"use client"

import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Check, X, Loader2 } from "lucide-react"
import { useState } from "react"
import { CardBrandIcon } from "./CardBrandIcon"

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
}

function CardItem({
  card,
  isSelected,
  onClick,
  onDelete
}: {
  card: StoredCard
  isSelected: boolean
  onClick: () => void
  onDelete?: () => void
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.01, x: 2 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "p-3 rounded-lg cursor-pointer",
        "flex items-center justify-between mb-1 mx-1",
        "transition-all duration-200 ease-in-out",
        "shadow-none",
        // Estilos según selección
        isSelected 
          ? "bg-gray-100 border border-gray-200" 
          : "hover:bg-gray-50"
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-md",
          isSelected ? "bg-white shadow-sm" : "bg-gray-50",
          "transition-colors duration-200"
        )}>
          <CardBrandIcon 
            brand={card.brand}
            theme="light"
            className={cn(
              "h-4 w-4",
              isSelected ? "text-green-500" : "text-gray-500"
            )}
          />
        </div>
        <div className="space-y-1">
          <p className={cn(
            "text-sm font-medium text-gray-900",
            "transition-colors duration-200"
          )}>
            •••• {card.last4}
          </p>
          <p className={cn(
            "text-xs text-gray-500",
            "transition-colors duration-200"
          )}>
            Expira: {card.expMonth.toString().padStart(2, '0')}/{card.expYear}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isSelected && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center justify-center"
          >
            <Check className="h-4 w-4 text-green-500" />
          </motion.div>
        )}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className={cn(
              "p-1.5 rounded-md opacity-0 group-hover:opacity-100",
              "transition-all duration-200",
              "hover:bg-gray-200 text-gray-500"
            )}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  )
}

function AddCardButton({ onAddCard }: { onAddCard: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.01, x: 2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onAddCard}
      className={cn(
        "w-full p-3 rounded-lg mb-1 mx-1",
        "flex items-center gap-3",
        "transition-all duration-200 ease-in-out",
        "hover:bg-gray-50 text-gray-600"
      )}
    >
      <div className={cn(
        "p-2 rounded-md",
        "bg-gray-50",
        "transition-colors duration-200"
      )}>
        <Plus className="h-4 w-4" />
      </div>
      <span className="text-sm font-medium">Agregar nueva tarjeta</span>
    </motion.button>
  )
}

export function CardList({
  cards,
  selectedCardId,
  onSelect,
  onAddCard,
  onDeleteCard,
  isExpanded = false,
  isLoading = false
}: CardListProps) {
  const handleCardSelect = (card: StoredCard) => {
    console.log('[CardList] Seleccionando tarjeta:', card.id)
    try {
      // Detener posible propagación de eventos que pueda causar re-renders no deseados
      // Propagar la selección al componente padre
      onSelect(card)
      // No retornamos nada para evitar comportamientos inesperados
    } catch (error) {
      console.error('[CardList] Error al seleccionar tarjeta:', error)
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    try {
      if (onDeleteCard) {
        await onDeleteCard(cardId)
        console.log('Tarjeta eliminada correctamente')
      }
    } catch (error) {
      console.error('Error al eliminar la tarjeta:', error)
    }
  }

  return (
    <motion.div
      initial={false}
      animate={isExpanded ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "fixed inset-x-4 sm:static sm:w-full z-[100] mt-1",
        "overflow-hidden rounded-lg border",
        "shadow-sm",
        "bg-white border-gray-200"
      )}
    >
      <div className="py-3 px-2 max-h-[300px] overflow-y-auto scrollbar-hide">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
            <span className="ml-2 text-sm text-gray-500">
              Cargando tarjetas...
            </span>
          </div>
        ) : (
          <>
            <AnimatePresence>
              {cards.map((card) => (
                <CardItem
                  key={card.id}
                  card={card}
                  isSelected={card.id === selectedCardId}
                  onClick={() => handleCardSelect(card)}
                  onDelete={onDeleteCard ? () => handleDeleteCard(card.id) : undefined}
                />
              ))}
            </AnimatePresence>
            
            <AddCardButton onAddCard={onAddCard} />
          </>
        )}
      </div>
    </motion.div>
  )
}
