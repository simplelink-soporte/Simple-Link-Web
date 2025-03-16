// Tipos de iconos
export type ClassFeatureIcon = 'calendar' | 'clock' | 'users' | 'location'
export type PackageFeatureIcon = 'calendar' | 'clock' | 'check' | 'calendar-check'

// Tipos de la base de datos
export interface ClassFromDB {
  id: string
  name: string
  description: string
  schedule_config: any
  price_per_session: number
  court_ids: string[]
  visibility: 'public' | 'private'
  status: 'active' | 'inactive'
  empresa_id: string
  created_at: string
  updated_at: string
  is_recurring: boolean
}

// Tipos para el frontend
export interface TimeSlot {
  startTime: string
  endTime: string
  capacity: number
  spotsLeft: number
  instructors: string[]
  courtIds: string[]
  price: number
}

export interface Schedule {
  days: number[]
  timeSlots: TimeSlot[]
  daysOfWeek: string[]
  startDate: string
  endDate: string | null
}

export interface PublicClass {
  id: string
  title: string
  description: string
  is_active: boolean
  created_at: string
  updated_at: string
  schedule: {
    days: number[]
    timeSlots: TimeSlot[]
    daysOfWeek: string[]
    startDate: string
    endDate: string | null
  }
  availablePaymentMethods: ('cash' | 'card' | 'transfer')[]
  visibility: 'public' | 'private'
  is_recurring: boolean
  instructor: string
  sessions: ClassSession[]
  branchInfo: {
    id: string
    name: string
    address: string | null
    phone: string | null
    courts?: Array<{
      id: string
      name: string
      description: string | null
    }>
  } | null
  courts: Array<{
    id: string
    name: string
    description: string | null
  }>
}

// Tipos básicos
export interface Feature {
  icon: PackageFeatureIcon
  text: string
}

// Información de sedes
export interface BranchInfo {
  id: string
  name: string
  address: string | null
  phone: string | null
}

// Paquetes de clases
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
  branches: BranchInfo[]
  tag: string | null
  status: 'active' | 'inactive' | 'archived'
}

export interface PackageFeature extends Feature {
  included: boolean
}

export interface ClassSession {
  id: string
  date: string
  startTime: string
  endTime: string
  spotsLeft: number
  totalSpots: number
  selected?: boolean
  stockStatus?: 'verified' | 'verifying' | 'error' | 'verified-out-of-stock' | 'pending' // Estado de verificación del stock
  courts: Array<{
    id: string
    name: string
    description: string | null
  }>
  instructor: string
  price: number
}

export type PaymentMethod = 'cash' | 'card' | 'transfer'

export interface UserPackageFromDB {
  id: string
  user_id: string
  package_id: string
  sessions_left: number
  expires_at: string
  status: 'active' | 'inactive' | 'expired' | 'cancelled'
  created_at?: string
  updated_at?: string
  package?: {
    id: string
    name: string
    branch_ids: string[]
    class_count: number
    expiration_days: number
    advance_booking_days: number
    include_private_classes: boolean
    available_payment_methods: string[]
    status: 'active' | 'inactive' | 'archived'
  }
}

export interface Organization {
  id: string
  name: string
  slug: string
  is_active: boolean
  settings?: Record<string, any>
  created_at: string
  updated_at: string
}