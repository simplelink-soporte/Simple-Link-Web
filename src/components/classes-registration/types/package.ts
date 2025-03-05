import type { Feature } from './index'

// Interfaz para la información de la sede
export interface BranchInfo {
  id: string
  name: string
  address: string | null
  phone: string | null
}

export interface ClassPackage {
  id: string
  title: string
  description: string
  price: number
  numberOfClasses: number
  features: Feature[]
  isPopular?: boolean
  
  // Campos de configuración
  expiration_days: number
  advance_booking_days: number
  include_private_classes: boolean
  available_payment_methods: string[]
  branch_ids: string[]
  branches: BranchInfo[] // Nueva propiedad para almacenar la información de las sedes
  tag: string | null
  status: 'active' | 'inactive' | 'archived'
}

export interface PackageFeature extends Feature {
  included: boolean
} 