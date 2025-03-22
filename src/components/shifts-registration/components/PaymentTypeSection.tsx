"use client"

import { useRef, useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check, ChevronDown as IconChevronDown, ChevronRight as IconChevronRight, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { PaymentTypeList } from "./PaymentTypeList"
import { PaymentTypeEnum, PAYMENT_TYPES } from "./payment-types"
import { PaymentTypeModal } from "./PaymentTypeModal"

// Hook personalizado para detectar si estamos en vista móvil
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Función para verificar el ancho de la ventana
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // 768px es el breakpoint estándar para tablet
    };
    
    // Verificar el tamaño inicial
    checkMobile();
    
    // Agregar listener para cambios de tamaño
    window.addEventListener('resize', checkMobile);
    
    // Limpiar listener cuando se desmonta el componente
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return isMobile;
};

interface PaymentTypeSectionProps {
  selectedPaymentMethod: PaymentTypeEnum | null;
  setSelectedPaymentMethod: (type: PaymentTypeEnum | null) => void;
  className?: string;
  paymentConfig?: {
    status: string;
    currency: string;
    guaranteePercentage?: number;
    partialPaymentPercentage?: number;
  };
}

export function PaymentTypeSection({
  selectedPaymentMethod,
  setSelectedPaymentMethod,
  className,
  paymentConfig
}: PaymentTypeSectionProps) {
  const [showPaymentList, setShowPaymentList] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  
  // Función para manejar la selección de tipo de pago
  const handleSelectPaymentMethod = (type: PaymentTypeEnum) => {
    setSelectedPaymentMethod(type);
    setShowPaymentList(false);
    setShowModal(false);
  };
  
  // Función para manejar el mostrar/ocultar la lista de tipos de pago
  const handleSelectPaymentType = () => {
    if (isMobile) {
      setShowModal(true);
    } else {
      setShowPaymentList(!showPaymentList);
    }
  };
  
  // Cerrar la lista cuando se hace clic fuera del componente
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowPaymentList(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [containerRef]);
  
  // Datos del tipo de pago seleccionado
  const selectedTypeData = selectedPaymentMethod 
    ? PAYMENT_TYPES.find(t => t.id === selectedPaymentMethod) 
    : null;
  
  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      {/* Cuando no hay un tipo de pago seleccionado */}
      <div className="w-full">
        {!selectedTypeData ? (
          <motion.div
            whileHover={{ scale: 1.0 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleSelectPaymentType}
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
                  <IconChevronRight className="h-4 w-4 text-gray-500" />
                </div>
                <span className="text-[15px] text-gray-500">
                  Seleccionar tipo de pago
                </span>
              </div>
              <IconChevronDown className={cn(
                "h-4 w-4 transition-transform duration-300 text-gray-500",
                showPaymentList ? "transform rotate-180" : ""
              )} />
            </div>
          </motion.div>
        ) : (
          /* Cuando hay un tipo de pago seleccionado */
          <motion.div
            whileHover={{ scale: 1.0 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleSelectPaymentType}
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
                    {selectedTypeData?.name || selectedPaymentMethod}
                  </span>
                  <span className="text-xs text-gray-500">
                    {selectedTypeData?.description || ''}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <IconChevronDown className={cn(
                  "h-4 w-4 transition-transform duration-300 text-gray-500",
                  showPaymentList ? "transform rotate-180" : ""
                )} />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPaymentMethod(null);
                  }}
                  className="p-1.5 rounded-lg transition-colors text-gray-400 hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
      
      {/* Lista de tipos de pago desplegable (solo para desktop) */}
      <AnimatePresence>
        {showPaymentList && !isMobile && (
          <div className="relative mt-2">
            <PaymentTypeList
              selectedType={selectedPaymentMethod}
              onSelect={handleSelectPaymentMethod}
              isExpanded={true}
              paymentConfig={paymentConfig}
            />
          </div>
        )}
      </AnimatePresence>
      
      {/* Modal de tipos de pago (solo para mobile) */}
      <PaymentTypeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        selectedPaymentMethod={selectedPaymentMethod}
        onSelect={handleSelectPaymentMethod}
        paymentConfig={paymentConfig}
      />
    </div>
  );
}
