import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'
import { mercadoPagoConnectionService } from '@/services/mercadoPagoConnectionService'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const error_description = searchParams.get('error_description')
    const state = searchParams.get('state') || ''
    
    // Recuperar empresa_id y país de las cookies
    const cookieStore = await cookies()
    let empresaId = cookieStore.get('mp_empresaId')?.value
    const country = cookieStore.get('mp_country')?.value
    
    // SOLUCIÓN: Extraer el empresaId del parámetro state si no está en las cookies
    // El formato del state es 'origin:settings:empresaId'
    if (!empresaId && state) {
      const stateParts = state.split(':')
      // Si el state tiene al menos 3 partes y la estructura es la esperada
      if (stateParts.length >= 3 && stateParts[0] === 'origin' && stateParts[1] === 'settings') {
        empresaId = stateParts[2]
        console.log('Empresa ID recuperado del state:', empresaId)
      }
    }
    
    console.log('Callback de Mercado Pago recibido:')
    console.log('- URL completa:', req.url)
    console.log('- Código:', code)
    console.log('- Error:', error)
    console.log('- Descripción del error:', error_description)
    console.log('- State:', state)
    console.log('- ID Empresa (cookie):', cookieStore.get('mp_empresaId')?.value)
    console.log('- ID Empresa (extraído del state):', empresaId)
    console.log('- País (cookie):', country)
    
    if (error) {
      console.error('Error en OAuth Mercado Pago:', error, error_description)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?error=auth_failed&details=${encodeURIComponent(error_description || '')}`)
    }
    
    if (!code || !empresaId) {
      console.error('Falta código o ID de empresa:', { code, empresaId })
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?error=missing_params`)
    }
    
    // Verificar nuevamente si la empresa es de Argentina o México
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('country')
      .eq('id', empresaId)
      .single()
      
    if (empresaError || !empresa) {
      console.error('Error al obtener información de la empresa:', empresaError)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?error=invalid_company`)
    }
    
    // Si no tenemos el país de la cookie, usamos el que acabamos de obtener
    const countryToUse = country || empresa.country
    
    // Validar país nuevamente como medida de seguridad
    if (!mercadoPagoConnectionService.isCountrySupported(countryToUse)) {
      console.error('País no soportado para Mercado Pago:', countryToUse)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?error=country_not_supported`)
    }
    
    // Recuperar las variables de entorno necesarias
    const clientId = process.env.MERCADOPAGO_CLIENT_ID
    const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET
    
    if (!clientId || !clientSecret) {
      console.error('Faltan variables de entorno para Mercado Pago')
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?error=configuration_error`)
    }
    
    // URL de redirección para el intercambio de tokens
    // Priorizar URL de ngrok si está disponible, después NEXT_PUBLIC_APP_URL, y finalmente localhost
    const ngrokUrl = process.env.NEXT_PUBLIC_NGROK_URL
    const configuredUrl = process.env.NEXT_PUBLIC_APP_URL
    
    // IMPORTANTE: Para desarrollo local, forzar el uso de la URL de ngrok si existe
    let baseUrl = ngrokUrl || configuredUrl || 'http://localhost:3000'
    
    // Si estamos en desarrollo local y hay una URL de ngrok configurada, usarla siempre
    if (process.env.NODE_ENV !== 'production' && ngrokUrl) {
      console.log('Usando URL de ngrok para desarrollo local')
      baseUrl = ngrokUrl
    }
    
    // Determinar la URL base para redirección de vuelta a la aplicación
    // En desarrollo local, redirigir al localhost para ver la aplicación
    const returnBaseUrl = process.env.NODE_ENV !== 'production' 
      ? 'http://localhost:3000'
      : configuredUrl
    
    const redirectUri = `${baseUrl}/api/mercadopago/callback`
    
    console.log('Configuración para intercambio de tokens:')
    console.log('- URL de redirección:', redirectUri)
    console.log('- URL de ngrok disponible:', !!ngrokUrl)
    console.log('- URL para retorno a aplicación:', returnBaseUrl)
    console.log('- Client ID presente:', !!clientId)
    console.log('- Client Secret presente:', !!clientSecret)
    
    // Intercambiar código por token de acceso
    console.log('Realizando intercambio de código por token...')
    const tokenResponse = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      })
    })
    
    console.log('Respuesta del servidor de tokens - Status:', tokenResponse.status)
    
    if (!tokenResponse.ok) {
      const responseText = await tokenResponse.text()
      console.error('Error al obtener token:', responseText)
      return NextResponse.redirect(`${returnBaseUrl}/settings/billing?error=token_failed&details=${encodeURIComponent(responseText.substring(0, 100))}`)
    }
    
    const tokenData = await tokenResponse.json()
    console.log('Token obtenido exitosamente, expires_in:', tokenData.expires_in)
    
    // Obtener información del usuario de Mercado Pago
    console.log('Obteniendo información del usuario...')
    const userResponse = await fetch('https://api.mercadopago.com/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    })
    
    console.log('Respuesta de información de usuario - Status:', userResponse.status)
    
    if (!userResponse.ok) {
      const responseText = await userResponse.text()
      console.error('Error al obtener información del usuario:', responseText)
      return NextResponse.redirect(`${returnBaseUrl}/settings/billing?error=user_info_failed&details=${encodeURIComponent(responseText.substring(0, 100))}`)
    }
    
    const userData = await userResponse.json()
    console.log('Información de usuario obtenida, id:', userData.id, 'email:', userData.email)
    
    // Guardar la conexión en la base de datos
    console.log('Guardando conexión en la base de datos...')
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
      return NextResponse.redirect(`${returnBaseUrl}/settings/billing?error=db_failed`)
    }
    
    console.log('Conexión guardada exitosamente')
    
    // Limpiar las cookies después de usarlas
    cookieStore.delete('mp_empresaId')
    cookieStore.delete('mp_country')
    
    // Redirigir al usuario de vuelta a la página de configuración
    return NextResponse.redirect(`${returnBaseUrl}/settings/billing?success=true`)
  } catch (error) {
    console.error('Error en callback de Mercado Pago:', error)
    
    // Determinar la URL base para redirección
    const returnBaseUrl = process.env.NODE_ENV !== 'production' 
      ? 'http://localhost:3000'
      : process.env.NEXT_PUBLIC_APP_URL
    
    return NextResponse.redirect(`${returnBaseUrl}/settings/billing?error=general`)
  }
}
