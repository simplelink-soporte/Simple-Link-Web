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
    
    // Log para depuración
    console.log('Auth callback iniciado:', { 
      url: request.url,
      origin: requestUrl.origin,
      clientType,
      hasCode: !!code
    })

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

    // Log para depuración
    console.log('Sesión creada exitosamente:', { 
      userId: data.session.user.id,
      redirectTo: config.routes.afterSignIn
    })

    // Asegurarnos de que la sesión se guarde correctamente
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Determinar la URL de redirección basada en el origen de la solicitud
    let redirectUrl: URL;
    
    // Si estamos en el subdominio app, usar la configuración correspondiente
    if (requestUrl.hostname.startsWith('app.')) {
      redirectUrl = new URL(config.routes.afterSignIn, requestUrl.origin)
    } 
    // Si estamos en www o el dominio principal, redirigir según el tipo de cliente
    else {
      // Para la landing page, redirigir al subdominio app con la ruta correcta
      const appDomain = `https://app.${requestUrl.hostname.replace('www.', '')}`
      redirectUrl = new URL(config.routes.afterSignIn, appDomain)
    }

    console.log('Redirigiendo a:', redirectUrl.toString())
    
    // URL to redirect to after sign in process completes
    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('Error en el callback de autenticación:', error)
    // Redirigir a la página de login con un mensaje de error
    return NextResponse.redirect(new URL('/admin/login?error=callback', request.url))
  }
}