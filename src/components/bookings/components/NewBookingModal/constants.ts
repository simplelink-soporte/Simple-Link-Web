import { IconClock, IconUsers } from "@tabler/icons-react"
import type { BookingTypeOption } from "./types"

export const BOOKING_TYPE_OPTIONS: BookingTypeOption[] = [
  {
    id: 'shift',
    title: 'Reserva Simple',
    description: 'Reserva una cancha para jugar',
    icon: IconClock,
    colors: {
      gradient: 'from-amber-50/40 to-amber-100/40',
      icon: 'text-amber-600/80',
      hover: 'hover:border-amber-200/60'
    }
  },
  {
    id: 'class',
    title: 'Crear Clase', 
    description: 'Crea una clase y compártela',
    icon: IconUsers,
    colors: {
      gradient: 'from-blue-50/40 to-blue-100/40',
      icon: 'text-blue-600/80',
      hover: 'hover:border-blue-200/60'
    }
  }
]

export const STEP_CONFIGS = {
  'class-details': {
    title: 'Detalles de la Clase',
    description: 'Agrega un título y descripción para tu clase'
  },
  'class-availability': {
    title: 'Disponibilidad',
    description: 'Define la capacidad y canchas disponibles'
  },
  'sessions': {
    title: 'Sesiones',
    description: 'Programa las fechas de las sesiones'
  },
  'confirmation': {
    title: 'Confirmar Clase',
    description: 'Revisa los detalles antes de confirmar'
  }
} as const

export const DEFAULT_CLASS_DETAILS = {
  name: '',
  description: '',
  duration: 60
} as const

export const DEFAULT_AVAILABILITY = {
  maxParticipants: 4,
  selectedCourts: []
} as const