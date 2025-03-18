import { memo, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { ItemCard } from './ItemCard';
import type { ItemWithStock } from '../types';

// Componente para el mensaje de no hay ítems
const NoItemsMessage = memo(({ theme = 'light' }: { theme?: 'light' | 'dark' }) => (
  <motion.div 
    className={cn(
      "flex flex-col items-center justify-center min-h-[200px] p-6 text-center rounded-lg border",
      theme === 'dark' 
        ? "bg-neutral-900 text-white border-neutral-800" 
        : "bg-white text-gray-700 border-gray-200"
    )}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.4 }}
  >
    <p className="text-lg font-medium mb-2">No se encontraron ítems</p>
    <p className="text-sm opacity-70">
      No hay ítems disponibles en este momento.
    </p>
  </motion.div>
));

// Componente para el estado de carga
const LoadingState = memo(({ theme = 'light' }: { theme?: 'light' | 'dark' }) => (
  <motion.div 
    className={cn(
      "flex flex-col items-center justify-center min-h-[200px] p-6 rounded-lg border",
      theme === 'dark' 
        ? "bg-neutral-900 text-white border-neutral-800" 
        : "bg-white text-gray-700 border-gray-200"
    )}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3 }}
  >
    <Loader2 className="w-10 h-10 animate-spin opacity-70 mb-4" />
    <p className="text-sm opacity-70">Cargando ítems...</p>
  </motion.div>
));

interface ItemsListProps {
  items: ItemWithStock[];
  selectedItems: Record<string, number>;
  onQuantityChange: (itemId: string, quantity: number) => void;
  getItemPrice: (item: ItemWithStock) => number;
  isLoading?: boolean;
  theme?: 'light' | 'dark';
  className?: string;
  layout?: 'list' | 'grid';
}

export const ItemsList = memo(function ItemsList({
  items,
  selectedItems,
  onQuantityChange,
  getItemPrice,
  isLoading = false,
  theme = 'light',
  className,
  layout = 'list'
}: ItemsListProps) {
  // Estado que guarda la versión previa de los ítems seleccionados
  const [prevSelectedItems, setPrevSelectedItems] = useState<Record<string, number>>({});
  
  // Efecto para actualizar los ítems seleccionados previos
  useEffect(() => {
    setPrevSelectedItems(selectedItems);
  }, [selectedItems]);
  
  // Log para depuración
  useEffect(() => {
    console.log("📋 ItemsList - Estado actual:", {
      itemsCount: items.length,
      isLoading,
      selectedItemsCount: Object.keys(selectedItems).length,
      layout
    });
    
    // Mostrar detalle de los primeros ítems para depuración
    if (items.length > 0) {
      console.log("📋 Primer ítem de la lista:", items[0]);
    }
  }, [items, isLoading, selectedItems, layout]);
  
  // Si está cargando, mostrar indicador
  if (isLoading) {
    return <LoadingState theme={theme} />;
  }
  
  // Si no hay ítems, mostrar mensaje
  if (!items || items.length === 0) {
    console.log("⚠️ No hay ítems para mostrar en ItemsList");
    return <NoItemsMessage theme={theme} />;
  }
  
  return (
    <div className={cn(
      "w-full h-full overflow-auto pb-32 scrollbar-hide", 
      theme === 'dark' ? "bg-neutral-900" : "bg-white",
      className
    )}
    style={{
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale'
    }}>
      {/* Estilo global para ocultar barras de desplazamiento y mejorar renderizado */}
      <style jsx global>{`
        /* Ocultar las barras de desplazamiento en todos los navegadores */
        .scrollbar-hide::-webkit-scrollbar {
          display: none !important;
        }
        .scrollbar-hide {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
        
        /* Mejorar la nitidez del texto en toda la aplicación */
        * {
          text-rendering: optimizeLegibility;
        }
      `}</style>

      {/* Lista de ítems */}
      <AnimatePresence initial={false}>
        <motion.div
          className={cn(
            "divide-y divide-gray-100/50 dark:divide-neutral-800/30",
            "rounded-lg overflow-hidden mx-1 my-1"
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {items.map(item => {
            if (!item || !item.id) {
              console.warn("⚠️ Ítem inválido:", item);
              return null;
            }
            
            return (
              <ItemCard
                key={item.id}
                item={item}
                quantity={selectedItems[item.id] || 0}
                price={getItemPrice(item)}
                onQuantityChange={(quantity) => onQuantityChange(item.id, quantity)}
                theme={theme}
              />
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
});
