import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'

interface VinculacionData {
  id: string
  user_id: string
  empresa_id: string
  estado: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export class VinculacionService {
  private supabase = createClientComponentClient<Database>()

  async createVinculacion(userId: string, empresaId: string) {
    try {
      // Primero verificamos si ya existe una vinculación
      const { data: existingVinculacion, error: searchError } = await this.supabase
        .from('vinculaciones')
        .select('*')
        .eq('user_id', userId)
        .eq('empresa_id', empresaId)
        .maybeSingle()

      if (searchError) {
        // console.error('Error al buscar vinculación:', searchError)
        throw searchError
      }

      // Si ya existe una vinculación activa, la retornamos
      if (existingVinculacion && existingVinculacion.estado === 'activo') {
        return existingVinculacion
      }

      // Si no existe, creamos una nueva
      const { data: newVinculacion, error: insertError } = await this.supabase
        .from('vinculaciones')
        .insert([
          {
            user_id: userId,
            empresa_id: empresaId,
            estado: 'activo',
            metadata: {}
          }
        ])
        .select()
        .single()

      if (insertError) {
        // console.error('Error al crear vinculación:', insertError)
        throw insertError
      }

      return newVinculacion
    } catch (error) {
      // console.error('Error en el servicio de vinculación:', error)
      throw error
    }
  }

  async getVinculacion(userId: string, empresaId: string) {
    try {
      const { data, error } = await this.supabase
        .from('vinculaciones')
        .select('*')
        .eq('user_id', userId)
        .eq('empresa_id', empresaId)
        .maybeSingle()

      if (error) throw error
      return data
    } catch (error) {
      // console.error('Error al obtener vinculación:', error)
      throw error
    }
  }
}

export const vinculacionService = new VinculacionService() 