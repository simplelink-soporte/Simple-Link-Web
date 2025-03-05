export interface Empresa {
  id: string
  name: string
  is_active: boolean
  plan_type: string
  auth_user_id: string
  created_at: string
  updated_at: string
  settings?: {
    theme?: string
    notifications?: boolean
    [key: string]: any
  }
} 