# Plan de Integración con Mercado Pago

## Objetivo
Implementar la funcionalidad para que los clientes puedan conectar su cuenta de Mercado Pago desde la página de integraciones (BillingSettings) y posteriormente poder cobrar a través de esta plataforma. **Esta funcionalidad estará disponible exclusivamente para empresas con país Argentina o México.**

## Análisis del estado actual
- Actualmente existe integración con Stripe en la página de BillingSettings
- Se tiene un servicio (`stripeConnectionService.ts`) que maneja la conexión con Stripe
- El componente BillingSettings.tsx gestiona la UI para conectar/desconectar Stripe
- La organización actual se obtiene a través del contexto `OrganizationContext` y contiene el campo `country` que podemos usar para la restricción

## Plan de implementación

### 1. Crear servicio para Mercado Pago

**Archivo:** `src/services/mercadoPagoConnectionService.ts`

Este servicio gestionará las operaciones relacionadas con la conexión a Mercado Pago:
- Obtener conexión existente
- Crear nueva conexión
- Eliminar conexión
- Actualizar estado de conexión

```typescript
import { supabase } from '@/lib/supabase'

export interface MercadoPagoConnection {
  id: string
  empresa_id: string
  mercadopago_user_id: string
  mercadopago_email: string | null
  account_status: 'pending' | 'active' | 'restricted' | 'disabled'
  access_token: string
  refresh_token: string
  token_expiry: string
  created_at: string
  updated_at: string
  last_webhook_received_at: string | null
}

class MercadoPagoConnectionService {
  async getConnection(empresaId: string): Promise<MercadoPagoConnection | null> {
    try {
      const { data, error } = await supabase
        .from('mercadopago_connections')
        .select('*')
        .eq('empresa_id', empresaId)
        .single()

      if (error) {
        console.error('Error al obtener la conexión de Mercado Pago:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error en getConnection:', error)
      return null
    }
  }

  async deleteConnection(connectionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('mercadopago_connections')
        .delete()
        .eq('id', connectionId)

      if (error) {
        console.error('Error al eliminar la conexión de Mercado Pago:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error en deleteConnection:', error)
      return false
    }
  }

  async updateConnectionStatus(
    connectionId: string, 
    status: MercadoPagoConnection['account_status']
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('mercadopago_connections')
        .update({ account_status: status })
        .eq('id', connectionId)

      if (error) {
        console.error('Error al actualizar el estado de la conexión:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error en updateConnectionStatus:', error)
      return false
    }
  }
  
  // Verificar si el país es compatible con Mercado Pago
  isCountrySupported(country: string | null): boolean {
    if (!country) return false;
    const supportedCountries = ['Argentina', 'Mexico', 'México']; // Incluimos posibles variaciones
    return supportedCountries.includes(country);
  }
}

export const mercadoPagoConnectionService = new MercadoPagoConnectionService()
```

### 2. Crear endpoints API para Mercado Pago

#### 2.1 Endpoint para inicio de autorización OAuth

**Archivo:** `src/app/api/mercadopago/connect/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const empresaId = searchParams.get('empresa_id')
    
    if (!empresaId) {
      return NextResponse.json({ error: 'ID de empresa requerido' }, { status: 400 })
    }
    
    // Verificar si la empresa es de Argentina o México
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('country')
      .eq('id', empresaId)
      .single()
      
    if (empresaError || !empresa) {
      return NextResponse.json({ error: 'No se pudo obtener información de la empresa' }, { status: 400 })
    }
    
    // Validar país
    const supportedCountries = ['Argentina', 'Mexico', 'México'];
    if (!empresa.country || !supportedCountries.includes(empresa.country)) {
      return NextResponse.json({ 
        error: 'Mercado Pago solo está disponible para empresas de Argentina o México' 
      }, { status: 403 })
    }
    
    // Guardar empresa_id en una cookie segura para recuperarlo en el callback
    cookies().set('mp_empresaId', empresaId, { 
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600, // 1 hora
      path: '/',
    })
    
    // URL de redirección a Mercado Pago OAuth
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const redirectUri = `${baseUrl}/api/mercadopago/callback`
    
    const authUrl = new URL('https://auth.mercadopago.com.ar/authorization')
    authUrl.searchParams.append('client_id', process.env.MERCADOPAGO_CLIENT_ID!)
    authUrl.searchParams.append('response_type', 'code')
    authUrl.searchParams.append('platform_id', 'mp')
    authUrl.searchParams.append('redirect_uri', redirectUri)
    
    return NextResponse.json({ url: authUrl.toString() })
  } catch (error) {
    console.error('Error en API de conexión a Mercado Pago:', error)
    return NextResponse.json({ error: 'Error al iniciar conexión' }, { status: 500 })
  }
}
```

#### 2.2 Endpoint para el callback de OAuth

**Archivo:** `src/app/api/mercadopago/callback/route.ts`

```typescript
import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    
    // Recuperar empresaId de la cookie
    const empresaId = cookies().get('mp_empresaId')?.value
    
    if (error) {
      console.error('Error en OAuth Mercado Pago:', error)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?error=auth_failed`)
    }
    
    if (!code || !empresaId) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?error=missing_params`)
    }
    
    // Verificar nuevamente si la empresa es de Argentina o México
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('country')
      .eq('id', empresaId)
      .single()
      
    if (empresaError || !empresa) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?error=invalid_company`)
    }
    
    // Validar país nuevamente como medida de seguridad
    const supportedCountries = ['Argentina', 'Mexico', 'México'];
    if (!empresa.country || !supportedCountries.includes(empresa.country)) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?error=country_not_supported`)
    }
    
    // Intercambiar código por token de acceso
    const tokenResponse = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: process.env.MERCADOPAGO_CLIENT_ID,
        client_secret: process.env.MERCADOPAGO_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/mercadopago/callback`
      })
    })
    
    if (!tokenResponse.ok) {
      console.error('Error al obtener token:', await tokenResponse.text())
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?error=token_failed`)
    }
    
    const tokenData = await tokenResponse.json()
    
    // Obtener información del usuario de Mercado Pago
    const userResponse = await fetch('https://api.mercadopago.com/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    })
    
    if (!userResponse.ok) {
      console.error('Error al obtener información del usuario:', await userResponse.text())
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?error=user_info_failed`)
    }
    
    const userData = await userResponse.json()
    
    // Guardar la conexión en la base de datos
    const { error: dbError } = await supabase
      .from('mercadopago_connections')
      .upsert({
        empresa_id: empresaId,
        mercadopago_user_id: userData.id,
        mercadopago_email: userData.email,
        account_status: 'active',
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expiry: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
    
    if (dbError) {
      console.error('Error al guardar conexión en BD:', dbError)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?error=db_failed`)
    }
    
    // Redirigir al usuario de vuelta a la página de configuración
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`)
  } catch (error) {
    console.error('Error en callback de Mercado Pago:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?error=general`)
  }
}
```

#### 2.3 Endpoint para obtener estado de conexión

**Archivo:** `src/app/api/mercadopago/connection/[empresaId]/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { mercadoPagoConnectionService } from '@/services/mercadoPagoConnectionService'
import { supabase } from '@/lib/supabase'

export async function GET(
  req: Request,
  { params }: { params: { empresaId: string } }
) {
  try {
    const empresaId = params.empresaId
    
    if (!empresaId) {
      return NextResponse.json({ error: 'ID de empresa requerido' }, { status: 400 })
    }
    
    // Verificar si la empresa es de Argentina o México
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('country')
      .eq('id', empresaId)
      .single()
      
    if (empresaError || !empresa) {
      return NextResponse.json({ error: 'No se pudo obtener información de la empresa' }, { status: 400 })
    }
    
    // Validar país
    const supportedCountries = ['Argentina', 'Mexico', 'México'];
    if (!empresa.country || !supportedCountries.includes(empresa.country)) {
      return NextResponse.json({ 
        error: 'Mercado Pago solo está disponible para empresas de Argentina o México',
        country_supported: false
      })
    }
    
    const connection = await mercadoPagoConnectionService.getConnection(empresaId)
    
    if (!connection) {
      return NextResponse.json({ 
        country_supported: true,
        connection: null
      })
    }
    
    // No retornamos tokens sensibles al cliente
    const sanitizedConnection = {
      id: connection.id,
      empresa_id: connection.empresa_id,
      mercadopago_user_id: connection.mercadopago_user_id,
      mercadopago_email: connection.mercadopago_email,
      account_status: connection.account_status,
      created_at: connection.created_at,
      updated_at: connection.updated_at
    }
    
    return NextResponse.json(sanitizedConnection)
  } catch (error) {
    console.error('Error al obtener conexión de Mercado Pago:', error)
    return NextResponse.json({ error: 'Error al obtener datos de conexión' }, { status: 500 })
  }
}
```

### 3. Modificar el componente BillingSettings.tsx

Actualizar el componente para incluir la integración con Mercado Pago, añadiendo:
- Estado para la conexión con Mercado Pago
- Función para conectar con Mercado Pago
- Función para desconectar Mercado Pago
- UI para mostrar el estado de la conexión
- **Implementar lógica para mostrar/ocultar la sección de Mercado Pago según el país**

```typescript
// Extracto de código para agregar al componente BillingSettings.tsx

// Verificar si el país es compatible con Mercado Pago
const isMercadoPagoSupported = useMemo(() => {
  const supportedCountries = ['Argentina', 'Mexico', 'México'];
  return organization?.country && supportedCountries.includes(organization.country);
}, [organization?.country]);

// Estado para manejar la conexión de Mercado Pago
const { data: mpConnection, isLoading: isLoadingMP } = useQuery({
  queryKey: ['mercadoPagoConnection', organization?.id],
  queryFn: async () => {
    if (!organization?.id) {
      throw new Error('No hay organización seleccionada');
    }
    
    try {
      const response = await fetch(`/api/mercadopago/connection/${organization.id}`);
      
      if (!response.ok) {
        throw new Error(`Error al cargar la información de Mercado Pago: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error || !data.country_supported) {
        return { country_supported: false, connection: null };
      }
      
      return {
        country_supported: true,
        connection: data.connection || null
      };
    } catch (error) {
      console.error('Error fetching MercadoPago connection:', error);
      return { country_supported: false, connection: null };
    }
  },
  enabled: !!organization?.id && isMercadoPagoSupported
});

// En el JSX, condicional para mostrar la sección según el país
{isMercadoPagoSupported && (
  <div className="space-y-4 mt-8">
    <div className="flex items-center justify-start">
      <h3 className="text-xl font-medium">Integración de Mercado Pago</h3>
    </div>

    <div className="p-0 mt-4">
      {isLoadingMP ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : (
        // Interfaz similar a la de Stripe, adaptada para Mercado Pago
        // ...
      )}
    </div>
  </div>
)}
```

### 4. Crear tabla en la base de datos de Supabase

```sql
CREATE TABLE mercadopago_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  mercadopago_user_id VARCHAR NOT NULL,
  mercadopago_email VARCHAR,
  account_status VARCHAR NOT NULL DEFAULT 'pending',
  access_token VARCHAR NOT NULL,
  refresh_token VARCHAR NOT NULL,
  token_expiry TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_webhook_received_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(empresa_id)
);
```

### 5. Configuración del entorno

Agregar las siguientes variables de entorno al proyecto:
```
MERCADOPAGO_CLIENT_ID=TU_CLIENT_ID
MERCADOPAGO_CLIENT_SECRET=TU_CLIENT_SECRET
```

## Cronograma estimado

1. **Fase de preparación (1 día)**
   - Crear la tabla en Supabase
   - Configurar variables de entorno
   - Registrar aplicación en Mercado Pago para obtener credenciales

2. **Fase de desarrollo (3 días)**
   - Implementar servicio de conexión con Mercado Pago
   - Desarrollar endpoints de API con restricción de país
   - Modificar el componente BillingSettings.tsx para incluir validación por país
   - Pruebas de integración

3. **Fase de testing (1 día)**
   - Pruebas completas del flujo de autorización
   - Verificación de restricción por país
   - Pruebas de desconexión

4. **Documentación y entrega (1 día)**
   - Documentación del proceso para usuarios
   - Entrega final

## Consideraciones adicionales

- **Seguridad**: Los tokens de Mercado Pago son sensibles y deben almacenarse de forma segura, nunca exponiéndolos al frontend.
- **Renovación de tokens**: Mercado Pago requiere renovar periódicamente los access tokens usando el refresh token. Considera implementar un job programado para esta tarea.
- **Webhooks**: Para mantener sincronizado el estado de la cuenta, es recomendable implementar endpoints para recibir webhooks de Mercado Pago.
- **Testing**: Utilizar el modo sandbox de Mercado Pago para pruebas antes de pasar a producción.
- **Validación de país**: La restricción por país debe implementarse tanto en el frontend como en el backend para garantizar la seguridad.
