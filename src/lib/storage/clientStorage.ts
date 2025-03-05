import type { ClientUser } from '@/supabase/types'

const CLIENT_STORAGE_PREFIX = 'simple-link:client:'
const CLIENT_SESSION_KEY = `${CLIENT_STORAGE_PREFIX}session`
const CLIENT_USER_KEY = `${CLIENT_STORAGE_PREFIX}user`

interface StoredClientUser {
  id: string
  email: string
  nombre?: string
  telefono?: string
  ciudad?: string
}

export const clientStorage = {
  // Sesión
  getSession: () => {
    try {
      const session = localStorage.getItem(CLIENT_SESSION_KEY)
      return session ? JSON.parse(session) : null
    } catch {
      return null
    }
  },

  setSession: (session: any) => {
    try {
      if (session) {
        localStorage.setItem(CLIENT_SESSION_KEY, JSON.stringify(session))
      } else {
        localStorage.removeItem(CLIENT_SESSION_KEY)
      }
    } catch {
      // Ignorar errores de localStorage
    }
  },

  // Usuario
  getUser: (): StoredClientUser | null => {
    try {
      const user = localStorage.getItem(CLIENT_USER_KEY)
      return user ? JSON.parse(user) : null
    } catch {
      return null
    }
  },

  setUser: (user: ClientUser | null) => {
    try {
      if (user) {
        const storedUser: StoredClientUser = {
          id: user.id,
          email: user.email || '',
          nombre: user.user_metadata.nombre,
          telefono: user.user_metadata.telefono,
          ciudad: user.user_metadata.ciudad
        }
        localStorage.setItem(CLIENT_USER_KEY, JSON.stringify(storedUser))
      } else {
        localStorage.removeItem(CLIENT_USER_KEY)
      }
    } catch {
      // Ignorar errores de localStorage
    }
  },

  // Limpieza
  clearAll: () => {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(CLIENT_STORAGE_PREFIX)) {
          localStorage.removeItem(key)
        }
      })
    } catch {
      // Ignorar errores de localStorage
    }
  }
} 