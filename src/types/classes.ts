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
  instructors: z.array(z.string()),
  isDisabled: z.boolean().optional()
})

export const classScheduleSchema = z.object({
  days: z.array(z.number()),
  timeSlots: z.array(classTimeSlotSchema),
  suspendedSessions: z.array(z.object({
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    courtId: z.string(),
    suspendedAt: z.string(),
    reason: z.string().optional()
  })).optional(),
  specificSessions: z.array(z.object({
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    courtIds: z.string(),
    capacity: z.number(),
    price: z.number(),
    instructors: z.array(z.string()),
    createdAt: z.string()
  })).optional()
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
  status: z.enum(['active', 'inactive', 'cancelled', 'completed']),
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
  status?: 'active' | 'inactive' | 'cancelled' | 'completed'
  visibility?: 'public' | 'private'
  empresaId: string
  date?: string // Fecha en formato YYYY-MM-DD
  includeCompleted?: boolean // Indica si se deben incluir clases con estado 'completed'
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
  price?: number // Precio de la sesión
  classId?: string // ID original de la clase
  sessionId?: string // ID único para la sesión
  isSuspended?: boolean // Indica si la sesión está suspendida para esta fecha/horario/pista
  isSpecificSession?: boolean // Indica si es una sesión específica para una fecha concreta
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

// Voy a agregar la interfaz SuspendedSession y actualizar ScheduleConfig
export interface SuspendedSession {
  date: string         // Fecha específica en formato YYYY-MM-DD
  startTime: string    // Hora de inicio
  endTime: string      // Hora de fin
  courtId: string      // ID de la pista
  suspendedAt: string  // Timestamp de cuándo se suspendió
  reason?: string      // Razón opcional de la suspensión
}

export interface SpecificSession {
  date: string         // Fecha específica en formato YYYY-MM-DD
  startTime: string    // Hora de inicio
  endTime: string      // Hora de fin
  courtIds: string     // ID de la pista asignada
  capacity: number     // Capacidad de la sesión
  price: number        // Precio de la sesión
  instructors: string[] // Instructores asignados
  createdAt: string    // Timestamp de cuándo se creó
}

export interface ScheduleConfig {
  days: number[]
  timeSlots: {
    startTime: string
    endTime: string
    courtIds: string[]
    capacity: number
    price: number
    instructors: string[]
    isDisabled?: boolean
  }[]
  suspendedSessions?: SuspendedSession[]
  specificSessions?: SpecificSession[]
}