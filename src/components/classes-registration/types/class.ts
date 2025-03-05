import type { Feature } from './index'
import type { Database } from "@/types/supabase"
import type { PaymentMethod } from './payment'

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
  schedule: Schedule
  availablePaymentMethods: PaymentMethod[]
  visibility: 'public' | 'private'
  is_recurring: boolean
  instructor: string
  sessions: ClassSession[]
  branchName: string
  courts: string[]
}

// Tipo para los datos crudos de la base de datos
export type ClassFromDB = Database['public']['Tables']['classes']['Row']

// Tipo para la sesión de una clase
export interface ClassSession {
  date: string
  startTime: string
  endTime: string
} 