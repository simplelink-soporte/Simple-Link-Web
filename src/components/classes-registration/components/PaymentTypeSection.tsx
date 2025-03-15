"use client"

import { X, ChevronDown, ChevronRight, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect, useRef } from "react"
import { PaymentTypeList } from "./PaymentTypeList"
import { PaymentTypeEnum, PAYMENT_TYPES } from "./payment-types"

// Filtrar tipos de pago específicos si es necesario
const FILTERED_PAYMENT_TYPES = PAYMENT_TYPES.filter(type => 
  !['card', 'cash'].includes(type.id)
)

interface PaymentTypeSectionProps {
  selectedType: PaymentTypeEnum | null
  onSelect: (type: PaymentTypeEnum | null) => void
  viewType?: 'mobile' | 'desktop'
}

export function PaymentTypeSection({
  selectedType,
  onSelect,
  viewType = 'desktop'
}: PaymentTypeSectionProps) {
  const selectedTypeData = selectedType ? PAYMENT_TYPES.find(t => t.id === selectedType) : null
  const [showList, setShowList] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Manejar clics fuera del componente para cerrar la lista
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowList(false)
      }
    }

    if (showList) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showList])

  // Función para manejar la selección directa de un tipo de pago
  const handleSelectPaymentType = (type: PaymentTypeEnum) => {
    onSelect(type)
    setShowList(false)
  }

  // Manejar el clic en el selector
  const handleSelectorClick = () => {
    setShowList(!showList)
  }

  // Manejar la eliminación del tipo seleccionado
  const handleRemoveType = () => {
    onSelect(null)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-3 relative"
      ref={containerRef}
    >
      {!selectedTypeData ? (
        <motion.div
          whileHover={{ scale: 1.0 }}
          whileTap={{ scale: 0.99 }}
          onClick={handleSelectorClick}
          className={cn(
            "w-full rounded-lg cursor-pointer",
            "transition-all duration-200",
            "bg-white",
            "border border-gray-200",
            "hover:border-gray-300",
            "h-[52px] flex items-center px-4"
          )}
        >
          <div className="flex items-center gap-3 w-full justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-md transition-colors bg-gray-50">
                <ChevronRight className="h-4 w-4 text-gray-500" />
              </div>
              <span className="text-[15px] text-gray-500">
                Seleccionar tipo de pago
              </span>
            </div>
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform duration-300 text-gray-500",
              showList ? "transform rotate-180" : ""
            )} />
          </div>
        </motion.div>
      ) : (
        <motion.div
          whileHover={{ scale: 1.0 }}
          whileTap={{ scale: 0.99 }}
          onClick={handleSelectorClick}
          className={cn(
            "w-full rounded-lg cursor-pointer",
            "transition-all duration-200",
            "p-3",
            "bg-white",
            "border border-gray-200",
            "hover:border-gray-300"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-md transition-colors bg-gray-50">
                <Check className="h-4 w-4 text-green-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900">
                  {selectedTypeData?.name || selectedType}
                </span>
                <span className="text-xs text-gray-500">
                  {selectedTypeData?.description || ''}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform duration-300 text-gray-500",
                showList ? "transform rotate-180" : ""
              )} />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemoveType()
                }}
                className="p-1.5 rounded-lg transition-colors text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Lista de tipos de pago desplegable */}
      <AnimatePresence>
        {showList && (
          <motion.div
            initial={{ opacity: 0, y: -5, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -5, height: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "fixed inset-x-4 sm:static sm:w-full z-[100] mt-2 origin-top",
              "rounded-lg shadow-lg",
              "overflow-hidden bg-white",
              "border border-gray-200"
            )}
          >
            <div className="max-h-[300px] overflow-y-auto scrollbar-hide">
              <PaymentTypeList
                selectedType={selectedType}
                onSelect={handleSelectPaymentType}
                paymentTypes={FILTERED_PAYMENT_TYPES}
                isExpanded={true}
                noContainer={true}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
