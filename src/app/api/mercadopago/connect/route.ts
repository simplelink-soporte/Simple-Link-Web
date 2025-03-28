import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'
import { mercadoPagoConnectionService } from '@/services/mercadoPagoConnectionService'

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
      console.error('Error al obtener información de la empresa:', empresaError)
      return NextResponse.json({ error: 'No se pudo obtener información de la empresa' }, { status: 400 })
    }
    
    // Validar país
    if (!mercadoPagoConnectionService.isCountrySupported(empresa.country)) {
      console.error('País no soportado para Mercado Pago:', empresa.country)
      return NextResponse.json({ 
        error: 'Mercado Pago solo está disponible para empresas de Argentina o México' 
      }, { status: 403 })
    }
    
    // Obtener cookieStore
    const cookieStore = await cookies()

    // Guardar empresa_id en una cookie segura para recuperarlo en el callback
    cookieStore.set('mp_empresaId', empresaId, { 
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600, // 1 hora
      path: '/',
    })
    
    // Guardar también el país para saber qué endpoint usar en el callback
    cookieStore.set('mp_country', empresa.country, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600,
      path: '/',
    })
    
    // URL de redirección a Mercado Pago OAuth
    // Priorizar URL de ngrok si está disponible, después NEXT_PUBLIC_APP_URL, y finalmente localhost
    const ngrokUrl = process.env.NEXT_PUBLIC_NGROK_URL
    const configuredUrl = process.env.NEXT_PUBLIC_APP_URL
    
    // IMPORTANTE: Para desarrollo local, forzar el uso de la URL de ngrok si existe
    let baseUrl = ngrokUrl || configuredUrl || 'http://localhost:3000'
    
    // Para depuración, extraer y mostrar las variables de entorno de process.env
    console.log('--- Variables de entorno para OAuth ---')
    console.log('NEXT_PUBLIC_NGROK_URL:', process.env.NEXT_PUBLIC_NGROK_URL)
    console.log('NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL)
    console.log('NODE_ENV:', process.env.NODE_ENV)
    
    // Si estamos en desarrollo local y hay una URL de ngrok configurada, usarla siempre
    if (process.env.NODE_ENV !== 'production' && ngrokUrl) {
      console.log('Usando URL de ngrok para desarrollo local')
      baseUrl = ngrokUrl
    }
    
    const redirectUri = `${baseUrl}/api/mercadopago/callback`
    
    console.log('URL de redirección configurada:', redirectUri)
    console.log('Variables de entorno - NEXT_PUBLIC_NGROK_URL:', process.env.NEXT_PUBLIC_NGROK_URL)
    console.log('Variables de entorno - NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL)
    console.log('Variables de entorno - CLIENT_ID:', process.env.MERCADOPAGO_CLIENT_ID)
    
    // Determinar la URL base de autorización según el país
    let authBaseUrl = 'https://auth.mercadopago.com.ar/authorization'
    if (empresa.country === 'Mexico' || empresa.country === 'México') {
      authBaseUrl = 'https://auth.mercadopago.com.mx/authorization'
    }
    
    const authUrl = new URL(authBaseUrl)
    
    // Agregar parámetros requeridos para OAuth
    authUrl.searchParams.append('client_id', process.env.MERCADOPAGO_CLIENT_ID || '')
    authUrl.searchParams.append('response_type', 'code')
    authUrl.searchParams.append('platform_id', 'mp')
    authUrl.searchParams.append('redirect_uri', redirectUri)
    
    // Agregar permisos (scopes) necesarios
    // Mercado Pago requiere que especifiques qué permisos necesita tu aplicación
    authUrl.searchParams.append('scope', 'read write offline_access')
    
    // Parámetros adicionales para mejorar la experiencia del usuario
    authUrl.searchParams.append('state', `origin:settings:${empresaId}`)
    
    console.log('URL de autorización Mercado Pago:', authUrl.toString())
    
    return NextResponse.json({ url: authUrl.toString() })
  } catch (error) {
    console.error('Error en API de conexión a Mercado Pago:', error)
    return NextResponse.json({ error: 'Error al iniciar conexión' }, { status: 500 })
  }
}
