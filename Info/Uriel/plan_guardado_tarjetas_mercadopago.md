# Plan de Implementación: Guardado de Tarjetas en MercadoPago

## 1. Análisis del Enfoque Actual

El sistema actual con Stripe funciona de la siguiente manera:
1. **Estructura de datos**: Tabla `stripe_customers` en Supabase que conecta un usuario con su correspondiente `stripe_customer_id`
2. **Servicios**: `stripe-customer.service.ts` maneja la lógica de buscar/crear clientes
3. **API Endpoints**: `/api/stripe/customer/route.ts` expone esta funcionalidad
4. **Frontend**: Hooks y componentes que interactúan con estas APIs

Este enfoque es correcto y podemos replicarlo para MercadoPago, adaptándolo a las particularidades de su API.

## 2. Plan de Implementación para MercadoPago

### 2.1 Crear tabla en Supabase para customers de MercadoPago

```sql
CREATE TYPE mercadopago_customer_status AS ENUM ('active', 'inactive');

CREATE TABLE public.mercadopago_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    empresa_id UUID NOT NULL,
    mercadopago_customer_id TEXT NOT NULL,
    status mercadopago_customer_status DEFAULT 'active',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    last_used TIMESTAMPTZ,
    payment_methods_count INTEGER DEFAULT 0,
    last_payment_error TEXT,
    CONSTRAINT unique_mp_customer_per_empresa UNIQUE (user_id, empresa_id)
);

CREATE INDEX idx_mp_customer_id ON public.mercadopago_customers (mercadopago_customer_id);
CREATE INDEX idx_mp_empresa_id ON public.mercadopago_customers (empresa_id);
```

### 2.2 Implementar servicio para gestionar clientes de MercadoPago

Crear el archivo `src/services/mercadopago-customer.service.ts`:

```typescript
import { MercadoPagoCustomerCache, MercadoPagoCustomerData } from '@/types/mercadopago';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mercadopago } from '@/lib/mercadopago';

export class MercadoPagoCustomerService {
  async getOrCreateCustomer(
    userId: string, 
    empresaId: string, 
    isRetry = false
  ): Promise<MercadoPagoCustomerCache> {
    try {
      // 1. Buscar en Supabase
      const { data: existingCustomers, error: searchError } = await supabaseAdmin
        .from('mercadopago_customers')
        .select('*')
        .match({
          user_id: userId,
          empresa_id: empresaId
        })
        .order('created_at', { ascending: false });

      if (searchError) {
        console.error('Error al buscar cliente MP:', searchError);
        throw searchError;
      }

      // Filtrar por cliente activo o el más reciente
      const activeCustomer = existingCustomers?.find(customer => customer.status === 'active') || 
                           existingCustomers?.[0];
      
      if (activeCustomer) {
        try {
          // 2. Validar existencia en MercadoPago
          const mpCustomer = await mercadopago.customers.get(activeCustomer.mercadopago_customer_id);

          if (mpCustomer) {
            // 3. Si el cliente no está activo, reactivarlo
            if (activeCustomer.status !== 'active') {
              await supabaseAdmin
                .from('mercadopago_customers')
                .update({
                  status: 'active',
                  last_used: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .match({ id: activeCustomer.id });
            } else {
              // Solo actualizar last_used si ya está activo
              await this.updateCustomerLastUsed(activeCustomer.id);
            }

            return {
              mercadoPagoCustomerId: activeCustomer.mercadopago_customer_id,
              empresaId,
              userId,
              lastUsed: new Date().toISOString(),
              status: 'active' as const
            };
          }
        } catch (mpError: any) {
          // 4. Marcar como inactivo si no existe en MercadoPago
          await this.markCustomerAsInactive(activeCustomer.id, mpError.message);
          
          // Si no es un reintento, crear nuevo cliente
          if (!isRetry) {
            return await this.createNewCustomer(userId, empresaId);
          }
        }
      }

      // 5. Si no hay cliente o todos están inactivos y no es un reintento, crear uno nuevo
      if (!isRetry) {
        return await this.createNewCustomer(userId, empresaId);
      }

      throw new Error('No se pudo recuperar ni crear el cliente después de múltiples intentos');

    } catch (error: any) {
      if (error.code === '23505' && !isRetry) {
        // Si es un error de duplicado y no es un reintento, esperar un momento y reintentar
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('Detectado cliente duplicado, intentando recuperar...');
        return await this.getOrCreateCustomer(userId, empresaId, true);
      }
      console.error('Error in getOrCreateCustomer:', error);
      throw error;
    }
  }

  private async createNewCustomer(userId: string, empresaId: string): Promise<MercadoPagoCustomerCache> {
    // 1. Obtener información de usuario para crear el customer
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('email, first_name, last_name')
      .eq('id', userId)
      .single();

    // 2. Crear customer en MercadoPago
    const customer = await mercadopago.customers.create({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      metadata: {
        user_id: userId,
        empresa_id: empresaId,
        created_at: new Date().toISOString()
      }
    });

    // 3. Guardar en Supabase
    const { data: newCustomer, error } = await supabaseAdmin
      .from('mercadopago_customers')
      .insert({
        user_id: userId,
        empresa_id: empresaId,
        mercadopago_customer_id: customer.id,
        last_used: new Date().toISOString(),
        metadata: {
          mp_created_at: new Date().toISOString(),
          initial_creation: true
        }
      })
      .select()
      .single();

    if (error) throw error;

    return {
      mercadoPagoCustomerId: customer.id,
      empresaId,
      userId,
      lastUsed: new Date().toISOString(),
      status: 'active'
    };
  }

  private async updateCustomerLastUsed(id: string) {
    const { error } = await supabaseAdmin
      .from('mercadopago_customers')
      .update({ last_used: new Date().toISOString() })
      .match({ id });

    if (error) throw error;
  }

  private async markCustomerAsInactive(id: string, errorMessage: string) {
    const { error } = await supabaseAdmin
      .from('mercadopago_customers')
      .update({
        status: 'inactive',
        last_payment_error: errorMessage,
        updated_at: new Date().toISOString()
      })
      .match({ id });

    if (error) throw error;
  }
}

export const mercadoPagoCustomerService = new MercadoPagoCustomerService();
```

### 2.3 Implementar tipos necesarios

Crear el archivo `src/types/mercadopago.ts`:

```typescript
export interface MercadoPagoCustomerData {
  id: string;
  user_id: string;
  empresa_id: string;
  mercadopago_customer_id: string;
  status: 'active' | 'inactive';
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  last_used?: string;
  payment_methods_count?: number;
  last_payment_error?: string;
}

export interface MercadoPagoCustomerCache {
  mercadoPagoCustomerId: string;
  empresaId: string;
  userId: string;
  lastUsed?: string;
  status: 'active' | 'inactive';
}

export interface MercadoPagoCard {
  id: string;
  customer_id: string;
  payment_method_id: string;
  issuer: {
    id: string;
    name: string;
  };
  last_four_digits: string;
  expiration_month: number;
  expiration_year: number;
  status: string;
  payment_method: {
    id: string;
    name: string;
    thumbnail: string;
    secure_thumbnail: string;
  };
}
```

### 2.4 Implementar API endpoints

#### 2.4.1 Endpoint para gestionar clientes
Crear el archivo `src/app/api/mercadopago/customer/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { mercadoPagoCustomerService } from '@/services/mercadopago-customer.service';

export async function POST(request: Request) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`📝 [${requestId}] Iniciando solicitud de Cliente MercadoPago`);

  try {
    const body = await request.json();
    const { empresaId, userId } = body;

    console.log(`📍 [${requestId}] Datos recibidos:`, {
      empresaId: empresaId ? '...present...' : 'missing',
      userId: userId ? '...present...' : 'missing'
    });

    if (!empresaId || !userId) {
      console.error(`❌ [${requestId}] Error: Faltan datos requeridos`);
      return NextResponse.json(
        { error: 'Se requieren empresaId y userId' },
        { status: 400 }
      );
    }

    const customerData = await mercadoPagoCustomerService.getOrCreateCustomer(
      userId,
      empresaId
    );

    if (!customerData) {
      console.error(`❌ [${requestId}] Error: No se pudo procesar el cliente`);
      return NextResponse.json(
        { error: 'Error al procesar el cliente' },
        { status: 500 }
      );
    }

    console.log(`✅ [${requestId}] Cliente procesado:`, {
      customerId: customerData.mercadoPagoCustomerId,
      status: customerData.status
    });

    return NextResponse.json(customerData);

  } catch (error: any) {
    console.error(`❌ [${requestId}] Error:`, error);
    
    // Manejar errores específicos
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Error de concurrencia al crear el cliente. Por favor, intente nuevamente.' },
        { status: 409 }
      );
    }

    // Errores de MercadoPago
    if (error.status >= 400) {
      return NextResponse.json(
        { error: error.message || 'Error al procesar con MercadoPago' },
        { status: 400 }
      );
    }

    // Error genérico
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error.message
      },
      { status: 500 }
    );
  }
}
```

#### 2.4.2 Endpoint para gestionar tarjetas
Crear el archivo `src/app/api/mercadopago/cards/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { mercadopago } from '@/lib/mercadopago';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mercadoPagoCustomerService } from '@/services/mercadopago-customer.service';
import { StoredCard } from '@/components/shifts-registration/components/card-list/shared/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get('empresaId');
  const userId = searchParams.get('userId');
  
  if (!empresaId || !userId) {
    return NextResponse.json(
      { error: 'Faltan parámetros requeridos' },
      { status: 400 }
    );
  }

  try {
    // 1. Obtener el customer_id
    const customerData = await mercadoPagoCustomerService.getOrCreateCustomer(
      userId,
      empresaId
    );

    if (!customerData || customerData.status !== 'active') {
      return NextResponse.json(
        { error: 'No se encontró un cliente activo' },
        { status: 404 }
      );
    }

    // 2. Obtener las tarjetas del cliente
    const mpCards = await mercadopago.card.all({
      customer_id: customerData.mercadoPagoCustomerId
    });

    // 3. Transformar al formato esperado por el frontend
    const cards: StoredCard[] = mpCards.map(card => ({
      id: card.id,
      brand: card.payment_method.name.toLowerCase(),
      last4: card.last_four_digits,
      expMonth: card.expiration_month,
      expYear: card.expiration_year,
      customerId: customerData.mercadoPagoCustomerId
    }));

    return NextResponse.json({ cards });

  } catch (error: any) {
    console.error('Error al obtener tarjetas:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener tarjetas' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { token, mercadoPagoCustomerId, userId, empresaId } = await request.json();
    
    if (!token || !mercadoPagoCustomerId || !userId || !empresaId) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    // Asociar tarjeta al cliente en MercadoPago
    const card = await mercadopago.card.create({
      token,
      customer_id: mercadoPagoCustomerId
    });

    // Actualizar contador de tarjetas en la tabla
    await supabaseAdmin
      .from('mercadopago_customers')
      .update({
        payment_methods_count: supabaseAdmin.sql`payment_methods_count + 1`,
        last_used: new Date().toISOString()
      })
      .match({
        user_id: userId,
        empresa_id: empresaId,
        mercadopago_customer_id: mercadoPagoCustomerId
      });

    return NextResponse.json({
      success: true,
      paymentMethodId: card.id
    });

  } catch (error: any) {
    console.error('Error al guardar tarjeta:', error);
    return NextResponse.json(
      { error: error.message || 'Error al guardar tarjeta' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const cardId = searchParams.get('cardId');
  const mercadoPagoCustomerId = searchParams.get('customerId');
  
  if (!cardId || !mercadoPagoCustomerId) {
    return NextResponse.json(
      { error: 'Faltan parámetros requeridos' },
      { status: 400 }
    );
  }

  try {
    // Eliminar tarjeta en MercadoPago
    await mercadopago.card.delete(mercadoPagoCustomerId, cardId);

    // Actualizar contador de tarjetas
    await supabaseAdmin
      .from('mercadopago_customers')
      .update({
        payment_methods_count: supabaseAdmin.sql`GREATEST(payment_methods_count - 1, 0)`,
        last_used: new Date().toISOString()
      })
      .match({
        mercadopago_customer_id: mercadoPagoCustomerId
      });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error al eliminar tarjeta:', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar tarjeta' },
      { status: 500 }
    );
  }
}
```

### 2.5 Actualizar el hook useMercadoPagoStoredCards

```typescript
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { StoredCard } from '@/components/shifts-registration/components/card-list/shared/types';

interface MercadoPagoConfig {
  mercadoPagoUserId: string | null;
  isConnected: boolean;
  empresaId: string;
}

export function useMercadoPagoStoredCards(
  mercadoPagoConfig: MercadoPagoConfig, 
  refreshTrigger = 0, 
  options = { autoLoad: true }
) {
  const [cards, setCards] = useState<StoredCard[]>([]);
  const [isLoading, setIsLoading] = useState(options.autoLoad);
  const [error, setError] = useState<Error | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const { user } = useAuth();
  
  const { mercadoPagoUserId, isConnected, empresaId } = mercadoPagoConfig;
  
  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;

  const loadCards = useCallback(async () => {
    if (!empresaId || !isConnected || !user) {
      console.log('[MercadoPagoStoredCards] No se puede cargar tarjetas:', {
        empresaId,
        isConnected,
        hasUser: Boolean(user)
      });
      setCards([]);
      setIsLoading(false);
      return;
    }

    try {
      console.log('[MercadoPagoStoredCards] 🔄 Iniciando carga de tarjetas:', {
        empresaId,
        userId: user.id,
        refreshTrigger,
        retryCount: retryCountRef.current
      });
      
      // 1. Si no tenemos un customerId, obtenemos uno
      if (!customerId) {
        const customerResponse = await fetch('/api/mercadopago/customer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ empresaId, userId: user.id })
        });
        
        if (!customerResponse.ok) {
          throw new Error('Error al obtener el cliente de MercadoPago');
        }
        
        const customerData = await customerResponse.json();
        setCustomerId(customerData.mercadoPagoCustomerId);
      }
      
      // 2. Obtener tarjetas guardadas
      const cardsResponse = await fetch(`/api/mercadopago/cards?empresaId=${empresaId}&userId=${user.id}`);
      
      if (!cardsResponse.ok) {
        throw new Error('Error al obtener tarjetas de MercadoPago');
      }
      
      const cardsData = await cardsResponse.json();
      setCards(cardsData.cards || []);
      setIsLoading(false);
      
      console.log('[MercadoPagoStoredCards] 💾 Estado actualizado:', {
        cardCount: cardsData.cards?.length || 0,
        lastUpdate: new Date().toISOString()
      });

    } catch (err) {
      if (!mountedRef.current) return;
      
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('[MercadoPagoStoredCards] ❌ Error al cargar las tarjetas:', {
        message: errorMessage,
        empresaId,
        userId: user.id,
        error: err
      });
      
      setError(err as Error);
      setIsLoading(false);
    }
  }, [empresaId, isConnected, refreshTrigger, user, customerId]);

  useEffect(() => {
    mountedRef.current = true;
    retryCountRef.current = 0;
    
    if (options.autoLoad) {
      setIsLoading(true);
      loadCards();
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, [loadCards, options.autoLoad]);

  const deleteCard = useCallback(async (cardId: string) => {
    if (!customerId || !isConnected || !user) {
      console.error('[MercadoPagoStoredCards] ❌ No se puede eliminar la tarjeta:', {
        customerId,
        isConnected,
        hasUser: Boolean(user)
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('[MercadoPagoStoredCards] 🗑️ Eliminando tarjeta:', {
        cardId,
        customerId
      });

      const response = await fetch(`/api/mercadopago/cards?cardId=${cardId}&customerId=${customerId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Error al eliminar la tarjeta');
      }
      
      // Actualizar la lista de tarjetas (eliminarla localmente)
      setCards(prevCards => prevCards.filter(card => card.id !== cardId));
      
      console.log('[MercadoPagoStoredCards] ✅ Tarjeta eliminada:', cardId);
      
    } catch (err) {
      console.error('[MercadoPagoStoredCards] ❌ Error al eliminar la tarjeta:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [customerId, isConnected, user]);

  return { cards, isLoading, error, deleteCard, loadCards, customerId };
}
```

### 2.6 Actualizar el componente MercadoPagoCardList

Implementar el componente del formulario de tarjeta que falta en `MercadoPagoCardList.tsx`:

```jsx
// Dentro de MercadoPagoCardSetupWrapper, reemplazar la sección "NOTA: Aquí se implementará el formulario específico de MercadoPago"
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';

// Inicializar MercadoPago
useEffect(() => {
  // Aquí usarías tu public key
  initMercadoPago('TEST-public-key-goes-here');
}, []);

const initialization = {
  amount: '0', // Para tokenización sin cargo
};

const onSubmit = async (formData) => {
  try {
    // Asociar token de tarjeta con el customer
    const cardResponse = await fetch('/api/mercadopago/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        token: formData.token,
        mercadoPagoCustomerId,
        userId,
        empresaId 
      })
    });
    
    const cardData = await cardResponse.json();
    
    if (cardData.success) {
      onSuccess(cardData.paymentMethodId);
    } else {
      onError(new Error(cardData.error || 'Error al guardar tarjeta'));
    }
  } catch (error) {
    console.error('Error al guardar tarjeta:', error);
    onError(error);
  }
};

return (
  <CardPayment
    initialization={initialization}
    onSubmit={onSubmit}
  />
);
```

## 3. Secuencia de implementación recomendada

1. Crear la tabla `mercadopago_customers` en Supabase
2. Implementar `mercadopago-customer.service.ts`
3. Crear endpoints de API para clientes y tarjetas
4. Actualizar el hook `useMercadoPagoStoredCards.ts`
5. Implementar el formulario en `MercadoPagoCardList.tsx`
6. Agregar configuración en `CardSetupForm.tsx` para permitir la creación de tarjetas de MP
7. Realizar pruebas integrales

## 4. Configuración de MercadoPago SDK

Para configurar correctamente el SDK de MercadoPago, debes crear un archivo de configuración en `lib/mercadopago.ts`:

```typescript
import { MercadoPagoConfig, Payment, Customer, Card } from 'mercadopago';

// Instancia de MercadoPago
const mercadopago = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

// Instancias de recursos
const payment = new Payment(mercadopago);
const customer = new Customer(mercadopago);
const card = new Card(mercadopago);

export {
  mercadopago,
  payment,
  customer,
  card
};
```

Este enfoque te permitirá implementar un sistema de guardado de tarjetas en MercadoPago equivalente al que ya tienes con Stripe, manteniendo la misma arquitectura y patrones.
