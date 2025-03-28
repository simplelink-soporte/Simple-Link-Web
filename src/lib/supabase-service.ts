import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

/**
 * Cliente de Supabase que usa la clave de servicio (service_role)
 * Este cliente ignora completamente las políticas RLS y tiene acceso completo a la base de datos
 * SOLO DEBE USARSE EN CONTEXTOS SERVERLESS (API routes, etc.)
 * NUNCA debe exponerse al cliente
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Se requieren NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_KEY para el cliente de servicio')
}

export const supabaseService = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      persistSession: false, // No persistir sesión
      autoRefreshToken: false // No refrescar token automáticamente
    }
  }
)

/**
 * Función para trabajar con tablas específicas usando el cliente de servicio
 * Ejemplos de uso:
 * 
 * // Para guardar datos en una tabla con RLS
 * await withServiceClient('mercadopago_connections').upsert({ 
 *   empresa_id: '123', 
 *   ...otrosDatos 
 * })
 * 
 * // Para consultar datos ignorando RLS
 * const { data } = await withServiceClient('empresas').select('*')
 */
export const withServiceClient = (table: keyof Database['public']['Tables']) => {
  return supabaseService.from(table)
}
