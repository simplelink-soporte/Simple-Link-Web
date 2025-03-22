"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { PaymentTypeList } from "./PaymentTypeList"
import { PaymentTypeEnum } from "./payment-types"

interface PaymentTypeModalProps {
  isOpen: boolean
  onClose: () => void
  selectedPaymentMethod: PaymentTypeEnum | null
  onSelect: (type: PaymentTypeEnum) => void
  isLoading?: boolean
  paymentConfig?: {
    status: string
    currency: string
    guaranteePercentage?: number
    partialPaymentPercentage?: number
  }
}

export function PaymentTypeModal({
  isOpen,
  onClose,
  selectedPaymentMethod,
  onSelect,
  isLoading = false,
  paymentConfig
}: PaymentTypeModalProps) {
  // Función para manejar la selección de tipo de pago
  const handlePaymentTypeSelect = (type: PaymentTypeEnum) => {
    onSelect(type)
    // Cerrar el modal después de seleccionar
    onClose()
  }

  // Manejador para evitar que los clics dentro del modal cierren el modal
  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay con backdrop blur */}
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-white/80 z-[70] flex items-center justify-center"
            onClick={onClose}
          >
            {/* Contenedor del modal */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ 
                type: "spring", 
                damping: 25, 
                stiffness: 300 
              }}
              className="w-[90%] max-w-md max-h-[85vh] bg-white rounded-lg shadow-lg overflow-hidden flex flex-col"
              onClick={handleModalClick}
            >
              {/* Encabezado del modal */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
                <h3 className="text-lg font-medium text-gray-900">
                  Seleccionar tipo de pago
                </h3>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              
              {/* Contenido del modal */}
              <div 
                className="overflow-y-auto p-4 flex-grow"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#d1d5db transparent',
                  WebkitOverflowScrolling: 'touch' // Mejor scroll en iOS
                }}
              >
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                    <p className="text-sm text-gray-500 text-center">
                      Cargando tipos de pago...
                    </p>
                  </div>
                ) : (
                  <PaymentTypeList
                    selectedType={selectedPaymentMethod}
                    onSelect={handlePaymentTypeSelect}
                    isExpanded={true}
                    noContainer={true}
                    viewType="mobile"
                    paymentConfig={paymentConfig}
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
