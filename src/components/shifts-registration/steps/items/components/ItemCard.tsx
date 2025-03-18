import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Minus, Plus } from "lucide-react";
import type { ItemWithStock } from "../types";

interface ItemCardProps {
  item: ItemWithStock;
  quantity: number;
  onQuantityChange: (value: number) => void;
  price: number;
  theme?: 'light' | 'dark';
}

export const ItemCard = ({ 
  item,
  quantity,
  onQuantityChange,
  price,
  theme = 'light'
}: ItemCardProps) => {
  const handleIncrement = () => {
    if (quantity < item.availableStock) {
      onQuantityChange(quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 0) {
      onQuantityChange(quantity - 1);
    }
  };

  // Formatear precio
  const formattedPrice = `$${price.toFixed(2)}`;
  
  // Determinar si está seleccionado
  const isSelected = quantity > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        transition: { duration: 0.2 }
      }}
      exit={{ opacity: 0 }}
      className={cn(
        "flex items-center justify-between py-4 px-3 relative",
        isSelected && (theme === 'dark' 
          ? "bg-neutral-800/20" 
          : "bg-gray-50")
      )}
      style={{
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        transform: 'translateZ(0)' // Forzar aceleración por hardware
      }}
    >
      <div className="flex-1 mr-4">
        <h3 className={cn(
          "text-sm font-medium",
          theme === 'dark' ? "text-white" : "text-gray-900"
        )}>
          {item.name}
        </h3>
        <p className={cn(
          "text-xs mt-1 flex items-center",
          theme === 'dark' ? "text-gray-400" : "text-gray-500"
        )}>
          <span className="font-medium">{formattedPrice}</span>
          <span className="mx-1 opacity-80">·</span>
          <span className="opacity-90">Valor unitario</span>
        </p>
      </div>
      
      <div className="flex items-center space-x-2">
        <button
          onClick={handleDecrement}
          disabled={quantity <= 0}
          className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center",
            "transition-colors duration-200",
            "border",
            theme === 'dark' 
              ? "border-neutral-700 text-white hover:bg-neutral-700/30" 
              : "border-gray-300 text-gray-900 hover:bg-gray-100/80",
            isSelected && (theme === 'dark'
              ? "border-neutral-600"
              : "border-gray-400"),
            "disabled:opacity-40 disabled:cursor-not-allowed"
          )}
          aria-label="Disminuir cantidad"
        >
          <Minus className="w-3 h-3" strokeWidth={2.5} />
        </button>

        <motion.span 
          key={`count-${quantity}`}
          initial={{ scale: 1.1, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className={cn(
            "text-sm font-medium min-w-[24px] text-center",
            theme === 'dark' ? "text-white" : "text-gray-900"
          )}
        >
          {quantity}
        </motion.span>

        <button
          onClick={handleIncrement}
          disabled={quantity >= item.availableStock}
          className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center",
            "transition-colors duration-200",
            "border",
            theme === 'dark' 
              ? "border-neutral-700 text-white hover:bg-neutral-700/30" 
              : "border-gray-300 text-gray-900 hover:bg-gray-100/80",
            isSelected && (theme === 'dark'
              ? "border-neutral-600"
              : "border-gray-400"),
            "disabled:opacity-40 disabled:cursor-not-allowed"
          )}
          aria-label="Aumentar cantidad"
        >
          <Plus className="w-3 h-3" strokeWidth={2.5} />
        </button>
      </div>
    </motion.div>
  );
}
