import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'

interface CompanyLink {
  id: string
  empresa_id: string
  slug: string
  type: 'classes' | 'bookings'
  is_active: boolean
  settings: {
    theme?: {
      primary_color?: string
      logo_url?: string
    }
    features?: {
      allow_guest?: boolean
      require_auth?: boolean
      show_prices?: boolean
    }
    restrictions?: {
      max_bookings_per_user?: number
      advance_days?: number
    }
  }
  created_at: string
  updated_at: string
}

export class LinkService {
  private supabase = createClientComponentClient<Database>()

  async getCompanyLink(empresaId: string): Promise<CompanyLink | null> {
    try {
      const { data, error } = await this.supabase
        .from('company_links')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('type', 'classes')
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error al obtener el link de la empresa:', error)
      return null
    }
  }

  async updateCompanyLink(empresaId: string, updates: Partial<CompanyLink>) {
    try {
      const { data, error } = await this.supabase
        .from('company_links')
        .update(updates)
        .eq('empresa_id', empresaId)
        .eq('type', 'classes')
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error al actualizar el link de la empresa:', error)
      throw error
    }
  }

  async createCompanyLink(empresaId: string, slug: string) {
    try {
      const { data, error } = await this.supabase
        .from('company_links')
        .insert({
          empresa_id: empresaId,
          slug,
          type: 'classes',
          is_active: true,
          settings: {
            features: {
              allow_guest: true,
              require_auth: false,
              show_prices: true
            }
          }
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error al crear el link de la empresa:', error)
      throw error
    }
  }

  // Más métodos según necesidad...
}
