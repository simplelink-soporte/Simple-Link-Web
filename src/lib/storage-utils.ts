import { AUTH_CONFIG } from '@/config/auth.config'

export const STORAGE_KEYS = {
  // Claves de autenticación
  auth: [
    AUTH_CONFIG.admin.storage.keys.session,
    AUTH_CONFIG.admin.storage.keys.user,
    AUTH_CONFIG.admin.storage.keys.organization
  ],
  // Claves de empresa
  empresa: [
    AUTH_CONFIG.admin.storage.keys.empresa.id,
    AUTH_CONFIG.admin.storage.keys.empresa.data,
    AUTH_CONFIG.admin.storage.keys.empresa.legacyId,
    AUTH_CONFIG.admin.storage.keys.currentBranch
  ],
  // Legacy keys
  legacy: [
    'sl-admin-session',
    'sl-admin-user',
    'sl-admin-organization'
  ]
} as const

export function clearStorageKeys(keys: string[]) {
  keys.forEach(key => {
    try {
      localStorage.removeItem(key)
    } catch (e) {
      console.warn(`Error al limpiar ${key} del localStorage:`, e)
    }
  })
}

export function clearAllStorage() {
  const allKeys = [
    ...STORAGE_KEYS.auth,
    ...STORAGE_KEYS.empresa,
    ...STORAGE_KEYS.legacy
  ]
  clearStorageKeys(allKeys)
}

export function clearEmpresaStorage() {
  clearStorageKeys(STORAGE_KEYS.empresa)
} 