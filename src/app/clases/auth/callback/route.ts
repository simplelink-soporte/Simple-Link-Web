import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code') || ''
  const action = requestUrl.searchParams.get('action') || 'login'
  const clientType = requestUrl.searchParams.get('client_type') || 'classes'
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  
  console.log('Callback de clases recibido con parámetros:', {
    code: code ? 'presente' : 'ausente',
    action,
    clientType,
    error,
    errorDescription,
    url: request.url
  })
  
  // Si hay un error, redirigir a la página de login con el error
  if (error) {
    console.error(`Error en autenticación OAuth: ${error}`, errorDescription)
    const loginUrl = new URL('/clases/login', requestUrl.origin)
    loginUrl.searchParams.set('error', error)
    if (errorDescription) {
      loginUrl.searchParams.set('error_description', errorDescription)
    }
    return NextResponse.redirect(loginUrl)
  }
  
  try {
    // Crear cliente de Supabase con cookies
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })
    
    // Importante: Procesar el código de autenticación
    if (code) {
      console.log('Procesando código de autenticación en callback de clases')
      await supabase.auth.exchangeCodeForSession(code)
    } else {
      console.warn('No se recibió código de autenticación en el callback')
    }
    
    // Obtener la sesión actual después de procesar el código
    const { data: { session } } = await supabase.auth.getSession()
    
    console.log('Estado de sesión después de procesar código:', {
      hasSession: !!session,
      userId: session?.user?.id
    })
    
    if (!session) {
      console.error('No se pudo establecer la sesión después de procesar el código')
      const loginUrl = new URL('/clases/login', requestUrl.origin)
      loginUrl.searchParams.set('error', 'session_not_established')
      return NextResponse.redirect(loginUrl)
    }
    
    // Asegurar que la URL de redirección use el mismo origen que la solicitud
    const fullRedirectUrl = new URL('/clases/login', requestUrl.origin)
    
    // Agregar un parámetro para indicar que la autenticación fue exitosa
    // y que debe verificar el localStorage para la redirección
    fullRedirectUrl.searchParams.set('auth_success', 'true')
    fullRedirectUrl.searchParams.set('action', action)
    
    // Agregar un timestamp como parámetro para evitar problemas de caché
    fullRedirectUrl.searchParams.set('timestamp', Date.now().toString())
    
    // Redirigir al usuario a la página de login que manejará la redirección final
    console.log('Redirigiendo desde callback de clases a:', fullRedirectUrl.toString())
    return NextResponse.redirect(fullRedirectUrl)
  } catch (error) {
    console.error('Error en callback de autenticación de clases:', error)
    
    // En caso de error, redirigir a la página de login con información del error
    const loginUrl = new URL('/clases/login', requestUrl.origin)
    loginUrl.searchParams.set('error', 'callback_error')
    return NextResponse.redirect(loginUrl)
  }
}
