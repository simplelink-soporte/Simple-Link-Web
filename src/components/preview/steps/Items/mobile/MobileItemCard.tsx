import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Minus, Plus } from "lucide-react";
import { ItemWithStock } from "../types";

interface MobileItemCardProps {
  item: ItemWithStock;
  theme: 'light' | 'dark';
  quantity: number;
  onQuantityChange: (value: number) => void;
  price: number;
}

export function MobileItemCard({
  item,
  theme,
  quantity,
  onQuantityChange,
  price
}: MobileItemCardProps) {
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

  return (
    <motion.div
      className={cn(
        "w-full h-full flex flex-col justify-center items-center p-6",
        "transition-colors duration-300",
        theme === 'dark' ? "bg-neutral-900" : "bg-white"
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ 
        type: "spring",
        stiffness: 300,
        damping: 30,
        duration: 0.3
      }}
    >
      <div className="flex flex-col items-center justify-center text-center space-y-6">
        <motion.h3 
          className={cn(
            "text-xl font-semibold",
            theme === 'dark' ? "text-white" : "text-gray-900"
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {item.name}
        </motion.h3>
        
        <motion.div 
          className="flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <motion.button
            onClick={handleDecrement}
            disabled={quantity <= 0}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center",
              "transition-colors duration-200",
              theme === 'dark' 
                ? "hover:bg-neutral-800 text-white" 
                : "hover:bg-gray-100 text-gray-900",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            aria-label="Disminuir cantidad"
          >
            <Minus className="w-5 h-5" />
          </motion.button>

          <motion.span 
            className={cn(
              "text-2xl font-semibold mx-6 min-w-[40px] text-center",
              theme === 'dark' ? "text-white" : "text-gray-900"
            )}
            key={quantity}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          >
            {quantity}
          </motion.span>

          <motion.button
            onClick={handleIncrement}
            disabled={quantity >= item.availableStock}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center",
              "transition-colors duration-200",
              theme === 'dark' 
                ? "hover:bg-neutral-800 text-white" 
                : "hover:bg-gray-100 text-gray-900",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            aria-label="Aumentar cantidad"
          >
            <Plus className="w-5 h-5" />
          </motion.button>
        </motion.div>
        
        <motion.p 
          className={cn(
            "text-sm",
            theme === 'dark' ? "text-gray-400" : "text-gray-500"
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Por cada unidad: ${price}
        </motion.p>
        
        <span className="hidden">{item.availableStock}</span>
      </div>
    </motion.div>
  );
} 