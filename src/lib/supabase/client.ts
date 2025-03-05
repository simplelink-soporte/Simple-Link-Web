import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseClientSingleton } from '@/lib/supabase'

// Re-exportar el singleton para mantener compatibilidad
export const supabase = SupabaseClientSingleton.getInstance()

// Función mejorada para obtener cliente autenticado
export const getAuthenticatedSupabaseClient = async () => {
  const client = SupabaseClientSingleton.getInstance()
  
  try {
    const { data: { session }, error: sessionError } = await client.auth.getSession()
    
    if (sessionError) {
      console.error('❌ Error al obtener sesión:', {
        error: sessionError,
        timestamp: new Date().toISOString()
      })
      throw sessionError
    }

    if (!session) {
      console.warn('⚠️ No hay sesión activa:', {
        timestamp: new Date().toISOString()
      })
      throw new Error('No hay sesión activa')
    }

    return {
      client,
      session,
      userId: session.user.id
    }
  } catch (error) {
    console.error('❌ Error en getAuthenticatedSupabaseClient:', {
      error,
      timestamp: new Date().toISOString()
    })
    
    // Limpiar instancia en caso de error
    SupabaseClientSingleton.clearInstance()
    throw error
  }
}

// Función para validar sesión
export const validateSession = async () => {
  try {
    const { session } = await getAuthenticatedSupabaseClient()
    return !!session
  } catch {
    return false
  }
}

// Función para obtener el ID del usuario actual
export const getCurrentUserId = async () => {
  try {
    const { userId } = await getAuthenticatedSupabaseClient()
    return userId
  } catch {
    return null
  }
}

// Función para cerrar sesión
export const signOut = async () => {
  const client = SupabaseClientSingleton.getInstance()
  try {
    await client.auth.signOut()
    SupabaseClientSingleton.clearInstance()
  } catch (error) {
    console.error('❌ Error al cerrar sesión:', error)
    throw error
  }
} 