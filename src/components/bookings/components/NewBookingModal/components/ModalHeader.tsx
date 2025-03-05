import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import type { BookingStep, BookingType } from "../types"

interface ModalHeaderProps {
  currentStep: BookingStep
  selectedBookingType?: BookingType
  isClassCreated?: boolean
  show?: boolean
}

export function ModalHeader({ 
  currentStep, 
  selectedBookingType,
  isClassCreated = false,
  show = true
}: ModalHeaderProps) {
  if (!show) return null;

  const getStepTitle = () => {
    // Primero manejamos el caso de simple_shift
    if (selectedBookingType === 'simple_shift') {
      switch (currentStep) {
        case 'participants':
          return 'Participantes'
        case 'rentals':
          return 'Artículos Adicionales'
        case 'payment':
          return 'Método de Pago'
        case 'confirmation':
          return 'Confirmar Reserva'
        default:
          return 'Nueva Reserva'
      }
    }

    // Luego manejamos los casos existentes
    switch (currentStep) {
      case 'class-details':
        return 'Detalles de la Clase'
      case 'class-schedule':
        return "Horarios y Capacidad"
      case 'payment':
        return 'Método de Pago'
      case 'confirmation':
        return isClassCreated ? '' : 'Confirmar Clase'
      default:
        return ''
    }
  }

  const getStepDescription = () => {
    // Primero manejamos el caso de simple_shift
    if (selectedBookingType === 'simple_shift') {
      switch (currentStep) {
        case 'participants':
          return 'Selecciona los participantes de la reserva'
        case 'rentals':
          return 'Añade artículos adicionales a tu reserva'
        case 'payment':
          return 'Configura el método y estado del pago'
        case 'confirmation':
          return 'Revisa los detalles de la reserva antes de confirmar'
        default:
          return ''
      }
    }

    // Luego manejamos los casos existentes
    switch (currentStep) {
      case 'class-details':
        return 'Ingresa los detalles básicos de la clase'
      case 'class-schedule':
        return "Configura los horarios, capacidad y profesores para cada sesión de la clase"
      case 'payment':
        return 'Configura el método y estado del pago'
      case 'confirmation':
        return isClassCreated ? '' : 'Revisa los detalles de la clase antes de crearla'
      default:
        return ''
    }
  }

  const title = getStepTitle()
  const description = getStepDescription()

  if (!title && !description) {
    return null
  }

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="p-6"
    >
      <motion.h2 
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-xl font-semibold text-gray-900"
      >
        {title}
      </motion.h2>
      <motion.p 
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-sm text-gray-500 mt-1"
      >
        {description}
      </motion.p>
    </motion.div>
  )
} 