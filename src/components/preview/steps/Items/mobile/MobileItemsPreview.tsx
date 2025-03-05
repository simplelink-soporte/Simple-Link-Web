import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { ItemsPreviewProps } from '../types';
import { ItemWithStock } from '../types';
import { withResponsiveView } from '../hoc/withResponsiveView';
import { useResponsiveStyles } from '../hooks/useResponsiveStyles';
import { MobileItemsList } from './MobileItemsList';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useFormItems } from '@/contexts/FormItemsContext';
import { useItems } from '@/hooks/useItems';
import { MobileNavigation } from '@/components/preview/layout/MobileNavigation';
import { MobileNextButton } from '@/components/preview/layout/MobileNextButton';

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

function MobileItemsPreviewBase({ theme, viewType, branchId, selectedSlot, ...props }: ItemsPreviewProps) {
  const { getStyle } = useResponsiveStyles('mobile');
  const { selectedItems, updateSelectedItems } = useFormItems();
  const [itemsWithStock, setItemsWithStock] = useState<ItemWithStock[]>([]);
  const [isProcessingData, setIsProcessingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Efecto para procesar los items y su stock - optimizado con una sola ejecución
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

  // Función para manejar cambios en la cantidad - optimizada con useCallback
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

  // Función para obtener el precio del ítem - memoizada para evitar recálculos
  const getItemPrice = useCallback((item: ItemWithStock) => {
    if (!selectedSlot) return 0;
    const durationInMinutes = selectedSlot.duration * 60;
    return item.duration_pricing[durationInMinutes.toString()] || 0;
  }, [selectedSlot]);

  // Calcular el número total de ítems seleccionados
  const totalItemsSelected = useMemo(() => {
    return Object.values(selectedItems).reduce((sum, quantity) => sum + quantity, 0);
  }, [selectedItems]);

  // Calcular el precio total de los ítems seleccionados
  const totalPrice = useMemo(() => {
    return itemsWithStock.reduce((sum, item) => {
      const quantity = selectedItems[item.id] || 0;
      const price = getItemPrice(item);
      return sum + (quantity * price);
    }, 0);
  }, [itemsWithStock, selectedItems, getItemPrice]);

  return (
    <div className={getStyle('container')}> 
      <div className={cn(
        "min-h-screen bg-white dark:bg-neutral-900",
        "flex flex-col"
      )}> 
        {/* Título y descripción - componente memoizado */} 
        <div className="pt-24 px-6 pb-6"> 
          <PageHeader theme={theme} />
        </div> 

        {/* Botones de navegación */} 
        <MobileNavigation 
          theme={theme} 
          onPrev={props.onPrev} 
          isPublicView={props.isPublicView} 
          className="absolute top-6 left-6 z-50" 
        /> 
        <MobileNextButton 
          theme={theme} 
          onNext={props.onNext} 
          isDisabled={false} 
          isPublicView={props.isPublicView} 
        /> 

        {/* Contenido principal: Lista de ítems o mensajes de estado */} 
        <div className="flex-1 px-4"> 
          {error && !isLoading ? (
            <ErrorMessage theme={theme} message={error} />
          ) : (
            <MobileItemsList
              items={itemsWithStock} 
              theme={theme} 
              selectedItems={selectedItems} 
              onQuantityChange={handleQuantityChange} 
              getItemPrice={getItemPrice}
              isLoading={isLoading}
            />
          )}
        </div> 
      </div> 
    </div> 
  ); 
}

// Aplicar el HOC con opciones específicas para la vista móvil
export const MobileItemsPreview = withResponsiveView(MobileItemsPreviewBase, {
  styleKey: 'container',
  fullWidth: true,
  disableWrapper: true
}); 