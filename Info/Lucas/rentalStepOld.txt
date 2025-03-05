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

interface RentalStepProps {
  startTime: string
  endTime: string
  durationInMinutes: number
  date: string
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
  date
}: RentalStepProps) {
  const { selectedDate } = useDateContext()
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
  }, []);

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
        <Label className="text-xs text-gray-600">
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
          placeholder="Ingrese el precio"
          className={cn(
            "mt-1 w-32 px-2 py-1",
            "rounded-md border border-gray-200 bg-white",
            "focus:outline-none focus:border-gray-300",
            "transition-colors duration-200",
            "placeholder:text-gray-400 text-sm",
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

  // Efecto optimizado para sincronizar rentals
  useEffect(() => {
    if (!durationInMinutes || rentalTotals.items.length === 0) return;
    
    const shouldUpdate = rentalTotals.items.some((rental, idx) => {
      const current = localRentals[idx];
      return !current || 
             current.price !== rental.totalPrice || 
             current.pricePerUnit !== rental.pricePerUnit;
    });

    if (shouldUpdate) {
      setLocalRentals(rentalTotals.items);
      updateRentals(rentalTotals.items);
    }
  }, [durationInMinutes, rentalTotals, localRentals, updateRentals]);

  // Optimizar renderPrice usando memoizedPrices
  const renderPrice = useCallback((item: Item) => {
    const priceInfo = memoizedPrices.get(item.id);
    
    if (!priceInfo || !validateDuration(durationInMinutes)) {
      return <span className="text-sm text-gray-500">Seleccione duración</span>;
    }

    if (priceInfo.hasConfigured || priceInfo.hasCustomPrice) {
      return <span className="text-sm font-medium text-gray-900 whitespace-nowrap">{priceInfo.basePrice}€</span>;
    }

    return <span className="text-sm text-gray-500">Sin precio configurado</span>;
  }, [memoizedPrices, durationInMinutes]);

  // Optimizar handleQuantityChange
  const handleQuantityChange = useCallback((itemId: string, change: number) => {
    setLocalRentals(prev => {
      const existingRental = prev.find(r => r.itemId === itemId);
      const item = itemsWithStock.find(i => i.id === itemId);
      const priceInfo = memoizedPrices.get(itemId);
      
      if (!item || !priceInfo) {
        console.warn('Item no encontrado o sin precio configurado');
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

        const totalPrice = priceInfo.basePrice * newQuantity;
        const updatedRentals = prev.map(r =>
          r.itemId === itemId
            ? { 
                ...r, 
                quantity: newQuantity,
                duration: durationInMinutes,
                price: totalPrice,
                pricePerUnit: priceInfo.basePrice,
                totalPrice
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

        const newRentals = [...prev, { 
          itemId, 
          quantity: 1,
          duration: durationInMinutes,
          price: priceInfo.basePrice,
          pricePerUnit: priceInfo.basePrice,
          totalPrice: priceInfo.basePrice
        }];
        updateRentals(newRentals);
        return newRentals;
      }

      return prev;
    });
  }, [itemsWithStock, memoizedPrices, durationInMinutes, updateRentals]);

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

      if (!items.length) {
        console.log('ℹ️ No hay items para procesar')
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
        console.log('🔍 Iniciando verificación de disponibilidad para items con fecha:', formattedDate)
        
        const stockPromises = items.map(async (item) => {
          console.log(`📦 Verificando stock para item: ${item.name} (${item.id}) en fecha: ${formattedDate}`)
          
          try {
            const availableStock = await bookingService.checkFutureAvailability(
              item.id,
              formattedDate,
              startTime,
              endTime
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
  }, [items, startTime, endTime, selectedDate])

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
            className="group relative p-4 rounded-lg border transition-all duration-200 bg-gray-50"
          >
            <div className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {item.name}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">
                    Verificando stock disponible...
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {itemsWithStock.map((item) => (
        <div
          key={item.id}
          className={cn(
            "group relative p-4 rounded-lg border transition-all duration-200",
            getQuantityForItem(item.id) > 0
              ? "bg-gray-50 ring-1 ring-black/5 border-transparent"
              : "bg-white border-gray-200 hover:border-gray-300"
          )}
        >
          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {item.name}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">
                  Stock disponible: {item.availableStock}
                </span>
                {item.requires_deposit && (
                  <span className="text-xs text-amber-600">
                    Depósito: {item.deposit_amount}€
                  </span>
                )}
              </div>
              {renderCustomPriceInput(item)}
            </div>

            <div className="flex items-center px-4">
              {renderPrice(item)}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleQuantityChange(item.id, -1)}
                disabled={getQuantityForItem(item.id) === 0}
                className={cn(
                  "h-8 w-8",
                  getQuantityForItem(item.id) === 0 && "opacity-50"
                )}
              >
                <IconMinus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center text-sm font-medium">
                {getQuantityForItem(item.id)}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleQuantityChange(item.id, 1)}
                disabled={getQuantityForItem(item.id) >= item.availableStock}
                className={cn(
                  "h-8 w-8",
                  getQuantityForItem(item.id) >= item.availableStock && "opacity-50"
                )}
              >
                <IconPlus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}

      {localRentals.length > 0 && (
        <div className="mt-8 pt-6 border-t">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-4">
              Resumen del Alquiler
            </h4>
            <div className="space-y-3">
              {localRentals.map(rental => {
                const item = items.find(i => i.id === rental.itemId)
                if (!item) return null
                const basePrice = calculateBasePrice(item)

                return (
                  <div 
                    key={rental.itemId}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">
                        {item.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        x{rental.quantity}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900">
                      {(basePrice * rental.quantity).toFixed(2)}€
                    </span>
                  </div>
                )
              })}
              <div className="pt-3 border-t border-gray-200 flex justify-between text-sm">
                <span className="font-medium text-gray-900">Total</span>
                <span className="font-medium text-gray-900">
                  {calculateTotal().toFixed(2)}€
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 