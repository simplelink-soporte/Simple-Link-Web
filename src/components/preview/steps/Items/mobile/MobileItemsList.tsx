import { memo, useCallback, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Minus, Plus, Check } from "lucide-react";
import { ItemWithStock } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

// Componente para el mensaje de no hay ítems
const NoItemsMessage = memo(({ theme }: { theme: "light" | "dark" }) => (
  <motion.div 
    className={cn(
      "flex flex-col items-center justify-center min-h-[200px] p-6 text-center",
      theme === 'dark' ? "bg-neutral-900 text-white" : "bg-white text-gray-700"
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
const LoadingState = memo(({ theme }: { theme: "light" | "dark" }) => (
  <motion.div 
    className={cn(
      "flex flex-col items-center justify-center min-h-[200px] p-6",
      theme === 'dark' ? "bg-neutral-900 text-white" : "bg-white text-gray-700"
    )}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3 }}
  >
    <Loader2 className="w-10 h-10 animate-spin opacity-70 mb-4" />
    <p className="text-sm opacity-70">Cargando ítems...</p>
  </motion.div>
));

// Componente de notificación para ítems seleccionados
const SelectionSummaryToast = memo(({ 
  selectedItems, 
  getItemDetails,
  theme,
  visible
}: { 
  selectedItems: Record<string, number>;
  getItemDetails: (itemId: string) => { item: ItemWithStock, price: number } | null;
  theme: 'light' | 'dark';
  visible: boolean;
}) => {
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
        "px-4 py-3 rounded-xl",
        "shadow-lg z-50 overflow-hidden border",
        theme === 'dark' 
          ? "bg-neutral-800 text-white border-neutral-700" 
          : "bg-white text-gray-900 border-gray-200"
      )}
      style={{ 
        willChange: 'transform, opacity',
        backfaceVisibility: 'hidden',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        transform: 'translateZ(0)' // Forzar aceleración por hardware
      }}
    >
      {/* Cabecera del resumen - simplificada */}
      <div className="flex justify-between items-center mb-1.5">
        <motion.h3 
          className="font-medium text-sm tracking-tight"
          layout
          style={{ WebkitFontSmoothing: 'antialiased' }}
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
          className={cn(
            "mt-1.5 space-y-1 max-h-24 overflow-y-auto scrollbar-hide",
            theme === 'dark' ? "pr-1" : "pr-1"
          )}
          style={{
            msOverflowStyle: 'none',       // Ocultar scrollbar en IE y Edge
            scrollbarWidth: 'none',        // Ocultar scrollbar en Firefox
            WebkitOverflowScrolling: 'touch' // Scroll suave en iOS
          }}
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
                style={{ WebkitFontSmoothing: 'antialiased' }}
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
          style={{ WebkitFontSmoothing: 'antialiased' }}
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

// Componente para cada ítem individual en la lista
const ItemListRow = memo(({ 
  item, 
  theme, 
  quantity, 
  onQuantityChange, 
  price,
  isRecentlyUpdated
}: { 
  item: ItemWithStock;
  theme: 'light' | 'dark';
  quantity: number;
  onQuantityChange: (itemId: string, value: number) => void;
  price: number;
  isRecentlyUpdated: boolean;
}) => {
  const handleIncrement = () => {
    if (quantity < item.availableStock) {
      const newQuantity = quantity + 1;
      onQuantityChange(item.id, newQuantity);
    }
  };

  const handleDecrement = () => {
    if (quantity > 0) {
      const newQuantity = quantity - 1;
      onQuantityChange(item.id, newQuantity);
    }
  };

  // Formatear precio con texto más profesional
  const formattedPrice = `$${price.toFixed(2)}`;

  // Determinar si el ítem está seleccionado para resaltarlo
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
        // Línea divisoria - eliminada para evitar duplicación con divide-y
        // "border-b",
        // theme === 'dark' 
        //   ? "border-neutral-800/30" 
        //   : "border-gray-100",
        // Resaltar suavemente cuando está seleccionado
        isSelected && (theme === 'dark' 
          ? "bg-neutral-800/20" 
          : "bg-gray-50"),
        isRecentlyUpdated && (theme === 'dark' ? "bg-neutral-800/30" : "bg-gray-100")
      )}
      style={{
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        transform: 'translateZ(0)' // Forzar aceleración por hardware
      }}
    >
      {/* Indicador de reciente actualización - aparece y desaparece suavemente */}
      <AnimatePresence>
        {isRecentlyUpdated && (
          <motion.div 
            className={cn(
              "absolute left-0 top-0 bottom-0 w-1 rounded-r",
              theme === 'dark' ? "bg-neutral-600" : "bg-gray-400"
            )}
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>

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
          key={`count-${item.id}-${quantity}`}
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
            "disabled:opacity-40 disabled:cursor-not-allowed"
          )}
          aria-label="Aumentar cantidad"
        >
          <Plus className="w-3 h-3" strokeWidth={2.5} />
        </button>
      </div>
    </motion.div>
  );
});

interface MobileItemsListProps {
  items: ItemWithStock[];
  theme: "light" | "dark";
  selectedItems: Record<string, number>;
  onQuantityChange: (itemId: string, value: number) => void;
  getItemPrice: (item: ItemWithStock) => number;
  isLoading?: boolean;
}

export const MobileItemsList = memo(function MobileItemsList({
  items,
  theme,
  selectedItems,
  onQuantityChange,
  getItemPrice,
  isLoading = false
}: MobileItemsListProps) {
  // Estado para controlar la visibilidad del toast de resumen
  const [toastVisible, setToastVisible] = useState(false);
  
  // Estado que guarda la versión previa de los ítems seleccionados para poder
  // determinar cuáles son nuevos o han cambiado
  const [prevSelectedItems, setPrevSelectedItems] = useState<Record<string, number>>({});
  
  // Efecto para mostrar/ocultar la notificación basado en ítems seleccionados
  useEffect(() => {
    // Contar el total de ítems seleccionados
    const totalItemsCount = Object.values(selectedItems).reduce((sum, qty) => sum + qty, 0);
    
    // Mostrar la notificación si hay ítems seleccionados, ocultarla si no hay ninguno
    setToastVisible(totalItemsCount > 0);
    
    // Actualizar el estado previo para la próxima comparación
    setPrevSelectedItems(selectedItems);
  }, [selectedItems]);
  
  // Renderizado condicional optimizado
  if (isLoading) {
    return <LoadingState theme={theme} />;
  }

  if (!items.length) {
    return <NoItemsMessage theme={theme} />;
  }

  return (
    <div 
      className={cn(
        "w-full h-full overflow-auto pb-32 scrollbar-hide", 
        theme === 'dark' ? "bg-neutral-900" : "bg-white"
      )}
      style={{
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale'
      }}
    >
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

      {/* Lista de ítems sin bordes externos */}
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
          {items.map((item) => (
            <ItemListRow
              key={item.id}
              item={item}
              theme={theme}
              quantity={selectedItems[item.id] || 0}
              onQuantityChange={onQuantityChange}
              price={getItemPrice(item)}
              isRecentlyUpdated={
                // Un ítem está recién actualizado si su cantidad actual es diferente de la anterior
                (selectedItems[item.id] || 0) > 0 && 
                selectedItems[item.id] !== prevSelectedItems[item.id]
              }
            />
          ))}
        </motion.div>
      </AnimatePresence>
      
      {/* Toast de notificación */}
      <AnimatePresence>
        {toastVisible && (
          <SelectionSummaryToast
            selectedItems={selectedItems}
            getItemDetails={(itemId) => {
              const item = items.find((i) => i.id === itemId);
              return item ? { item, price: getItemPrice(item) } : null;
            }}
            theme={theme}
            visible={toastVisible}
          />
        )}
      </AnimatePresence>
    </div>
  );
}); 