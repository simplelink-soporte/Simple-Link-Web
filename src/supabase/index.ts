// Re-exportar tipos
export * from './types'

// Re-exportar configuraciones
export {
  ADMIN_AUTH_CONFIG,
  ADMIN_STORAGE_CONFIG
} from './admin'

export {
  CLIENT_AUTH_CONFIG,
  CLIENT_STORAGE_CONFIG
} from './client'

// Re-exportar funcionalidades de admin
export {
  createAdminSupabaseClient,
  clearAdminSupabaseClient,
  hasActiveAdminInstances
} from './admin'

// Re-exportar funcionalidades de cliente
export {
  createClientSupabaseClient,
  clearClientSupabaseClient,
  hasActiveClientInstances
} from './client'

// Función de utilidad para crear el cliente según el tipo
export function createSupabaseClient(type: 'admin' | 'client') {
  return type === 'admin' ? createAdminSupabaseClient() : createClientSupabaseClient()
}

// Función de utilidad para limpiar el cliente según el tipo
export function clearSupabaseClient(type: 'admin' | 'client') {
  return type === 'admin' ? clearAdminSupabaseClient() : clearClientSupabaseClient()
}

// Función de utilidad para verificar instancias activas según el tipo
export function hasActiveInstances(type: 'admin' | 'client') {
  return type === 'admin' ? hasActiveAdminInstances() : hasActiveClientInstances()
} 