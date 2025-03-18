import { memo } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import type { ItemWithStock } from '../types';

interface FloatingSelectionSummaryProps {
  selectedItems: Record<string, number>;
  getItemDetails: (itemId: string) => { item: ItemWithStock, price: number } | null;
  visible: boolean;
  theme?: 'light' | 'dark';
}

export const FloatingSelectionSummary = memo(function FloatingSelectionSummary({
  selectedItems,
  getItemDetails,
  visible,
  theme = 'light'
}: FloatingSelectionSummaryProps) {
  // Si no hay ítems seleccionados o no debe ser visible, no mostrar nada
  if (!visible || Object.keys(selectedItems).length === 0) return null;
  
  // Obtener los detalles de los ítems seleccionados
  const itemsDetails = Object.entries(selectedItems)
    .map(([itemId, quantity]) => {
      const details = getItemDetails(itemId);
      return details ? { ...details, quantity } : null;
    })
    .filter(Boolean) as Array<{ item: ItemWithStock, price: number, quantity: number }>;
  
  // Si no hay ítems con detalles válidos, no mostrar nada
  if (itemsDetails.length === 0) return null;
  
  // Determinar si mostrar el diseño compacto (un solo ítem) o el diseño de lista (múltiples ítems)
  const isSingleItem = itemsDetails.length === 1;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={cn(
        "fixed inset-x-0 bottom-24 mx-auto w-[85%] max-w-sm",
        "px-4 py-3 rounded-xl shadow-lg z-50 overflow-hidden border",
        theme === 'dark' 
          ? "bg-neutral-800 text-white border-neutral-700" 
          : "bg-white text-gray-900 border-gray-200"
      )}
    >
      {/* Cabecera del resumen */}
      <div className="flex justify-between items-center mb-1.5">
        <motion.h3 
          className="font-medium text-sm tracking-tight"
          layout
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={itemsDetails.length}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              {isSingleItem 
                ? "Ítem seleccionado" 
                : `${itemsDetails.length} ítems seleccionados`}
            </motion.span>
          </AnimatePresence>
        </motion.h3>
      </div>
      
      {/* Listado de ítems (para múltiples ítems) */}
      {!isSingleItem && (
        <motion.div 
          className="mt-1.5 space-y-1 max-h-24 overflow-y-auto scrollbar-hide"
          layout
        >
          <style jsx global>{`
            /* Ocultar completamente la barra de desplazamiento */
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <AnimatePresence initial={false}>
            {itemsDetails.map(({ item, quantity, price }) => (
              <motion.div 
                key={item.id} 
                className="flex justify-between items-center text-xs"
                initial={{ opacity: 0, x: -10, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, x: 10, height: 0 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 400, 
                  damping: 30,
                  opacity: { duration: 0.2 }
                }}
                layout
              >
                <div className="flex items-center flex-1 mr-2">
                  <span className="font-medium truncate max-w-[130px]">{item.name}</span>
                  <span className="mx-1 opacity-80">·</span>
                  <motion.span 
                    className="opacity-90 whitespace-nowrap"
                    key={`${item.id}-${quantity}`}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {quantity} {quantity === 1 ? 'un.' : 'un.'}
                  </motion.span>
                </div>
                <span className="text-xs font-medium whitespace-nowrap ml-1">
                  ${(price * quantity).toFixed(2)}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
      
      {/* Para un solo ítem, mostrar diseño compacto */}
      {isSingleItem && (
        <motion.div 
          className="flex justify-between items-center text-sm"
          layout
        >
          <div className="flex items-center flex-1 mr-2">
            <span className="font-medium truncate max-w-[180px]">{itemsDetails[0].item.name}</span>
            <span className="mx-1 opacity-80">·</span>
            <motion.span 
              className="opacity-90 whitespace-nowrap"
              key={`${itemsDetails[0].item.id}-${itemsDetails[0].quantity}`}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              {itemsDetails[0].quantity} {itemsDetails[0].quantity === 1 ? 'unidad' : 'unidades'}
            </motion.span>
          </div>
          <span className="text-sm font-medium whitespace-nowrap">
            ${(itemsDetails[0].price * itemsDetails[0].quantity).toFixed(2)}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
});
