import { SupabaseClient } from '@supabase/supabase-js'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import type { User, Session } from '@supabase/supabase-js'
import type { ClientType } from '@/config/auth.config'

export type SupabaseAuthClient = ReturnType<typeof createClientComponentClient<Database>>

export type ClientType = 'admin' | 'client'

// Tipos base
export interface BaseUser extends User {
  app_metadata: {
    role?: 'admin' | 'client' | 'staff'
    provider?: string
  }
  user_metadata: {
    name?: string
    full_name?: string
    avatar_url?: string
    nombre?: string
    telefono?: string
    ciudad?: string
  }
}

export interface BaseAuthSession extends Omit<Session, 'user'> {
  user: BaseUser
}

export interface BaseAuthError {
  message: string
  status?: number
}

// Tipos específicos para admin
export interface AdminUser extends BaseUser {
  app_metadata: {
    role: 'admin' | 'staff'
    provider?: string
  }
}

export interface AdminAuthSession extends Omit<Session, 'user'> {
  user: AdminUser
}

// Tipos específicos para cliente
export interface ClientUser extends BaseUser {
  app_metadata: {
    role: 'client'
    provider?: string
  }
  user_metadata: {
    name?: string
    full_name?: string
    avatar_url?: string
    nombre?: string
    telefono?: string
    ciudad?: string
  }
}

export interface ClientAuthSession extends Omit<Session, 'user'> {
  user: ClientUser
}

// Configuraciones
export interface AuthConfig {
  storageKey: string
  cookieOptions: {
    name: string
    path: string
    sameSite: 'lax' | 'strict' | 'none'
    secure: boolean
  }
  routes: {
    signIn: string
    signOut: string
    unauthorized: string
    callback: string
  }
}

export interface StorageConfig {
  prefix: string
  keys: {
    session: string
    user: string
    empresa: string
  }
}

export interface ClientOptions {
  auth: {
    persistSession: boolean
    autoRefreshToken: boolean
    detectSessionInUrl: boolean
    storageKey: string
    cookieOptions: AuthConfig['cookieOptions']
  }
  global: {
    headers: Record<string, string>
  }
}

export interface AuthError {
  message: string
  status?: number
  code?: string
} 