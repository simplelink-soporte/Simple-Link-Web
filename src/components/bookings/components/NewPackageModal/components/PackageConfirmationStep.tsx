import { motion } from "framer-motion"
import type { PackageDetails, PackagePaymentConfig } from "../types"
import { IconCheck } from "@tabler/icons-react"

interface PackageConfirmationStepProps {
  details: PackageDetails
  payment: PackagePaymentConfig
  isCreated: boolean
  onSuccess: () => void
  mode?: 'create' | 'edit'
}

export function PackageConfirmationStep({
  details,
  payment,
  isCreated,
  onSuccess,
  mode = 'create'
}: PackageConfirmationStepProps) {
  if (isCreated) {
    onSuccess()
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-12"
      >
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <IconCheck className="w-6 h-6 text-green-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          ¡Paquete {mode === 'edit' ? 'actualizado' : 'creado'} exitosamente!
        </h3>
        <p className="text-sm text-gray-500 text-center max-w-[280px]">
          {mode === 'edit' 
            ? 'Los cambios han sido guardados correctamente'
            : 'El paquete ya está disponible para su compra'
          }
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">
          Resumen del paquete
        </h3>
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Detalles del paquete
            </h4>
            <ul className="space-y-2">
              <li className="flex justify-between text-sm">
                <span className="text-gray-500">Nombre:</span>
                <span className="text-gray-900">{details.name}</span>
              </li>
              <li className="flex justify-between text-sm">
                <span className="text-gray-500">Sesiones:</span>
                <span className="text-gray-900">{details.classCount}</span>
              </li>
              <li className="flex justify-between text-sm">
                <span className="text-gray-500">Precio:</span>
                <span className="text-gray-900">${details.price}</span>
              </li>
              <li className="flex justify-between text-sm">
                <span className="text-gray-500">Vencimiento:</span>
                <span className="text-gray-900">{details.expirationDays} días</span>
              </li>
            </ul>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Métodos de pago
            </h4>
            <ul className="space-y-2">
              {payment.paymentMethods.map((method) => (
                <li key={method} className="text-sm text-gray-900">
                  {method === 'stripe' ? 'Tarjeta de crédito/débito' : 'Transferencia bancaria'}
                </li>
              ))}
              {payment.paymentMethods.length === 0 && (
                <li className="text-sm text-gray-500">
                  No se han seleccionado métodos de pago
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  )
} 