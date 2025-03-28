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

    console.log('Middleware - Verificación de sesión:', {
      hasSession: !!session,
      pathname,
      userId: session?.user?.id
    })

    // Verificar acceso según la ruta
    if (pathname.startsWith('/admin')) {
      if (!session) {
        console.log('Middleware: No hay sesión, redirigiendo a login admin')
        return NextResponse.redirect(new URL('/admin/login?returnUrl=' + pathname, req.url))
      }
      return NextResponse.next()
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

      // Si el usuario está autenticado, permitir acceso
      console.log('Middleware: Usuario autenticado con acceso a clases')
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

      // Si el usuario está autenticado, permitir acceso
      console.log('Middleware: Usuario autenticado con acceso a reservas')
      return NextResponse.next()
    }

    if (!session) {
      console.log('Middleware: No hay sesión, redirigiendo a login')
      return NextResponse.redirect(new URL('/login?returnUrl=' + pathname, req.url))
    }

    return NextResponse.next()
  } catch (error) {
    console.error('Error en middleware:', error)
    return NextResponse.redirect(new URL('/error', req.url))
  }
}