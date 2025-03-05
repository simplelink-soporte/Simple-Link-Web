import { motion } from "framer-motion"
import type { PackageStep, EditPackageStep } from "../types"

interface ModalHeaderProps {
  currentStep: PackageStep | EditPackageStep
  mode?: 'create' | 'edit'
}

export function ModalHeader({ currentStep, mode = 'create' }: ModalHeaderProps) {
  const getStepTitle = () => {
    switch (currentStep) {
      case 'package-details':
      case 'edit-details':
        return mode === 'edit' ? 'Editar Detalles del Paquete' : 'Detalles del Paquete'
      case 'package-payment':
      case 'edit-payment':
        return mode === 'edit' ? 'Editar Métodos de Pago' : 'Métodos de Pago'
      case 'package-confirmation':
      case 'edit-confirmation':
        return mode === 'edit' ? 'Confirmar Cambios' : 'Confirmar Paquete'
      default:
        return ''
    }
  }

  const getStepDescription = () => {
    switch (currentStep) {
      case 'package-details':
      case 'edit-details':
        return mode === 'edit' 
          ? 'Modifica los detalles básicos del paquete'
          : 'Ingresa los detalles básicos del paquete'
      case 'package-payment':
      case 'edit-payment':
        return mode === 'edit'
          ? 'Actualiza los métodos de pago disponibles'
          : 'Selecciona los métodos de pago disponibles'
      case 'package-confirmation':
      case 'edit-confirmation':
        return mode === 'edit'
          ? 'Revisa y confirma los cambios del paquete'
          : 'Revisa y confirma los detalles del paquete'
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
      className="p-6 border-b"
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