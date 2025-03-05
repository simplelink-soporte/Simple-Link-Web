export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type PlanType = 'FREE' | 'PRO'
export type ResetPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY'

export type Database = {
  public: {
    Tables: {
      empresas: {
        Row: {
          id: string
          name: string
          business_name: string | null
          email: string | null
          phone: string | null
          address: string | null
          city: string | null
          state: string | null
          is_active: boolean | null
          settings: Record<string, any> | null
          created_at: string | null
          updated_at: string | null
          auth_user_id: string | null
          plan_type: string | null
          onboarding: string | null
          country: string | null
          zip_code: string | null
          plan_id: string | null
          plan_updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          business_name?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          is_active?: boolean | null
          settings?: Record<string, any> | null
          created_at?: string | null
          updated_at?: string | null
          auth_user_id?: string | null
          plan_type?: string | null
          onboarding?: string | null
          country?: string | null
          zip_code?: string | null
          plan_id?: string | null
          plan_updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          business_name?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          is_active?: boolean | null
          settings?: Record<string, any> | null
          created_at?: string | null
          updated_at?: string | null
          auth_user_id?: string | null
          plan_type?: string | null
          onboarding?: string | null
          country?: string | null
          zip_code?: string | null
          plan_id?: string | null
          plan_updated_at?: string | null
        }
      },
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
          updated_at?: string
        }
      },
      bookings: {
        Row: {
          id: string
          court_id: string
          date: string
          start_time: string
          end_time: string
          title: string
          description: string | null
          total_price: number
          rental_items: {
            item_id: string
            quantity: number
            price: number
          }[]
          participants: {
            member_id: string
            role: 'player' | 'guest'
          }[]
          status: string
          payment_type: string
          payment_status: 'pending' | 'partial' | 'completed' | 'cancelled'
          payment_method: 'cash' | 'stripe' | 'transfer' | null
          deposit_amount: number | null
          cancelled_at: string | null
          cancellation_reason: string | null
          empresa_id: string
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          court_id: string
          date: string
          start_time: string
          end_time: string
          title: string
          description?: string | null
          total_price?: number
          rental_items?: {
            item_id: string
            quantity: number
            price: number
          }[]
          participants: {
            member_id: string
            role: 'player' | 'guest'
          }[]
          status?: string
          payment_type?: string
          payment_status?: 'pending' | 'partial' | 'completed' | 'cancelled'
          payment_method?: 'cash' | 'stripe' | 'transfer' | null
          deposit_amount?: number | null
          cancelled_at?: string | null
          cancellation_reason?: string | null
          empresa_id: string
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          court_id?: string
          date?: string
          start_time?: string
          end_time?: string
          title?: string
          description?: string | null
          total_price?: number
          rental_items?: {
            item_id: string
            quantity: number
            price: number
          }[]
          participants?: {
            member_id: string
            role: 'player' | 'guest'
          }[]
          status?: string
          payment_type?: string
          payment_status?: 'pending' | 'partial' | 'completed' | 'cancelled'
          payment_method?: 'cash' | 'stripe' | 'transfer' | null
          deposit_amount?: number | null
          cancelled_at?: string | null
          cancellation_reason?: string | null
          empresa_id?: string
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      },
      bookings_payments: {
        Row: {
          id: string
          booking_id: string
          amount: number
          type: 'booking' | 'deposit' | 'remaining' | 'guarantee' | 'no_show_charge'
          status: 'pending' | 'completed' | 'failed' | 'refunded'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          amount: number
          type: 'booking' | 'deposit' | 'remaining' | 'guarantee' | 'no_show_charge'
          status: 'pending' | 'completed' | 'failed' | 'refunded'
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          amount?: number
          type?: 'booking' | 'deposit' | 'remaining' | 'guarantee' | 'no_show_charge'
          status?: 'pending' | 'completed' | 'failed' | 'refunded'
          notes?: string
          updated_at?: string
        }
      },
      classes: {
        Row: {
          id: string
          empresa_id: string
          created_at: string
          updated_at: string
          name: string
          description: string | null
          visibility: 'public' | 'private'
          start_date: string
          end_date: string | null
          is_recurring: boolean
          schedule_config: {
            days: number[]
            timeSlots: Array<{
              startTime: string
              endTime: string
              price: number
              capacity: number
              instructors: string[]
              courtIds: string[]
            }>
          }
          available_payment_methods: string[]
          payment_config: {
            currency?: string
            status?: string
          }
          status: 'active' | 'cancelled' | 'completed'
          created_by: string
          min_students: number
          branch_id: string | null
        }
        Insert: {
          id?: string
          empresa_id: string
          created_at?: string
          updated_at?: string
          name: string
          description?: string | null
          visibility: 'public' | 'private'
          start_date: string
          end_date?: string | null
          is_recurring?: boolean
          schedule_config: {
            days: number[]
            timeSlots: Array<{
              startTime: string
              endTime: string
              price: number
              capacity: number
              instructors: string[]
              courtIds: string[]
            }>
          }
          available_payment_methods: string[]
          payment_config?: {
            currency?: string
            status?: string
          }
          status?: 'active' | 'cancelled' | 'completed'
          created_by: string
          min_students?: number
          branch_id?: string | null
        }
        Update: {
          empresa_id?: string
          name?: string
          description?: string | null
          visibility?: 'public' | 'private'
          start_date?: string
          end_date?: string | null
          is_recurring?: boolean
          schedule_config?: {
            days: number[]
            timeSlots: Array<{
              startTime: string
              endTime: string
              price: number
              capacity: number
              instructors: string[]
              courtIds: string[]
            }>
          }
          available_payment_methods?: string[]
          payment_config?: {
            currency?: string
            status?: string
          }
          status?: 'active' | 'cancelled' | 'completed'
          min_students?: number
          branch_id?: string | null
          updated_at?: string
        }
      },
      packages: {
        Row: {
          id: string
          empresa_id: string
          created_at: string
          updated_at: string
          name: string
          class_count: number
          price: number
          expiration_days: number
          advance_booking_days: number
          branch_ids: string[]
          include_private_classes: boolean
          tag: string | null
          available_payment_methods: string[]
          status: 'active' | 'inactive' | 'archived'
          created_by: string
        }
        Insert: {
          id?: string
          empresa_id: string
          created_at?: string
          updated_at?: string
          name: string
          class_count: number
          price: number
          expiration_days: number
          advance_booking_days?: number
          branch_ids: string[]
          include_private_classes?: boolean
          tag?: string | null
          available_payment_methods: string[]
          status?: 'active' | 'inactive' | 'archived'
          created_by: string
        }
        Update: {
          id?: string
          empresa_id?: string
          name?: string
          class_count?: number
          price?: number
          expiration_days?: number
          advance_booking_days?: number
          branch_ids?: string[]
          include_private_classes?: boolean
          tag?: string | null
          available_payment_methods?: string[]
          status?: 'active' | 'inactive' | 'archived'
          created_by?: string
          updated_at?: string
        }
      },
      usuarios: {
        Row: {
          id: string
          email: string
          nombre: string
          empresa_id: string
          role: string
          created_at: string
          updated_at: string
          avatar_url?: string
        }
        Insert: {
          id: string
          email: string
          nombre: string
          empresa_id: string
          role?: string
          created_at?: string
          updated_at?: string
          avatar_url?: string
        }
        Update: {
          id?: string
          email?: string
          nombre?: string
          empresa_id?: string
          role?: string
          created_at?: string
          updated_at?: string
          avatar_url?: string
        }
      },
      vinculaciones: {
        Row: {
          id: string
          user_id: string
          empresa_id: string
          estado: string
          metadata: Record<string, any>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          empresa_id: string
          estado?: string
          metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          empresa_id?: string
          estado?: string
          metadata?: Record<string, any>
          updated_at?: string
        }
      },
      company_links: {
        Row: {
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
        Insert: {
          id?: string
          empresa_id: string
          slug: string
          type: 'classes' | 'bookings'
          is_active?: boolean
          settings?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
        Update: {
          empresa_id?: string
          slug?: string
          type?: 'classes' | 'bookings'
          is_active?: boolean
          settings?: Record<string, any>
          updated_at?: string
        }
      },
      sedes: {
        Row: {
          id: string
          organization_id: string | null
          name: string
          address: string | null
          phone: string | null
          manager_id: string | null
          opening_hours: Record<string, any> | null
          is_active: boolean | null
          settings: Record<string, any> | null
          created_at: string | null
          updated_at: string | null
          empresa_id: string
          timezone: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          name: string
          address?: string | null
          phone?: string | null
          manager_id?: string | null
          opening_hours?: Record<string, any> | null
          is_active?: boolean | null
          settings?: Record<string, any> | null
          created_at?: string | null
          updated_at?: string | null
          empresa_id: string
          timezone?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          name?: string
          address?: string | null
          phone?: string | null
          manager_id?: string | null
          opening_hours?: Record<string, any> | null
          is_active?: boolean | null
          settings?: Record<string, any> | null
          created_at?: string | null
          updated_at?: string | null
          empresa_id?: string
          timezone?: string
        }
      },
      members: {
        Row: {
          id: string
          first_name: string
          last_name: string
          email: string
          phone: string | null
          gender: string | null
          notes: string | null
          status: string
          created_at: string
          updated_at: string
          branch_id: string | null
          empresa_id: string | null
        }
        Insert: Omit<Database['public']['Tables']['members']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['members']['Row']>
      },
      user_packages: {
        Row: {
          id: string
          user_id: string
          package_id: string
          sessions_left: number
          expires_at: string
          status: 'active' | 'inactive' | 'expired'
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          user_id: string
          package_id: string
          sessions_left: number
          expires_at: string
          status?: 'active' | 'inactive' | 'expired'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          package_id?: string
          sessions_left?: number
          expires_at?: string
          status?: 'active' | 'inactive' | 'expired'
          created_at?: string
          updated_at?: string
        }
      },
      subscription_plans: {
        Row: {
          id: string
          name: string
          code: PlanType
          description: string | null
          price: number
          daily_booking_limit: number
          reset_period: ResetPeriod
          features: Json | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code: PlanType
          description?: string | null
          price: number
          daily_booking_limit: number
          reset_period: ResetPeriod
          features?: Json | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: PlanType
          description?: string | null
          price?: number
          daily_booking_limit?: number
          reset_period?: ResetPeriod
          features?: Json | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      },
      stripe_connections: {
        Row: {
          id: string
          empresa_id: string
          stripe_account_id: string
          stripe_account_email: string | null
          account_status: 'pending' | 'active' | 'restricted' | 'disabled'
          charges_enabled: boolean
          payouts_enabled: boolean
          requirements: Json | null
          created_at: string
          updated_at: string
          last_webhook_received_at: string | null
        }
        Insert: {
          id?: string
          empresa_id: string
          stripe_account_id: string
          stripe_account_email?: string | null
          account_status?: 'pending' | 'active' | 'restricted' | 'disabled'
          charges_enabled?: boolean
          payouts_enabled?: boolean
          requirements?: Json | null
          created_at?: string
          updated_at?: string
          last_webhook_received_at?: string | null
        }
        Update: {
          id?: string
          empresa_id?: string
          stripe_account_id?: string
          stripe_account_email?: string | null
          account_status?: 'pending' | 'active' | 'restricted' | 'disabled'
          charges_enabled?: boolean
          payouts_enabled?: boolean
          requirements?: Json | null
          created_at?: string
          updated_at?: string
          last_webhook_received_at?: string | null
        }
      },
      stripe_customers: {
        Row: {
          id: string
          user_id: string
          stripe_customer_id: string
          stripe_account_id: string
          status: 'active' | 'inactive'
          metadata: Json | null
          created_at: string
          updated_at: string
          last_used: string | null
          payment_methods_count: number
          last_payment_error: string | null
        }
        Insert: {
          id?: string
          user_id: string
          stripe_customer_id: string
          stripe_account_id: string
          status?: 'active' | 'inactive'
          metadata?: Json | null
          created_at?: string
          updated_at?: string
          last_used?: string | null
          payment_methods_count?: number
          last_payment_error?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          stripe_customer_id?: string
          stripe_account_id?: string
          status?: 'active' | 'inactive'
          metadata?: Json | null
          created_at?: string
          updated_at?: string
          last_used?: string | null
          payment_methods_count?: number
          last_payment_error?: string | null
        }
      },
      error_logs: {
        Row: {
          id: string
          type: string
          error_message: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          type: string
          error_message: string
          metadata: Json
          created_at?: string
        }
        Update: {
          id?: string
          type?: string
          error_message?: string
          metadata?: Json
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: {
      get_booking_count: {
        Args: {
          p_empresa_id: string
          p_date: string
        }
        Returns: number
      }
      begin_no_show_charge_transaction: {
        Args: {
          p_booking_id: string
        }
        Returns: void
      }
      commit_no_show_charge_transaction: {
        Args: {
          p_booking_id: string
        }
        Returns: void
      }
      rollback_no_show_charge_transaction: {
        Args: {
          p_booking_id: string
        }
        Returns: void
      }
    }
    Enums: {
      plan_type: PlanType
      reset_period: ResetPeriod
    }
  }
} 