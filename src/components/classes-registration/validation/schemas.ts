import * as z from 'zod'

// Esquema de autenticación con Google
export const authSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().optional(),
  phone: z.string().optional(),
  dni: z.string().optional()
})

// Esquema de paquete
export const packageSchema = z.object({
  id: z.string(),
  empresa_id: z.string(),
  name: z.string(),
  class_count: z.number().min(1, 'Debe tener al menos 1 clase'),
  price: z.number().min(0, 'El precio no puede ser negativo'),
  expiration_days: z.number().min(1, 'Debe tener al menos 1 día de validez'),
  advance_booking_days: z.number().min(0),
  branch_ids: z.array(z.string()),
  include_private_classes: z.boolean(),
  tag: z.string().nullable(),
  available_payment_methods: z.array(z.string()),
  status: z.enum(['active', 'inactive', 'archived'])
})

// Esquema de sesión
export const sessionSchema = z.object({
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  totalSpots: z.number().min(1),
  spotsLeft: z.number().min(0),
  selected: z.boolean().optional()
})

// Esquema de pago
export const paymentSchema = z.object({
  method: z.enum(['cash', 'card', 'transfer']),
  amount: z.number().positive('El monto debe ser mayor a 0'),
  currency: z.string().default('ARS'),
  installments: z.number().min(1).optional()
})

// Esquema de registro completo
export const registrationSchema = z.object({
  packageId: z.string().optional(),
  classId: z.string(),
  sessions: z.array(sessionSchema),
  payment: paymentSchema,
  notes: z.string().optional()
})

// Tipos inferidos
export type AuthFormData = z.infer<typeof authSchema>
export type PackageData = z.infer<typeof packageSchema>
export type SessionFormData = z.infer<typeof sessionSchema>
export type PaymentFormData = z.infer<typeof paymentSchema>
export type RegistrationFormData = z.infer<typeof registrationSchema>

// Validadores
export const validateAuth = (data: unknown) => authSchema.safeParse(data)
export const validatePackage = (data: unknown) => packageSchema.safeParse(data)
export const validateSession = (data: unknown) => sessionSchema.safeParse(data)
export const validatePayment = (data: unknown) => paymentSchema.safeParse(data)
export const validateRegistration = (data: unknown) => registrationSchema.safeParse(data) 