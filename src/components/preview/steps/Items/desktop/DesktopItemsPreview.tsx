import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { ItemsPreviewProps } from '../types';
import { ItemWithStock } from '../types';
import { withResponsiveView } from '../hoc/withResponsiveView';
import { useResponsiveStyles } from '../hooks/useResponsiveStyles';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useFormItems } from '@/contexts/FormItemsContext';
import { useItems } from '@/hooks/useItems';
import { Loader2, Plus, Minus } from 'lucide-react';

// Componente memoizado para el título y descripción
const PageHeader = memo(({ 
  theme
}: { 
  theme: 'light' | 'dark';
}) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }} 
    animate={{ opacity: 1, y: 0 }} 
    transition={{ duration: 0.4 }} 
    className="space-y-2"
  > 
    <div className="flex items-center justify-between">
      <h1 className={cn(
        "text-2xl font-semibold",
        theme === 'dark' ? "text-white" : "text-gray-900" 
      )}> 
        Elige tus ítems
      </h1>
    </div>
    
    <p className={cn(
      "text-sm",
      theme === 'dark' ? "text-gray-400" : "text-gray-500" 
    )}> 
      Selecciona los artículos que deseas reservar 
    </p> 
  </motion.div>
));

// Componente memoizado para el mensaje de error
const ErrorMessage = memo(({ 
  theme, 
  message 
}: { 
  theme: 'light' | 'dark';
  message: string;
}) => (
  <div className="flex items-center justify-center h-64 px-6 text-center">
    <p className={cn(
      "text-sm",
      theme === 'dark' ? "text-gray-400" : "text-gray-500"
    )}>
      {message}
    </p>
  </div>
));

// Componente para mostrar el estado de carga
const LoadingState = memo(({ theme }: { theme: "light" | "dark" }) => (
  <motion.div 
    className={cn(
      "flex flex-col items-center justify-center min-h-[300px] p-6",
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

// Componente de notificación para ítems seleccionados - como en mobile
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
  isRecentlyUpdated = false,
  isLast = false
}: { 
  item: ItemWithStock;
  theme: 'light' | 'dark';
  quantity: number;
  onQuantityChange: (itemId: string, value: number) => void;
  price: number;
  isRecentlyUpdated?: boolean;
  isLast?: boolean;
}) => {
  const handleIncrement = () => {
    if (quantity < item.availableStock) {
      onQuantityChange(item.id, quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 0) {
      onQuantityChange(item.id, quantity - 1);
    }
  };

  // Determinar si el ítem está seleccionado para resaltarlo
  const isSelected = quantity > 0;
  
  // Formatear precio
  const formattedPrice = `$${price.toFixed(2)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        transition: { duration: 0.2 }
      }}
      className={cn(
        "flex items-center justify-between py-4 px-3 relative",
        !isLast && "border-b",
        theme === 'dark' 
          ? isSelected ? "bg-neutral-800/50" : "" 
          : isSelected ? "bg-gray-50" : "",
        theme === 'dark' && !isLast ? "border-neutral-800/40" : !isLast ? "border-gray-100" : ""
      )}
    >
      {/* Información del ítem */}
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
      
      {/* Selector de cantidad */}
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

function DesktopItemsPreviewBase({ theme, viewType, branchId, selectedSlot, ...props }: ItemsPreviewProps) {
  const { getStyle } = useResponsiveStyles('desktop');
  const { selectedItems, updateSelectedItems } = useFormItems();
  const [itemsWithStock, setItemsWithStock] = useState<ItemWithStock[]>([]);
  const [isProcessingData, setIsProcessingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previousSelectedItems, setPreviousSelectedItems] = useState<Record<string, number>>({});
  const [toastVisible, setToastVisible] = useState(false);

  // Obtener items usando el hook
  const { data: items = [], isLoading: itemsLoading, error: itemsError } = useItems(branchId);

  // Determinar el estado de carga general
  const isLoading = itemsLoading || isProcessingData;

  // Validar branchId y selectedSlot
  useEffect(() => {
    if (!branchId || !selectedSlot) {
      console.warn('Branch ID o Selected Slot no están disponibles:', { branchId, selectedSlot });
      setError('Información necesaria no está disponible.');
      return;
    }
  }, [branchId, selectedSlot]);

  // Efecto para manejar errores
  useEffect(() => {
    if (itemsError) {
      setError('Error al cargar los ítems.');
      return;
    }
    
    // Limpiar errores previos si no hay error actual
    if (!itemsLoading) {
      setError(null);
    }
  }, [items, itemsError, itemsLoading]);

  // Efecto para procesar los items y su stock
  useEffect(() => {
    // No procesar si aún estamos cargando los items
    if (itemsLoading || !items || !selectedSlot) {
      return;
    }

    // Comenzar procesamiento
    setIsProcessingData(true);

    try {
      // Procesar todos los items de una vez sin setTimeout
      const processedItems = items.map(item => ({
        ...item,
        availableStock: item.stock || 0,
        baseStock: item.stock || 0,
        reservedUnits: 0,
        duration_pricing: item.duration_pricing || {}
      }));

      setItemsWithStock(processedItems);
      setIsProcessingData(false);
    } catch (err) {
      console.error("Error processing items:", err);
      setError('Error al procesar los ítems.');
      setIsProcessingData(false);
    }
  }, [items, selectedSlot, itemsLoading]);

  // Actualizar el estado anterior de los items seleccionados para animaciones
  useEffect(() => {
    setPreviousSelectedItems(selectedItems);
  }, [selectedItems]);
  
  // Efecto para mostrar/ocultar la notificación basado en ítems seleccionados
  useEffect(() => {
    // Contar el total de ítems seleccionados
    const totalItemsCount = Object.values(selectedItems).reduce((sum, qty) => sum + qty, 0);
    
    // Mostrar la notificación si hay ítems seleccionados, ocultarla si no hay ninguno
    setToastVisible(totalItemsCount > 0);
  }, [selectedItems]);

  // Función para manejar cambios en la cantidad
  const handleQuantityChange = useCallback((itemId: string, quantity: number) => {
    // Crear una copia del objeto selectedItems y modificarla
    const newSelectedItems = { ...selectedItems };
    
    if (quantity === 0) {
      delete newSelectedItems[itemId];
    } else {
      newSelectedItems[itemId] = quantity;
    }
    
    // Actualizar el estado con el nuevo objeto
    updateSelectedItems(newSelectedItems);
  }, [selectedItems, updateSelectedItems]);

  // Función para obtener el precio del ítem
  const getItemPrice = useCallback((item: ItemWithStock) => {
    if (!selectedSlot) return 0;
    const durationInMinutes = selectedSlot.duration * 60;
    return item.duration_pricing[durationInMinutes.toString()] || 0;
  }, [selectedSlot]);

  // Función para obtener detalles de un ítem por ID
  const getItemDetails = useCallback((itemId: string) => {
    const item = itemsWithStock.find(i => i.id === itemId);
    if (!item) return null;
    return {
      item,
      price: getItemPrice(item)
    };
  }, [itemsWithStock, getItemPrice]);

  // Verificar si un ítem se actualizó recientemente para animaciones
  const isItemRecentlyUpdated = useCallback((itemId: string) => {
    const prevQuantity = previousSelectedItems[itemId] || 0;
    const currentQuantity = selectedItems[itemId] || 0;
    return prevQuantity !== currentQuantity;
  }, [previousSelectedItems, selectedItems]);

  return (
    <div className={getStyle('container')}>
      {/* Título y descripción */}
      <div className="mb-6">
        <PageHeader theme={theme} />
      </div>
      
      {/* Contenido principal: Lista de ítems o mensajes de estado */}
      {error && !isLoading ? (
        <ErrorMessage theme={theme} message={error} />
      ) : isLoading ? (
        <LoadingState theme={theme} />
      ) : (
        <>
          {/* Lista de ítems */}
          <div className="rounded-lg overflow-hidden">
            {itemsWithStock.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <p className={cn(
                  "text-sm",
                  theme === 'dark' ? "text-gray-400" : "text-gray-500"
                )}>
                  No se encontraron artículos
                </p>
              </div>
            ) : (
              <div>
                <AnimatePresence initial={false}>
                  {itemsWithStock.map((item, index) => (
                    <ItemListRow
                      key={item.id}
                      item={item}
                      theme={theme}
                      quantity={selectedItems[item.id] || 0}
                      onQuantityChange={handleQuantityChange}
                      price={getItemPrice(item)}
                      isRecentlyUpdated={isItemRecentlyUpdated(item.id)}
                      isLast={index === itemsWithStock.length - 1}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
          
          {/* Notificación de ítems seleccionados */}
          <AnimatePresence>
            {toastVisible && (
              <SelectionSummaryToast
                selectedItems={selectedItems}
                getItemDetails={getItemDetails}
                theme={theme}
                visible={toastVisible}
              />
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

export const DesktopItemsPreview = withResponsiveView(DesktopItemsPreviewBase, {
  styleKey: 'container',
}); 