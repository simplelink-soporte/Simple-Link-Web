import { type CookieOptions } from '@/types/supabase-auth'

export const AUTH_CONFIG = {
  admin: {
    routes: {
      afterSignIn: '/admin/dashboard/bookings/reservations',
      afterSignOut: '/admin/login',
      signIn: '/admin/login',
      signUp: '/admin/register',
      authCallback: '/admin/auth/callback',
      verifyRequest: '/admin/verify-request',
      error: '/admin/error',
      unauthorized: '/admin/unauthorized',
      restrictedPaths: [
        '/admin/dashboard/bookings/reservations',
        '/admin/dashboard',
        '/admin/settings'
      ]
    },
    cookies: {
      name: 'sb-auth-token', // Nombre unificado para todas las cookies
      options: {
        path: '/',  // Path global para que funcione en todas las rutas
        domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: 60 * 60 * 24 * 7, // 7 días
        httpOnly: true
      }
    },
    storage: {
      prefix: 'sl-admin',
      keys: {
        session: 'sl-session', // Clave unificada
        user: 'sl-user', // Clave unificada
        organization: 'sl-organization', // Clave unificada
        currentBranch: 'currentBranchId',
        empresa: {
          id: 'current_empresa_id',
          data: 'empresaData',
          legacyId: 'empresaId' // Para mantener compatibilidad
        }
      }
    }
  },
  client: {
    routes: {
      signIn: '/clases/login',
      signUp: '/clases/registro',
      signOut: '/clases/logout',
      callback: '/clases/auth/callback',
      unauthorized: '/unauthorized',
      afterSignIn: '/clases',
      protected: ['/clases/*']
    },
    cookies: {
      name: 'sb-auth-token', // Mismo nombre que admin para unificar
      options: {
        path: '/', // Path global
        domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: 60 * 60 * 24 * 7, // 7 días
        httpOnly: true
      }
    },
    storage: {
      prefix: 'sl-client',
      keys: {
        session: 'sl-session', // Clave unificada
        user: 'sl-user', // Clave unificada
        organization: 'sl-organization' // Clave unificada
      }
    }
  }
} as const

export type AuthConfig = typeof AUTH_CONFIG

export type ClientType = keyof typeof AUTH_CONFIG

export function getAuthConfig(type: ClientType) {
  return AUTH_CONFIG[type]
}

// Rutas protegidas por tipo de cliente
export const PROTECTED_ROUTES = {
  admin: ['/admin/dashboard', '/admin/settings', '/admin/users'],
  client: ['/clases/*']
} as const

// Rutas públicas
export const PUBLIC_ROUTES = [
  '/',
  '/admin/login',
  '/admin/register',
  '/admin/auth/callback',
  '/clases/login',
  '/clases/registro',
  '/clases/auth/callback',
  '/unauthorized'
] as const