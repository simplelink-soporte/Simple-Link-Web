"use client"

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'
import type { AuthError, AdminUser, ClientUser, BaseAuthSession } from '@/types/supabase-auth'
import { AUTH_CONFIG } from '@/config/auth.config'
import { useAppStore } from '@/store/appStore'
import { clearAllStorage } from '@/lib/storage-utils'

export interface AuthUserMetadata {
  name?: string
  avatar_url?: string
  empresa_id?: string
  provider?: string
  providers?: string[]
  [key: string]: any
}

interface AuthUser {
  id: string
  email: string
  role: 'admin' | 'staff' | 'client'
  metadata: AuthUserMetadata
  app_metadata: {
    role: 'admin' | 'staff'
    provider?: string
  }
}

interface AuthSession {
  user: AuthUser
  access_token: string
  refresh_token: string
  expires_at: number
}

interface AuthContextType {
  user: AuthUser | null
  session: AuthSession | null
  isLoading: boolean
  error: AuthError | null
  signIn: (credentials: { email: string; password: string }) => Promise<{ user: AuthUser; session: AuthSession } | null>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const BROADCAST_EVENTS = {
  SESSION_UPDATED: 'SESSION_UPDATED',
  SESSION_CLEARED: 'SESSION_CLEARED',
  TAB_INITIALIZED: 'TAB_INITIALIZED',
  TAB_CLOSED: 'TAB_CLOSED'
} as const

const AUTH_SESSION_CHECK_INTERVAL = 1000 * 60 * 5 // 5 minutos
const SESSION_CHECK_KEY = 'last_session_check'

// Función para verificar si necesitamos comprobar la sesión
function shouldCheckSession(): boolean {
  if (typeof window === 'undefined') return true
  
  const storedSession = localStorage.getItem(AUTH_CONFIG.admin.storage.keys.session)
  
  // Solo verificar si no hay sesión almacenada
  return !storedSession
}

// Función para actualizar el timestamp de la última verificación
function updateLastSessionCheck() {
  localStorage.setItem(SESSION_CHECK_KEY, Date.now().toString())
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<AuthError | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const router = useRouter()
  const supabase = createSupabaseClient()
  
  // Referencias para el canal y el ID de pestaña
  const authChannelRef = useRef<BroadcastChannel | null>(null)
  const tabIdRef = useRef<string>(Math.random().toString(36).slice(2))

  // Función para obtener o crear el canal de manera segura
  const getAuthChannel = useCallback(() => {
    if (typeof window === 'undefined') return null
    
    try {
      if (!authChannelRef.current) {
        authChannelRef.current = new BroadcastChannel('auth_channel')
      }
      return authChannelRef.current
    } catch (error) {
      console.error('Error al crear BroadcastChannel:', error)
      return null
    }
  }, [])

  // Función para enviar mensajes de manera segura
  const sendMessage = useCallback((message: any) => {
    try {
      const channel = getAuthChannel()
      if (channel) {
        // Verificar si el canal está disponible antes de enviar
        if (!channel.dispatchEvent(new Event('test'))) {
          console.warn('Canal no disponible')
          return
        }
        channel.postMessage(message)
      }
    } catch (error) {
      console.error('Error al enviar mensaje:', error)
    }
  }, [getAuthChannel])

  // Función para persistir la sesión
  const persistSession = useCallback((authSession: AuthSession) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(AUTH_CONFIG.admin.storage.keys.session, JSON.stringify(authSession))
        sendMessage({ 
          type: BROADCAST_EVENTS.SESSION_UPDATED, 
          session: authSession,
          tabId: tabIdRef.current
        })
      } catch (error) {
        console.error('Error al persistir sesión:', error)
      }
    }
  }, [sendMessage])

  // Función para limpiar la sesión
  const clearSession = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(AUTH_CONFIG.admin.storage.keys.session)
        sendMessage({ 
          type: BROADCAST_EVENTS.SESSION_CLEARED,
          tabId: tabIdRef.current
        })
      } catch (error) {
        console.error('Error al limpiar sesión:', error)
      }
    }
  }, [sendMessage])

  // Definir signOut antes del useEffect que lo usa
  const signOut = useCallback(async () => {
    try {
      setIsLoading(true)
      
      // Determinar si estamos en el contexto de clases o admin
      const isClassesContext = window.location.pathname.startsWith('/clases')
      
      // Limpiar estado y storage
      setUser(null)
      setSession(null)
      clearSession()
      
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      // Redirigir según el contexto
      if (isClassesContext) {
        window.location.href = '/clases/login'
      } else {
        window.location.href = '/admin/login'
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
      setError(error as AuthError)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, clearSession])

  // Función para verificar la sesión
  const checkSession = useCallback(async () => {
    try {
      // Intentar recuperar la sesión del localStorage primero
      const storedSession = localStorage.getItem(AUTH_CONFIG.admin.storage.keys.session)
      
      // Si hay una sesión almacenada y no necesitamos verificar, usarla
      if (storedSession && !shouldCheckSession()) {
        const parsedSession = JSON.parse(storedSession) as AuthSession
        setSession(parsedSession)
        setUser(parsedSession.user)
        setIsLoading(false)
        setIsInitialized(true)
        return
      }

      // Si llegamos aquí, necesitamos verificar la sesión con Supabase
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) throw sessionError

      if (currentSession?.user) {
        const role = currentSession.user.app_metadata?.role || 'client'
        
        // Verificar el contexto de la ruta actual
        const isAdminRoute = window.location.pathname.startsWith('/admin')
        
        // Solo verificar rol de admin en rutas de admin
        if (isAdminRoute && role !== 'admin') {
          await signOut()
          throw new Error('No tienes permisos de administrador')
        }

        // Para rutas de clases, permitir roles de client y admin
        if (!isAdminRoute && !['client', 'admin', 'superadmin'].includes(role)) {
          await signOut()
          throw new Error('No tienes permisos para acceder a esta sección')
        }

        // Crear el objeto de usuario autenticado
        const authUser: AuthUser = {
          id: currentSession.user.id,
          email: currentSession.user.email || '',
          role: role as AuthUser['role'],
          metadata: currentSession.user.user_metadata,
          app_metadata: {
            role: role as 'admin' | 'staff',
            provider: currentSession.user.app_metadata?.provider
          }
        }

        const authSession: AuthSession = {
          user: authUser,
          access_token: currentSession.access_token,
          refresh_token: currentSession.refresh_token,
          expires_at: currentSession.expires_at || 0
        }

        setUser(authUser)
        setSession(authSession)
        persistSession(authSession)
        updateLastSessionCheck()
      } else {
        setUser(null)
        setSession(null)
        clearSession()
      }
    } catch (error) {
      console.error('Error al verificar sesión:', error)
      setError(error as AuthError)
      setUser(null)
      setSession(null)
      clearSession()
    } finally {
      setIsLoading(false)
      setIsInitialized(true)
    }
  }, [supabase, signOut, persistSession, clearSession])

  // Efecto para verificar y restaurar la sesión
  useEffect(() => {
    if (!isInitialized) {
      checkSession()
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (event === 'SIGNED_IN') {
        console.log('Sesión iniciada')
        await checkSession()
      } else if (event === 'SIGNED_OUT') {
        clearSession()
        setUser(null)
        setSession(null)
      }
      
      setIsLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [checkSession, clearSession, isInitialized])

  const signIn = async ({ email, password }: { email: string; password: string }) => {
    try {
      setError(null)
      setIsLoading(true)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user && data.session) {
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email || '',
          role: data.user.app_metadata?.role || 'client',
          metadata: data.user.user_metadata,
          app_metadata: {
            role: data.user.app_metadata?.role || 'admin',
            provider: data.user.app_metadata?.provider
          }
        }

        const authSession: AuthSession = {
          user: authUser,
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at || 0
        }

        setUser(authUser)
        setSession(authSession)
        persistSession(authSession)

        // No redirigimos aquí, dejamos que la página de login maneje la redirección
        return { user: authUser, session: authSession }
      }
      return null
    } catch (error) {
      setError(error as AuthError)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const signInWithGoogle = async () => {
    try {
      setError(null)
      setIsLoading(true)
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/admin/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          scopes: 'email profile'
        }
      })

      if (error) throw error

    } catch (error: any) {
      console.error('Error en inicio de sesión con Google:', error)
      setError(error as AuthError)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Función para verificar y actualizar el rol de administrador
  const verifyAndUpdateAdminRole = async (user: AuthUser) => {
    try {
      // Verificar si ya tiene rol de admin
      if (user.app_metadata?.role === 'admin') {
        return true
      }

      // Si no tiene rol, intentar actualizar a admin
      const { data: { user: updatedUser }, error } = await supabase.auth.updateUser({
        data: {
          role: 'admin',
          provider: 'google',
          providers: ['google']
        }
      })

      if (error) throw error
      return updatedUser.app_metadata?.role === 'admin'

    } catch (error) {
      console.error('Error al verificar/actualizar rol:', error)
      return false
    }
  }

  const clearError = () => setError(null)

  const updateUserMetadata = useCallback(async (metadata: Partial<AuthUserMetadata>) => {
    try {
      setIsLoading(true)
      
      const { data: { user: updatedUser }, error } = await supabase.auth.updateUser({
        data: metadata
      })

      if (error) throw error
      
      const currentUser = user
      if (currentUser && updatedUser) {
        const updatedAuthUser: AuthUser = {
          ...currentUser,
          metadata: {
            ...currentUser.metadata,
            ...metadata
          }
        }
        setUser(updatedAuthUser)
      }

      return { error: null }
    } catch (error) {
      console.error('Error al actualizar metadatos:', error)
      return { error }
    } finally {
      setIsLoading(false)
    }
  }, [supabase, user])

  const value = {
    user,
    session,
    isLoading,
    error,
    signIn,
    signInWithGoogle,
    signOut,
    clearError,
    updateUserMetadata
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }
  return context
} 