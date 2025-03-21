"use client"

import { cn } from "@/lib/utils"
import { 
  Check, 
  Wallet, 
  Building, 
  CreditCard, 
  Banknote,
  DollarSign
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"
import { PaymentType, PaymentTypeEnum, PAYMENT_TYPES, EXCLUDED_PAYMENT_OPTIONS } from "./payment-types"

// Componente para PaymentTypeItem
interface PaymentTypeItemProps {
  type: PaymentType
  isSelected: boolean
  onClick: () => void
}

function PaymentTypeItem({ type, isSelected, onClick }: PaymentTypeItemProps) {
  // Renderizar el icono apropiado según el tipo de pago
  const renderIcon = () => {
    switch (type.id) {
      case 'guarantee':
      case 'card':
        return <CreditCard className={cn("h-4 w-4", isSelected ? "text-green-500" : "text-gray-500")} />;
      case 'booking':
        return <Building className={cn("h-4 w-4", isSelected ? "text-green-500" : "text-gray-500")} />;
      case 'cash':
        return <DollarSign className={cn("h-4 w-4", isSelected ? "text-green-500" : "text-gray-500")} />;
      case 'transfer':
        return <Banknote className={cn("h-4 w-4", isSelected ? "text-green-500" : "text-gray-500")} />;
      case 'deposit':
      case 'full':
      default:
        return <Wallet className={cn("h-4 w-4", isSelected ? "text-green-500" : "text-gray-500")} />;
    }
  };
  
  return (
    <motion.div
      whileHover={{ scale: 1.01, x: 2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "p-3 rounded-lg cursor-pointer",
        "flex items-center justify-between mb-1 mx-1",
        "transition-all duration-200 ease-in-out",
        isSelected 
          ? "bg-gray-100 border border-gray-200" 
          : "hover:bg-gray-50"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-md",
          isSelected ? "bg-white" : "bg-gray-50",
          "transition-colors duration-200"
        )}>
          {renderIcon()}
        </div>
        <div className="space-y-1">
          <p className={cn(
            "text-sm font-medium text-gray-900",
            "transition-colors duration-200"
          )}>
            {type.name}
          </p>
          <p className={cn(
            "text-xs text-gray-500",
            "transition-colors duration-200"
          )}>
            {type.description}
          </p>
        </div>
      </div>
      {isSelected && (
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center justify-center ml-2"
        >
          <Check className="h-4 w-4 text-green-500" />
        </motion.div>
      )}
    </motion.div>
  )
}

interface PaymentTypeListProps {
  selectedType: PaymentTypeEnum | null
  onSelect: (type: PaymentTypeEnum) => void
  paymentTypes?: PaymentType[]
  isExpanded?: boolean
  noContainer?: boolean
  viewType?: 'mobile' | 'desktop'
  paymentConfig?: {
    status: string
    currency: string
    guaranteePercentage?: number
    partialPaymentPercentage?: number
  }
}

export function PaymentTypeList({
  selectedType,
  onSelect,
  paymentTypes = PAYMENT_TYPES,
  isExpanded = false,
  noContainer = false,
  viewType = 'desktop',
  paymentConfig
}: PaymentTypeListProps) {
  // Filtrar los tipos de pago excluidos
  const filteredPaymentTypes = paymentTypes.filter(
    type => !EXCLUDED_PAYMENT_OPTIONS.includes(type.id)
  );
  
  // Función para manejar la selección de un tipo de pago
  const handleTypeSelect = (type: PaymentTypeEnum) => {
    console.log(`[PaymentTypeList] Seleccionando tipo de pago: ${type}`);
    
    // Obtener información completa del tipo seleccionado
    const typeInfo = filteredPaymentTypes.find(t => t.id === type);
    
    // Añadir información detallada en los logs
    console.log(`[PaymentTypeList] Detalles del tipo seleccionado:`, {
      id: type,
      name: typeInfo?.name || type,
      description: typeInfo?.description || 'Sin descripción',
      requiresCard: typeInfo?.requiresCard || false,
      paymentConfig: paymentConfig // Log de la configuración de pago si está disponible
    });
    
    // Para todos los tipos, seleccionar directamente
    onSelect(type);
  };
  
  // Función para obtener la descripción actualizada según la configuración de pago
  const getUpdatedDescription = (type: PaymentType): string => {
    // Si no hay configuración de pago, usar la descripción original
    if (!paymentConfig) return type.description;
    
    switch (type.id) {
      case 'guarantee':
        // Si hay un porcentaje de garantía definido, actualizar la descripción
        if (paymentConfig.guaranteePercentage) {
          return `Se cargará el ${paymentConfig.guaranteePercentage}% en caso de no asistencia`;
        }
        break;
      case 'deposit':
        // Si hay un porcentaje de pago parcial definido, actualizar la descripción
        if (paymentConfig.partialPaymentPercentage) {
          return `Paga ahora el ${paymentConfig.partialPaymentPercentage}% y el resto al llegar`;
        }
        break;
    }
    
    return type.description;
  };
  
  // Contenido de los elementos de la lista con la configuración de pago
  const listContent = (
    <div className="space-y-1">
      <AnimatePresence>
        {filteredPaymentTypes.map((type) => (
          <PaymentTypeItem
            key={`${type.id}-${type.name}`}
            type={{
              ...type,
              description: getUpdatedDescription(type)
            }}
            isSelected={selectedType === type.id}
            onClick={() => handleTypeSelect(type.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );

  // Si no se necesita contenedor, devolver solo el contenido
  if (noContainer) {
    return listContent;
  }
  
  // Implementación similar a CardList
  if (!isExpanded) {
    return null;
  }
  
  return (
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, y: -5, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -5, height: 0 }}
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
            {listContent}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
