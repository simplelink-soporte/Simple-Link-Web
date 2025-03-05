"use client"

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { UserPackageFromDB } from '../types/models'

interface PackageStatusModalProps {
  isOpen: boolean
  onClose: () => void
  activePackage: UserPackageFromDB
  onBuyPackage?: () => void
}

export function PackageStatusModal({ 
  isOpen, 
  onClose, 
  activePackage,
  onBuyPackage 
}: PackageStatusModalProps) {
  // Validar que el paquete exista y tenga las propiedades necesarias
  if (!activePackage?.sessions_left || !activePackage?.expires_at) {
    return null
  }

  const hasNoSessionsLeft = activePackage.sessions_left === 0
  const expirationDate = new Date(activePackage.expires_at)
  const isExpired = expirationDate < new Date()

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-md bg-white rounded-2xl p-6 border border-gray-200"
          >
            {/* Contenido */}
            <div className="space-y-6">
              {/* Imagen y título */}
              <div className="text-center space-y-3">
                <div className="flex justify-center">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <Image
                      src="/images/Miroodles - paquete.png"
                      alt="Package icon"
                      fill
                      className="object-contain"
                      priority
                    />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {hasNoSessionsLeft || isExpired ? 'Paquete inactivo' : 'Paquete activo'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {hasNoSessionsLeft || isExpired
                      ? 'Tu paquete ya no está disponible para usar'
                      : 'Tienes un paquete activo con sesiones disponibles'
                    }
                  </p>
                </div>
              </div>

              {/* Detalles del paquete */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                {/* Sesiones restantes */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Sesiones restantes</span>
                  <span className={cn(
                    "font-medium",
                    hasNoSessionsLeft ? "text-red-600" : "text-gray-600"
                  )}>
                    {activePackage.sessions_left} {activePackage.sessions_left === 1 ? 'sesión' : 'sesiones'}
                  </span>
                </div>

                {/* Fecha de expiración */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Válido hasta</span>
                  <span className={cn(
                    "font-medium",
                    isExpired ? "text-red-600" : "text-gray-600"
                  )}>
                    {format(expirationDate, 'd MMMM yyyy', { locale: es })}
                  </span>
                </div>

                {/* Estado */}
                {(hasNoSessionsLeft || isExpired) && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="bg-yellow-50 rounded-lg p-3">
                      <p className="text-sm text-yellow-800">
                        {hasNoSessionsLeft
                          ? 'Has utilizado todas las sesiones de tu paquete'
                          : 'Tu paquete ha expirado'
                        }
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Botones */}
              <div className="flex flex-col gap-3">
                {(hasNoSessionsLeft || isExpired) && onBuyPackage && (
                  <motion.button
                    onClick={onBuyPackage}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "w-full",
                      "px-4 py-2 rounded-xl",
                      "bg-white border border-gray-200",
                      "text-gray-800 hover:text-gray-900",
                      "hover:border-gray-300 hover:bg-gray-50",
                      "transition-all duration-200",
                      "flex items-center justify-center gap-2",
                      "text-sm font-medium"
                    )}
                  >
                    <span>Comprar nuevo paquete</span>
                  </motion.button>
                )}

                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={cn(
                    "text-sm text-gray-600 hover:text-gray-900",
                    "transition-colors duration-200"
                  )}
                >
                  <span>Cerrar</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 