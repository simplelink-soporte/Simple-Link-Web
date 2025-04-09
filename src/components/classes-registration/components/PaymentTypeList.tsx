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
    case 'booking':
      return typeId === 'booking' ? Building : CreditCard
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
          {type.details && (
            <ul className="text-xs text-gray-500 list-disc pl-4 space-y-1">
              {type.details.map((detail, index) => (
                <li key={index}>{detail}</li>
              ))}
            </ul>
          )}
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
  // Verificar si existe garantía pero no booking
  const hasGuarantee = paymentTypes.some(type => type.id === 'guarantee');
  const hasBooking = paymentTypes.some(type => type.id === 'booking');
  const showGuaranteeAsBooking = hasGuarantee && !hasBooking;

  // Crear tipos de pago modificados con el caso especial
  const modifiedPaymentTypes = [...paymentTypes]; // Clonar el array original

  // Si tenemos garantía pero no booking, reemplazamos la descripción y nombre de garantía
  if (showGuaranteeAsBooking) {
    for (let i = 0; i < modifiedPaymentTypes.length; i++) {
      if (modifiedPaymentTypes[i].id === 'guarantee') {
        // Modificar la opción de garantía para mostrarla como "Pago en el Club"
        modifiedPaymentTypes[i] = {
          ...modifiedPaymentTypes[i],
          name: 'Pago en el Club',
          description: 'Pagar al llegar al club',
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
  
  // Filtrar las opciones de pago
  const filteredPaymentTypes = useMemo(() => {
    return modifiedPaymentTypes.filter(type => !EXCLUDED_PAYMENT_OPTIONS.includes(type.id))
  }, [modifiedPaymentTypes])
  
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
        if (paymentConfig.guaranteePercentage && !showGuaranteeAsBooking) {
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
            {type.details && (
              <ul className="text-xs text-gray-500 list-disc pl-4 space-y-1">
                {type.id === 'deposit' && paymentConfig?.partialPaymentPercentage
                  ? [
                      // Reemplazar el detalle de la seña con el porcentaje configurado
                      `Paga una seña del ${paymentConfig.partialPaymentPercentage}% ahora y el resto al llegar al club`
                    ].map((detail, index) => (
                      <li key={index}>{detail}</li>
                    ))
                  : type.details.map((detail, index) => (
                      <li key={index}>{detail}</li>
                    ))
                }
              </ul>
            )}
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

  return (
    <div className={cn(
      !noContainer && "space-y-3",
      'w-full'
    )}>
      {!noContainer && (
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm text-gray-900">Selecciona tu tipo de pago</h3>
        </div>
      )}
      <div>
        {filteredPaymentTypes.map((type) => (
          <PaymentTypeItemWithConfig
            key={type.id}
            type={type}
            isSelected={selectedType === type.id}
            onClick={() => handleTypeSelect(type.id as PaymentTypeEnum)}
          />
        ))}
      </div>
    </div>
  )
}
