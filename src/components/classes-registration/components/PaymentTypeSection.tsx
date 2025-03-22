"use client"

import { X, ChevronDown, ChevronRight, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect, useRef } from "react"
import { PaymentTypeList } from "./PaymentTypeList"
import { PaymentTypeEnum, PAYMENT_TYPES, PaymentType } from "./payment-types"
import { PaymentTypeModal } from "./PaymentTypeModal"
import { GuaranteeConfirmationModal } from "./GuaranteeConfirmationModal"

// Filtrar tipos de pago específicos si es necesario
const FILTERED_PAYMENT_TYPES = PAYMENT_TYPES.filter(type => 
  !['card', 'cash'].includes(type.id)
)

// Tipos de pago que requieren tarjeta
export const PAYMENT_TYPES_REQUIRING_CARD: PaymentTypeEnum[] = ['guarantee', 'full', 'deposit'];

// Función auxiliar para verificar si un tipo de pago requiere tarjeta
export function requiresCardPayment(paymentType: PaymentTypeEnum | null): boolean {
  return paymentType !== null && PAYMENT_TYPES_REQUIRING_CARD.includes(paymentType);
}

// Función para verificar si estamos en el caso especial (garantía como booking)
export function isGuaranteeActingAsBooking(paymentTypes: PaymentType[]): boolean {
  const hasGuarantee = paymentTypes.some(type => type.id === 'guarantee');
  const hasBooking = paymentTypes.some(type => type.id === 'booking');
  return hasGuarantee && !hasBooking;
}

interface PaymentTypeSectionProps {
  selectedType: PaymentTypeEnum | null
  onSelect: (type: PaymentTypeEnum | null, guaranteePercentage?: number) => void
  viewType?: 'mobile' | 'desktop'
  paymentTypes?: PaymentType[]
  paymentConfig?: {
    status: string
    currency: string
    guaranteePercentage?: number
    partialPaymentPercentage?: number
  }
}

export function PaymentTypeSection({
  selectedType,
  onSelect,
  viewType = 'desktop',
  paymentTypes = FILTERED_PAYMENT_TYPES,
  paymentConfig
}: PaymentTypeSectionProps) {
  const selectedTypeData = selectedType ? PAYMENT_TYPES.find(t => t.id === selectedType) : null
  const [showList, setShowList] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Estado para controlar la visibilidad del modal en móvil
  const [showModal, setShowModal] = useState(false)
  
  // Estado para controlar la visibilidad del modal de garantía
  const [showGuaranteeModal, setShowGuaranteeModal] = useState(false)
  
  // Estado para almacenar temporalmente el tipo seleccionado antes de confirmar
  const [pendingGuaranteeSelection, setPendingGuaranteeSelection] = useState<PaymentTypeEnum | null>(null)
  
  // Estado para almacenar el porcentaje de garantía
  const [guaranteePercentage, setGuaranteePercentage] = useState<number>(paymentConfig?.guaranteePercentage || 30)

  // Manejar clics fuera del componente para cerrar la lista
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowList(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Función para alternar la visualización de la lista
  const toggleList = () => {
    if (viewType === 'mobile') {
      setShowModal(true)
    } else {
      setShowList(!showList)
    }
  }

  // Función para manejar la selección de un tipo de pago
  const handleSelectPaymentType = (type: PaymentTypeEnum) => {
    // Verificar si estamos en el caso especial donde garantía actúa como booking
    const specialCase = isGuaranteeActingAsBooking(paymentTypes);
    
    // Si es garantía pero NO estamos en el caso especial, mostrar el modal de confirmación
    if (type === 'guarantee' && !specialCase) {
      // Si es garantía normal, guardar la selección pendiente y mostrar el modal de confirmación
      setPendingGuaranteeSelection(type);
      setShowGuaranteeModal(true);
      setShowList(false);
      setShowModal(false);
    } else {
      // Para otros tipos de pago o garantía en caso especial, seleccionar directamente
      onSelect(type);
      setShowList(false);
      setShowModal(false);
    }
  };

  // Función para confirmar la selección de garantía
  const handleGuaranteeConfirm = () => {
    if (pendingGuaranteeSelection) {
      onSelect(pendingGuaranteeSelection, guaranteePercentage);
      setPendingGuaranteeSelection(null);
    }
    setShowGuaranteeModal(false);
  };

  // Función para cancelar la selección de garantía
  const handleGuaranteeCancel = () => {
    setPendingGuaranteeSelection(null);
    setShowGuaranteeModal(false);
  };

  // Manejar el clic en el selector
  const handleSelectorClick = () => {
    toggleList()
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

      {/* Lista desplegable de opciones */}
      <AnimatePresence>
        {showList && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.3 }}
            className="absolute z-30 w-full mt-1 bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200"
          >
            <div className="p-3">
              <PaymentTypeList
                selectedType={selectedType}
                onSelect={handleSelectPaymentType}
                paymentTypes={paymentTypes}
                isExpanded={true}
                noContainer={true}
                viewType={viewType}
                paymentConfig={paymentConfig}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal para móvil */}
      {showModal && (
        <PaymentTypeModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Seleccionar tipo de pago"
        >
          <PaymentTypeList
            selectedType={selectedType}
            onSelect={handleSelectPaymentType}
            paymentTypes={paymentTypes}
            paymentConfig={paymentConfig}
            noContainer={true}
            viewType={viewType}
          />
        </PaymentTypeModal>
      )}

      {/* Modal de confirmación de garantía */}
      {showGuaranteeModal && (
        <GuaranteeConfirmationModal
          isOpen={showGuaranteeModal}
          onClose={handleGuaranteeCancel}
          onConfirm={handleGuaranteeConfirm}
          onCancel={handleGuaranteeCancel}
          guaranteePercentage={guaranteePercentage}
          onPercentageChange={setGuaranteePercentage}
        />
      )}
    </motion.div>
  )
}
