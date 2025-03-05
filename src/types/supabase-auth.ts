import type { Database } from './supabase'
import type { SupabaseClient, User } from '@supabase/supabase-js'

export type SupabaseAuthClient = SupabaseClient<Database>

export type ClientType = 'admin' | 'client'

// Tipos base para configuración de cookies
export interface CookieOptions {
  name: string
  path?: string
  sameSite: 'lax' | 'strict' | 'none'
  secure: boolean
  domain?: string
}

// Configuración específica por tipo de cliente
export interface ClientConfig {
  storageKey: string
  cookieOptions: CookieOptions
}

// Opciones de autenticación para Supabase
export interface SupabaseAuthOptions {
  auth: {
    storageKey: string
    cookieOptions: CookieOptions
    persistSession: boolean
    detectSessionInUrl: boolean
    autoRefreshToken: boolean
  }
  global: {
    headers: Record<string, string>
  }
}

// Tipos para usuarios
export interface BaseUser extends User {
  app_metadata: {
    provider?: string
    [key: string]: any
  }
  user_metadata: {
    name?: string
    full_name?: string
    avatar_url?: string
    [key: string]: any
  }
}

// Usuario Administrador
export interface AdminUser extends BaseUser {
  app_metadata: {
    role: 'admin' | 'staff'
    provider?: string
  }
  user_metadata: {
    name?: string
    full_name?: string
    avatar_url?: string
  }
}

// Usuario Cliente
export interface ClientUser extends BaseUser {
  app_metadata: {
    role: 'client'
    provider?: string
  }
  user_metadata: {
    nombre?: string
    telefono?: string
    ciudad?: string
    [key: string]: any
  }
}

// Tipos para sesiones
export interface BaseAuthSession {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at: number
  provider_token?: string
  provider_refresh_token?: string
}

export interface AdminAuthSession extends BaseAuthSession {
  user: AdminUser
}

export interface ClientAuthSession extends BaseAuthSession {
  user: ClientUser
}

// Tipos para errores
export interface AuthError {
  message: string
  status?: number
  code?: string
}

// Tipos para respuestas de autenticación
export interface AuthResponse<T extends BaseUser = BaseUser> {
  data: {
    user: T | null
    session: BaseAuthSession | null
  }
  error: AuthError | null
} 