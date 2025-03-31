import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const clientType = requestUrl.searchParams.get('client_type') || 'admin'
  const action = requestUrl.searchParams.get('action') || 'login'
  
  // Si no hay código, redirigir a la página de error
  if (!code) {
    return NextResponse.redirect(
      new URL(`/${clientType === 'admin' ? 'admin/login' : 'clases/login'}`, requestUrl.origin)
    )
  }

  try {
    // Crear cliente de Supabase con cookies
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })
    
    // Intercambiar el código por una sesión
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      throw error
    }

    // Determinar la URL de redirección según el tipo de cliente
    let redirectTo = '/'
    
    if (clientType === 'admin') {
      redirectTo = `/admin/auth/callback?action=${action}`
    } else if (clientType === 'classes') {
      redirectTo = `/clases/auth/callback?action=${action}`
    }
    
    // Asegurar que la URL de redirección use el mismo origen que la solicitud
    const fullRedirectUrl = new URL(redirectTo, requestUrl.origin)
    
    // Redirigir al usuario a la página de callback correspondiente
    return NextResponse.redirect(fullRedirectUrl)
  } catch (error) {
    // En caso de error, redirigir a la página de login correspondiente
    return NextResponse.redirect(
      new URL(`/${clientType === 'admin' ? 'admin/login' : 'clases/login'}`, requestUrl.origin)
    )
  }
}