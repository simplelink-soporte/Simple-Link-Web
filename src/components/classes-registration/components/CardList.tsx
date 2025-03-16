"use client"

import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Check, X, Loader2, ArrowLeft, CreditCard } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { CardBrandIcon } from "./CardBrandIcon"
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { CardSetupForm } from "@/components/preview/steps/summary/components/CardSetupForm"
import { Button } from "@/components/ui/button"

// Clave pública de Stripe
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string;

interface StoredCard {
  id: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
}

interface CardListProps {
  cards: StoredCard[]
  selectedCardId?: string
  onSelect: (card: StoredCard) => void
  onAddCard: () => void
  onDeleteCard?: (cardId: string) => void
  isExpanded?: boolean
  isLoading?: boolean
  showCardForm?: boolean
  onCardSetupSuccess?: (paymentMethodId: string) => void
  onCardSetupError?: (error: any) => void
  onCardSetupBack?: () => void
  theme?: 'light' | 'dark'
  stripeAccountId?: string
  viewType?: 'mobile' | 'desktop'
}

function CardItem({
  card,
  isSelected = false,
  onClick,
  onDelete,
  theme = 'light',
  viewType = 'desktop'
}: {
  card: StoredCard
  isSelected?: boolean
  onClick: () => void
  onDelete?: () => void
  theme?: 'light' | 'dark'
  viewType?: 'mobile' | 'desktop'
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.01, x: 2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "p-3 rounded-lg cursor-pointer",
        "flex items-center justify-between mb-1 mx-1",
        "transition-all duration-200 ease-in-out",
        viewType === 'mobile' ? "flex-wrap" : "", // Permitir wrap en móvil si es necesario
        isSelected 
          ? "bg-gray-100 border border-gray-200" 
          : "hover:bg-gray-50"
      )}
    >
      <div className={cn(
        "flex items-center gap-3",
        viewType === 'mobile' ? "w-full mb-1" : ""
      )}>
        <div className={cn(
          "p-2 rounded-md",
          isSelected ? "bg-white" : "bg-gray-50",
          "transition-colors duration-200"
        )}>
          <CardBrandIcon 
            brand={card.brand} 
            theme={theme}
            className={cn(
              "h-4 w-4",
              isSelected ? "text-green-500" : "text-gray-500"
            )} 
          />
        </div>
        <div className="space-y-1">
          <span className={cn(
            "text-sm font-medium text-gray-900",
            "transition-colors duration-200"
          )}>
            {card.brand.charAt(0).toUpperCase() + card.brand.slice(1)} **** {card.last4}
          </span>
        </div>
      </div>
      
      {/* Reemplazamos el botón de eliminar por el texto de vencimiento */}
      <div className={cn(
        "flex items-center justify-end",
        viewType === 'mobile' ? "w-full mt-1 justify-between" : ""
      )}>
        <span className={cn(
          "text-xs text-gray-500",
          "transition-colors duration-200"
        )}>
          Exp: {card.expMonth.toString().padStart(2, '0')}/{card.expYear}
        </span>
        
        {isSelected && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center justify-center ml-2"
          >
            <Check className="h-4 w-4 text-green-500" />
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

function AddCardButton({
  onClick,
  theme = 'light',
  viewType = 'desktop'
}: {
  onClick: () => void;
  theme?: 'light' | 'dark';
  viewType?: 'mobile' | 'desktop';
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.01, x: 2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "p-3 rounded-lg cursor-pointer",
        "flex items-center gap-3 mb-1 mx-1",
        "transition-all duration-200 ease-in-out",
        "hover:bg-gray-50",
        viewType === 'mobile' ? "w-full justify-start" : ""
      )}
    >
      <div className="p-2 rounded-md bg-gray-50 transition-colors duration-200">
        <Plus className="h-4 w-4 text-gray-500" />
      </div>
      <span className="text-sm font-medium text-gray-900">Agregar nueva tarjeta</span>
    </motion.div>
  )
}

function CardSetupWrapper({
  onSuccess,
  onError,
  onBack,
  stripeAccountId,
  theme = 'light',
  viewType = 'desktop'
}: {
  onSuccess: (paymentMethodId: string) => void;
  onError: (error: any) => void;
  onBack: () => void;
  stripeAccountId?: string;
  theme?: 'light' | 'dark';
  viewType?: 'mobile' | 'desktop';
}) {
  const stripePromise = loadStripe(stripeKey, stripeAccountId ? {
    stripeAccount: stripeAccountId
  } : undefined);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "p-4 rounded-lg border",
        viewType === 'mobile' ? "w-full" : "",
        theme === 'dark'
          ? "bg-neutral-900 border-neutral-800"
          : "bg-white border-gray-200"
      )}
    >
      <Elements stripe={stripePromise}>
        <div className="space-y-4">
          <div className="flex flex-col space-y-1">
            <h3 className={cn(
              "text-base font-medium",
              theme === 'dark' ? "text-gray-200" : "text-gray-700"
            )}>
              Agregar Nueva Tarjeta
            </h3>
            <p className={cn(
              "text-xs",
              theme === 'dark' ? "text-gray-400" : "text-gray-500"
            )}>
              Completa los datos de tu tarjeta para guardarla de forma segura
            </p>
          </div>
          
          <CardSetupForm 
            onSuccess={onSuccess}
            onError={onError}
            onBack={onBack}
            theme={theme}
          />
        </div>
      </Elements>
    </motion.div>
  )
}

export function CardList({
  cards = [],
  selectedCardId,
  onSelect,
  onAddCard,
  onDeleteCard,
  isExpanded = false,
  isLoading = false,
  showCardForm = false,
  onCardSetupSuccess,
  onCardSetupError,
  onCardSetupBack,
  theme = 'light',
  stripeAccountId,
  viewType
}: CardListProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [isContentVisible, setIsContentVisible] = useState(isExpanded)
  
  // Sincronizar el estado interno con la prop isExpanded
  useEffect(() => {
    setIsContentVisible(isExpanded)
  }, [isExpanded])
  
  useEffect(() => {
    if (showCardForm !== undefined) {
      setShowAddForm(showCardForm)
    }
  }, [showCardForm])
  
  // Cuando se agrega una tarjeta con éxito, ocultar el formulario y notificar al padre
  const handleCardSetupSuccess = (paymentMethodId: string) => {
    console.log('Card setup success in CardList')
    setShowAddForm(false)
    if (onCardSetupSuccess) {
      onCardSetupSuccess(paymentMethodId)
    }
  }
  
  // Si hay un error en la configuración de la tarjeta, notificar al padre
  const handleCardSetupError = (error: any) => {
    console.log('Card setup error in CardList:', error)
    if (onCardSetupError) {
      onCardSetupError(error)
    }
  }
  
  // Manejar el regreso desde el formulario de tarjeta
  const handleCardSetupBack = () => {
    console.log('Card setup back in CardList')
    setShowAddForm(false)
    if (onCardSetupBack) {
      onCardSetupBack()
    }
  }
  
  // Si estamos mostrando el formulario para agregar tarjeta
  if (showAddForm) {
    return (
      <div className="space-y-2">
        <CardSetupWrapper
          onSuccess={handleCardSetupSuccess}
          onError={handleCardSetupError}
          onBack={handleCardSetupBack}
          theme={theme}
          stripeAccountId={stripeAccountId}
          viewType={viewType}
        />
      </div>
    )
  }
  
  // Si no hay tarjetas y no estamos expandidos, no mostramos nada
  if (!isContentVisible && cards.length === 0 && !isLoading) {
    return null
  }
  
  // Contenido normal de la lista de tarjetas
  const listContent = (
    <div className="space-y-1">
      {isLoading ? (
        <div className="py-4 px-2 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
          <span className="ml-2 text-sm text-gray-500">Cargando tarjetas guardadas...</span>
        </div>
      ) : cards.length > 0 ? (
        cards.map((card) => (
          <CardItem 
            key={card.id}
            card={card}
            isSelected={selectedCardId === card.id}
            onClick={() => onSelect(card)}
            theme={theme}
            viewType={viewType}
          />
        ))
      ) : (
        <div className="py-3 px-2 text-sm text-gray-500 text-center">
          No tienes tarjetas guardadas
        </div>
      )}
      
      {!isLoading && (
        <AddCardButton 
          onClick={() => {
            console.log('Add card button clicked')
            if (onCardSetupSuccess) {
              setShowAddForm(true)
            } else {
              onAddCard()
            }
          }}
          theme={theme}
          viewType={viewType}
        />
      )}
    </div>
  )
  
  // Implementación similar a PaymentTypeList
  if (!isContentVisible) {
    return null
  }
  
  return (
    <AnimatePresence>
      {isContentVisible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "relative overflow-hidden",
            "p-3",
            "rounded-lg border border-gray-100 bg-white",
            "mt-3", // Aumentamos el margen superior para mayor separación
            viewType === 'mobile' ? "w-full" : "" // Aseguramos ancho completo en móvil
          )}
        >
          {listContent}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
