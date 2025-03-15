"use client"

import { X, CreditCard, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { useState, useEffect, useCallback, useRef } from "react"
import { CardList } from "./CardList"
import { useStoredCards } from "@/hooks/useStoredCards"
import { StripeProvider } from "@/contexts/StripeContext"
import { useAuth } from "@/contexts/AuthContext"
import { CardBrandIcon } from "./CardBrandIcon"

// Definimos la interfaz para un método de pago
export interface PaymentMethod {
  id: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
  type: 'card' | 'cash' | 'transfer'
  name: string
  description: string
  customerId?: string
}

export interface PaymentSectionProps {
  theme?: 'light' | 'dark';
  selectedMethod: PaymentMethod | null
  onShowMethods: () => void
  onUpdateMethod: (method: PaymentMethod) => Promise<void>
  onRemoveMethod: () => void
  viewType?: "mobile" | "desktop"
  stripeAccountId?: string
  expandCardList?: boolean
  className?: string
}

export function PaymentSection({
  selectedMethod,
  onShowMethods,
  onUpdateMethod,
  onRemoveMethod,
  viewType = "desktop",
  stripeAccountId,
  expandCardList = false,
  className
}: PaymentSectionProps) {
  const [localMethod, setLocalMethod] = useState<PaymentMethod | null>(null)
  const [isListExpanded, setIsListExpanded] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  
  const [originalOnShowMethods] = useState(() => onShowMethods)
  
  // Hook para cargar las tarjetas guardadas
  const { cards = [], isLoading: isCardsLoading, error: cardsError, deleteCard } = useStoredCards(refreshTrigger, {
    autoLoad: true // Siempre cargar las tarjetas independientemente del estado de expandCardList
  })

  // Actualizar método seleccionado cuando cambia desde props
  useEffect(() => {
    if (selectedMethod && selectedMethod.id) {
      console.log('Actualizando método de pago local:', selectedMethod)
      setLocalMethod(selectedMethod)
      // No cerramos la lista aquí para evitar conflictos con la selección manual
    } else {
      setLocalMethod(null)
    }
  }, [selectedMethod])

  // Actualizar expansión de la lista cuando cambia desde props
  useEffect(() => {
    // Solo actualizamos el estado si expandCardList es true y la lista no está ya expandida
    // Esto previene un ciclo de re-expansión después de una selección
    if (expandCardList === true && !isListExpanded) {
      setIsListExpanded(true)
    }
  }, [expandCardList, isListExpanded])

  // Procesar la selección de una tarjeta
  const processCardSelection = useCallback((card: any) => {
    console.log('Procesando selección de tarjeta:', card)
    
    try {
      const paymentMethod: PaymentMethod = {
        id: card.id,
        brand: card.brand,
        last4: card.last4,
        expMonth: card.expMonth,
        expYear: card.expYear,
        type: 'card',
        name: `${card.brand} terminada en ${card.last4}`,
        description: `Expira: ${card.expMonth.toString().padStart(2, '0')}/${card.expYear}`,
        customerId: card.customerId
      }

      // Actualizar estado local
      setLocalMethod(paymentMethod)
      
      // Propagar al contexto global
      if (onUpdateMethod) {
        console.log('[PaymentSection] Actualizando método de pago global:', paymentMethod)
        onUpdateMethod(paymentMethod)
          .then(() => {
            console.log('Tarjeta seleccionada correctamente')
          })
          .catch(error => {
            console.error('Error al actualizar método de pago:', error)
          })
      } else {
        console.warn('[PaymentSection] onUpdateMethod no disponible')
      }

      return paymentMethod
    } catch (error) {
      console.error('Error al seleccionar la tarjeta:', error)
      return false
    }
  }, [onUpdateMethod])

  // Abrir modal de métodos de pago
  const openPaymentMethodModal = useCallback(() => {
    console.log('Abriendo modal de métodos de pago')
    originalOnShowMethods()
  }, [originalOnShowMethods])

  // Manejar la selección de tarjeta con un sistema de bloqueo para evitar reaperturas
  const isProcessingRef = useRef(false);

  const handleCardSelect = useCallback((card: any) => {
    console.log('[PaymentSection] handleCardSelect llamado con:', card)
    
    // Si ya estamos procesando una selección, ignorar
    if (isProcessingRef.current) {
      console.log('[PaymentSection] Ignorando selección - ya hay una selección en proceso')
      return;
    }
    
    // Activar el bloqueo
    isProcessingRef.current = true;
    
    // Cerrar inmediatamente la lista
    setIsListExpanded(false);
    
    // Procesar la selección después de un pequeño retraso
    setTimeout(() => {
      processCardSelection(card);
      
      // Liberar el bloqueo después de procesar
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 300);
    }, 50);
  }, [processCardSelection]);

  // Manejar la adición de una tarjeta
  const handleAddCard = () => {
    console.log('Abriendo modal para agregar tarjeta')
    openPaymentMethodModal()
  }

  // Manejar la eliminación del método de pago
  const handleRemoveMethod = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation()
    setLocalMethod(null)
    onRemoveMethod()
    setIsListExpanded(false)
  }, [onRemoveMethod])

  // Verificar si el método está completo
  const isMethodComplete = useCallback(() => {
    const method = localMethod || selectedMethod
    if (!method) return false

    return (
      method.id &&
      method.brand &&
      method.last4 &&
      typeof method.expMonth === 'number' &&
      typeof method.expYear === 'number'
    )
  }, [localMethod, selectedMethod])

  const methodToDisplay = localMethod || selectedMethod

  // Manejar el clic en el componente principal
  const handleComponentClick = useCallback(() => {
    // Si hay tarjetas disponibles o estamos cargando, mostrar/ocultar la lista
    if (viewType === 'desktop') {
      if (!isCardsLoading || cards.length > 0 || isCardsLoading) {
        console.log('[PaymentSection] Toggle lista de tarjetas')
        setIsListExpanded(!isListExpanded)
      } 
      // Si no hay tarjetas disponibles, abrir el modal
      else {
        console.log('[PaymentSection] No hay tarjetas disponibles, mostrar modal')
        openPaymentMethodModal()
      }
    } 
    // Comportamiento para otras vistas
    else {
      if (!isCardsLoading && cards.length > 0) {
        setIsListExpanded(!isListExpanded)
      } else {
        openPaymentMethodModal()
      }
    }
  }, [isCardsLoading, cards.length, isListExpanded, viewType, openPaymentMethodModal])

  // Función para obtener el mensaje de error de forma segura
  const getErrorMessage = (error: unknown): string => {
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
      return error.message
    }
    return 'Intente nuevamente.'
  }

  const hasError = cardsError !== null && cardsError !== undefined

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className={cn("space-y-3", className)}
    >
      <div
        onClick={handleComponentClick}
        className={cn(
          "w-full rounded-lg cursor-pointer",
          "transition-all duration-200",
          methodToDisplay
            ? "p-3 border border-gray-200"
            : "h-[52px] border border-gray-200",
          "bg-white",
          "hover:border-gray-300",
          "shadow-[0_1px_4px_-2px_rgba(0,0,0,0.05)]",
          !methodToDisplay && "flex items-center justify-between"
        )}
      >
        {!methodToDisplay ? (
          <>
            <div className="flex items-center gap-3 px-4 h-full">
              <CreditCard className="h-[18px] w-[18px] text-gray-500" />
              <span className="text-[15px] font-medium text-gray-500">
                Método de Pago
              </span>
            </div>
            <div className="pr-4">
              <ChevronDown className={cn(
                "h-[18px] w-[18px] transition-transform duration-300",
                isListExpanded && "transform rotate-180",
                "text-gray-500"
              )} />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gray-100 p-2 rounded-md flex items-center justify-center">
                <CardBrandIcon 
                  brand={methodToDisplay.brand} 
                  theme="light"
                  className="h-6 w-10"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900">
                  {methodToDisplay.name}
                </span>
                <span className="text-xs mt-1 text-gray-500">
                  {methodToDisplay.description}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform duration-300",
                isListExpanded && "transform rotate-180",
                "text-gray-500"
              )} />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemoveMethod()
                }}
                className="p-1.5 rounded-lg transition-colors duration-200 text-gray-400 hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <CardList
        cards={cards}
        selectedCardId={methodToDisplay?.id}
        onSelect={handleCardSelect}
        onAddCard={handleAddCard}
        onDeleteCard={deleteCard}
        isExpanded={isListExpanded}
        isLoading={isCardsLoading}
      />

      {hasError && (
        <div className="text-xs p-2 rounded-md text-center mt-1 text-red-500 bg-red-50">
          Error al cargar los métodos de pago. {getErrorMessage(cardsError)}
        </div>
      )}
    </motion.div>
  )
}

// Componente wrapper que proporciona el StripeProvider
export function PaymentSectionWithStripe(props: PaymentSectionProps) {
  // Estado local para gestionar errores
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  // Validar que tenemos un ID de cuenta Stripe válido
  const isValidStripeId = props.stripeAccountId && 
                         props.stripeAccountId.startsWith('acct_') && 
                         props.stripeAccountId.length > 10;
  
  // Validar que tenemos un usuario
  const isValidUser = Boolean(user && user.id);
  
  // Efecto para logging y control de carga
  useEffect(() => {
    // Solo considerar cargado después de un tiempo razonable
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    console.log('[PaymentSectionWithStripe] Estado:', {
      stripeAccountId: props.stripeAccountId,
      isValidStripeId,
      isValidUser,
      userId: user?.id,
      userEmail: user?.email,
      isLoading
    });
    
    if (!isLoading) {
      if (!isValidStripeId) {
        setError('ID de cuenta Stripe inválido');
      } else if (!isValidUser) {
        setError('Usuario no disponible');
      } else {
        setError(null);
      }
    }
    
    return () => clearTimeout(timer);
  }, [props.stripeAccountId, isValidStripeId, isValidUser, user, isLoading]);
  
  if (error && !isLoading) {
    console.error(`[PaymentSectionWithStripe] Error: ${error}`, {
      stripeAccountId: props.stripeAccountId,
      userId: user?.id
    });
    // En caso de error, mostrar un mensaje o un componente alternativo
    return (
      <div className="p-4 border border-red-200 rounded-lg bg-red-50 text-red-700 text-sm">
        No se puede cargar la información de pago. {error}
      </div>
    );
  }
  
  return (
    <StripeProvider 
      empresaId={props.stripeAccountId || null}
      isConnected={true}
      isLoading={false}
      error={null}
      charges_enabled={true}
    >
      <PaymentSection {...props} />
    </StripeProvider>
  )
}
