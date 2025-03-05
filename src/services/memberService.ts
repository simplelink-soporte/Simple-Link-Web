import { createSupabaseClient } from '@/lib/supabase'
import type { Member } from '@/types/members'

interface CreateMemberData {
  first_name: string
  last_name: string
  email: string
  phone?: string
  gender?: 'male' | 'female' | 'not_specified'
  status: string
}

export const memberService = {
  async getMembers(empresaId: string) {
    const supabase = createSupabaseClient()
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('first_name')

    if (error) throw error
    return data as Member[]
  },

  async getMemberById(id: string) {
    const supabase = createSupabaseClient()
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as Member
  },

  async searchMembers(searchTerm: string) {
    try {
      if (!searchTerm.trim()) return { data: [], error: null }

      const supabase = createSupabaseClient()
      const { data, error } = await supabase
        .from('members')
        .select('id, first_name, last_name, email, phone')
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(5)

      if (error) throw error

      return { 
        data: data.map(member => ({
          id: member.id,
          fullName: `${member.first_name || ''} ${member.last_name || ''}`.trim(),
          email: member.email,
          phone: member.phone
        })), 
        error: null 
      }
    } catch (error: any) {
      console.error('Error buscando miembros:', error)
      return { 
        data: null, 
        error: error.message 
      }
    }
  },

  async createMember(data: CreateMemberData) {
    try {
      const supabase = createSupabaseClient()
      const { data: member, error } = await supabase
        .from('members')
        .insert([{
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          phone: data.phone || null,
          gender: data.gender || null,
          status: data.status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error

      return member
    } catch (error: any) {
      console.error('Error creando miembro:', error)
      throw new Error(error.message || 'Error al crear el miembro')
    }
  }
}