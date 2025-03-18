'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StepComponentProps } from '../StepRenderer';
import { useShiftForm } from '../../context/ShiftFormContext';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, Check, Search, Loader2, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useItems } from '@/hooks/useItems';
import { toast } from 'sonner';
import { bookingService } from '@/services/bookingService';
import type { Item, ItemType, RentalSelection } from '@/types/items';
import { format } from 'date-fns';
import { ItemWithStock } from './types';

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

function QuantitySelector({ value, onChange, min = 0, max = 100 }: QuantitySelectorProps) {
  const handleDecrease = useCallback(() => {
    if (value > min) {
      onChange(value - 1);
    }
  }, [value, min, onChange]);

  const handleIncrease = useCallback(() => {
    if (value < max) {
      onChange(value + 1);
    }
  }, [value, max, onChange]);

  return (
    <div className="flex items-center gap-1">
      <div
        role="button"
        tabIndex={0}
        onClick={handleDecrease}
        onKeyDown={(e) => e.key === 'Enter' && handleDecrease()}
        className={cn(
          "h-5 w-5 rounded-lg flex items-center justify-center cursor-pointer",
          value <= min && "opacity-50 cursor-not-allowed",
          "hover:bg-gray-100 text-gray-500"
        )}
        aria-label="Disminuir cantidad"
      >
        <Minus className="h-3 w-3" />
      </div>
      
      <span className={cn(
        "text-[10px] font-medium min-w-[20px] text-center",
        "text-gray-700"
      )}>
        {value}
      </span>
      
      <div
        role="button"
        tabIndex={0}
        onClick={handleIncrease}
        onKeyDown={(e) => e.key === 'Enter' && handleIncrease()}
        className={cn(
          "h-5 w-5 rounded-lg flex items-center justify-center cursor-pointer",
          value >= max && "opacity-50 cursor-not-allowed",
          "hover:bg-gray-100 text-gray-500"
        )}
        aria-label="Aumentar cantidad"
      >
        <Plus className="h-3 w-3" />
      </div>
    </div>
  );
}

const ItemsStep: React.FC<StepComponentProps> = ({
  onNext,
  onPrevious,
  isLastStep,
  isFirstStep,
  progress,
}) => {
  const { state, setSelectedItems, setItemsTotalPrice } = useShiftForm();
  const [itemsWithStock, setItemsWithStock] = useState<ItemWithStock[]>([]);
  const [isLoadingStock, setIsLoadingStock] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [localSelectedItems, setLocalSelectedItems] = useState<Record<string, number>>({});
  const [totalPrice, setTotalPrice] = useState(0);

  // Obtener datos del contexto
  const locationId = state.selectedLocation;
  const selectedDate = state.selectedDate;
  const selectedTimeSlot = state.selectedTimeSlot;
  const startTime = selectedTimeSlot?.split("-")[0]?.trim();
  const endTime = selectedTimeSlot?.split("-")[1]?.trim();
  const duration = state.duration;

  useEffect(() => {
    const fetchItemsStock = async () => {
      if (!locationId || !selectedDate || !startTime || !endTime) {
        setIsLoadingStock(false);
        return;
      }

      try {
        setIsLoadingStock(true);
        
        // Construir el slot seleccionado
        const selectedSlot = {
          date: selectedDate,
          startTime,
          endTime,
          duration
        };

        // Simulación de llamada al servicio (hay que implementar este método en el servicio)
        // const response = await bookingService.getItemsAvailability(locationId, selectedSlot);
        
        // Por ahora usaremos datos de prueba 
        const mockItems: ItemWithStock[] = [
          {
            id: '1',
            name: 'Raqueta de Tenis',
            type: 'equipment',
            availableStock: 5,
            baseStock: 8,
            reservedUnits: 3,
            duration_pricing: { '1': 10, '2': 18, '3': 25 }
          },
          {
            id: '2',
            name: 'Pelotas de Tenis (Pack)',
            type: 'equipment',
            availableStock: 10,
            baseStock: 15,
            reservedUnits: 5,
            duration_pricing: { '1': 5, '2': 8, '3': 10 }
          },
          {
            id: '3',
            name: 'Botella de Agua',
            type: 'consumable',
            availableStock: 20,
            baseStock: 30,
            reservedUnits: 10,
            duration_pricing: { '1': 2, '2': 2, '3': 2 }
          }
        ];

        setItemsWithStock(mockItems);
      } catch (error) {
        console.error('Error fetching items availability:', error);
        toast.error('No se pudo cargar la disponibilidad de artículos');
      } finally {
        setIsLoadingStock(false);
      }
    };

    fetchItemsStock();
  }, [locationId, selectedDate, startTime, endTime, duration]);

  // Filtrar items según la búsqueda
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return itemsWithStock;
    
    const query = searchQuery.toLowerCase();
    return itemsWithStock.filter(item => 
      item.name.toLowerCase().includes(query)
    );
  }, [itemsWithStock, searchQuery]);

  // Manejar cambios en la selección de items
  const handleItemSelection = useCallback((itemId: string, quantity: number) => {
    setLocalSelectedItems(prev => {
      const updated = { ...prev };
      
      if (quantity <= 0) {
        delete updated[itemId];
      } else {
        updated[itemId] = quantity;
      }
      
      return updated;
    });
  }, []);

  // Calcular precio total cuando cambian las selecciones
  useEffect(() => {
    if (!itemsWithStock.length) return;

    let price = 0;
    Object.entries(localSelectedItems).forEach(([itemId, quantity]) => {
      const item = itemsWithStock.find(i => i.id === itemId);
      if (item && item.duration_pricing && duration) {
        const durationPrice = item.duration_pricing[duration.toString()] || 0;
        price += durationPrice * quantity;
      }
    });

    setTotalPrice(price);
  }, [localSelectedItems, itemsWithStock, duration]);

  // Función para continuar al siguiente paso
  const handleNext = useCallback(() => {
    // Guardar los items seleccionados en el contexto
    setSelectedItems(localSelectedItems);
    setItemsTotalPrice(totalPrice);
    
    onNext();
  }, [localSelectedItems, totalPrice, setSelectedItems, setItemsTotalPrice, onNext]);

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Seleccionar Artículos</h2>
        <p className="text-gray-500 mt-1">Elige los artículos que deseas reservar para tu turno</p>
        
        {/* Barra de progreso */}
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
          <div 
            className="bg-primary h-2.5 rounded-full transition-all duration-300" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      <div className="mt-6">
        {/* Buscador */}
        <div className="mb-4 relative">
          <Input
            type="text"
            placeholder="Buscar artículos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>

        {isLoadingStock ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-sm text-gray-500">Cargando artículos disponibles...</p>
          </div>
        ) : (
          <>
            {filteredItems.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No se encontraron artículos disponibles.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredItems.map((item) => (
                  <div 
                    key={item.id}
                    className="border rounded-lg p-3 flex justify-between items-center"
                  >
                    <div>
                      <h3 className="font-medium">{item.name}</h3>
                      <p className="text-sm text-gray-500">
                        {item.availableStock > 0 
                          ? `${item.availableStock} disponibles` 
                          : 'No disponible'}
                      </p>
                      <p className="text-sm font-medium mt-1">
                        ${item.duration_pricing?.[duration.toString()] || 0}
                      </p>
                    </div>
                    
                    <QuantitySelector
                      value={localSelectedItems[item.id] || 0}
                      onChange={(value) => handleItemSelection(item.id, value)}
                      max={item.availableStock}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Resumen de selección */}
            {Object.keys(localSelectedItems).length > 0 && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-2">Artículos seleccionados</h3>
                <ul className="space-y-1">
                  {Object.entries(localSelectedItems).map(([itemId, quantity]) => {
                    const item = itemsWithStock.find(i => i.id === itemId);
                    return item ? (
                      <li key={itemId} className="flex justify-between text-sm">
                        <span>{item.name} x{quantity}</span>
                        <span>${(item.duration_pricing?.[duration.toString()] || 0) * quantity}</span>
                      </li>
                    ) : null;
                  })}
                </ul>
                <div className="mt-3 pt-2 border-t flex justify-between font-medium">
                  <span>Total</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-8 flex justify-between">
        <Button 
          variant="outline" 
          onClick={onPrevious}
          disabled={isFirstStep}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Anterior
        </Button>
        
        <Button 
          onClick={handleNext}
          disabled={isLoadingStock}
        >
          Continuar
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ItemsStep;
