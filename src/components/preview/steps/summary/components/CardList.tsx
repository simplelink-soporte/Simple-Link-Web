import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check, X, Loader2 } from "lucide-react";
import { CardBrandIcon } from "./CardBrandIcon";

interface StoredCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

interface CardListProps {
  theme: 'light' | 'dark';
  cards: StoredCard[];
  selectedCardId?: string;
  onSelect: (card: StoredCard) => void;
  onAddCard: () => void;
  onDeleteCard?: (cardId: string) => void;
  isExpanded?: boolean;
  isLoading?: boolean;
}

function CardItem({
  card,
  isSelected,
  onClick,
  onDelete,
  theme
}: {
  card: StoredCard;
  isSelected: boolean;
  onClick: () => void;
  onDelete?: () => void;
  theme: 'light' | 'dark';
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.01, x: 2, boxShadow: "none" }}
      whileTap={{ scale: 0.98, boxShadow: "none" }}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "p-3 rounded-lg cursor-pointer",
        "flex items-center justify-between mb-1 mx-1",
        "transition-all duration-200 ease-in-out",
        "shadow-none",
        // Estilos según selección y tema
        theme === 'dark'
          ? isSelected 
            ? "bg-neutral-700" 
            : "hover:bg-neutral-800/50"
          : isSelected 
            ? "bg-gray-100" 
            : "hover:bg-gray-50"
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-md",
          theme === 'dark' 
            ? isSelected ? "bg-neutral-600" : "bg-neutral-800" 
            : isSelected ? "bg-white" : "bg-gray-50",
          "transition-colors duration-200"
        )}>
          <CardBrandIcon 
            brand={card.brand} 
            theme={theme}
            className={cn(
              "h-4 w-4",
              isSelected
                ? theme === 'dark' ? "text-green-400" : "text-green-500"
                : theme === 'dark' ? "text-gray-300" : "text-gray-600"
            )}
          />
        </div>
        <div className="space-y-1">
          <p className={cn(
            "text-sm font-medium",
            theme === 'dark' ? "text-white" : "text-gray-900",
            "transition-colors duration-200"
          )}>
            •••• {card.last4}
          </p>
          <p className={cn(
            "text-xs",
            theme === 'dark' ? "text-gray-400" : "text-gray-500",
            "transition-colors duration-200"
          )}>
            Expira: {card.expMonth.toString().padStart(2, '0')}/{card.expYear}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className={cn(
              "p-1.5 rounded-md opacity-0 group-hover:opacity-100",
              "transition-all duration-200",
              theme === 'dark' 
                ? "hover:bg-neutral-700 text-gray-400" 
                : "hover:bg-gray-200 text-gray-500"
            )}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

function AddCardButton({ onAddCard, theme }: { onAddCard: () => void; theme: 'light' | 'dark' }) {
  return (
    <motion.button
      whileHover={{ scale: 1.01, x: 2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onAddCard}
      className={cn(
        "w-full p-3 rounded-lg mb-1 mx-1",
        "flex items-center gap-3",
        "transition-all duration-200 ease-in-out",
        theme === 'dark'
          ? "hover:bg-neutral-800/50 text-gray-400"
          : "hover:bg-gray-50 text-gray-600"
      )}
    >
      <div className={cn(
        "p-2 rounded-md",
        theme === 'dark' ? "bg-neutral-800" : "bg-gray-50",
        "transition-colors duration-200"
      )}>
        <Plus className="h-4 w-4" />
      </div>
      <span className="text-sm font-medium">Agregar nueva tarjeta</span>
    </motion.button>
  );
}

export function CardList({
  theme,
  cards,
  selectedCardId,
  onSelect,
  onAddCard,
  onDeleteCard,
  isExpanded = false,
  isLoading = false
}: CardListProps) {
  const handleCardSelect = (card: StoredCard) => {
    console.log('[CardList] Seleccionando tarjeta:', card.id);
    try {
      // Propagar la selección al componente padre
      onSelect(card);
      return true;
    } catch (error) {
      console.error('[CardList] Error al seleccionar tarjeta:', error);
      return false;
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      if (onDeleteCard) {
        await onDeleteCard(cardId);
        // Eliminar notificación
        // toast.success('Tarjeta eliminada correctamente');
      }
    } catch (error) {
      console.error('Error al eliminar la tarjeta:', error);
      // Eliminar notificación
      // toast.error('Error al eliminar la tarjeta');
    }
  };

  return (
    <motion.div
      initial={false}
      animate={isExpanded ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "overflow-hidden rounded-lg border mt-1",
        "shadow-none",
        theme === 'dark' 
          ? "bg-neutral-900 border-neutral-800" 
          : "bg-white border-gray-200"
      )}
    >
      <div className="py-3 px-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className={cn(
              "h-5 w-5 animate-spin",
              theme === 'dark' ? "text-gray-400" : "text-gray-500"
            )} />
            <span className={cn(
              "ml-2 text-sm",
              theme === 'dark' ? "text-gray-400" : "text-gray-500"
            )}>
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
                  theme={theme}
                />
              ))}
            </AnimatePresence>
            
            <AddCardButton onAddCard={onAddCard} theme={theme} />
          </>
        )}
      </div>
    </motion.div>
  );
} 