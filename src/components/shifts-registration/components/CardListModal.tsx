"use client"

import React, { useEffect, useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { StoredCard } from "./card-list/shared/types"
import { CardList } from "./card-list"
import { Elements } from '@stripe/react-stripe-js'
import { useStripePromise, getDefaultStripeOptions } from '@/hooks/useStripePromise'

interface CardListModalProps {
  isOpen: boolean
  onClose: () => void
  cards: StoredCard[]
  selectedCardId?: string
  onSelect: (card: StoredCard) => void
  onAddCard: () => void
  onDeleteCard?: (cardId: string) => void
  isLoading?: boolean
  showCardForm?: boolean
  onCardSetupSuccess?: (paymentMethodId: string) => void
  onCardSetupError?: (error: any) => void
  onCardSetupBack?: () => void
  theme?: 'light' | 'dark'
  stripeAccountId?: string // Importante: usar la cuenta específica del club
  mercadoPagoUserId?: string
  empresaId?: string
  amount?: number // Monto total para validación en pasarelas de pago
}

export function CardListModal({
  isOpen,
  onClose,
  cards,
  selectedCardId,
  onSelect,
  onAddCard,
  onDeleteCard,
  isLoading,
  showCardForm,
  onCardSetupSuccess,
  onCardSetupError,
  onCardSetupBack,
  theme = 'light',
  stripeAccountId,
  mercadoPagoUserId,
  empresaId,
  amount
}: CardListModalProps) {
  // Memoizar la instancia de Stripe para evitar reinicios frecuentes
  const stripePromise = useStripePromise(stripeAccountId)
  const stripeOptions = getDefaultStripeOptions()

  // Función para manejar la selección de tarjeta
  const handleCardSelect = (card: StoredCard) => {
    onSelect(card)
    // Cerrar el modal después de seleccionar
    onClose()
  }

  // Manejador para evitar que los clics dentro del modal cierren el modal
  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  // Efecto para prevenir que el cuerpo de la página se desplace cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      // Bloquear scroll del body cuando el modal está abierto
      document.body.style.overflow = 'hidden'
    } else {
      // Restaurar el scroll cuando el modal se cierra
      document.body.style.overflow = 'auto'
    }
    
    return () => {
      // Asegurarse de restaurar el scroll cuando el componente se desmonte
      document.body.style.overflow = 'auto'
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay con backdrop blur */}
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-white/80 z-[70] flex items-center justify-center"
            onClick={onClose}
          >
            {/* Contenedor del modal */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ 
                type: "spring", 
                damping: 25, 
                stiffness: 300 
              }}
              className="w-[90%] max-w-md max-h-[85vh] bg-white rounded-lg shadow-lg overflow-hidden flex flex-col"
              onClick={handleModalClick}
            >
              {/* Encabezado del modal */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
                <h3 className="text-lg font-medium text-gray-900">
                  Seleccionar método de pago
                </h3>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              
              {/* Contenido del modal */}
              <div 
                className="overflow-y-auto p-4 flex-grow"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#d1d5db transparent',
                  WebkitOverflowScrolling: 'touch'
                }}
              >
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                    <p className="text-sm text-gray-500 text-center">
                      Cargando métodos de pago guardados...
                    </p>
                  </div>
                ) : (
                  <Elements stripe={stripePromise} options={stripeOptions}>
                    <div className="shifts-registration-cardlist-wrapper">
                      <CardList
                        cards={cards}
                        selectedCardId={selectedCardId}
                        onSelect={handleCardSelect}
                        onAddCard={onAddCard}
                        onDeleteCard={onDeleteCard}
                        isExpanded={true}
                        isLoading={isLoading}
                        showCardForm={showCardForm}
                        onCardSetupSuccess={onCardSetupSuccess}
                        onCardSetupError={onCardSetupError}
                        onCardSetupBack={onCardSetupBack}
                        theme={theme}
                        stripeAccountId={stripeAccountId}
                        mercadoPagoUserId={mercadoPagoUserId}
                        empresaId={empresaId}
                        amount={amount}
                        viewType="mobile"
                      />
                    </div>
                  </Elements>
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
