import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'

// Rutas públicas que no requieren autenticación
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/auth/callback',
  '/unauthorized',
  '/admin/login',
  '/admin/auth/callback',
  '/admin/auth/error',
  '/clases/login',
  '/clases/registro',
  '/reservas/login'
] as const

// Rutas de assets estáticos
const STATIC_ROUTES = [
  '/_next',
  '/static',
  '/favicon.ico'
] as const

// Funciones auxiliares
function isStaticAsset(pathname: string): boolean {
  return STATIC_ROUTES.some(route => pathname.startsWith(route))
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname === route)
}

// Función para obtener empresa_id desde diferentes fuentes
async function getEmpresaId(req: NextRequest, session: any, supabase: any) {
  // 1. Intentar obtener de los metadatos del usuario
  const empresaIdFromMeta = session?.user?.app_metadata?.empresa_id || session?.user?.user_metadata?.empresa_id
  if (empresaIdFromMeta) {
    console.log('Middleware: Empresa ID encontrada en metadatos:', empresaIdFromMeta)
    return empresaIdFromMeta
  }

  // 2. Intentar obtener de las cookies
  const empresaIdFromCookie = req.cookies.get('empresa_id')?.value
  if (empresaIdFromCookie) {
    console.log('Middleware: Empresa ID encontrada en cookie:', empresaIdFromCookie)
    return empresaIdFromCookie
  }

  // 3. Si no hay cookie, buscar en la base de datos
  console.log('Middleware: Buscando empresa en base de datos para usuario:', session.user.id)
  
  // Primero buscar en empresas directamente
  const { data: empresaData } = await supabase
    .from('empresas')
    .select('id')
    .eq('auth_user_id', session.user.id)
    .single()

  if (empresaData?.id) {
    console.log('Middleware: Empresa encontrada directamente:', empresaData.id)
    await persistEmpresaId(empresaData.id, session, supabase)
    return empresaData.id
  }

  // Si no se encuentra, buscar en vinculaciones
  const { data: vinculacionData } = await supabase
    .from('vinculaciones')
    .select('empresa_id')
    .eq('user_id', session.user.id)
    .eq('estado', 'activo')
    .single()

  if (vinculacionData?.empresa_id) {
    console.log('Middleware: Empresa encontrada en vinculaciones:', vinculacionData.empresa_id)
    await persistEmpresaId(vinculacionData.empresa_id, session, supabase)
    return vinculacionData.empresa_id
  }

  return null
}

// Función para persistir el empresa_id
async function persistEmpresaId(empresaId: string, session: any, supabase: any) {
  // 1. Actualizar metadatos del usuario
  await supabase.auth.updateUser({
    data: { empresa_id: empresaId }
  })

  // 2. Devolver la respuesta con la cookie actualizada
  const response = NextResponse.next()
  response.cookies.set('empresa_id', empresaId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 // 30 días
  })
  
  return response
}

// Middleware principal
export const config = {
  matcher: [
    '/admin/:path*',
    '/clases/:path*',
    '/reservas/:path*',
    '/api/:path*',
    '/f/:path*'
  ]
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Permitir acceso a rutas públicas
  if (isStaticAsset(pathname) || isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  try {
    const supabase = createMiddlewareClient<Database>({ req, res: NextResponse.next() })
    const { data: { session } } = await supabase.auth.getSession()

    const userRole = session?.user?.app_metadata?.role || 'client'

    console.log('Middleware - Verificación de sesión:', {
      hasSession: !!session,
      userRole,
      pathname,
      userId: session?.user?.id
    })

    // Verificar acceso según el rol y la ruta
    if (pathname.startsWith('/admin')) {
      if (!session) {
        console.log('Middleware: No hay sesión, redirigiendo a login admin')
        return NextResponse.redirect(new URL('/admin/login?returnUrl=' + pathname, req.url))
      }

      // Para rutas admin, verificar específicamente el rol de administrador
      if (userRole !== 'admin' && userRole !== 'superadmin') {
        console.log('Middleware: Usuario sin rol admin')
        return NextResponse.redirect(new URL('/unauthorized', req.url))
      }
    }

    // Manejo específico para rutas de clases
    if (pathname.startsWith('/clases/')) {
      // Excluir rutas públicas de clases de manera más explícita
      if (['/clases/login', '/clases/registro'].includes(pathname)) {
        return NextResponse.next()
      }

      if (!session) {
        console.log('Middleware: No hay sesión, redirigiendo a login de clases')
        const returnUrl = encodeURIComponent(pathname)
        const loginUrl = new URL(`/clases/login?returnUrl=${returnUrl}`, req.url)
        return NextResponse.redirect(loginUrl)
      }

      // Para rutas de clases, permitir tanto clientes como administradores
      const allowedRoles = ['client', 'admin', 'superadmin']
      if (!allowedRoles.includes(userRole)) {
        console.log('Middleware: Usuario sin acceso a clases, rol:', userRole)
        return NextResponse.redirect(new URL('/unauthorized', req.url))
      }

      // Si el usuario está autenticado y tiene permisos, permitir acceso
      console.log('Middleware: Usuario autenticado con acceso a clases, rol:', userRole)
      return NextResponse.next()
    }

    // Manejo específico para rutas de reservas
    if (pathname.startsWith('/reservas/')) {
      // Excluir rutas públicas de reservas
      if (['/reservas/login'].includes(pathname)) {
        return NextResponse.next()
      }

      if (!session) {
        console.log('Middleware: No hay sesión, redirigiendo a login de reservas')
        const returnUrl = encodeURIComponent(pathname)
        const loginUrl = new URL(`/reservas/login?returnUrl=${returnUrl}`, req.url)
        return NextResponse.redirect(loginUrl)
      }

      // Para rutas de reservas, permitir tanto clientes como administradores
      const allowedRoles = ['client', 'admin', 'superadmin']
      if (!allowedRoles.includes(userRole)) {
        console.log('Middleware: Usuario sin acceso a reservas, rol:', userRole)
        return NextResponse.redirect(new URL('/unauthorized', req.url))
      }

      // Si el usuario está autenticado y tiene permisos, permitir acceso
      console.log('Middleware: Usuario autenticado con acceso a reservas, rol:', userRole)
      return NextResponse.next()
    }

    // Rutas protegidas que requieren autenticación
    const protectedPaths = ['/clases', '/f/']
    const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))

    if (isProtectedPath && !session) {
      // Guardar la URL original para redireccionar después del login
      const redirectUrl = new URL('/login', req.url)
      redirectUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    return NextResponse.next()
  } catch (error) {
    console.error('Error en middleware:', error)
    return NextResponse.redirect(new URL('/error', req.url))
  }
} 