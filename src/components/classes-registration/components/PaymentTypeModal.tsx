"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { PaymentTypeList } from "./PaymentTypeList"
import { PaymentTypeEnum, PaymentType } from "./payment-types"

interface PaymentTypeModalProps {
  isOpen: boolean
  onClose: () => void
  selectedType: PaymentTypeEnum | null
  onSelect: (type: PaymentTypeEnum) => void
  paymentTypes: PaymentType[]
}

export function PaymentTypeModal({
  isOpen,
  onClose,
  selectedType,
  onSelect,
  paymentTypes
}: PaymentTypeModalProps) {
  // Función para manejar la selección del tipo de pago
  const handleTypeSelect = (type: PaymentTypeEnum) => {
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
              className="w-[90%] max-w-md bg-white rounded-lg shadow-lg overflow-hidden"
              onClick={handleModalClick}
            >
              {/* Encabezado del modal */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
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
              <div className="max-h-[70vh] overflow-y-auto p-4">
                <PaymentTypeList
                  selectedType={selectedType}
                  onSelect={handleTypeSelect}
                  paymentTypes={paymentTypes}
                  isExpanded={true}
                  noContainer={true}
                  viewType="mobile"
                />
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
