export interface Database {
  public: {
    Tables: {
      members: {
        Row: {
          id: string
          first_name: string | null
          last_name: string | null
          email: string
          phone: string | null
          gender: 'male' | 'female' | 'other' | null
          birth_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          first_name?: string | null
          last_name?: string | null
          email: string
          phone?: string | null
          gender?: 'male' | 'female' | 'other' | null
          birth_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          first_name?: string | null
          last_name?: string | null
          email?: string
          phone?: string | null
          gender?: 'male' | 'female' | 'other' | null
          birth_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      courts: {
        Row: {
          id: string
          name: string
          branch_id: string
          sport: 'padel' | 'tennis' | 'badminton' | 'pickleball' | 'squash'
          court_type: 'indoor' | 'outdoor' | 'covered'
          surface: 'crystal' | 'synthetic' | 'clay' | 'grass' | 'rubber' | 'concrete' | 'panoramic' | 'premium'
          features: string[]
          is_active: boolean
          available_durations: number[]
          duration_pricing: Record<string, number>
          custom_pricing: Record<string, any>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          branch_id: string
          sport: 'padel' | 'tennis' | 'badminton' | 'pickleball' | 'squash'
          court_type: 'indoor' | 'outdoor' | 'covered'
          surface: 'crystal' | 'synthetic' | 'clay' | 'grass' | 'rubber' | 'concrete' | 'panoramic' | 'premium'
          features?: string[]
          is_active?: boolean
          available_durations?: number[]
          duration_pricing?: Record<string, number>
          custom_pricing?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          branch_id?: string
          sport?: 'padel' | 'tennis' | 'badminton' | 'pickleball' | 'squash'
          court_type?: 'indoor' | 'outdoor' | 'covered'
          surface?: 'crystal' | 'synthetic' | 'clay' | 'grass' | 'rubber' | 'concrete' | 'panoramic' | 'premium'
          features?: string[]
          is_active?: boolean
          available_durations?: number[]
          duration_pricing?: Record<string, number>
          custom_pricing?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
      }
      empresas: {
        Row: {
          id: string
          name: string
          business_name: string | null
          tax_id: string | null
          email: string | null
          phone: string | null
          address: string | null
          city: string | null
          state: string | null
          country: string | null
          logo_url: string | null
          is_active: boolean
          settings: Record<string, any>
          created_at: string
          updated_at: string
          plan_type: 'FREE' | 'PRO'
          plan_id: string | null
        }
        Insert: {
          id?: string
          name: string
          business_name?: string | null
          tax_id?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          country?: string | null
          logo_url?: string | null
          is_active?: boolean
          settings?: Record<string, any>
          created_at?: string
          updated_at?: string
          plan_type?: 'FREE' | 'PRO'
          plan_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          business_name?: string | null
          tax_id?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          country?: string | null
          logo_url?: string | null
          is_active?: boolean
          settings?: Record<string, any>
          created_at?: string
          updated_at?: string
          plan_type?: 'FREE' | 'PRO'
          plan_id?: string | null
        }
      }
      admin_profiles: {
        Row: {
          id: string
          organization_id: string
          first_name: string
          role: 'admin' | 'staff'
          permissions: string[]
          is_active: boolean
          last_login: string | null
        }
        Insert: {
          id: string
          organization_id: string
          first_name: string
          role: 'admin' | 'staff'
          permissions?: string[]
          is_active?: true | false
          last_login?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          first_name?: string
          role?: 'admin' | 'staff'
          permissions?: string[]
          is_active?: true | false
          last_login?: string | null
        }
      }
      sedes: {
        Row: {
          id: string
          name: string
          address: string
          phone: string
          manager_id: string
          is_active: boolean
          opening_hours: {
            [day: string]: {
              ranges: Array<{
                start: string  // formato "HH:mm"
                end: string    // formato "HH:mm"
              }>
            }
          }
          settings: Record<string, any>
          empresa_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address: string
          phone: string
          manager_id: string
          is_active?: boolean
          opening_hours?: {
            [day: string]: {
              ranges: Array<{
                start: string  // formato "HH:mm"
                end: string    // formato "HH:mm"
              }>
            }
          }
          settings?: Record<string, any>
          empresa_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string
          phone?: string
          manager_id?: string
          is_active?: boolean
          opening_hours?: {
            [day: string]: {
              ranges: Array<{
                start: string  // formato "HH:mm"
                end: string    // formato "HH:mm"
              }>
            }
          }
          settings?: Record<string, any>
          empresa_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      items: {
        Row: {
          id: string
          name: string
          type: 'equipment' | 'accessory' | 'consumable'
          duration_pricing: Record<string, number>
          default_duration: number
          stock: number
          requires_deposit: boolean
          deposit_amount: number | null
          is_active: boolean
          created_at: string
          updated_at: string
          empresa_id: string
          sede_id: string | null
        }
        Insert: {
          id?: string
          name: string
          type: 'equipment' | 'accessory' | 'consumable'
          duration_pricing?: Record<string, number>
          default_duration?: number
          stock: number
          requires_deposit?: boolean
          deposit_amount?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          empresa_id: string
          sede_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          type?: 'equipment' | 'accessory' | 'consumable'
          duration_pricing?: Record<string, number>
          default_duration?: number
          stock?: number
          requires_deposit?: boolean
          deposit_amount?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          empresa_id?: string
          sede_id?: string | null
        }
      }
      bookings: {
        Row: {
          id: string
          court_id: string
          date: string
          start_time: string
          end_time: string
          title: string | null
          description: string | null
          total_price: number
          payment_status: 'pending' | 'partial' | 'completed'
          payment_method: 'cash' | 'stripe' | 'transfer'
          deposit_amount: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          court_id: string
          date: string
          start_time: string
          end_time: string
          title?: string | null
          description?: string | null
          total_price: number
          payment_status: 'pending' | 'partial' | 'completed'
          payment_method: 'cash' | 'stripe' | 'transfer'
          deposit_amount?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          court_id?: string
          date?: string
          start_time?: string
          end_time?: string
          title?: string | null
          description?: string | null
          total_price?: number
          payment_status?: 'pending' | 'partial' | 'completed'
          payment_method?: 'cash' | 'stripe' | 'transfer'
          deposit_amount?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 