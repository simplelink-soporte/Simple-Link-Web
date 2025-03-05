import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

type TypedSupabaseClient = SupabaseClient<Database>

// Validación de credenciales de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️ Supabase credentials missing', { 
    url: supabaseUrl ? 'present' : 'missing',
    key: supabaseKey ? 'present' : 'missing'
  })
  throw new Error('Please define NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables')
}

// Validar que la URL sea válida
try {
  new URL(supabaseUrl)
} catch (error) {
  console.error('⚠️ Invalid Supabase URL:', supabaseUrl)
  throw new Error('Invalid NEXT_PUBLIC_SUPABASE_URL. Must be a valid URL.')
}

// Configuración única para todas las instancias
const STORAGE_KEY = 'sb-padel-auth-token'
const CLIENT_OPTIONS = {
  auth: {
    storageKey: STORAGE_KEY,
    persistSession: true,
    detectSessionInUrl: true
  }
}

// Singleton mejorado para el cliente de Supabase
export class SupabaseClientSingleton {
  private static instance: TypedSupabaseClient | null = null
  private static adminInstance: TypedSupabaseClient | null = null
  private static lastInitTime: number = 0
  private static readonly INIT_COOLDOWN = 1000 // 1 segundo de cooldown
  private static isInitializing: boolean = false

  private constructor() {}

  private static canInitialize(): boolean {
    if (this.isInitializing) return false
    
    const now = Date.now()
    if (now - this.lastInitTime < this.INIT_COOLDOWN) {
      return false
    }
    this.lastInitTime = now
    return true
  }

  private static createClient(options: any = {}): TypedSupabaseClient {
    this.isInitializing = true
    try {
      return createClientComponentClient<Database>({
        ...CLIENT_OPTIONS,
        ...options
      })
    } finally {
      this.isInitializing = false
    }
  }

  public static getInstance(): TypedSupabaseClient {
    if (typeof window === 'undefined') {
      return this.createClient()
    }

    if (!this.canInitialize() && this.instance) {
      return this.instance
    }

    if (!this.instance) {
      console.log('🔄 Creando nueva instancia del cliente Supabase', {
        storageKey: STORAGE_KEY,
        timestamp: new Date().toISOString()
      })
      
      this.instance = this.createClient()

      // Suscribirse a cambios de sesión
      if (this.instance) {
        this.instance.auth.onAuthStateChange((event, session) => {
          console.log('🔄 Cambio en estado de autenticación:', { 
            event,
            timestamp: new Date().toISOString(),
            storageKey: STORAGE_KEY
          })
        })
      }
    }

    return this.instance
  }

  public static getAdminInstance(): TypedSupabaseClient {
    if (typeof window === 'undefined') {
      return this.createClient()
    }

    if (!this.canInitialize() && this.adminInstance) {
      return this.adminInstance
    }

    if (!this.adminInstance) {
      console.log('🔄 Creando nueva instancia del cliente Supabase Admin', {
        storageKey: STORAGE_KEY,
        timestamp: new Date().toISOString()
      })

      this.adminInstance = this.createClient({
        global: {
          headers: {
            'x-application-name': 'padel-panel-admin',
            'x-admin-access': 'true'
          }
        }
      })
    }

    return this.adminInstance
  }

  public static clearInstance(): void {
    if (!this.canInitialize()) return
    
    console.log('🧹 Limpiando instancias del cliente Supabase', {
      storageKey: STORAGE_KEY,
      timestamp: new Date().toISOString()
    })
    
    if (this.instance) {
      this.instance.auth.signOut()
    }
    if (this.adminInstance) {
      this.adminInstance.auth.signOut()
    }
    
    this.instance = null
    this.adminInstance = null
    
    // Limpiar storage
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }

  public static async validateSession(): Promise<boolean> {
    const client = this.getInstance()
    try {
      const { data: { session }, error } = await client.auth.getSession()
      return !error && !!session
    } catch {
      return false
    }
  }
}

// Exportar cliente simple para compatibilidad
export const supabase = SupabaseClientSingleton.getInstance()

// Funciones de utilidad mejoradas
export const createSupabaseClient = () => {
  try {
    const client = SupabaseClientSingleton.getInstance()
    // Validar conexión
    void client.auth.getSession().catch(error => {
      console.error('❌ Error al probar conexión Supabase:', error)
      SupabaseClientSingleton.clearInstance()
    })
    return client
  } catch (error) {
    console.error('❌ Error al crear cliente Supabase:', error)
    throw error
  }
}

export const createAdminSupabaseClient = () => {
  try {
    return SupabaseClientSingleton.getAdminInstance()
  } catch (error) {
    console.error('❌ Error al crear cliente Supabase Admin:', error)
    throw error
  }
}

export const clearSupabaseClient = () => SupabaseClientSingleton.clearInstance()

export const validateSupabaseSession = () => SupabaseClientSingleton.validateSession() 
