"use client"

import { X, CreditCard, ChevronDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { useState, useEffect, useCallback, useRef } from "react"
// Actualizar importación para usar la nueva estructura modular
import { CardList } from "./card-list"
import { CardListModal } from "./CardListModal"
import { useStoredCards } from "@/hooks/useStoredCards"
import { StripeProvider } from "@/contexts/StripeContext"
import { useAuth } from "@/contexts/AuthContext"
import { CardBrandIcon } from "./CardBrandIcon"
import { useStripe } from '@/contexts/StripeContext'

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
  empresaId?: string
  amount?: number  // Añadir soporte para el monto a mostrar
}

export function PaymentSection({
  selectedMethod,
  onShowMethods,
  onUpdateMethod,
  onRemoveMethod,
  viewType = "desktop",
  stripeAccountId,
  expandCardList = false,
  className = "",
  theme = 'light',
  empresaId,
  amount
}: PaymentSectionProps) {
  const { user } = useAuth()
  const [isListExpanded, setIsListExpanded] = useState(expandCardList)
  const [showCardForm, setShowCardForm] = useState(false)
  const [localMethod, setLocalMethod] = useState<PaymentMethod | null>(selectedMethod)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [showCardModal, setShowCardModal] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Context de Stripe
  let stripeContext = null;
  let isStripeAvailable = true;

  try {
    stripeContext = useStripe();
  } catch (error) {
    isStripeAvailable = false;
    console.log('Stripe no está disponible:', error);
  }
  
  // Hook para cargar las tarjetas guardadas
  const storedCards = useStoredCards(empresaId || null, refreshTrigger, {
    autoLoad: true // Siempre cargar las tarjetas independientemente del estado de expandCardList
  });

  const { cards = [], isLoading: isCardsLoading, error: cardsError, deleteCard, gatewayInfo } = storedCards

  // Verificar status empresaId para debugging
  useEffect(() => {
    if (stripeAccountId) {
      console.log('[PaymentSection] stripeAccountId recibido:', stripeAccountId);
    } else {
      console.log('[PaymentSection] No se recibió stripeAccountId en props');
    }
  }, [stripeAccountId]);

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
    // No actualizamos cuando expandCardList es false ya que eso podría ser
    // gestionado por la lógica interna del componente
  }, [expandCardList, isListExpanded])

  // Control para actualizar el refreshTrigger solo cuando sea necesario
  const lastRefreshTimestamp = useRef<number>(Date.now());
  const MIN_REFRESH_INTERVAL = 30000; // 30 segundos como mínimo entre recargas

  const refreshCards = useCallback(() => {
    const now = Date.now();
    // Solo permitir refrescar si ha pasado suficiente tiempo desde la última recarga
    if (now - lastRefreshTimestamp.current > MIN_REFRESH_INTERVAL) {
      console.log('[PaymentSection] Solicitando recarga de tarjetas...');
      lastRefreshTimestamp.current = now;
      setRefreshTrigger(prev => prev + 1);
    } else {
      console.log('[PaymentSection] Recarga ignorada: demasiado frecuente');
    }
  }, []);

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
  const originalOnShowMethods = onShowMethods;
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

    // Marcar que estamos procesando
    isProcessingRef.current = true;
    
    // Cerrar modal si estamos en móvil
    if (viewType === 'mobile') {
      setShowCardModal(false);
      setShowCardForm(false);
    }
    
    // Cerrar la lista desplegable
    setIsListExpanded(false)
    
    // Procesar la selección
    const result = processCardSelection(card);
    
    // Desmarcar el procesamiento cuando termine
    setTimeout(() => {
      isProcessingRef.current = false;
    }, 300);
    
  }, [processCardSelection, viewType])

  // Manejar la adición de una tarjeta
  const handleAddCard = () => {
    if (!isStripeAvailable) {
      console.error('El sistema de pagos no está disponible');
      return;
    }

    if (!stripeContext?.isConnected) {
      console.error('La cuenta de Stripe no está configurada correctamente');
      return;
    }

    setShowCardForm(true);
    setIsListExpanded(false);
  }

  // Manejar el éxito al guardar una tarjeta
  const handleCardSetupSuccess = async (paymentMethodId: string) => {
    try {
      setShowCardForm(false);
      refreshCards();
      
      // Esperar a que las tarjetas se recarguen
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Buscar la nueva tarjeta y seleccionarla
      const newCard = cards.find(card => card.id === paymentMethodId);
      if (newCard) {
        processCardSelection(newCard);
      }
      
      console.log('Tarjeta agregada correctamente');
    } catch (error) {
      console.error('Error al configurar la tarjeta:', error);
    }
  };

  // Manejar error al guardar una tarjeta
  const handleCardSetupError = (error: any) => {
    console.error('Error al configurar la tarjeta:', error.message || error);
    setShowCardForm(false);
  };

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
    // No hacer nada si el formulario de tarjeta está visible
    if (showCardForm) return;
    
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
    // Comportamiento para móvil: mostrar el modal
    else if (viewType === 'mobile') {
      console.log('[PaymentSection] Versión móvil: abriendo modal de tarjetas')
      setShowCardModal(true)
    }
    // Comportamiento para otras vistas
    else {
      if (!isCardsLoading && cards.length > 0) {
        setIsListExpanded(!isListExpanded)
      } else {
        openPaymentMethodModal()
      }
    }
  }, [isCardsLoading, cards.length, viewType, isListExpanded, showCardForm, openPaymentMethodModal])

  // Función para manejar el botón "Volver" en el formulario de tarjeta
  const handleCardSetupBack = () => {
    setShowCardForm(false);
  };

  const getErrorMessage = (error: any): string => {
    if (!error) return '';
    if (typeof error === 'string') return error;
    return error.message || 'Error desconocido';
  };

  const hasError = cardsError && cardsError.message;

  // Expandir/colapsar la lista
  const toggleList = useCallback(() => {
    setIsListExpanded(prev => !prev)
  }, [])

  // Manejar la eliminación de una tarjeta
  const handleDeleteCard = useCallback(async (cardId: string) => {
    try {
      await deleteCard(cardId)
      
      // Si la tarjeta eliminada es la seleccionada, limpiar la selección
      if (methodToDisplay?.id === cardId) {
        handleRemoveMethod()
      }
      
      // No actualizamos el refreshTrigger directamente para evitar recargas en bucle
      console.log('[PaymentSection] Tarjeta eliminada correctamente');
    } catch (error) {
      console.error('[PaymentSection] Error al eliminar tarjeta:', error)
    }
  }, [deleteCard, methodToDisplay, handleRemoveMethod])

  return (
    <motion.div 
      className={cn("relative", className)}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div
        onClick={handleComponentClick}
        className={cn(
          "w-full rounded-lg cursor-pointer transition-all duration-200",
          methodToDisplay
            ? "p-3 border border-gray-100 dark:border-neutral-800"
            : "h-[52px] border border-gray-200 dark:border-neutral-800",
          "bg-white dark:bg-neutral-900",
          "hover:border-gray-300 dark:hover:border-neutral-700",
          "shadow-[0_1px_4px_-2px_rgba(0,0,0,0.05)]",
          "dark:shadow-[0_1px_4px_-2px_rgba(0,0,0,0.3)]",
          !methodToDisplay && "flex items-center justify-between"
        )}
      >
        {!methodToDisplay ? (
          <>
            <div className="flex items-center gap-3 px-4 h-full">
              <CreditCard className="h-[18px] w-[18px] text-gray-500 dark:text-gray-400" />
              <span className="text-[15px] font-medium text-gray-500 dark:text-gray-400">
                Método de Pago
              </span>
            </div>
            <div className="pr-4">
              <ChevronDown className={cn(
                "h-[18px] w-[18px] transition-transform duration-300",
                isListExpanded && "transform rotate-180",
                "text-gray-500 dark:text-gray-400"
              )} />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-md bg-gray-50 dark:bg-neutral-800">
                <CardBrandIcon 
                  brand={methodToDisplay.brand}
                  theme={theme}
                  className="text-gray-600 dark:text-gray-400" 
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-200">
                  {methodToDisplay.name}
                </span>
                <span className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                  {methodToDisplay.description}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-1.5 rounded-md",
                isListExpanded 
                  ? "bg-gray-100 dark:bg-neutral-700" 
                  : "hover:bg-gray-100 dark:hover:bg-neutral-800",
              )}>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform duration-300",
                  isListExpanded && "transform rotate-180",
                  "text-gray-500 dark:text-gray-400"
                )} />
              </div>
              <button
                onClick={(e) => handleRemoveMethod(e)}
                className={cn(
                  "p-1.5 rounded-md",
                  "hover:bg-gray-100 dark:hover:bg-neutral-800",
                  "text-gray-500 dark:text-gray-400"
                )}
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
        onDeleteCard={handleDeleteCard}
        isExpanded={isListExpanded}
        isLoading={isCardsLoading}
        showCardForm={showCardForm}
        onCardSetupSuccess={handleCardSetupSuccess}
        onCardSetupError={handleCardSetupError}
        onCardSetupBack={handleCardSetupBack}
        theme={theme}
        stripeAccountId={stripeAccountId}
        amount={amount}
      />

      {hasError && (
        <div className={cn(
          "text-xs p-2 rounded-md text-center mt-1",
          theme === 'dark' ? "text-red-400 bg-red-900/20" : "text-red-500 bg-red-50"
        )}>
          Error al cargar los métodos de pago. {getErrorMessage(cardsError)}
        </div>
      )}
      
      {/* Modal para la versión móvil */}
      {viewType === 'mobile' && (
        <CardListModal
          isOpen={showCardModal}
          onClose={() => {
            setShowCardModal(false);
            setShowCardForm(false);
          }}
          cards={cards}
          selectedCardId={methodToDisplay?.id}
          onSelect={handleCardSelect}
          onAddCard={handleAddCard}
          onDeleteCard={handleDeleteCard}
          isLoading={isCardsLoading}
          showCardForm={showCardForm}
          onCardSetupSuccess={handleCardSetupSuccess}
          onCardSetupError={handleCardSetupError}
          onCardSetupBack={handleCardSetupBack}
          theme={theme}
          stripeAccountId={stripeAccountId}
          amount={amount}
        />
      )}
    </motion.div>
  )
}

// Componente wrapper que proporciona el StripeProvider
export function PaymentSectionWithStripe(props: PaymentSectionProps) {
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
  );
}
