"use client"

import { useState, useEffect, useMemo, useCallback } from 'react'
import { format } from 'date-fns'
import { IconPlus, IconMinus } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { useItems } from '@/hooks/useItems'
import { useBranchContext } from '@/contexts/BranchContext'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import type { Item, RentalSelection } from '@/types/items'
import { cn } from "@/lib/utils"
import { Label } from '@/components/ui/label'
import { motion } from 'framer-motion'
import { timeToMinutes } from '@/lib/time-utils'
import { useRentalContext } from '@/contexts/RentalContext'
import { supabase } from '@/lib/supabase'
import { checkFutureAvailability } from '@/services/bookingService'
import { bookingService } from '@/services/bookingService'
import { useDateContext } from "@/contexts/DateContext"
import { DateTime } from 'luxon'

interface RentalStepProps {
  startTime: string
  endTime: string
  durationInMinutes: number
  selectedDate: Date
  isVisible?: boolean
}

// Definir la interfaz para el item con stock
interface ItemWithStock extends Item {
  availableStock: number;
  baseStock: number;
  reservedUnits: number;
}

// Mover fuera del componente las funciones de utilidad
const validateDuration = (durationInMinutes: number): boolean => {
  return typeof durationInMinutes === 'number' && !isNaN(durationInMinutes) && durationInMinutes > 0;
};

const getPriceForDuration = (item: Item, durationInMinutes: number): number | undefined => {
  if (!item?.duration_pricing) return undefined;
  return item.duration_pricing[String(durationInMinutes)];
};

export function RentalStep({ 
  startTime,
  endTime,
  durationInMinutes: propDurationInMinutes,
  selectedDate,
  isVisible = true
}: RentalStepProps) {
  const { currentBranch } = useBranchContext()
  const { rentals, updateRentals } = useRentalContext()
  const [localRentals, setLocalRentals] = useState<RentalSelection[]>(rentals)
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({})
  const { data: items = [], isLoading, error } = useItems(currentBranch?.id)
  const [itemsWithStock, setItemsWithStock] = useState<ItemWithStock[]>([])
  const [isLoadingStock, setIsLoadingStock] = useState(true)

  // Calcular la duración internamente como backup
  const calculatedDuration = useMemo(() => {
    if (!startTime || !endTime) return 0;
    try {
      const startMinutes = timeToMinutes(startTime);
      const endMinutes = timeToMinutes(endTime);
      return Math.max(0, endMinutes - startMinutes);
    } catch (error) {
      console.error('Error calculando la duración:', error);
      return 0;
    }
  }, [startTime, endTime]);

  // Usar la duración proporcionada o la calculada como fallback
  const durationInMinutes = useMemo(() => 
    propDurationInMinutes > 0 ? propDurationInMinutes : calculatedDuration,
    [propDurationInMinutes, calculatedDuration]
  );

  // Verificar si un item tiene precio configurado para la duración actual
  const hasConfiguredPrice = useCallback((item: Item): boolean => {
    if (!validateDuration(durationInMinutes)) return false;
    return getPriceForDuration(item, durationInMinutes) !== undefined;
  }, [durationInMinutes]);

  // Función para calcular el precio base de un artículo
  const calculateBasePrice = useCallback((item: Item): number => {
    if (!validateDuration(durationInMinutes)) return 0;
    
    const configuredPrice = getPriceForDuration(item, durationInMinutes);
    if (configuredPrice !== undefined) return Number(configuredPrice);
    
    return customPrices[item.id] || 0;
  }, [durationInMinutes, customPrices]);

  // Manejar cambio de precio personalizado
  const handleCustomPriceChange = useCallback((itemId: string, value: number | null) => {
    setCustomPrices(prev => ({
      ...prev,
      [itemId]: value || 0
    }));

    // Actualizar el rental si existe
    setLocalRentals(prev => {
      const existingRental = prev.find(r => r.itemId === itemId);
      if (!existingRental) return prev;

      return prev.map(r =>
        r.itemId === itemId
          ? {
              ...r,
              pricePerUnit: value || 0,
              price: (value || 0) * r.quantity,
              totalPrice: (value || 0) * r.quantity
            }
          : r
      );
    });
    // No actualizamos el contexto aquí para evitar el error
  }, []);

  // Efecto para sincronizar los rentals locales con el contexto global
  useEffect(() => {
    // Solo actualizar el contexto cuando los rentals locales cambien
    if (JSON.stringify(localRentals) !== JSON.stringify(rentals)) {
      updateRentals(localRentals);
    }
  }, [localRentals, rentals, updateRentals]);

  // Renderizar el input de precio personalizado
  const renderCustomPriceInput = useCallback((item: Item) => {
    const hasConfigured = hasConfiguredPrice(item);
    const showCustomPrice = !hasConfigured && validateDuration(durationInMinutes);

    if (!showCustomPrice) return null;

    const currentPrice = customPrices[item.id];
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        className="mt-2"
      >
        <Label className="text-xs text-gray-500 font-normal block">
          Precio personalizado para {durationInMinutes} minutos
        </Label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={currentPrice || ''}
          onChange={(e) => {
            const value = e.target.value === '' ? null : parseFloat(e.target.value);
            handleCustomPriceChange(item.id, value);
          }}
          placeholder="0€"
          className={cn(
            "mt-3 w-24 px-0 py-1",
            "border-0 border-b border-gray-200/50",
            "focus:outline-none focus:border-gray-400/70",
            "transition-colors duration-200",
            "placeholder:text-gray-400 text-sm text-gray-900",
            "bg-transparent",
            "[appearance:textfield]",
            "[&::-webkit-outer-spin-button]:appearance-none",
            "[&::-webkit-inner-spin-button]:appearance-none"
          )}
        />
      </motion.div>
    );
  }, [durationInMinutes, hasConfiguredPrice, customPrices, handleCustomPriceChange]);

  // Memoizar cálculos de precios y totales
  const memoizedPrices = useMemo(() => {
    if (!items.length || !validateDuration(durationInMinutes)) return new Map();
    
    return new Map(items.map(item => [
      item.id,
      {
        basePrice: getPriceForDuration(item, durationInMinutes) || customPrices[item.id] || 0,
        hasConfigured: getPriceForDuration(item, durationInMinutes) !== undefined,
        hasCustomPrice: customPrices[item.id] !== undefined
      }
    ]));
  }, [items, durationInMinutes, customPrices]);

  // Memoizar totales de rentals
  const rentalTotals = useMemo(() => {
    return localRentals.reduce((acc, rental) => {
      const priceInfo = memoizedPrices.get(rental.itemId);
      if (!priceInfo) return acc;
      
      return {
        ...acc,
        total: acc.total + (priceInfo.basePrice * rental.quantity),
        items: [...acc.items, {
          ...rental,
          pricePerUnit: priceInfo.basePrice,
          totalPrice: priceInfo.basePrice * rental.quantity
        }]
      };
    }, { total: 0, items: [] as RentalSelection[] });
  }, [localRentals, memoizedPrices]);

  // Optimizar handleQuantityChange
  const handleQuantityChange = useCallback((itemId: string, change: number) => {
    setLocalRentals(prev => {
      const existingRental = prev.find(r => r.itemId === itemId);
      const item = itemsWithStock.find(i => i.id === itemId);
      const priceInfo = memoizedPrices.get(itemId);
      
      if (!item || !priceInfo) {
        return prev;
      }

      const basePrice = priceInfo.basePrice;
      if (basePrice <= 0) {
        toast.error('El precio no está configurado correctamente');
        return prev;
      }

      if (existingRental) {
        const newQuantity = Math.max(0, existingRental.quantity + change);
        
        if (change > 0 && newQuantity > item.availableStock) {
          toast.error(`No hay suficiente stock disponible. Máximo disponible: ${item.availableStock}`);
          return prev;
        }

        if (newQuantity === 0) {
          const newRentals = prev.filter(r => r.itemId !== itemId);
          updateRentals(newRentals);
          return newRentals;
        }

        const updatedRentals = prev.map(r =>
          r.itemId === itemId
            ? { 
                ...r, 
                quantity: newQuantity,
                duration: durationInMinutes,
                pricePerUnit: basePrice,
                price: basePrice * newQuantity,
                totalPrice: basePrice * newQuantity
              }
            : r
        );
        updateRentals(updatedRentals);
        return updatedRentals;
      }

      if (change > 0) {
        if (item.availableStock < 1) {
          toast.error('No hay stock disponible');
          return prev;
        }

        const newRental = { 
          itemId, 
          quantity: 1,
          duration: durationInMinutes,
          pricePerUnit: basePrice,
          price: basePrice,
          totalPrice: basePrice
        };

        const newRentals = [...prev, newRental];
        updateRentals(newRentals);
        return newRentals;
      }

      return prev;
    });
  }, [itemsWithStock, memoizedPrices, durationInMinutes, updateRentals]);

  // Optimizar useEffect para sincronizar rentals
  useEffect(() => {
    if (!durationInMinutes || localRentals.length === 0) return;
    
    const updatedRentals = localRentals.map(rental => {
      const priceInfo = memoizedPrices.get(rental.itemId);
      if (!priceInfo || priceInfo.basePrice <= 0) return null;

      return {
        ...rental,
        duration: durationInMinutes,
        pricePerUnit: priceInfo.basePrice,
        price: priceInfo.basePrice * rental.quantity,
        totalPrice: priceInfo.basePrice * rental.quantity
      };
    }).filter(Boolean);

    if (updatedRentals.length !== localRentals.length) {
      setLocalRentals(updatedRentals);
      updateRentals(updatedRentals);
    }
  }, [durationInMinutes, memoizedPrices, localRentals, updateRentals]);

  const getQuantityForItem = useCallback((itemId: string) => {
    return localRentals.find(r => r.itemId === itemId)?.quantity || 0;
  }, [localRentals]);

  const calculateTotal = useCallback(() => {
    return localRentals.reduce((total, rental) => {
      const item = items.find(i => i.id === rental.itemId);
      if (!item) return total;
      const basePrice = calculateBasePrice(item);
      return total + (basePrice * rental.quantity);
    }, 0);
  }, [localRentals, items, calculateBasePrice]);

  // Función para renderizar el precio del artículo
  const renderPrice = useCallback((item: Item) => {
    if (!validateDuration(durationInMinutes)) {
      return <span className="text-sm text-gray-400">Duración no válida</span>;
    }

    const configuredPrice = getPriceForDuration(item, durationInMinutes);
    const customPrice = customPrices[item.id];
    const price = configuredPrice !== undefined ? configuredPrice : customPrice;

    if (price === undefined || price <= 0) {
      return <span className="text-xs font-normal text-gray-600">Precio no configurado</span>;
    }

    return (
      <span className="text-sm font-medium text-gray-900">
        {price.toFixed(2)}€
      </span>
    );
  }, [durationInMinutes, customPrices]);

  // Efecto para inicializar itemsWithStock cuando items cambia
  useEffect(() => {
    const initializeStock = async () => {
      const formattedDate = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null

      console.log('🔄 Iniciando inicialización de stock:', {
        itemsCount: items.length,
        hasRequiredParams: {
          startTime: !!startTime,
          endTime: !!endTime,
          date: !!formattedDate
        },
        params: {
          startTime,
          endTime,
          date: formattedDate || 'no-date'
        }
      })

      if (!items.length || !currentBranch) {
        console.log('ℹ️ No hay items para procesar o no hay sede seleccionada')
        setItemsWithStock([])
        setIsLoadingStock(false)
        return
      }

      if (!startTime || !endTime || !formattedDate) {
        console.log('ℹ️ Faltan parámetros temporales o fecha inválida:', {
          startTime,
          endTime,
          formattedDate
        })
        
        const baseStock = items.map(item => ({
          ...item,
          availableStock: item.stock,
          baseStock: item.stock,
          reservedUnits: 0
        }))
        setItemsWithStock(baseStock)
        setIsLoadingStock(false)
        return
      }

      setIsLoadingStock(true)
      
      try {
        // Convertir la hora local a UTC para la consulta
        const branchTimezone = currentBranch.timezone || 'Europe/Madrid'
        const startDateTime = DateTime.fromFormat(startTime, 'HH:mm', { zone: branchTimezone })
        const endDateTime = DateTime.fromFormat(endTime, 'HH:mm', { zone: branchTimezone })
        
        const utcStartTime = startDateTime.toUTC().toFormat('HH:mm')
        const utcEndTime = endDateTime.toUTC().toFormat('HH:mm')

        console.log('🔍 Iniciando verificación de disponibilidad para items con fecha:', formattedDate, {
          localTime: { start: startTime, end: endTime },
          utcTime: { start: utcStartTime, end: utcEndTime },
          timezone: branchTimezone
        })
        
        const stockPromises = items.map(async (item) => {
          console.log(`📦 Verificando stock para item: ${item.name} (${item.id}) en fecha: ${formattedDate}`)
          
          try {
            const availableStock = await bookingService.checkFutureAvailability(
              item.id,
              formattedDate,
              utcStartTime,
              utcEndTime
            )

            console.log('✅ Stock verificado:', {
              itemId: item.id,
              itemName: item.name,
              baseStock: item.stock,
              availableStock,
              reservedUnits: Math.max(0, item.stock - availableStock),
              date: formattedDate
            })

            const reservedUnits = Math.max(0, item.stock - availableStock)
            const validatedAvailableStock = Math.max(0, Math.min(availableStock, item.stock))

            return {
              ...item,
              availableStock: validatedAvailableStock,
              baseStock: item.stock,
              reservedUnits
            } as ItemWithStock
          } catch (error) {
            console.error('❌ Error al verificar stock:', {
              itemId: item.id,
              itemName: item.name,
              error,
              date: formattedDate
            })
            
            return {
              ...item,
              availableStock: item.stock,
              baseStock: item.stock,
              reservedUnits: 0
            } as ItemWithStock
          }
        })

        const results = await Promise.all(stockPromises)
        console.log('✅ Stock actualizado para todos los items:', {
          itemsCount: results.length,
          items: results.map(item => ({
            name: item.name,
            availableStock: item.availableStock,
            baseStock: item.baseStock
          }))
        })
        setItemsWithStock(results)
      } catch (error) {
        console.error('❌ Error general al procesar stock:', error)
        
        const baseStock = items.map(item => ({
          ...item,
          availableStock: item.stock,
          baseStock: item.stock,
          reservedUnits: 0
        }))
        setItemsWithStock(baseStock)
      } finally {
        console.log('🔄 Finalizando proceso de stock')
        setIsLoadingStock(false)
      }
    }

    initializeStock()
  }, [items, startTime, endTime, selectedDate, currentBranch])

  if (!currentBranch) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-gray-500 mb-4">
          Selecciona una sede para ver los artículos disponibles
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Spinner className="w-8 h-8" />
        <p className="text-sm text-gray-500 mt-2">Cargando artículos...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-red-500 mb-4">
          {error instanceof Error ? error.message : 'Error al cargar los artículos'}
        </p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Reintentar
        </Button>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-gray-500 mb-4">
          No hay artículos disponibles en esta sede
        </p>
      </div>
    )
  }

  if (isLoadingStock) {
    return (
      <div className="space-y-6">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "group flex items-center py-3 px-4 rounded-lg",
              "hover:bg-gray-50 transition-colors duration-200"
            )}
          >
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {item.name}
              </h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-500">
                  Verificando stock disponible...
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-gray-900">
          Artículos disponibles
        </h3>
        <p className="text-xs text-gray-500">
          Selecciona los artículos que deseas alquilar para tu reserva
        </p>
      </div>

      {/* Lista de artículos */}
      <div className="space-y-1">
        {itemsWithStock.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "group flex flex-col py-3 px-4 rounded-lg",
              "transition-colors duration-200",
              getQuantityForItem(item.id) > 0
                ? "bg-gray-50"
                : "hover:bg-gray-50/50"
            )}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">{item.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500">
                    Stock: {item.availableStock}
                  </span>
                  {item.requires_deposit && (
                    <span className="text-xs text-amber-600">
                      Depósito: {item.deposit_amount}€
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right min-w-[60px]">
                  {renderPrice(item)}
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleQuantityChange(item.id, -1)}
                    disabled={getQuantityForItem(item.id) === 0}
                    className={cn(
                      "h-7 w-7",
                      "border-gray-200",
                      "bg-white hover:bg-gray-50/80",
                      getQuantityForItem(item.id) === 0 && "opacity-50"
                    )}
                  >
                    <IconMinus className="h-3 w-3" />
                  </Button>
                  <span className="w-5 text-center text-sm text-gray-600">
                    {getQuantityForItem(item.id)}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleQuantityChange(item.id, 1)}
                    disabled={getQuantityForItem(item.id) >= item.availableStock}
                    className={cn(
                      "h-7 w-7",
                      "border-gray-200",
                      "bg-white hover:bg-gray-50/80",
                      getQuantityForItem(item.id) >= item.availableStock && "opacity-50"
                    )}
                  >
                    <IconPlus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
            {renderCustomPriceInput(item)}
          </motion.div>
        ))}
      </div>

      {/* Resumen del alquiler */}
      {localRentals.length > 0 && (
        <div className="mt-6 pt-5 border-t border-gray-100">
          <div className="space-y-0.5">
            <h3 className="text-xs font-medium text-gray-600">
              Resumen del alquiler
            </h3>
            <p className="text-xs text-gray-400">
              {localRentals.length === 1 
                ? '1 artículo seleccionado'
                : `${localRentals.length} artículos seleccionados`
              }
            </p>
          </div>
          <div className="mt-3 space-y-2">
            {localRentals.map(rental => {
              const item = items.find(i => i.id === rental.itemId)
              if (!item) return null
              const basePrice = calculateBasePrice(item)

              return (
                <motion.div
                  key={rental.itemId}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between py-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{item.name}</span>
                    <span className="text-xs text-gray-400">x{rental.quantity}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {(basePrice * rental.quantity).toFixed(2)}€
                  </span>
                </motion.div>
              )
            })}
            <div className="pt-2 border-t border-gray-100 flex justify-between">
              <span className="text-sm font-medium text-gray-900">Total</span>
              <span className="text-sm font-medium text-gray-900">
                {calculateTotal().toFixed(2)}€
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 