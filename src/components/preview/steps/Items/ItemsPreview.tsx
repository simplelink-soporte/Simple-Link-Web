import { useState, useEffect, useCallback, useMemo } from "react";
import { FormStepField } from "@/types/form-steps";
import { PreviewContainer } from "../../layout/PreviewContainer";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, Check, Search, Loader2, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { NavigationButtons } from "../../layout/NavigationButtons";
import { Input } from "@/components/ui/input";
import { useItems } from "@/hooks/useItems";
import { toast } from "sonner";
import { bookingService } from "@/services/bookingService";
import type { Item, ItemType, RentalSelection } from "@/types/items";
import { format, parseISO } from "date-fns";
import { useForm } from "@/contexts/FormContext";
import { useFormItems } from '@/contexts/FormItemsContext';
import { MobileNavigation } from "../../layout/MobileNavigation";
import { MobileNextButton } from "../../layout/MobileNextButton";
import { MobileItemsPreview } from "./mobile/MobileItemsPreview";

// Interfaces
interface ItemsPreviewProps {
  field: FormStepField;
  theme: 'light' | 'dark';
  viewType: "mobile" | "desktop";
  onNext: () => void;
  onPrev: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  isPublicView?: boolean;
  branchId?: string;
  selectedSlot?: any;
}

interface ItemWithStock extends Item {
  availableStock: number;
  baseStock: number;
  reservedUnits: number;
  id: string;
  name: string;
  type: ItemType;
  duration_pricing: Record<string, number>;
}

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  theme: 'light' | 'dark';
  min?: number;
  max?: number;
}

function QuantitySelector({ value, onChange, theme, min = 0, max = 100 }: QuantitySelectorProps) {
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
          theme === 'dark' 
            ? "hover:bg-zinc-800 text-gray-400" 
            : "hover:bg-gray-100 text-gray-500"
        )}
        aria-label="Disminuir cantidad"
      >
        <Minus className="h-3 w-3" />
      </div>
      
      <span className={cn(
        "text-[10px] font-medium min-w-[20px] text-center",
        theme === 'dark' ? "text-gray-200" : "text-gray-700"
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
          theme === 'dark' 
            ? "hover:bg-zinc-800 text-gray-400" 
            : "hover:bg-gray-100 text-gray-500"
        )}
        aria-label="Aumentar cantidad"
      >
        <Plus className="h-3 w-3" />
      </div>
    </div>
  );
}

export function ItemsPreview({ 
  field, 
  theme, 
  viewType,
  onNext,
  onPrev,
  isFirstStep,
  isLastStep,
  isPublicView,
  branchId,
  selectedSlot
}: ItemsPreviewProps) {
  const { title, description } = field;
  const { state } = useForm();
  const { 
    updateRentals, 
    rentals, 
    totalPrice,
    selectedItems,
    updateSelectedItems 
  } = useFormItems();
  
  const [itemsWithStock, setItemsWithStock] = useState<ItemWithStock[]>([]);
  const [isLoadingStock, setIsLoadingStock] = useState(true);
  const [lastCheckedSlot, setLastCheckedSlot] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Obtener datos del contexto
  const { location, shift } = state;
  const currentBranchId = location.branchId || undefined;
  const currentSelectedSlot = shift.date ? {
    date: shift.date,
    startTime: shift.startTime!,
    endTime: shift.endTime!,
    duration: shift.duration
  } : undefined;

  // Manejo de carga
  if (!currentBranchId) {
    return <div className="text-gray-500">Cargando información de la sede...</div>;
  }

  // Si es vista móvil y pública, usar el componente móvil
  if (viewType === "mobile" && isPublicView) {
    console.log('Current Selected Slot:', currentSelectedSlot);
    if (!currentSelectedSlot) {
      console.warn('Current Selected Slot no está definido.');
      return <div className="text-red-500">Error: Selected Slot no está disponible.</div>;
    }

    return (
      <MobileItemsPreview
        field={field}
        theme={theme}
        viewType={viewType}
        onNext={onNext}
        onPrev={onPrev}
        isFirstStep={isFirstStep}
        isLastStep={isLastStep}
        isPublicView={isPublicView}
        branchId={currentBranchId}
        selectedSlot={currentSelectedSlot}
      />
    );
  }

  // Función para actualizar cantidades y contexto
  const handleQuantityChange = useCallback((itemId: string, newQuantity: number) => {
    console.log('[ItemsPreview] Actualizando cantidad:', {
      itemId,
      newQuantity,
      shift,
      duration: shift.duration
    });

    const item = itemsWithStock.find(i => i.id === itemId);
    
    if (!item) {
      console.warn('[ItemsPreview] Item no encontrado:', itemId);
      return;
    }

    // Validar límites
    if (newQuantity < 0) {
      console.warn('[ItemsPreview] Cantidad no puede ser negativa');
      return;
    }

    if (newQuantity > item.availableStock) {
      console.warn('[ItemsPreview] No hay suficiente stock:', {
        requested: newQuantity,
        available: item.availableStock
      });
      toast.error(`No hay suficiente stock disponible. Máximo disponible: ${item.availableStock}`);
      return;
    }

    // Actualizar cantidades
    const newSelectedItems = { ...selectedItems };
    
    if (newQuantity === 0) {
      delete newSelectedItems[itemId];
    } else {
      newSelectedItems[itemId] = newQuantity;
    }

    updateSelectedItems(newSelectedItems);

    // Calcular duración en minutos
    const durationInMinutes = (shift.duration || 1) * 60;
    console.log('[ItemsPreview] Calculando precio:', {
      duration: shift.duration,
      durationInMinutes,
      availablePrices: item.duration_pricing
    });

    // Crear rentals actualizados con la estructura completa
    const updatedRentals = Object.entries(newSelectedItems).map(([id, qty]) => {
      const itemWithStock = itemsWithStock.find(i => i.id === id);
      if (!itemWithStock) return null;

      // Obtener precio por duración
      const pricePerUnit = itemWithStock.duration_pricing[durationInMinutes.toString()] || 0;
      const totalPrice = qty * pricePerUnit;

      console.log('[ItemsPreview] Precio calculado para item:', {
        itemId: id,
        durationInMinutes,
        pricePerUnit,
        quantity: qty,
        totalPrice,
        availablePrices: itemWithStock.duration_pricing
      });

      // Crear rental con todos los campos necesarios
      const rental: RentalSelection = {
        itemId: id,
        quantity: qty,
        duration: shift.duration || 1,
        pricePerUnit,
        price: totalPrice,
        totalPrice
      };

      console.log('[ItemsPreview] Creando rental:', rental);
      return rental;
    }).filter((rental): rental is RentalSelection => rental !== null);

    console.log('[ItemsPreview] Actualizando rentals:', {
      updatedRentals,
      selectedItems: newSelectedItems,
      duration: shift.duration,
      durationInMinutes
    });

    updateRentals(updatedRentals);

  }, [itemsWithStock, selectedItems, updateSelectedItems, updateRentals, shift.duration]);

  // Validar si se puede avanzar al siguiente paso
  const canProceed = useMemo(() => {
    // Los items son opcionales, así que siempre podemos avanzar
    return true;
  }, []);

  const handleNext = useCallback(() => {
    console.log('[ItemsPreview] Intentando avanzar al siguiente paso:', {
      currentStep: state.currentStep,
      hasItems: Object.keys(selectedItems).length > 0,
      isLastStep
    });
    
    // Siempre permitir avanzar ya que los items son opcionales
    if (typeof onNext === 'function') {
      console.log('[ItemsPreview] Ejecutando onNext');
      onNext();
    } else {
      console.error('[ItemsPreview] Error: onNext no es una función');
    }
  }, [onNext, state.currentStep, selectedItems, isLastStep]);

  // Manejar el click en un item
  const handleItemClick = useCallback((item: ItemWithStock) => {
    if (item.availableStock <= 0) return;

    const currentQuantity = selectedItems[item.id] || 0;
    const newQuantity = currentQuantity === 0 ? 1 : 0;
    
    handleQuantityChange(item.id, newQuantity);
  }, [selectedItems, handleQuantityChange]);

  // Obtener items usando el hook
  const { data: items = [], isLoading, error } = useItems(currentBranchId);

  // Función para validar y formatear fecha
  const validateAndFormatDate = useCallback((dateStr: string | undefined) => {
    if (!dateStr) return null;
    try {
      // Intentar parsear la fecha
      const parsedDate = parseISO(dateStr);
      return format(parsedDate, 'yyyy-MM-dd');
    } catch (error) {
      console.error('❌ Error al parsear fecha:', dateStr, error);
      return null;
    }
  }, []);

  // Función para validar horario
  const validateTimeFormat = useCallback((time: string | undefined) => {
    if (!time) return false;
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }, []);

  // Memoizar el slot key para comparaciones
  const slotKey = useMemo(() => {
    if (!currentSelectedSlot?.date || !currentSelectedSlot?.startTime || !currentSelectedSlot?.endTime) return null;
    return `${currentSelectedSlot.date}-${currentSelectedSlot.startTime}-${currentSelectedSlot.endTime}`;
  }, [currentSelectedSlot]);

  // Efecto para inicializar itemsWithStock cuando items cambia
  useEffect(() => {
    // Si no hay cambios en el slot o items, no hacer nada
    if (!slotKey || !Array.isArray(items) || items.length === 0 || slotKey === lastCheckedSlot) {
      return;
    }

    console.log('ItemsPreview - Iniciando verificación de disponibilidad:', {
      slotKey,
      itemsCount: items.length
    });

    const checkAvailability = async () => {
      setIsLoadingStock(true);
      try {
        const { date, startTime, endTime } = currentSelectedSlot!;

        // Verificar todos los items en paralelo
        const stockPromises = (items as Item[]).map(async (item: Item) => {
          try {
            const stock = await bookingService.checkFutureAvailability(
              item.id,
              date,
              startTime,
              endTime
            );

            return {
              ...item,
              availableStock: stock,
              baseStock: item.stock || 0,
              reservedUnits: Math.max(0, (item.stock || 0) - stock)
            } as ItemWithStock;
          } catch (error) {
            console.error(`Error al verificar stock para item ${item.id}:`, error);
            return {
              ...item,
              availableStock: 0,
              baseStock: item.stock || 0,
              reservedUnits: item.stock || 0
            } as ItemWithStock;
          }
        });

        const itemsWithStockData = await Promise.all(stockPromises);
        setItemsWithStock(itemsWithStockData);
        setLastCheckedSlot(slotKey);
      } catch (error) {
        console.error('Error al verificar disponibilidad:', error);
        toast.error('Error al verificar disponibilidad de artículos');
        setItemsWithStock((items as Item[]).map(item => ({
          ...item,
          availableStock: 0,
          baseStock: item.stock || 0,
          reservedUnits: item.stock || 0
        })));
      } finally {
        setIsLoadingStock(false);
      }
    };

    checkAvailability();
  }, [items, slotKey, lastCheckedSlot, currentSelectedSlot]);

  const filteredItems = itemsWithStock.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const hasAvailableStock = item.availableStock > 0;
    return matchesSearch && hasAvailableStock;
  });

  const getItemPrice = useCallback((item: ItemWithStock) => {
    if (!currentSelectedSlot) return 0;
    
    const durationInMinutes = currentSelectedSlot.duration * 60;
    const price = item.duration_pricing[durationInMinutes.toString()];
    
    return price || 0;
  }, [currentSelectedSlot]);

  if (isLoading || isLoadingStock) {
    return (
      <PreviewContainer viewType={viewType} theme={theme}>
        <div className="flex flex-col items-center justify-center p-8">
          <Loader2 className={cn(
            "h-8 w-8 animate-spin",
            theme === 'dark' ? "text-gray-400" : "text-gray-500"
          )} />
          <p className={cn(
            "text-sm mt-2",
            theme === 'dark' ? "text-gray-400" : "text-gray-500"
          )}>
            Cargando artículos...
          </p>
        </div>
      </PreviewContainer>
    );
  }

  if (error) {
    return (
      <PreviewContainer viewType={viewType} theme={theme}>
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <p className={cn(
            "text-sm mb-4",
            theme === 'dark' ? "text-red-400" : "text-red-500"
          )}>
            {error instanceof Error ? error.message : 'Error al cargar los artículos'}
          </p>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className={theme === 'dark' ? "border-gray-800" : ""}
          >
            Reintentar
          </Button>
        </div>
      </PreviewContainer>
    );
  }

  return (
    <PreviewContainer 
      viewType={viewType} 
      theme={theme}
      onNext={handleNext}
      onPrev={onPrev}
      isFirstStep={isFirstStep}
      isLastStep={isLastStep}
      isPublicView={isPublicView}
      isNextDisabled={false}
      hideNavigation={viewType === "mobile" && isPublicView}
    >
      <div className="min-h-full flex flex-col relative">
        {viewType === "mobile" && (
          <>
            <MobileNavigation
              theme={theme}
              onPrev={onPrev}
              isPublicView={isPublicView}
            />
            <MobileNextButton
              theme={theme}
              onNext={handleNext}
              isDisabled={false}
              isPublicView={isPublicView}
            />
          </>
        )}
        <div className={cn(
          "flex-1",
          viewType === "mobile" && isPublicView && "pt-24 pb-24"
        )}>
          <div className="pb-24">
            <div className="pb-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className={cn(
                  "space-y-1",
                  viewType === "mobile" ? "text-left" : "text-center"
                )}
              >
                <h1 className={cn(
                  "text-lg font-semibold transition-colors",
                  theme === 'dark' ? "text-white" : "text-gray-900"
                )}>
                  Elige tus ítems del club
                </h1>
                <p className={cn(
                  "text-sm transition-colors",
                  theme === 'dark' ? "text-gray-400" : "text-gray-500"
                )}>
                  Selecciona los artículos que deseas reservar
                </p>
              </motion.div>
            </div>

            <div className={cn(
              viewType === "mobile" ? "px-0" : "px-4"
            )}>
              <div className={cn(
                "w-full relative",
                "transition-all duration-200 ease-in-out",
                theme === 'dark' 
                  ? "bg-neutral-900" 
                  : "bg-gray-100/60",
                viewType === "mobile" ? "rounded-none" : "rounded-xl"
              )}>
                <div className={cn(
                  "w-full p-4 border-b",
                  theme === 'dark' 
                    ? "border-gray-800" 
                    : "border-gray-200/50"
                )}>
                  <div className="relative flex-1 max-w-[200px]">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar artículo..."
                      className={cn(
                        "w-full h-7 pl-8 pr-3 rounded-lg text-xs",
                        "transition-all duration-200",
                        "placeholder:text-gray-400",
                        theme === 'dark'
                          ? "bg-zinc-800 text-gray-200 placeholder:text-gray-500"
                          : "bg-gray-100/60 text-gray-900",
                        theme === 'dark'
                          ? "focus:bg-zinc-700"
                          : "focus:bg-gray-200/60",
                        "outline-none"
                      )}
                    />
                    <Search 
                      className={cn(
                        "absolute left-2.5 top-1/2 -translate-y-1/2",
                        "h-3.5 w-3.5",
                        theme === 'dark' ? "text-gray-400" : "text-gray-500"
                      )}
                    />
                  </div>
                </div>

                <div className={cn(
                  viewType === "mobile" ? "p-2" : "p-4"
                )}>
                  <div className="space-y-2">
                    {filteredItems.length === 0 ? (
                      <div className="text-center py-8">
                        <p className={cn(
                          "text-sm",
                          theme === 'dark' ? "text-gray-400" : "text-gray-500"
                        )}>
                          No hay artículos disponibles
                        </p>
                      </div>
                    ) : (
                      filteredItems.map((item, index) => {
                        const quantity = selectedItems[item.id] || 0;
                        const remainingStock = item.availableStock - quantity;
                        const isOutOfStock = remainingStock === 0 && quantity === 0;
                        const isSelected = quantity > 0;
                        const price = getItemPrice(item);

                        return (
                          <motion.button
                            key={item.id}
                            className={cn(
                              "w-full rounded-lg transition-all duration-200 ease-in-out",
                              "overflow-hidden relative",
                              theme === 'dark' 
                                ? isSelected
                                  ? "bg-zinc-800 hover:bg-neutral-800 text-white"
                                  : "bg-transparent hover:bg-neutral-800/50 text-gray-200"
                                : isSelected
                                  ? "bg-white hover:bg-gray-50 text-gray-800"
                                  : "bg-transparent hover:bg-gray-200/50 text-gray-800",
                              isOutOfStock && "opacity-50"
                            )}
                            initial={{ opacity: 0 }}
                            animate={{ 
                              opacity: 1,
                              scale: isSelected ? 1.01 : 1,
                              transition: { 
                                delay: index * 0.1,
                                scale: { 
                                  duration: 0.3,
                                  ease: [0.16, 1, 0.3, 1]
                                }
                              }
                            }}
                            onClick={() => !isOutOfStock && handleItemClick(item)}
                          >
                            <AnimatePresence>
                              {isSelected && (
                                <motion.div
                                  initial={{ 
                                    opacity: 0,
                                    scale: 0.95
                                  }}
                                  animate={{ 
                                    opacity: 1,
                                    scale: 1,
                                    transition: { 
                                      duration: 0.2,
                                      ease: [0.16, 1, 0.3, 1],
                                    }
                                  }}
                                  exit={{ 
                                    opacity: 0,
                                    scale: 0.95,
                                    transition: {
                                      duration: 0.15,
                                      ease: "easeOut"
                                    }
                                  }}
                                  className={cn(
                                    "absolute inset-0 z-0",
                                    theme === 'dark' 
                                      ? "bg-zinc-800"
                                      : "bg-gray-200"
                                  )}
                                />
                              )}
                            </AnimatePresence>

                            <div className="p-2.5 relative z-10">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0 text-left">
                                  <motion.h3
                                    className="font-medium text-xs truncate text-left"
                                    animate={{
                                      color: isSelected 
                                        ? theme === 'dark'
                                          ? "#ffffff"
                                          : "#111827"
                                        : theme === 'dark'
                                          ? "#ffffff"
                                          : "#111827"
                                    }}
                                  >
                                    {item.name}
                                  </motion.h3>
                                  <motion.p
                                    className="text-[9px] mt-0.5 text-left"
                                    animate={{
                                      color: isSelected 
                                        ? theme === 'dark'
                                          ? "#9ca3af"
                                          : "#6b7280"
                                        : theme === 'dark'
                                          ? "#6b7280"
                                          : "#9ca3af"
                                    }}
                                  >
                                    {`${item.type} • Stock: ${remainingStock}`}
                                  </motion.p>
                                </div>
                                <motion.span
                                  className="text-[11px] font-medium whitespace-nowrap text-right"
                                  animate={{
                                    color: isSelected 
                                      ? theme === 'dark'
                                        ? "#e5e7eb"
                                        : "#374151"
                                      : theme === 'dark'
                                        ? "#d1d5db"
                                        : "#111827"
                                  }}
                                >
                                  {price ? `$${price}` : 'N/A'}
                                </motion.span>
                              </div>

                              <div className="flex items-center justify-between mt-2">
                                <motion.p
                                  className="text-[9px] max-w-[65%] text-left"
                                  animate={{
                                    color: isSelected 
                                      ? theme === 'dark'
                                        ? "#9ca3af"
                                        : "#6b7280"
                                      : theme === 'dark'
                                        ? "#6b7280"
                                        : "#9ca3af"
                                  }}
                                >
                                  {item.name}
                                </motion.p>
                                <div onClick={(e) => e.stopPropagation()}>
                                  <QuantitySelector 
                                    value={quantity}
                                    onChange={(newValue) => handleQuantityChange(item.id, newValue)}
                                    theme={theme}
                                    min={0}
                                    max={item.availableStock}
                                  />
                                </div>
                              </div>
                            </div>
                          </motion.button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PreviewContainer>
  );
} 