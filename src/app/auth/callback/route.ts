import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/supabase'
import { AUTH_CONFIG } from '@/config/auth.config'
import type { ClientType } from '@/config/auth.config'

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const clientType = (requestUrl.searchParams.get('client_type') || 'client') as ClientType
    const config = AUTH_CONFIG[clientType]

    // Si no hay código, redirigir al login
    if (!code) {
      console.error('No se encontró código de autorización')
      return NextResponse.redirect(new URL(config.routes.signIn, requestUrl.origin))
    }

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient<Database>({ 
      cookies: () => cookieStore
    }, {
      cookieOptions: {
        name: config.cookies.name,
        ...config.cookies.options
      }
    })
    
    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error || !data.session) {
      console.error('Error al intercambiar código por sesión:', error)
      return NextResponse.redirect(new URL(`${config.routes.signIn}?error=callback`, requestUrl.origin))
    }

    // Asegurarnos de que la sesión se guarde correctamente
    await new Promise(resolve => setTimeout(resolve, 500))

    // URL to redirect to after sign in process completes
    return NextResponse.redirect(new URL(config.routes.afterSignIn, requestUrl.origin))
  } catch (error) {
    console.error('Error en el callback de autenticación:', error)
    return NextResponse.redirect(new URL('/admin/login?error=callback', request.url))
  }
}