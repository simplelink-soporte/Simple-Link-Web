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
  '/admin/register',
  '/admin/auth/callback',
  '/admin/auth/error',
  '/clases/login',
  '/clases/registro',
  '/clases/auth/callback',
  '/reservas/login',
  '/reservas/auth/callback'
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
  // Verificación más precisa para rutas de callback
  if (pathname === '/auth/callback' || 
      pathname === '/admin/auth/callback' || 
      pathname === '/clases/auth/callback' ||
      pathname === '/reservas/auth/callback') {
    return true
  }
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
  const res = NextResponse.next()

  // Log para depuración
  console.log('Middleware ejecutándose en:', {
    pathname,
    url: req.url,
    host: req.headers.get('host')
  })

  // Permitir acceso a rutas públicas y assets estáticos
  if (isStaticAsset(pathname) || isPublicRoute(pathname)) {
    console.log('Middleware: Ruta pública o asset estático, permitiendo acceso')
    return res
  }

  try {
    // Crear cliente de Supabase con cookies actualizadas
    const supabase = createMiddlewareClient<Database>({ req, res })
    
    // IMPORTANTE: Usar getUser en lugar de getSession para validar la sesión
    // getUser hace una llamada al servidor de Supabase para validar el token
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Middleware - Error al obtener usuario:', error.message)
      throw error
    }

    // Verificar si hay un token de acceso en las cookies
    const hasAccessToken = req.cookies.has('sb-access-token') || 
                          req.cookies.has('supabase-auth-token')

    console.log('Middleware - Verificación de usuario:', {
      hasUser: !!user,
      hasAccessToken,
      pathname,
      userId: user?.id,
      host: req.headers.get('host')
    })

    // Verificar acceso según la ruta
    if (pathname.startsWith('/admin')) {
      // Si es la ruta de callback, permitir siempre
      if (pathname === '/admin/auth/callback') {
        console.log('Middleware: Permitiendo acceso a callback de autenticación')
        return res
      }
      
      // Si no hay usuario pero hay token, podría ser un problema de sincronización
      // Permitir el acceso y dejar que la aplicación maneje la redirección si es necesario
      if (!user && hasAccessToken && (pathname.startsWith('/admin/dashboard'))) {
        console.log('Middleware: Token presente pero usuario no validado, permitiendo acceso condicional')
        return res
      }
      
      if (!user) {
        console.log('Middleware: No hay usuario, redirigiendo a login admin')
        const returnUrl = encodeURIComponent(pathname)
        const host = req.headers.get('host') || ''
        
        // Determinar si estamos en un subdominio específico
        const isAppSubdomain = host.startsWith('app.')
        const isWwwSubdomain = host.startsWith('www.')
        
        // Construir la URL de redirección manteniendo el mismo dominio/subdominio
        const loginUrl = new URL(`/admin/login?returnUrl=${returnUrl}`, req.url)
        
        return NextResponse.redirect(loginUrl)
      }
      
      console.log('Middleware: Usuario autenticado con acceso a admin')
      return res
    }

    // Manejo específico para rutas de clases
    if (pathname.startsWith('/clases/')) {
      // Excluir rutas públicas de clases de manera más explícita
      if (['/clases/login', '/clases/registro'].includes(pathname)) {
        return res
      }

      if (!user) {
        console.log('Middleware: No hay usuario, redirigiendo a login de clases')
        const returnUrl = encodeURIComponent(pathname)
        console.log('Middleware: returnUrl generado:', returnUrl)
        
        // Crear URL completa con el returnUrl
        const url = new URL('/clases/login', req.url)
        url.searchParams.set('returnUrl', returnUrl)
        
        console.log('Middleware: URL de redirección completa:', url.toString())
        return NextResponse.redirect(url)
      }
    }

    // Manejo específico para rutas de reservas
    if (pathname.startsWith('/reservas/')) {
      if (!user) {
        console.log('Middleware: No hay usuario, redirigiendo a login de reservas')
        const returnUrl = encodeURIComponent(pathname)
        const loginUrl = new URL(`/reservas/login?returnUrl=${returnUrl}`, req.url)
        return NextResponse.redirect(loginUrl)
      }
    }

    // Si llegamos aquí, el usuario está autenticado y tiene acceso a la ruta
    return res
  } catch (error) {
    console.error('Middleware - Error:', error)
    
    // En caso de error, redirigir a la página de login correspondiente
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/admin/login', req.url))
    } else if (pathname.startsWith('/clases')) {
      const returnUrl = encodeURIComponent(pathname)
      const url = new URL('/clases/login', req.url)
      url.searchParams.set('returnUrl', returnUrl)
      return NextResponse.redirect(url)
    } else if (pathname.startsWith('/reservas')) {
      const returnUrl = encodeURIComponent(pathname)
      const url = new URL('/reservas/login', req.url)
      url.searchParams.set('returnUrl', returnUrl)
      return NextResponse.redirect(url)
    }
    
    // Para otras rutas, redirigir a la página principal
    return NextResponse.redirect(new URL('/', req.url))
  }
}