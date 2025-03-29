import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/supabase'
import { AUTH_CONFIG } from '@/config/auth.config'
import type { ClientType } from '@/config/auth.config'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const clientType = (requestUrl.searchParams.get('client_type') || 'client') as ClientType
  const config = AUTH_CONFIG[clientType]

  if (code) {
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
    await supabase.auth.exchangeCodeForSession(code)

    // Verificar el rol del usuario según el contexto
    const { data: { user } } = await supabase.auth.getUser()
    const userRole = user?.app_metadata?.role

    // Si el rol no coincide con el contexto, redirigir a unauthorized
    if (clientType === 'admin' && userRole !== 'admin' && userRole !== 'staff') {
      return NextResponse.redirect(new URL(config.routes.unauthorized, requestUrl.origin))
    }

    if (clientType === 'client' && userRole !== 'client') {
      return NextResponse.redirect(new URL(config.routes.unauthorized, requestUrl.origin))
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL(config.routes.afterSignIn, requestUrl.origin))
} 