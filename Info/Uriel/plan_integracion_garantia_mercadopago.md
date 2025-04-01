# Plan de Implementación: Garantía con Tarjeta para Mercado Pago

## Índice
1. [Análisis del Flujo Actual con Stripe](#1-análisis-del-flujo-actual-con-stripe)
2. [Estrategia de Implementación para Mercado Pago](#2-estrategia-de-implementación-para-mercado-pago)
3. [Cambios Necesarios en el Frontend](#3-cambios-necesarios-en-el-frontend)
4. [Implementación de APIs para Mercado Pago](#4-implementación-de-apis-para-mercado-pago)
5. [Gestión de Conexiones de Pago](#5-gestión-de-conexiones-de-pago)
6. [Testing y Validación](#6-testing-y-validación)
7. [Plan de Implementación Paso a Paso](#7-plan-de-implementación-paso-a-paso)

## 1. Análisis del Flujo Actual con Stripe

### 1.1 Estructura de los componentes
El flujo actual con Stripe para guardar y usar tarjetas como garantía consta de varios componentes:

- **CardSetupForm.tsx**: Formulario para configurar una nueva tarjeta usando Stripe Elements
- **CardList.tsx**: Componente para mostrar y gestionar tarjetas guardadas
- **SummaryStep.tsx**: Implementa la lógica para usar la tarjeta como garantía durante la reserva

### 1.2 Flujo de datos y operaciones
1. **Registro de tarjeta**:
   - Se crea/recupera un customer en Stripe (`/api/stripe/customer`)
   - Se genera un SetupIntent (`/api/stripe/setup-intent`)
   - Se confirma el SetupIntent con los datos de la tarjeta
   - Se guarda la referencia del método de pago

2. **Uso como garantía**:
   - El usuario selecciona una tarjeta registrada
   - Se usa la tarjeta como garantía sin realizar un cargo inmediato
   - En caso de no asistencia, se puede realizar un cargo a la tarjeta posteriormente

3. **Validaciones**:
   - Verificación de conexión con Stripe
   - Verificación de cliente de Stripe
   - Manejo de errores específicos de tarjetas

## 2. Estrategia de Implementación para Mercado Pago

### 2.1 Enfoque General
Implementaremos un sistema paralelo al de Stripe, manteniendo la misma arquitectura de datos y flujo de trabajo pero utilizando los componentes y APIs de Mercado Pago.

### 2.2 Checkout Bricks de Mercado Pago
[Checkout Bricks](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/introduction) es una solución de Mercado Pago que ofrece componentes modulares para implementar flujos de pago. Para nuestro caso, utilizaremos:

- **Card Payment Brick**: Para capturar y tokenizar datos de tarjeta de forma segura

### 2.3 Modelo de datos
El enfoque con Mercado Pago será similar al de Stripe, donde:

- Mercado Pago almacena todas las tarjetas asociadas a un `customer_id`
- Nuestra aplicación solo almacena referencias a estos `customer_id` y `payment_method_id`
- No almacenamos datos sensibles de tarjetas, siguiendo el estándar PCI DSS

## 3. Cambios Necesarios en el Frontend

### 3.1 Nuevos Componentes
1. **CardSetupFormMP.tsx**: Equivalente a CardSetupForm.tsx pero utilizando Checkout Bricks
   ```jsx
   import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';

   export function CardSetupFormMP({ onSuccess, empresaId, userId }) {
     // Inicializar MP con el public key
     initMercadoPago('PUBLIC_KEY_HERE');
     
     const initialization = {
       amount: '0', // Para tokenización, no se realiza cargo
     };
     
     const onSubmit = async (formData) => {
       try {
         // 1. Obtener o crear customer_id para este usuario
         const customerResponse = await fetch('/api/mercadopago/customer', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ userId, empresaId })
         });
         
         const { mpCustomerId } = await customerResponse.json();
         
         // 2. Asociar token de tarjeta con el customer
         const cardResponse = await fetch('/api/mercadopago/card', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ 
             token: formData.token,
             mpCustomerId,
             userId,
             empresaId 
           })
         });
         
         const cardData = await cardResponse.json();
         
         if (cardData.success) {
           onSuccess(cardData.paymentMethodId);
         }
       } catch (error) {
         console.error('Error al guardar tarjeta:', error);
       }
     };
     
     return (
       <CardPayment
         initialization={initialization}
         onSubmit={onSubmit}
       />
     );
   }
   ```

2. **CardListMP.tsx**: Versión adaptada para mostrar tarjetas de Mercado Pago
   ```jsx
   export function CardListMP({ empresaId, userId, onSelect }) {
     const [cards, setCards] = useState([]);
     const [isLoading, setIsLoading] = useState(true);
     
     useEffect(() => {
       async function loadCards() {
         try {
           setIsLoading(true);
           // 1. Obtener tarjetas guardadas de este usuario en Mercado Pago
           const response = await fetch(`/api/mercadopago/cards?empresaId=${empresaId}&userId=${userId}`);
           const data = await response.json();
           
           setCards(data.cards || []);
         } catch (error) {
           console.error('Error al cargar tarjetas:', error);
         } finally {
           setIsLoading(false);
         }
       }
       
       loadCards();
     }, [empresaId, userId]);
     
     // Renderizar tarjetas similar a CardList.tsx
     return (
       <div>
         {isLoading ? (
           <div>Cargando tarjetas...</div>
         ) : (
           cards.map(card => (
             <CardItem
               key={card.id}
               card={card}
               onClick={() => onSelect(card)}
             />
           ))
         )}
       </div>
     );
   }
   ```

### 3.2 Adaptación de Componentes Existentes
1. **Componente unificado**: Crear un componente que decida qué versión mostrar (Stripe o MP)
   ```jsx
   // PaymentMethodSelector.tsx
   export function PaymentMethodSelector({ empresaId }) {
     const { activeMethod } = usePaymentGateway(empresaId);
     
     if (activeMethod === 'loading') {
       return <div>Cargando métodos de pago...</div>;
     }
     
     // Renderizar el componente adecuado según la configuración
     return (
       <>
         {activeMethod === 'stripe' && <CardList {...props} />}
         {activeMethod === 'mercadopago' && <CardListMP {...props} />}
         {activeMethod === 'none' && <div>No hay método de pago configurado</div>}
       </>
     );
   }
   ```

2. **Modificar SummaryStep.tsx**:
   ```jsx
   // Dentro de SummaryStep.tsx
   import { usePaymentGateway } from '@/hooks/usePaymentGateway';
   
   // Agregar a las props existentes
   const { activeMethod } = usePaymentGateway(empresaId);
   
   // En la función handleCreateReservation
   if (selectedPaymentMethod === 'guarantee' && selectedCardMethod) {
     // Guardar referencia según el proveedor activo
     if (activeMethod === 'stripe') {
       // Lógica existente para Stripe
     } else if (activeMethod === 'mercadopago') {
       // Nueva lógica para Mercado Pago - similar a Stripe pero con mp_payment_method_id
     }
   }
   ```

### 3.3 Hooks y Contextos
1. **usePaymentGateway**: Hook para verificar el método de pago activo
   ```jsx
   // hooks/usePaymentGateway.ts
   import { useState, useEffect } from 'react';
   
   export function usePaymentGateway(empresaId: string | null) {
     const [activeMethod, setActiveMethod] = useState('loading');
     
     useEffect(() => {
       if (!empresaId) {
         setActiveMethod('none');
         return;
       }
       
       async function checkGateways() {
         try {
           // Verificar Stripe
           const stripeResponse = await fetch(`/api/stripe/connection/${empresaId}`);
           const stripeData = await stripeResponse.json();
           
           // Verificar Mercado Pago
           const mpResponse = await fetch(`/api/mercadopago/connection/${empresaId}`);
           const mpData = await mpResponse.json();
           
           // Priorizar Stripe si ambos están configurados
           if (stripeData.isConnected) {
             setActiveMethod('stripe');
           } else if (mpData.connection) {
             setActiveMethod('mercadopago');
           } else {
             setActiveMethod('none');
           }
         } catch (error) {
           console.error('Error al verificar pasarelas de pago:', error);
           setActiveMethod('none');
         }
       }
       
       checkGateways();
     }, [empresaId]);
     
     return { activeMethod };
   }
   ```

## 4. Implementación de APIs para Mercado Pago

### 4.1 API para Gestión de Clientes
```typescript
// api/mercadopago/customer/route.ts
import { NextResponse } from 'next/server';
import { mercadoPagoConnectionService } from '@/services/mercadoPagoConnectionService';
import { supabaseService } from '@/lib/supabase-service';

export async function POST(request: Request) {
  try {
    const { userId, empresaId } = await request.json();
    
    // 1. Verificar conexión de Mercado Pago
    const mpConnection = await mercadoPagoConnectionService.getConnection(empresaId);
    if (!mpConnection || !mpConnection.access_token) {
      return NextResponse.json({ error: 'No hay conexión válida con Mercado Pago' }, { status: 400 });
    }
    
    // 2. Buscar si ya existe un customer_id para este usuario
    const { data: existingCustomer } = await supabaseService
      .from('mp_customers')
      .select('mp_customer_id')
      .eq('user_id', userId)
      .eq('empresa_id', empresaId)
      .single();
    
    if (existingCustomer?.mp_customer_id) {
      return NextResponse.json({
        mpCustomerId: existingCustomer.mp_customer_id,
        status: 'existing'
      });
    }
    
    // 3. Obtener datos del usuario para crear el customer
    const { data: userData } = await supabaseService
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', userId)
      .single();
    
    if (!userData?.email) {
      return NextResponse.json({ error: 'Datos de usuario incompletos' }, { status: 400 });
    }
    
    // 4. Crear customer en Mercado Pago
    const customerData = {
      email: userData.email,
      first_name: userData.first_name || '',
      last_name: userData.last_name || ''
    };
    
    // Crear customer usando la API de Mercado Pago
    const response = await fetch('https://api.mercadopago.com/v1/customers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpConnection.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(customerData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ 
        error: 'Error al crear cliente en Mercado Pago',
        details: errorData
      }, { status: 400 });
    }
    
    const newCustomer = await response.json();
    
    // 5. Guardar referencia en nuestra base de datos
    await supabaseService.from('mp_customers').insert({
      user_id: userId,
      empresa_id: empresaId,
      mp_customer_id: newCustomer.id,
      email: userData.email,
      created_at: new Date().toISOString()
    });
    
    return NextResponse.json({
      mpCustomerId: newCustomer.id,
      status: 'created'
    });
  } catch (error) {
    console.error('Error al procesar cliente de Mercado Pago:', error);
    return NextResponse.json({ 
      error: 'Error interno al procesar el cliente',
    }, { status: 500 });
  }
}
```

### 4.2 API para Gestión de Tarjetas
```typescript
// api/mercadopago/cards/route.ts
import { NextResponse } from 'next/server';
import { mercadoPagoConnectionService } from '@/services/mercadoPagoConnectionService';

// GET: Obtener tarjetas guardadas
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get('empresaId');
  const userId = searchParams.get('userId');
  
  if (!empresaId || !userId) {
    return NextResponse.json({ error: 'Parámetros incompletos' }, { status: 400 });
  }
  
  try {
    // 1. Obtener conexión de Mercado Pago
    const mpConnection = await mercadoPagoConnectionService.getConnection(empresaId);
    if (!mpConnection || !mpConnection.access_token) {
      return NextResponse.json({ error: 'No hay conexión válida con Mercado Pago' }, { status: 400 });
    }
    
    // 2. Obtener customer_id de este usuario
    const { data: customer } = await supabaseService
      .from('mp_customers')
      .select('mp_customer_id')
      .eq('user_id', userId)
      .eq('empresa_id', empresaId)
      .single();
    
    if (!customer?.mp_customer_id) {
      return NextResponse.json({ cards: [] }); // No hay tarjetas si no hay customer
    }
    
    // 3. Obtener tarjetas del customer desde Mercado Pago
    const response = await fetch(`https://api.mercadopago.com/v1/customers/${customer.mp_customer_id}/cards`, {
      headers: {
        'Authorization': `Bearer ${mpConnection.access_token}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error al obtener tarjetas de MP:', errorData);
      return NextResponse.json({ error: 'Error al consultar tarjetas', details: errorData }, { status: 400 });
    }
    
    const cardsData = await response.json();
    
    // 4. Transformar datos al formato esperado por el frontend
    const formattedCards = cardsData.map(card => ({
      id: card.id,
      brand: card.payment_method.payment_type_id || card.payment_method.name || 'card',
      last4: card.last_four_digits,
      expMonth: card.expiration_month,
      expYear: card.expiration_year
    }));
    
    return NextResponse.json({ cards: formattedCards });
    
  } catch (error) {
    console.error('Error al procesar tarjetas de Mercado Pago:', error);
    return NextResponse.json({ error: 'Error interno al procesar tarjetas' }, { status: 500 });
  }
}

// POST: Guardar nueva tarjeta
export async function POST(request: Request) {
  try {
    const { token, mpCustomerId, userId, empresaId } = await request.json();
    
    if (!token || !mpCustomerId || !userId || !empresaId) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }
    
    // 1. Obtener conexión de Mercado Pago
    const mpConnection = await mercadoPagoConnectionService.getConnection(empresaId);
    if (!mpConnection || !mpConnection.access_token) {
      return NextResponse.json({ error: 'No hay conexión válida con Mercado Pago' }, { status: 400 });
    }
    
    // 2. Asociar tarjeta al customer usando la API de Mercado Pago
    const response = await fetch(`https://api.mercadopago.com/v1/customers/${mpCustomerId}/cards`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpConnection.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ 
        error: 'Error al guardar tarjeta en Mercado Pago',
        details: errorData
      }, { status: 400 });
    }
    
    const cardData = await response.json();
    
    return NextResponse.json({
      success: true,
      paymentMethodId: cardData.id,
      card: {
        id: cardData.id,
        last4: cardData.last_four_digits,
        brand: cardData.payment_method.payment_type_id,
        expMonth: cardData.expiration_month,
        expYear: cardData.expiration_year
      }
    });
  } catch (error) {
    console.error('Error al guardar tarjeta en Mercado Pago:', error);
    return NextResponse.json({ error: 'Error interno al guardar tarjeta' }, { status: 500 });
  }
}
```

### 4.3 Servicio de Cliente de Mercado Pago
```typescript
// services/mercadopagoCustomerService.ts
import { supabaseService } from '@/lib/supabase-service';
import { mercadoPagoConnectionService } from './mercadoPagoConnectionService';

export const mercadopagoCustomerService = {
  /**
   * Obtiene o crea un cliente de Mercado Pago para el usuario indicado
   */
  async getOrCreateCustomer(userId: string, empresaId: string) {
    try {
      // 1. Verificar si ya existe un customer
      const { data: existingCustomer } = await supabaseService
        .from('mp_customers')
        .select('mp_customer_id')
        .eq('user_id', userId)
        .eq('empresa_id', empresaId)
        .single();
        
      if (existingCustomer?.mp_customer_id) {
        return {
          mpCustomerId: existingCustomer.mp_customer_id,
          status: 'existing'
        };
      }
      
      // 2. Si no existe, crear uno nuevo
      // (Implementación completa en la API)
      
      // Esta función se implementa completamente en la API
      // porque requiere más contexto y acceso a datos del usuario
      
      return null;
    } catch (error) {
      console.error('Error en servicio mercadopagoCustomerService:', error);
      throw error;
    }
  }
};
```

## 5. Gestión de Conexiones de Pago

### 5.1 Creación de tabla para clientes de Mercado Pago

```sql
-- Esta tabla solo almacena referencias, no datos sensibles
CREATE TABLE IF NOT EXISTS mp_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  mp_customer_id TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, empresa_id)
);

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_mp_customers_user_id ON mp_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_mp_customers_empresa_id ON mp_customers(empresa_id);
```

### 5.2 Hook para Usar en Componentes
```typescript
// usePaymentGateway.ts
import { useState, useEffect } from 'react';
import { paymentGatewayService } from '@/services/paymentGatewayService';

export function usePaymentGateway(empresaId: string | null) {
  const [activeMethod, setActiveMethod] = useState<'stripe' | 'mercadopago' | 'none' | 'loading'>('loading');
  
  useEffect(() => {
    if (!empresaId) {
      setActiveMethod('none');
      return;
    }
    
    async function checkActiveMethod() {
      try {
        const { method } = await paymentGatewayService.getActivePaymentMethod(empresaId);
        setActiveMethod(method);
      } catch (error) {
        console.error('Error al verificar método de pago:', error);
        setActiveMethod('none');
      }
    }
    
    checkActiveMethod();
  }, [empresaId]);
  
  return { activeMethod };
}
```

## 6. Testing y Validación

### 6.1 Plan de Pruebas
1. **Pruebas unitarias**:
   - Verificar funcionamiento de las APIs
   - Probar los servicios de cliente y tarjeta

2. **Pruebas de integración**:
   - Probar el flujo completo de registro de tarjeta con Mercado Pago
   - Verificar la selección correcta de gateway (Stripe vs MP)

3. **Pruebas de interfaz**:
   - Validar que la interfaz se adapta correctamente según el método de pago activo
   - Comprobar mensajes de error apropiados

### 6.2 Datos de Prueba para Mercado Pago
- Usar sandbox de Mercado Pago para todas las pruebas
- Datos de tarjetas de prueba para Mercado Pago:
  - Visa: 4509 9535 6623 3704, CVV: 123, Fecha: cualquiera futura
  - Mastercard: 5031 7557 3453 0604, CVV: 123, Fecha: cualquiera futura

## 7. Plan de Implementación Paso a Paso

### Fase 1: Preparación de la Base de Datos
1. Crear tabla `mp_customers` para almacenar las referencias de clientes de Mercado Pago

### Fase 2: Implementación de APIs
1. Desarrollar API para gestión de clientes de Mercado Pago
2. Desarrollar API para gestión de tarjetas
3. Implementar servicios necesarios para comunicación con Mercado Pago

### Fase 3: Desarrollo de Componentes Frontend
1. Crear CardSetupFormMP utilizando Checkout Bricks
2. Desarrollar CardListMP para mostrar tarjetas de Mercado Pago
3. Implementar hook usePaymentGateway
4. Adaptar PaymentMethodSelector para soportar ambos métodos

### Fase 4: Integración en el Flujo de Reserva
1. Modificar SummaryStep para detectar y usar el método de pago activo
2. Implementar manejo de garantía para tarjetas de Mercado Pago
3. Unificar interfaz de usuario para ambos métodos

### Fase 5: Testing y Despliegue
1. Realizar pruebas exhaustivas con ambos métodos de pago
2. Validar toda la funcionalidad en entorno de desarrollo
3. Planificar el despliegue en producción

## Consideraciones Adicionales

### Seguridad
- Nunca almacenar datos sensibles de tarjetas en nuestra base de datos
- Utilizar solo los tokens proporcionados por Mercado Pago
- Implementar políticas de seguridad adecuadas en la base de datos

### Exclusividad de Método de Pago
- Implementar una interfaz en el panel de administración para activar/desactivar métodos de pago
- Asegurar que solo un método puede estar activo a la vez (Stripe o Mercado Pago)

### Documentación
- Crear documentación detallada del nuevo flujo
- Proporcionar guías para usuarios finales sobre el proceso de registro de tarjetas
