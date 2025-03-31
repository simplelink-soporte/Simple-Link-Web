import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/supabase'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const action = requestUrl.searchParams.get('action')
  const clientType = requestUrl.searchParams.get('client_type')
  
  // Log para depuración
  console.log('Callback de autenticación para reservas recibido:', {
    code: !!code, // Solo logueamos si existe el código, no su valor por seguridad
    action,
    clientType,
    url: request.url
  })

  // Verificar si es un error de OAuth (por ejemplo, si el usuario canceló)
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  
  if (error) {
    console.error('Error OAuth en callback de reservas:', error, errorDescription)
    // Redirigir a la página de login con el error
    return NextResponse.redirect(
      new URL(`/reservas/login?error=${error}&error_description=${encodeURIComponent(errorDescription || '')}`, requestUrl.origin)
    )
  }

  // Si no hay código, es un error
  if (!code) {
    console.error('No se recibió código de autenticación en callback de reservas')
    return NextResponse.redirect(
      new URL('/reservas/login?error=no_code', requestUrl.origin)
    )
  }

  try {
    // Crear cliente de Supabase
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Intercambiar el código por una sesión
    await supabase.auth.exchangeCodeForSession(code)
    
    // Verificar que la sesión se haya establecido correctamente
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('No se pudo establecer la sesión después de la autenticación')
    }
    
    console.log('Sesión establecida correctamente en callback de reservas')
    
    // Redirigir a la página de login con indicador de éxito
    return NextResponse.redirect(
      new URL(`/reservas/login?auth_success=true&action=${action || 'login'}`, requestUrl.origin)
    )
  } catch (error: any) {
    console.error('Error en callback de autenticación de reservas:', error.message)
    
    // Redirigir a la página de login con el error
    return NextResponse.redirect(
      new URL(`/reservas/login?error=server_error&error_description=${encodeURIComponent(error.message)}`, requestUrl.origin)
    )
  }
}
