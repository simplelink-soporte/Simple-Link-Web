import type { Database } from '@/types/supabase'

export type Usuario = Database['public']['Tables']['usuarios']['Row']
export type UsuarioInsert = Database['public']['Tables']['usuarios']['Insert']
export type UsuarioUpdate = Database['public']['Tables']['usuarios']['Update']

export type Vinculacion = Database['public']['Tables']['vinculaciones']['Row']
export type VinculacionInsert = Database['public']['Tables']['vinculaciones']['Insert']
export type VinculacionUpdate = Database['public']['Tables']['vinculaciones']['Update']

export type Empresa = Database['public']['Tables']['empresas']['Row']
export type EmpresaInsert = Database['public']['Tables']['empresas']['Insert']
export type EmpresaUpdate = Database['public']['Tables']['empresas']['Update']

export type Package = Database['public']['Tables']['packages']['Row']
export type PackageInsert = Database['public']['Tables']['packages']['Insert']
export type PackageUpdate = Database['public']['Tables']['packages']['Update']

export type UserPackage = Database['public']['Tables']['user_packages']['Row'] & {
  empresa_id: string;
}
export type UserPackageInsert = Database['public']['Tables']['user_packages']['Insert']
export type UserPackageUpdate = Database['public']['Tables']['user_packages']['Update']

export interface ServiceResponse<T> {
  data?: T
  error?: {
    message: string
    details?: string
    hint?: string
  }
  metadata?: Record<string, any>
}
