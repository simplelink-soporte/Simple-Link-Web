import { IconCash, IconCreditCard, IconBuildingBank } from "@tabler/icons-react"
import type { PaymentOption } from "../types"

// Pasos del registro
export const STEPS = {
  AUTH: 'auth',
  PACKAGE_SELECTION: 'package-selection',
  CLASS_SELECTION: 'class-selection',
  INFO: 'info',
  SESSIONS: 'sessions',
  PAYMENT: 'payment'
} as const

// Opciones de pago
export const PAYMENT_OPTIONS: readonly PaymentOption[] = [
  {
    id: 'cash',
    label: 'Efectivo',
    description: 'Pago en efectivo al llegar a la clase',
    iconType: 'cash'
  },
  {
    id: 'card',
    label: 'Mercado Pago',
    description: 'Pago con tarjeta a través de Mercado Pago',
    iconType: 'card'
  },
  {
    id: 'transfer',
    label: 'Transferencia',
    description: 'Transferencia bancaria',
    iconType: 'transfer'
  }
] as const

// Configuración de precios
export const PRICE_CONFIG = {
  DEFAULT_PRICE: 5000,
  CURRENCY: 'ARS',
  DECIMALS: 2
} as const

// Configuración de fechas
export const DATE_CONFIG = {
  FORMAT: 'dd/MM/yyyy',
  TIME_FORMAT: 'HH:mm',
  DAYS_TO_SHOW: 30
} as const

// Configuración de capacidad
export const CAPACITY_CONFIG = {
  MIN_STUDENTS: 1,
  DEFAULT_CAPACITY: 10,
  MAX_CAPACITY: 20
} as const

// Configuración de visibilidad
export const VISIBILITY_CONFIG = {
  PUBLIC: 'public',
  PRIVATE: 'private'
} as const 