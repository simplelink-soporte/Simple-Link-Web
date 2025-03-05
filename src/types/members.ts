import type { Database } from './supabase'

export type Member = Database['public']['Tables']['members']['Row']

export interface CreateMemberData {
  first_name: string
  last_name: string
  email: string
  phone: string | null
  gender: 'male' | 'female' | 'not_specified' | null
  status: string
  empresa_id: string
  branch_id?: string | null
} 