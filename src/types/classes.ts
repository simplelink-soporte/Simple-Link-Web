import { z } from 'zod'
import type { PaymentMethodEnum, PaymentStatusEnum, PaymentTypeEnum } from './bookings'

// Type guard para verificar si un objeto es una TransformedClass
export function isTransformedClass(obj: any): obj is TransformedClass {
  return (
    obj &&
    typeof obj === 'object' &&
    'type' in obj &&
    obj.type === 'class' &&
    'instructor' in obj &&
    'capacity' in obj &&
    'currentParticipants' in obj
  )
}

// Esquema Zod para validación
export const classTimeSlotSchema = z.object({
  price: z.number(),
  endTime: z.string(),
  capacity: z.number(),
  courtIds: z.array(z.string()),
  startTime: z.string(),
  instructors: z.array(z.string())
})

export const classScheduleSchema = z.object({
  days: z.array(z.number()),
  timeSlots: z.array(classTimeSlotSchema)
})

export const classSchema = z.object({
  id: z.string().uuid(),
  empresa_id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  visibility: z.enum(['public', 'private']),
  start_date: z.string(),
  end_date: z.string().nullable(),
  is_recurring: z.boolean(),
  schedule_config: classScheduleSchema,
  status: z.enum(['active', 'inactive', 'cancelled']),
  created_by: z.string().uuid(),
  min_students: z.number().optional(),
  branch_id: z.string().uuid().nullable()
})

// Tipos TypeScript inferidos de los esquemas Zod
export type ClassTimeSlot = z.infer<typeof classTimeSlotSchema>
export type ClassSchedule = z.infer<typeof classScheduleSchema>
export type Class = z.infer<typeof classSchema>

// Tipos adicionales para el servicio
export interface ClassQueryOptions {
  branchId?: string
  status?: 'active' | 'inactive' | 'cancelled'
  visibility?: 'public' | 'private'
  empresaId: string
  date?: string // Fecha en formato YYYY-MM-DD
}

export interface ServiceResponse<T> {
  data?: T
  error?: {
    message: string
    code: string
    details?: string
  }
}

// Tipo para representar una clase transformada al formato de reserva
export interface TransformedClass {
  id: string
  courtId: string
  date: string
  startTime: string
  endTime: string
  title: string
  description: string | null
  type: 'class'
  instructor: string
  capacity: number
  currentParticipants: number
  status: string
  visibility: string
  // Propiedades adicionales para compatibilidad con SelectedBooking
  court?: string
  totalAmount?: number
  depositAmount?: number
  courtPrice?: number
  rentalItemsPrice?: number
  paymentStatus?: PaymentStatusEnum
  paymentMethod?: PaymentMethodEnum
  paymentType?: PaymentTypeEnum
  participants?: Array<{
    id: string
    memberId: string
    role: string
    firstName: string
    lastName: string
  }>
  rentedItems?: Array<{
    id: string
    name: string
    quantity: number
    pricePerUnit: number
  }>
} 