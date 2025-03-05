import { X, CreditCard, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { PaymentMethod } from "../types";
import { useStripe } from '@/contexts/StripeContext';
import { CardBrandIcon } from "./CardBrandIcon";
import { useCallback, useState, useEffect } from "react";
import type { StripeContextType } from '@/contexts/StripeContext';
import { useStoredCards } from "@/hooks/useStoredCards";
import { CardList } from "./CardList";
import { CardSetupForm } from "./CardSetupForm";
import { Button } from "@/components/ui/button";

export interface PaymentSectionProps {
  theme: 'light' | 'dark';
  selectedMethod: PaymentMethod | null;
  onShowMethods: () => void;
  onUpdateMethod: (method: PaymentMethod) => Promise<void>;
  onRemoveMethod: () => void;
  viewType?: "mobile" | "desktop";
  empresaId: string;
  showModalOnSelect?: boolean;
  disableModal?: boolean;
  directCardSelect?: boolean;
  expandCardList?: boolean;
  limitHeight?: boolean;
}

export function PaymentSection({
  theme,
  selectedMethod,
  onShowMethods,
  onUpdateMethod,
  onRemoveMethod,
  viewType = "desktop",
  empresaId,
  showModalOnSelect = false,
  disableModal = false,
  directCardSelect = false,
  expandCardList = false,
  limitHeight = false
}: PaymentSectionProps) {
  const [localMethod, setLocalMethod] = useState<PaymentMethod | null>(null);
  const [isListExpanded, setIsListExpanded] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showCardList, setShowCardList] = useState<boolean>(expandCardList);
  
  const [originalOnShowMethods] = useState(() => onShowMethods);
  
  let stripeContext: StripeContextType | null = null;
  let isStripeAvailable = true;

  try {
    stripeContext = useStripe();
  } catch (error) {
    isStripeAvailable = false;
    console.log('Stripe no está disponible:', error);
  }

  const { cards = [], isLoading: isCardsLoading, error: cardsError, deleteCard } = useStoredCards(refreshTrigger, {
    autoLoad: isListExpanded || showCardForm || expandCardList
  });

  useEffect(() => {
    if (selectedMethod && selectedMethod.id) {
      console.log('Actualizando método de pago local:', selectedMethod);
      setLocalMethod(selectedMethod);
      setIsListExpanded(false);
    } else {
      setLocalMethod(null);
    }
  }, [selectedMethod]);

  useEffect(() => {
    if (expandCardList !== undefined) {
      setIsListExpanded(expandCardList);
    }
  }, [expandCardList]);

  const processCardSelection = useCallback((card: any) => {
    console.log('Procesando selección directa de tarjeta:', card);
    
    try {
      const paymentMethod: PaymentMethod = {
        id: card.id,
        brand: card.brand,
        last4: card.last4,
        expMonth: card.expMonth,
        expYear: card.expYear,
        type: 'card',
        name: `${card.brand} terminada en ${card.last4}`,
        description: `Expira: ${card.expMonth.toString().padStart(2, '0')}/${card.expYear}`
      };

      // Actualizar estado local
      setLocalMethod(paymentMethod);
      setIsListExpanded(false);

      // Propagar al contexto global
      if (onUpdateMethod) {
        console.log('[PaymentSection] Actualizando método de pago global con:', paymentMethod);
        onUpdateMethod(paymentMethod)
          .then(() => {
            // Eliminar notificación
            // toast.success('Tarjeta seleccionada correctamente');
          })
          .catch(error => {
            console.error('Error al actualizar método de pago:', error);
            // Eliminar notificación
            // toast.error('Error al actualizar método de pago');
          });
      } else {
        console.warn('[PaymentSection] onUpdateMethod no disponible, no se actualizará el estado global');
        // Eliminar notificación
        // toast.success('Tarjeta seleccionada localmente');
      }

      // Retornar el método para que pueda ser usado por otros componentes
      return paymentMethod;
    } catch (error) {
      console.error('Error al seleccionar la tarjeta:', error);
      // Eliminar notificación
      // toast.error('Error al seleccionar la tarjeta');
      return false;
    }
  }, [onUpdateMethod]);

  const openPaymentMethodModal = useCallback(() => {
    if (disableModal || directCardSelect) {
      console.log('Modal desactivado, no se abrirá');
      return;
    }
    
    console.log('Abriendo modal de métodos de pago');
    originalOnShowMethods();
  }, [disableModal, directCardSelect, originalOnShowMethods]);

  const handleCardSelect = useCallback((card: any) => {
    console.log('handleCardSelect llamado con:', card);
    
    if (directCardSelect || disableModal) {
      return processCardSelection(card);
    }
    
    try {
      const paymentMethod: PaymentMethod = {
        id: card.id,
        brand: card.brand,
        last4: card.last4,
        expMonth: card.expMonth,
        expYear: card.expYear,
        type: 'card',
        name: `${card.brand} terminada en ${card.last4}`,
        description: `Expira: ${card.expMonth.toString().padStart(2, '0')}/${card.expYear}`
      };

      setLocalMethod(paymentMethod);
      setIsListExpanded(false);

      if (onUpdateMethod) {
        onUpdateMethod(paymentMethod);
      } else if (showModalOnSelect) {
        openPaymentMethodModal();
      }

      // Eliminar notificación
      // toast.success('Tarjeta seleccionada correctamente');
      return true;
    } catch (error) {
      console.error('Error al seleccionar la tarjeta:', error);
      // Eliminar notificación
      // toast.error('Error al seleccionar la tarjeta');
      return false;
    }
  }, [onUpdateMethod, showModalOnSelect, openPaymentMethodModal, directCardSelect, disableModal, processCardSelection]);

  const handleAddCard = () => {
    if (directCardSelect || disableModal) {
      if (!isStripeAvailable) {
        // Eliminar notificación
        // toast.error('El sistema de pagos no está disponible');
        return;
      }

      if (!stripeContext?.isConnected) {
        // Eliminar notificación
        // toast.error('La cuenta de Stripe no está configurada correctamente');
        return;
      }

      setShowCardForm(true);
      return;
    }

    if (!isStripeAvailable) {
      // Eliminar notificación
      // toast.error('El sistema de pagos no está disponible');
      return;
    }

    if (!stripeContext?.isConnected) {
      // Eliminar notificación
      // toast.error('La cuenta de Stripe no está configurada correctamente');
      return;
    }

    if (disableModal) {
      setShowCardForm(true);
    } else {
      openPaymentMethodModal();
    }
  };

  const handleCardSetupSuccess = async (paymentMethodId: string) => {
    try {
      setShowCardForm(false);
      setRefreshTrigger(prev => prev + 1);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newCard = cards.find(card => card.id === paymentMethodId);
      if (newCard) {
        if (directCardSelect || disableModal) {
          processCardSelection(newCard);
        } else {
          handleCardSelect(newCard);
        }
      }
      
      // Eliminar notificación
      // toast.success('Tarjeta agregada correctamente');
    } catch (error) {
      console.error('Error al configurar la tarjeta:', error);
      // Eliminar notificación
      // toast.error('Error al actualizar la lista de tarjetas');
    }
  };

  const handleCardSetupError = (error: any) => {
    // Eliminar notificación
    // toast.error(error.message || 'Error al configurar la tarjeta');
    setShowCardForm(false);
  };

  const handleRemoveMethod = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLocalMethod(null);
    onRemoveMethod();
    setIsListExpanded(false);
  }, [onRemoveMethod]);

  const isMethodComplete = useCallback(() => {
    const method = localMethod || selectedMethod;
    if (!method) return false;

    return (
      method.id &&
      method.brand &&
      method.last4 &&
      typeof method.expMonth === 'number' &&
      typeof method.expYear === 'number'
    );
  }, [localMethod, selectedMethod]);

  const methodToDisplay = localMethod || selectedMethod;

  // Toggle para mostrar/ocultar la lista de tarjetas
  const toggleCardList = useCallback(() => {
    // Si expandCardList es undefined, manejar normalmente
    if (expandCardList === undefined) {
      setShowCardList(prev => !prev);
    }
    // Si expandCardList está definido, solo permitir cerrar la lista
    // (la apertura es controlada por el prop)
    else if (showCardList) {
      setShowCardList(false);
    }
  }, [expandCardList, showCardList]);

  // Función para determinar si hay un error y debería mostrarse
  const hasError = cardsError !== null && cardsError !== undefined;

  // Función para renderizar el mensaje de error de forma segura
  const getErrorMessage = (error: unknown): string => {
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
      return error.message;
    }
    return 'Intente nuevamente.';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="space-y-3"
    >
      <div
        onClick={() => {
          if (!showCardForm) {
            if (directCardSelect || disableModal) {
              setIsListExpanded(!isListExpanded);
            } else {
              if (!isCardsLoading && cards.length > 0) {
                setIsListExpanded(!isListExpanded);
              } else {
                openPaymentMethodModal();
              }
            }
          }
        }}
        className={cn(
          "w-full rounded-lg cursor-pointer",
          "transition-all duration-200",
          methodToDisplay
            ? "p-3 border border-gray-100 dark:border-neutral-800"
            : "h-[52px] border border-gray-100 dark:border-neutral-800",
          "bg-white dark:bg-neutral-900",
          "hover:border-gray-200 dark:hover:border-neutral-700",
          "shadow-[0_1px_4px_-2px_rgba(0,0,0,0.05)]",
          "dark:shadow-[0_1px_4px_-2px_rgba(0,0,0,0.3)]",
          !methodToDisplay && "flex items-center justify-between"
        )}
      >
        {!methodToDisplay ? (
          <>
            <div className="flex items-center gap-3 px-4 h-full">
              <CreditCard className={cn(
                "h-[18px] w-[18px]",
                theme === 'dark' ? "text-gray-400" : "text-gray-500"
              )} />
              <span className={cn(
                "text-[15px] font-medium",
                theme === 'dark' ? "text-gray-400" : "text-gray-500"
              )}>
                Método de Pago
              </span>
            </div>
            <div className="pr-4">
              <ChevronDown className={cn(
                "h-[18px] w-[18px]",
                theme === 'dark' ? "text-gray-400" : "text-gray-500"
              )} />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-1.5 rounded-md",
                theme === 'dark' ? "bg-neutral-800" : "bg-gray-50"
              )}>
                <CardBrandIcon 
                  brand={methodToDisplay.brand} 
                  theme={theme}
                  className={cn(
                    theme === 'dark' ? "text-gray-400" : "text-gray-600"
                  )} 
                />
              </div>
              <div className="flex flex-col">
                <span className={cn(
                  "text-sm font-medium",
                  theme === 'dark' 
                    ? "text-gray-200"
                    : "text-gray-900"
                )}>
                  {methodToDisplay.name}
                </span>
                <span className={cn(
                  "text-xs mt-1",
                  theme === 'dark' 
                    ? "text-gray-400"
                    : "text-gray-500"
                )}>
                  {methodToDisplay.description}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRemoveMethod}
                className={cn(
                  "p-1.5 rounded-lg transition-colors duration-200",
                  theme === 'dark' 
                    ? "text-gray-400 hover:bg-neutral-800"
                    : "text-gray-400 hover:bg-gray-50"
                )}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {!showCardForm && (
        <CardList
          theme={theme}
          cards={cards}
          selectedCardId={methodToDisplay?.id}
          onSelect={directCardSelect || disableModal ? processCardSelection : handleCardSelect}
          onAddCard={handleAddCard}
          onDeleteCard={deleteCard}
          isExpanded={isListExpanded}
          isLoading={isCardsLoading}
        />
      )}

      {showCardForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={cn(
            "p-4 rounded-lg border",
            theme === 'dark'
              ? "bg-neutral-900 border-neutral-800"
              : "bg-white border-gray-200"
          )}
        >
          <CardSetupForm
            onSuccess={handleCardSetupSuccess}
            onError={handleCardSetupError}
            onBack={() => setShowCardForm(false)}
            theme={theme}
          />
        </motion.div>
      )}

      {hasError && (
        <div className={cn(
          "text-xs p-2 rounded-md text-center mt-1",
          theme === 'dark' ? "text-red-400 bg-red-900/20" : "text-red-500 bg-red-50"
        )}>
          Error al cargar los métodos de pago. {getErrorMessage(cardsError)}
        </div>
      )}
    </motion.div>
  );
} 