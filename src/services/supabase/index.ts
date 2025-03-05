import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

type Member = Database['public']['Tables']['members']['Row']
type NewMember = Omit<Member, 'id' | 'created_at' | 'updated_at'>

export const memberService = {
  async createMember(data: NewMember) {
    try {
      const { data: newMember, error } = await supabase
        .from('members')
        .insert([data])
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return newMember
    } catch (error: any) {
      console.error('Error en createMember:', error)
      throw new Error(error.message || 'Error al crear el miembro')
    }
  },

  async updateMember(id: string, data: Partial<NewMember>) {
    try {
      const { data: updatedMember, error } = await supabase
        .from('members')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return updatedMember
    } catch (error: any) {
      console.error('Error en updateMember:', error)
      throw new Error(error.message || 'Error al actualizar el miembro')
    }
  },

  async deleteMember(id: string) {
    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', id)

      if (error) {
        throw new Error(error.message)
      }
    } catch (error: any) {
      console.error('Error en deleteMember:', error)
      throw new Error(error.message || 'Error al eliminar el miembro')
    }
  },

  async getMember(id: string) {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return data
    } catch (error: any) {
      console.error('Error en getMember:', error)
      throw new Error(error.message || 'Error al obtener el miembro')
    }
  },

  async getMembers() {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      return data || []
    } catch (error: any) {
      console.error('Error en getMembers:', error)
      throw new Error(error.message || 'Error al obtener los miembros')
    }
  }
} 