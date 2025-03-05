export interface CompanyLinkSettings {
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