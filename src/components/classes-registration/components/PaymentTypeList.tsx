"use client"

import { cn } from "@/lib/utils"
import { Check, CreditCard, Wallet, Building } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useState, useMemo } from "react"
import { PaymentType, PaymentTypeEnum, PAYMENT_TYPES, EXCLUDED_PAYMENT_OPTIONS } from "./payment-types"

// Función para obtener el icono correspondiente a cada tipo de pago
function getPaymentTypeIcon(typeId: string) {
  switch (typeId) {
    case 'guarantee':
      return CreditCard
    case 'booking':
      return Building
    case 'deposit':
    case 'full':
    default:
      return Wallet
  }
}

interface PaymentTypeItemProps {
  type: PaymentType
  isSelected: boolean
  onClick: () => void
}

function PaymentTypeItem({ type, isSelected, onClick }: PaymentTypeItemProps) {
  const Icon = getPaymentTypeIcon(type.id)
  
  return (
    <motion.div
      whileHover={{ scale: 1.01, x: 2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "p-3 rounded-lg cursor-pointer",
        "flex items-center justify-between mb-1 mx-1",
        "transition-all duration-200 ease-in-out",
        // Eliminamos la sombra y ajustamos el hover
        isSelected 
          ? "bg-gray-100 border border-gray-200" 
          : "hover:bg-gray-50"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-md",
          isSelected ? "bg-white" : "bg-gray-50", // Eliminamos shadow-sm
          "transition-colors duration-200"
        )}>
          <Icon className={cn(
            "h-4 w-4",
            isSelected ? "text-green-500" : "text-gray-500"
          )} />
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
  // Filtrar las opciones de pago
  const filteredPaymentTypes = useMemo(() => {
    return paymentTypes.filter(type => !EXCLUDED_PAYMENT_OPTIONS.includes(type.name))
  }, [paymentTypes])
  
  // Función para manejar la selección de un tipo de pago
  const handleTypeSelect = (type: PaymentTypeEnum) => {
    console.log(`[PaymentTypeList] Seleccionando tipo de pago: ${type}`)
    
    // Obtener información completa del tipo seleccionado
    const typeInfo = filteredPaymentTypes.find(t => t.id === type)
    
    // Añadir información detallada en los logs
    console.log(`[PaymentTypeList] Detalles del tipo seleccionado:`, {
      id: type,
      name: typeInfo?.name || type,
      description: typeInfo?.description || 'Sin descripción',
      requiresCard: typeInfo?.requiresCard || false,
      paymentConfig: paymentConfig // Log de la configuración de pago si está disponible
    })
    
    // Para todos los tipos, seleccionar directamente
    onSelect(type)
  }
  
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

  // Modificamos el componente PaymentTypeItem para usar la descripción actualizada
  const PaymentTypeItemWithConfig = ({ type, isSelected, onClick }: PaymentTypeItemProps) => {
    const Icon = getPaymentTypeIcon(type.id);
    const updatedDescription = getUpdatedDescription(type);
    
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
            <Icon className={cn(
              "h-4 w-4",
              isSelected ? "text-green-500" : "text-gray-500"
            )} />
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
              {updatedDescription}
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
    );
  };
  
  // Contenido de los elementos de la lista con la configuración de pago
  const listContent = (
    <div className="space-y-1">
      <AnimatePresence>
        {filteredPaymentTypes.map((type) => (
          <PaymentTypeItemWithConfig
            key={`${type.id}-${type.name}`}
            type={type}
            isSelected={selectedType === type.id}
            onClick={() => handleTypeSelect(type.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  )

  // Si no se necesita contenedor, devolver solo el contenido
  if (noContainer) {
    return listContent
  }
  
  // Implementación similar a CardList
  if (!isExpanded) {
    return null
  }
  
  return (
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "mt-3", // Agregamos el mismo margen superior que en CardList
            noContainer 
              ? "space-y-1" 
              : "p-3 space-y-1 rounded-lg border border-gray-100 bg-white"
          )}
        >
          {listContent}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
