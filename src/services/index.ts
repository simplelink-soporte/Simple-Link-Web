import { createSupabaseClient } from '@/lib/supabase/index'
import type { Branch, Usuario } from '@/types/database.types'
import type { Database } from '@/types/supabase'

type Empresa = Database['public']['Tables']['empresas']['Row']

// Crear una instancia del cliente para servicios generales
const supabase = createSupabaseClient('client')

// Exportar el cliente de supabase para compatibilidad con código existente
export { supabase }

// Servicios de usuario
export const userService = {
  async getUsersByEmpresa(empresaId: string): Promise<Usuario[]> {
    try {
      const { data: vinculaciones, error: vincError } = await supabase
        .from('vinculaciones')
        .select('user_id')
        .eq('empresa_id', empresaId)
        .eq('estado', 'activo')

      if (vincError) throw vincError
      if (!vinculaciones?.length) return []

      const { data: usuarios, error: userError } = await supabase
        .from('usuarios')
        .select(`
          id,
          nombre,
          email,
          created_at
        `)
        .in('id', vinculaciones.map((v: { user_id: string }) => v.user_id))
        .order('created_at', { ascending: false })

      if (userError) throw userError
      return usuarios
    } catch (error: any) {
      console.error('Error al obtener usuarios:', error)
      throw new Error(error.message || 'Error al obtener los usuarios')
    }
  },

  async getEmpresaByAuthUserId(authUserId: string): Promise<Empresa | null> {
    try {
      const { data: empresa, error } = await supabase
        .from('empresas')
        .select('id, auth_user_id')
        .eq('auth_user_id', authUserId)
        .single()

      if (error) throw error
      return empresa
    } catch (error: any) {
      console.error('Error al obtener empresa:', error)
      throw new Error(error.message || 'Error al obtener la empresa')
    }
  }
}

// Servicios de sede
export const branchService = {
  async getBranchesByEmpresa(empresaId: string): Promise<Branch[]> {
    try {
      const { data, error } = await supabase
        .from('sedes')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error: any) {
      console.error('Error al obtener sedes:', error)
      throw new Error(error.message || 'Error al obtener las sedes')
    }
  },

  async getBranchById(branchId: string): Promise<Branch | null> {
    try {
      const { data, error } = await supabase
        .from('sedes')
        .select('*')
        .eq('id', branchId)
        .single()

      if (error) throw error
      return data
    } catch (error: any) {
      console.error('Error al obtener sede:', error)
      throw new Error(error.message || 'Error al obtener la sede')
    }
  }
}

// Servicios de empresa
export const empresaService = {
  async getEmpresaById(empresaId: string): Promise<Empresa | null> {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', empresaId)
        .single()

      if (error) throw error
      return data
    } catch (error: any) {
      console.error('Error al obtener empresa:', error)
      throw new Error(error.message || 'Error al obtener la empresa')
    }
  }
} 