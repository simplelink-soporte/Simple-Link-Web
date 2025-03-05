export interface Database {
  public: {
    Tables: {
      classes: {
        Row: {
          id: string
          empresa_id: string
          created_at: string
          updated_at: string
          name: string
          description: string | null
          visibility: 'public' | 'private'
          branch_id: string[]
          start_date: string
          end_date: string | null
          is_recurring: boolean | null
          schedule_config: {
            duration?: number
            [key: string]: any
          }
          available_payment_methods: string[]
          payment_config: {
            price_per_session?: number
            [key: string]: any
          }
          status: 'active' | 'cancelled' | 'completed'
          created_by: string
          min_students: number | null
        }
        Insert: {
          id?: string
          empresa_id: string
          created_at?: string
          updated_at?: string
          name: string
          description?: string | null
          visibility: 'public' | 'private'
          branch_id: string[]
          start_date: string
          end_date?: string | null
          is_recurring?: boolean | null
          schedule_config?: any
          available_payment_methods: string[]
          payment_config?: any
          status?: 'active' | 'cancelled' | 'completed'
          created_by: string
          min_students?: number | null
        }
        Update: {
          id?: string
          empresa_id?: string
          created_at?: string
          updated_at?: string
          name?: string
          description?: string | null
          visibility?: 'public' | 'private'
          branch_id?: string[]
          start_date?: string
          end_date?: string | null
          is_recurring?: boolean | null
          schedule_config?: any
          available_payment_methods?: string[]
          payment_config?: any
          status?: 'active' | 'cancelled' | 'completed'
          created_by?: string
          min_students?: number | null
        }
      }
    }
  }
} 