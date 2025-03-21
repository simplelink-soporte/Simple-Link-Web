"use client"

import { useRef, useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check, ChevronDown as IconChevronDown, ChevronRight as IconChevronRight, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { PaymentTypeList } from "./PaymentTypeList"
import { PaymentTypeEnum, PAYMENT_TYPES } from "./payment-types"

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
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Función para manejar la selección de tipo de pago
  const handleSelectPaymentMethod = (type: PaymentTypeEnum) => {
    setSelectedPaymentMethod(type);
    setShowPaymentList(false);
  };
  
  // Función para manejar el mostrar/ocultar la lista de tipos de pago
  const handleSelectPaymentType = () => {
    setShowPaymentList(!showPaymentList);
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
      
      {/* Lista de tipos de pago desplegable */}
      <AnimatePresence>
        {showPaymentList && (
          <motion.div
            initial={{ opacity: 0, y: 5, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 5, height: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "absolute left-0 right-0 z-[100] mt-2 w-full",
              "rounded-lg",
              "overflow-hidden bg-white",
              "border border-gray-200",
              "shadow-md"
            )}
          >
            <div className="max-h-[300px] overflow-y-auto scrollbar-hide">
              <PaymentTypeList
                selectedType={selectedPaymentMethod}
                onSelect={handleSelectPaymentMethod}
                isExpanded={true}
                noContainer={true}
                paymentConfig={paymentConfig}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
