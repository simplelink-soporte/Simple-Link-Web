"use client"

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'

export interface Organization {
  id: string
  name: string
  slug: string
  settings?: {
    link?: {
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
  }
}

export class OrganizationService {
  private static instance: OrganizationService
  private supabase = createClientComponentClient<Database>()

  private constructor() {}

  public static getInstance(): OrganizationService {
    if (!OrganizationService.instance) {
      OrganizationService.instance = new OrganizationService()
    }
    return OrganizationService.instance
  }

  public async getOrganizationBySlug(slug: string): Promise<Organization | null> {
    try {
      // Primero buscamos el link por el slug
      const { data: linkData, error: linkError } = await this.supabase
        .from('company_links')
        .select('empresa_id, settings, slug')
        .eq('slug', slug)
        .eq('type', 'classes')
        .eq('is_active', true)
        .single()

      if (linkError) throw linkError
      if (!linkData) return null

      // Luego buscamos la empresa
      const { data: orgData, error: orgError } = await this.supabase
        .from('empresas')
        .select('id, name')
        .eq('id', linkData.empresa_id)
        .single()

      if (orgError) throw orgError
      if (!orgData) return null

      return {
        id: orgData.id,
        name: orgData.name,
        slug: linkData.slug,
        settings: linkData.settings
      }
    } catch (error) {
      console.error('Error al obtener la organización:', error)
      return null
    }
  }

  public async getOrganizationById(id: string): Promise<Organization | null> {
    try {
      // Primero buscamos la empresa
      const { data: orgData, error: orgError } = await this.supabase
        .from('empresas')
        .select('id, name')
        .eq('id', id)
        .single()

      if (orgError) throw orgError
      if (!orgData) return null

      // Luego buscamos el link activo
      const { data: linkData, error: linkError } = await this.supabase
        .from('company_links')
        .select('settings, slug')
        .eq('empresa_id', id)
        .eq('type', 'classes')
        .eq('is_active', true)
        .single()

      if (linkError && linkError.code !== 'PGRST116') throw linkError

      return {
        id: orgData.id,
        name: orgData.name,
        slug: linkData?.slug || '',
        settings: linkData?.settings
      }
    } catch (error) {
      console.error('Error al obtener la organización:', error)
      return null
    }
  }
} 