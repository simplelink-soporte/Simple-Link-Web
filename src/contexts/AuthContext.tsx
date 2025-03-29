"use client"

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'
import type { AuthError, ClientUser, BaseAuthSession } from '@/types/supabase-auth'
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
  metadata: AuthUserMetadata
  app_metadata: {
    provider?: string
    empresa_id?: string
  }
}

interface AuthSession {
  user: AuthUser
  access_token: string
  refresh_token: string
  expires_at: number
}

interface OnboardingCheckResult {
  hasEmpresa: boolean
  isOnboardingComplete: boolean
  empresa?: any
}

interface AuthContextType {
  user: AuthUser | null
  session: AuthSession | null
  isLoading: boolean
  error: AuthError | null
  signIn: (credentials: { email: string; password: string }) => Promise<{ user: AuthUser; session: AuthSession; onboarding: OnboardingCheckResult } | null>
  signUp: (credentials: { email: string; password: string }) => Promise<{ user: AuthUser; session: AuthSession; onboarding: OnboardingCheckResult } | null>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
  checkEmpresaOnboarding: (userId: string) => Promise<OnboardingCheckResult>
  refreshSession: () => Promise<AuthSession | null>
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

  // Variable para controlar el tiempo entre refrescos de token
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0)
  const MIN_REFRESH_INTERVAL = 5000 // 5 segundos mínimo entre refrescos

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

      if (currentSession) {
        const sessionData: AuthSession = {
          user: {
            id: currentSession.user.id,
            email: currentSession.user.email!,
            metadata: currentSession.user.user_metadata,
            app_metadata: {
              provider: currentSession.user.app_metadata?.provider
            }
          },
          access_token: currentSession.access_token,
          refresh_token: currentSession.refresh_token,
          expires_at: currentSession.expires_at || 0
        }

        setSession(sessionData)
        setUser(sessionData.user)
        persistSession(sessionData)
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
  }, [supabase, persistSession, clearSession])

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

  // Función para verificar el estado de onboarding de una empresa
  const checkEmpresaOnboarding = async (userId: string) => {
    try {
      console.log('Verificando onboarding para usuario:', userId)
      
      // Obtener la empresa asociada al usuario directamente
      // No usamos la tabla 'profiles' que no existe
      const { data: empresa, error: empresaError } = await supabase
        .from('empresas')
        .select('*')
        .eq('auth_user_id', userId)
        .single()
      
      if (empresaError && empresaError.code !== 'PGRST116') {
        // PGRST116 significa que no se encontró ningún registro, lo cual es normal para usuarios nuevos
        console.warn('Error al obtener empresa:', empresaError)
      }
      
      // Verificar si el usuario tiene una empresa asociada
      const hasEmpresa = empresa !== null
      // Verificar si el onboarding está completo basado en el campo 'onboarding' de la tabla empresas
      // El onboarding está completo si el valor es 'COMPLETED' o 'Completo'
      const isOnboardingComplete = empresa?.onboarding === 'COMPLETED' || empresa?.onboarding === 'Completo'
      
      console.log('Resultado de verificación de onboarding:', {
        hasEmpresa,
        isOnboardingComplete,
        onboardingValue: empresa?.onboarding
      })
      
      return {
        hasEmpresa,
        isOnboardingComplete,
        empresa
      }
    } catch (error) {
      console.error('Error al verificar onboarding:', error)
      return {
        hasEmpresa: false,
        isOnboardingComplete: false,
        empresa: null
      }
    }
  }

  // Función para refrescar la sesión
  const refreshSession = async (): Promise<AuthSession | null> => {
    try {
      setIsLoading(true)
      
      // Refrescar la sesión
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('Error al refrescar sesión:', error)
        throw error
      }
      
      if (!data.session) {
        console.warn('No se pudo refrescar la sesión')
        return null
      }
      
      // Convertir la sesión de Supabase a nuestro tipo AuthSession
      const authSession: AuthSession = {
        ...data.session,
        expires_at: data.session.expires_at || Math.floor(Date.now() / 1000) + 3600, // Si no hay expires_at, establecer 1 hora por defecto
        user: {
          ...data.session.user,
          email: data.session.user.email || '',  // Asegurar que email nunca sea undefined
          metadata: data.session.user.user_metadata || {}
        }
      }
      
      // Actualizar el estado
      setSession(authSession)
      setUser(authSession.user)
      
      return authSession
    } catch (error) {
      console.error('Error en refreshSession:', error)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const signIn = async (credentials: { email: string; password: string }) => {
    try {
      setIsLoading(true)
      setError(null)

      const { data, error } = await supabase.auth.signInWithPassword(credentials)
      if (error) throw error

      if (!data.user) {
        throw new Error('No se encontró información del usuario')
      }

      // Verificar onboarding
      const onboardingStatus = await checkEmpresaOnboarding(data.user.id)

      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email || '',
        metadata: data.user.user_metadata,
        app_metadata: {
          provider: data.user.app_metadata?.provider,
          empresa_id: onboardingStatus.empresa?.id
        }
      }

      const authSession: AuthSession = {
        user: authUser,
        access_token: data.session!.access_token,
        refresh_token: data.session!.refresh_token,
        expires_at: data.session!.expires_at || 0
      }

      setUser(authUser)
      setSession(authSession)
      persistSession(authSession)

      return { user: authUser, session: authSession, onboarding: onboardingStatus }
    } catch (error) {
      console.error('Error en signIn:', error)
      setError(error as AuthError)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const signUp = async (credentials: { email: string; password: string }) => {
    try {
      setIsLoading(true)
      setError(null)

      const { data, error } = await supabase.auth.signUp(credentials)
      if (error) throw error

      if (!data.user) {
        throw new Error('No se encontró información del usuario')
      }

      // Verificar onboarding
      const onboardingStatus = await checkEmpresaOnboarding(data.user.id)

      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email || '',
        metadata: data.user.user_metadata,
        app_metadata: {
          provider: data.user.app_metadata?.provider,
          empresa_id: onboardingStatus.empresa?.id
        }
      }

      const authSession: AuthSession = {
        user: authUser,
        access_token: data.session!.access_token,
        refresh_token: data.session!.refresh_token,
        expires_at: data.session!.expires_at || 0
      }

      setUser(authUser)
      setSession(authSession)
      persistSession(authSession)

      return { user: authUser, session: authSession, onboarding: onboardingStatus }
    } catch (error) {
      console.error('Error en signUp:', error)
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
      
      // Determinar si estamos en el contexto de clases o admin
      const isClassesContext = window.location.pathname.startsWith('/clases')
      
      // Agregar parámetro para identificar el tipo de cliente
      const clientType = isClassesContext ? 'client' : 'admin'
      
      // Verificar si es registro o inicio de sesión
      const isRegistering = typeof window !== 'undefined' 
        ? localStorage.getItem('auth_action') === 'register'
        : false
        
      // Usar URL relativa para que funcione en cualquier dominio
      const redirectUrl = `/auth/callback?client_type=${clientType}&action=${isRegistering ? 'register' : 'login'}`
      
      console.log('Iniciando autenticación con Google:', { 
        clientType, 
        isRegistering, 
        redirectUrl 
      })
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          scopes: 'email profile'
        }
      })

      if (error) throw error
      // La redirección la maneja Supabase automáticamente

    } catch (error: any) {
      console.error('Error en inicio de sesión con Google:', error)
      setError(error as AuthError)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const clearError = () => setError(null)

  const updateUserMetadata = useCallback(async (metadata: Partial<AuthUserMetadata>) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: metadata
      })

      if (error) {
        return { error: error as AuthError }
      }

      return { error: null }
    } catch (error) {
      return { error: error as AuthError }
    }
  }, [supabase])

  const value = {
    user,
    session,
    isLoading,
    error,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    clearError,
    checkEmpresaOnboarding,
    refreshSession
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