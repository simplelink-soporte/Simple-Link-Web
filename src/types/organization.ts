import type { Database } from './supabase'

export type Organization = Database['public']['Tables']['empresas']['Row']

export interface OrganizationWithSettings extends Organization {
  settings: {
    theme?: {
      primary_color?: string
      secondary_color?: string
      logo_url?: string
    }
    features?: {
      enable_online_bookings?: boolean
      enable_class_registration?: boolean
      enable_memberships?: boolean
    }
  } | null
} 