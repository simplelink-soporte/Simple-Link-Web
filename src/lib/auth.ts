import { User } from '@supabase/supabase-js'

export interface AuthMetadata {
  role: string
  provider: string
  providers: string[]
  empresa_id?: string
}

export function getUserRole(user: User | null): string {
  if (!user) return 'client'
  return user.app_metadata?.role || 'client'
}

export function isAdmin(user: User | null): boolean {
  return getUserRole(user) === 'admin'
}

export function canAccessAdmin(user: User | null): boolean {
  return isAdmin(user)
}

export function canAccessClases(user: User | null): boolean {
  const role = getUserRole(user)
  return ['admin', 'client'].includes(role)
}

export function getAuthRedirectPath(user: User | null, returnUrl?: string | null): string {
  // Si hay un returnUrl válido, usarlo
  if (returnUrl && returnUrl.startsWith('/clases/') && returnUrl !== '/clases/login') {
    return returnUrl
  }

  // Si no hay returnUrl, usar rutas por defecto según rol
  const role = getUserRole(user)
  switch (role) {
    case 'admin':
      return '/admin/dashboard'
    case 'client':
      return '/clases/login' // Redirigir al login para obtener el returnUrl
    default:
      return '/'
  }
}

export function getMetadata(user: User | null): AuthMetadata {
  if (!user) {
    return {
      role: 'client',
      provider: 'email',
      providers: ['email']
    }
  }

  return {
    role: user.app_metadata?.role || 'client',
    provider: user.app_metadata?.provider || 'email',
    providers: user.app_metadata?.providers || ['email'],
    empresa_id: user.app_metadata?.empresa_id
  }
} 