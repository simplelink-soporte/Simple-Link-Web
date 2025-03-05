import { supabase } from '@/lib/supabase'
import type { PostgrestError } from '@supabase/supabase-js'
import type { Usuario, ServiceResponse, Empresa } from '@/components/usersSection/types'

export const userService = {
  async getUsersByEmpresa(empresaId: string): Promise<ServiceResponse<Usuario[]>> {
    try {
      console.log('🔍 Iniciando búsqueda de usuarios para la empresa:', empresaId)

      // Consulta directa para obtener usuarios vinculados
      const { data: usuarios, error } = await supabase
        .from('usuarios')
        .select(`
          id,
          nombre,
          email,
          dni,
          telefono,
          genero,
          fecha_nacimiento,
          direccion,
          ciudad,
          pais,
          estado,
          created_at,
          updated_at,
          metadata
        `)
        .in('id', (rpc) =>
          rpc
            .from('vinculaciones')
            .select('user_id')
            .eq('empresa_id', empresaId)
            .eq('estado', 'activo')
        )

      if (error) {
        console.error('❌ Error al obtener usuarios:', error)
        throw error
      }

      console.log('✅ Usuarios encontrados:', usuarios?.length || 0)
      return { data: usuarios || [] }

    } catch (error) {
      console.error('❌ Error en getUsersByEmpresa:', error)
      const pgError = error as PostgrestError
      return {
        error: {
          message: pgError.message || 'Error al obtener los usuarios',
          details: pgError.details,
          hint: pgError.hint
        }
      }
    }
  },

  async getEmpresaByAuthUserId(authUserId: string): Promise<ServiceResponse<Empresa>> {
    try {
      console.log('🔍 Buscando empresa para el usuario:', authUserId)

      const { data: empresa, error } = await supabase
        .from('empresas')
        .select('id, auth_user_id, name')
        .eq('auth_user_id', authUserId)
        .single()

      if (error) {
        console.error('❌ Error al obtener empresa:', error)
        throw error
      }

      if (!empresa) {
        console.error('❌ No se encontró empresa para el usuario:', authUserId)
        throw new Error('Empresa no encontrada')
      }

      console.log('✅ Empresa encontrada:', empresa)
      return { data: empresa }

    } catch (error) {
      console.error('❌ Error en getEmpresaByAuthUserId:', error)
      const pgError = error as PostgrestError
      return {
        error: {
          message: pgError.message || 'Error al obtener la empresa',
          details: pgError.details,
          hint: pgError.hint
        }
      }
    }
  }
} 