"use client"

import { useRef, useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check, ChevronDown as IconChevronDown, ChevronRight as IconChevronRight, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { PaymentTypeList } from "./PaymentTypeList"
import { PaymentTypeEnum, PAYMENT_TYPES } from "./payment-types"
import { PaymentTypeModal } from "./PaymentTypeModal"
import { useShiftForm } from '../context/ShiftFormContext'

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
  availablePaymentMethods?: string[];
}

export function PaymentTypeSection({
  selectedPaymentMethod,
  setSelectedPaymentMethod,
  className,
  paymentConfig,
  availablePaymentMethods
}: PaymentTypeSectionProps) {
  const [showPaymentList, setShowPaymentList] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { state } = useShiftForm();
  
  // Obtiene los métodos de pago disponibles, ya sea de props o del contexto
  const paymentMethodsAvailable = availablePaymentMethods || state.availablePaymentMethods;
  
  // Creamos una configuración de pago basada en los porcentajes del contexto si no se proporciona directamente
  const effectivePaymentConfig = paymentConfig || {
    status: 'active',
    currency: 'EUR',
    guaranteePercentage: state.paymentPercentages?.garantia || state.paymentPercentages?.guarantee || 40,
    partialPaymentPercentage: state.paymentPercentages?.sena || state.paymentPercentages?.deposit || 25
  };
  
  // Verificar si tenemos el caso especial: garantía sin booking
  const hasGuarantee = paymentMethodsAvailable?.includes('guarantee');
  const hasBooking = paymentMethodsAvailable?.includes('booking');
  const showGuaranteeAsBooking = hasGuarantee && !hasBooking;

  // Filtra los tipos de pago disponibles según la configuración
  const availableTypes = paymentMethodsAvailable && paymentMethodsAvailable.length > 0
    ? PAYMENT_TYPES.filter(type => paymentMethodsAvailable.includes(type.id))
    : PAYMENT_TYPES;
  
  // Modificamos los tipos de pago si es necesario para el caso especial
  const displayTypes = [...availableTypes];
  if (showGuaranteeAsBooking) {
    // Para cada tipo, si es garantía, modificamos su presentación
    for (let i = 0; i < displayTypes.length; i++) {
      if (displayTypes[i].id === 'guarantee') {
        displayTypes[i] = {
          ...displayTypes[i],
          name: 'Pago en el Club',
          description: 'Pagar al llegar al club',
          // Mantenemos los detalles de garantía para que el usuario sepa que se le pedirá tarjeta
          details: [
            'Se solicitarán los datos de tu tarjeta como garantía',
            'No se realizará ningún cargo inmediato',
            'En caso de no presentarse, se realizará un cargo del porcentaje establecido'
          ]
        };
        break;
      }
    }
  }

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
  
  // Datos del tipo de pago seleccionado - usamos displayTypes para mostrar el nombre adaptado
  const selectedTypeData = selectedPaymentMethod 
    ? displayTypes.find(t => t.id === selectedPaymentMethod) 
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
      
      {/* Modal para dispositivos móviles */}
      <AnimatePresence>
        {showModal && (
          <PaymentTypeModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            onSelect={handleSelectPaymentMethod}
            selectedPaymentMethod={selectedPaymentMethod}
            paymentTypes={displayTypes}
            paymentConfig={effectivePaymentConfig}
          />
        )}
      </AnimatePresence>

      {/* Dropdown de opciones para desktop */}
      <AnimatePresence>
        {showPaymentList && !isMobile && (
          <PaymentTypeList
            selectedType={selectedPaymentMethod}
            onSelect={handleSelectPaymentMethod}
            paymentTypes={displayTypes}
            isExpanded={showPaymentList}
            paymentConfig={effectivePaymentConfig}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
