import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const action = requestUrl.searchParams.get('action') || 'login'
  
  try {
    // Crear cliente de Supabase con cookies
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })
    
    // Obtener la sesión actual
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('No se encontró una sesión activa')
    }

    // Determinar la URL de redirección
    // Por defecto, redirigir a la página principal de clases
    let redirectTo = '/clases'
    
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
    
    // En caso de error, redirigir a la página de login
    return NextResponse.redirect(
      new URL('/clases/login', requestUrl.origin)
    )
  }
}
