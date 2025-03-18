'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StepComponentProps } from '../StepRenderer';
import { useShiftForm } from '../../context/ShiftFormContext';
import { Button } from '@/components/ui/button';
import { ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate, formatTime } from '@/lib/dateUtils';
import { useItems } from '@/hooks/useItems';
import { toast } from 'sonner';
import { ItemsList } from './components/ItemsList';
import { ItemWithStock } from './types';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { motion, AnimatePresence } from 'framer-motion';
import { SelectionSummaryToast } from './components/SelectionSummaryToast';

// Componente principal de items
export function ItemsStep({
  onNext,
  onPrevious,
  isLastStep,
  isFirstStep,
  progress,
}: StepComponentProps) {
  // Estado global del formulario
  const { 
    state,
    setSelectedItems,
    setItemsTotalPrice
  } = useShiftForm();

  // Extraer datos del estado global
  const { 
    selectedLocation: locationId, 
    selectedDate, 
    selectedTimeSlot, 
    duration, 
    shiftDetails 
  } = state;

  // Extraer startTime y endTime de los detalles del shift o del timeSlot
  const startTime = shiftDetails?.startTime || selectedTimeSlot?.split("-")[0]?.trim();
  const endTime = shiftDetails?.endTime || selectedTimeSlot?.split("-")[1]?.trim();

  // Estados locales
  const [itemsWithStock, setItemsWithStock] = useState<ItemWithStock[]>([]);
  const [localSelectedItems, setLocalSelectedItems] = useState<Record<string, number>>({});
  const [isProcessingData, setIsProcessingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Detectar si es un dispositivo móvil
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Obtener el ID de la sede (branch) a partir del locationId
  const branchId = locationId;

  // Obtener items usando el hook useItems
  const { 
    data: items = [], 
    isLoading: itemsLoading, 
    error: itemsError 
  } = useItems(branchId, {
    enabled: !!locationId,
    onError: (error) => {
      console.error("Error loading items:", error);
      toast.error("No se pudieron cargar los artículos disponibles");
      setError("Error al cargar los artículos. Por favor, intenta de nuevo más tarde.");
    }
  });

  // Determinar el estado de carga general
  const isLoading = itemsLoading || isProcessingData;

  // Formatear fecha y hora para mostrar
  const formattedDate = selectedDate ? formatDate(selectedDate) : 'No seleccionada';
  const formattedTimeSlot = startTime && endTime 
    ? `${formatTime(startTime)} - ${formatTime(endTime)}` 
    : 'No seleccionado';

  // Efecto para manejar errores
  useEffect(() => {
    if (itemsError) {
      console.error("❌ Error detectado en useItems:", itemsError);
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
    if (itemsLoading) {
      console.log("⏳ Aún cargando items, esperando...");
      return;
    }

    if (!items || items.length === 0) {
      console.log("⚠️ No hay items para procesar después de carga");
      return;
    }

    console.log("🔄 Iniciando procesamiento de items, cantidad:", items.length);

    // Comenzar procesamiento
    setIsProcessingData(true);

    try {
      // Procesar todos los items de una vez
      const processedItems: ItemWithStock[] = items.map(item => {
        // Asegurarse de que duration_pricing sea un objeto válido
        let duration_pricing = {};
        try {
          if (typeof item.duration_pricing === 'string') {
            duration_pricing = JSON.parse(item.duration_pricing);
          } else if (item.duration_pricing && typeof item.duration_pricing === 'object') {
            duration_pricing = item.duration_pricing;
          }
        } catch (e) {
          console.warn("⚠️ Error al procesar duration_pricing del ítem:", item.name, e);
        }

        return {
          ...item,
          availableStock: item.stock || 0,
          baseStock: item.stock || 0,
          reservedUnits: 0,
          id: item.id,
          name: item.name,
          type: item.type || 'equipment',
          duration_pricing: duration_pricing
        };
      });

      console.log("✅ Items procesados correctamente:", processedItems.length);
      
      // Si hay items después del procesamiento, actualizar el estado
      if (processedItems.length > 0) {
        console.log("✅ Primer ítem procesado:", processedItems[0]);
        setItemsWithStock(processedItems);
      } else {
        console.warn("⚠️ No hay items después del procesamiento");
      }
      
      setIsProcessingData(false);
    } catch (err) {
      console.error("❌ Error processing items:", err);
      setError('Error al procesar los ítems.');
      setIsProcessingData(false);
    }
  }, [items, selectedDate, startTime, endTime, itemsLoading]);

  // Filtrar items basados en la búsqueda
  const filteredItems = useMemo(() => {
    if (!itemsWithStock) return [];
    
    // Filtrar por tipo y disponibilidad
    return itemsWithStock.filter(item => 
      item.availableStock > 0 || (localSelectedItems[item.id] || 0) > 0
    );
  }, [itemsWithStock, localSelectedItems]);

  // Función para obtener el precio de un ítem basado en la duración
  const getItemPrice = useCallback((item: ItemWithStock) => {
    if (!duration) return 0;
    const durationInMinutes = duration * 60;
    return item.duration_pricing[durationInMinutes.toString()] || 0;
  }, [duration]);

  // Calcular el precio total
  const totalPrice = useMemo(() => {
    return Object.entries(localSelectedItems).reduce((acc, [itemId, quantity]) => {
      const item = itemsWithStock.find(item => item.id === itemId);
      if (!item) return acc;
      return acc + (getItemPrice(item) * quantity);
    }, 0);
  }, [localSelectedItems, itemsWithStock, getItemPrice]);

  // Calcular el número total de ítems seleccionados
  const totalItemsSelected = useMemo(() => {
    return Object.values(localSelectedItems).reduce((sum, quantity) => sum + quantity, 0);
  }, [localSelectedItems]);

  // Comprobar si hay ítems seleccionados
  const hasItems = totalItemsSelected > 0;

  // Manejar cambios en la selección de items
  const handleItemSelection = useCallback((itemId: string, quantity: number) => {
    setLocalSelectedItems(prev => {
      const newItems = { ...prev };
      if (quantity <= 0) {
        delete newItems[itemId];
      } else {
        newItems[itemId] = quantity;
      }
      return newItems;
    });
  }, []);

  // Modo oscuro para la aplicación
  const theme = 'light'; // O conectar con el contexto de tema si existe
  
  // Estado para controlar la visibilidad del toast de resumen
  const [toastVisible, setToastVisible] = useState(false);
  
  // Estado que guarda la versión previa de los ítems seleccionados
  const [prevSelectedItems, setPrevSelectedItems] = useState<Record<string, number>>({});
  
  // Efecto para mostrar/ocultar la notificación basado en ítems seleccionados
  useEffect(() => {
    // Contar el total de ítems seleccionados
    const totalItemsCount = Object.values(localSelectedItems).reduce((sum, qty) => sum + qty, 0);
    
    // Mostrar la notificación si hay ítems seleccionados, ocultarla si no hay ninguno
    setToastVisible(totalItemsCount > 0);
    
    // Actualizar el estado previo para la próxima comparación
    setPrevSelectedItems(localSelectedItems);
  }, [localSelectedItems]);

  // Manejar el avance al siguiente paso
  const handleNext = () => {
    // Guardar los ítems seleccionados en el contexto global
    setSelectedItems(localSelectedItems);
    setItemsTotalPrice(totalPrice);
    
    // Avanzar al siguiente paso
    onNext();
  };

  // Si no hay locationId, mostrar un mensaje informativo
  useEffect(() => {
    if (!locationId) {
      setError('Por favor, selecciona una ubicación primero');
    } else {
      setError(null);
    }
  }, [locationId]);

  // Si está cargando todo el componente
  if (isLoading && !itemsWithStock.length) {
    return (
      <div className="p-8 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <p className="mt-4 text-gray-600">Cargando ítems disponibles...</p>
      </div>
    );
  }

  // Si hay un error que mostrar
  if (error && !isLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center">
        <div className="text-red-500 mb-4 text-center">{error}</div>
      </div>
    );
  }

  return (
    <div className="container px-0 py-0 mx-auto max-w-6xl">
      {/* Cabecera con título y descripción */}
      <div className="mb-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900">Selecciona los ítems</h1>
          <p className="text-sm text-gray-500">Selecciona los artículos que deseas reservar</p>
        </div>
      </div>
      
      {/* Layout responsivo con lista de ítems */}
      <div className="w-full">
        {/* Lista de ítems */}
        {filteredItems.length > 0 ? (
          <ItemsList 
            items={filteredItems}
            selectedItems={localSelectedItems}
            onQuantityChange={handleItemSelection}
            getItemPrice={getItemPrice}
            isLoading={isLoading}
            layout="list"
            className="pb-10" // Reducido el espacio al eliminar el botón flotante
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-neutral-900 rounded-lg">
            <p className="text-gray-500">No se encontraron ítems disponibles.</p>
          </div>
        )}
      </div>
      
      {/* Toast de notificación */}
      <AnimatePresence>
        {toastVisible && (
          <SelectionSummaryToast
            selectedItems={localSelectedItems}
            getItemDetails={(itemId) => {
              const item = itemsWithStock.find((i) => i.id === itemId);
              return item ? { item, price: getItemPrice(item) } : null;
            }}
            theme={theme}
            visible={toastVisible}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default ItemsStep;
