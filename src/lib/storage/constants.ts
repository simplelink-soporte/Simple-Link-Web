export const ADMIN_STORAGE_KEYS = {
  AUTH: 'admin-supabase-auth',
  EMPRESA: 'admin-empresa-data',
  SETTINGS: 'admin-settings'
} as const

export const CLIENT_STORAGE_KEYS = {
  AUTH: 'client-supabase-auth',
  USER: 'client-user-data',
  PREFERENCES: 'client-preferences'
} as const

// Tipos para las claves
export type AdminStorageKey = typeof ADMIN_STORAGE_KEYS[keyof typeof ADMIN_STORAGE_KEYS]
export type ClientStorageKey = typeof CLIENT_STORAGE_KEYS[keyof typeof CLIENT_STORAGE_KEYS] 