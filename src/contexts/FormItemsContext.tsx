'use client';

import { createContext, useContext, useCallback, useState, ReactNode } from 'react';
import type { RentalSelection, Item } from '@/types/items';
import { validateRental, calculateRentalPrice } from '@/types/rentals';

interface FormItemsContextType {
  rentals: RentalSelection[];
  selectedItems: Record<string, number>;
  totalPrice: number;
  updateRentals: (rentals: RentalSelection[]) => void;
  updateSelectedItems: (items: Record<string, number>) => void;
  clearItems: () => void;
  addItem: (itemId: string) => void;
  removeItem: (itemId: string) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  getItemsCount: () => number;
  getItemQuantity: (itemId: string) => number;
  transformSelectedItemsToRentals: (items: Item[], durationInMinutes: number) => RentalSelection[];
}

const FormItemsContext = createContext<FormItemsContextType | undefined>(undefined);

interface FormItemsProviderProps {
  children: ReactNode;
}

export function FormItemsProvider({ children }: FormItemsProviderProps) {
  const [rentals, setRentals] = useState<RentalSelection[]>([]);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [totalPrice, setTotalPrice] = useState(0);

  const validateAndTransformRental = useCallback((rental: RentalSelection): RentalSelection | null => {
    // Validación básica
    if (!rental.itemId || typeof rental.quantity !== 'number' || rental.quantity <= 0) {
      console.warn('Rental inválido - datos básicos:', rental);
      return null;
    }

    // Validar precio por unidad
    if (typeof rental.pricePerUnit !== 'number' || rental.pricePerUnit <= 0) {
      console.warn('Rental inválido - precio por unidad:', rental);
      return null;
    }

    // Validar duración
    if (!rental.duration || rental.duration <= 0) {
      console.warn('Rental inválido - duración:', rental);
      return null;
    }

    // Calcular precio total
    const calculatedTotal = rental.quantity * rental.pricePerUnit;
    
    console.log('Rental validado y transformado:', {
      itemId: rental.itemId,
      quantity: rental.quantity,
      pricePerUnit: rental.pricePerUnit,
      duration: rental.duration,
      calculatedTotal
    });

    return {
      ...rental,
      totalPrice: calculatedTotal,
      price: calculatedTotal // Para compatibilidad
    };
  }, []);

  const updateRentals = useCallback((newRentals: RentalSelection[]) => {
    console.log('FormItemsContext - Actualizando rentals:', {
      rentalsActuales: rentals,
      nuevosRentals: newRentals
    });
    
    // Validar y transformar rentals
    const validRentals = newRentals
      .map(validateAndTransformRental)
      .filter((rental): rental is RentalSelection => rental !== null);

    if (validRentals.length !== newRentals.length) {
      console.warn('Se eliminaron rentals inválidos:', {
        original: newRentals.length,
        valid: validRentals.length,
        rentalsEliminados: newRentals.filter(r => !validRentals.find(v => v.itemId === r.itemId))
      });
    }

    // Actualizar estado
    setRentals(validRentals);

    // Calcular precio total
    const newTotal = validRentals.reduce((sum, rental) => sum + rental.totalPrice, 0);
    setTotalPrice(newTotal);

    // Actualizar selectedItems
    const newSelectedItems = validRentals.reduce((acc, rental) => {
      acc[rental.itemId] = rental.quantity;
      return acc;
    }, {} as Record<string, number>);
    setSelectedItems(newSelectedItems);

    console.log('FormItemsContext - Estado actualizado:', {
      rentals: validRentals,
      selectedItems: newSelectedItems,
      totalPrice: newTotal,
      rentalsLength: validRentals.length
    });
  }, [validateAndTransformRental]);

  const updateSelectedItems = useCallback((newItems: Record<string, number>) => {
    console.log('FormItemsContext - Actualizando selectedItems:', newItems);
    
    // Filtrar items con cantidad 0 o negativa
    const validItems = Object.entries(newItems).reduce((acc, [id, qty]) => {
      if (qty > 0) {
        acc[id] = qty;
      }
      return acc;
    }, {} as Record<string, number>);

    setSelectedItems(validItems);

    // Actualizar rentals correspondientes
    const updatedRentals = rentals.filter(rental => validItems[rental.itemId]);
    if (updatedRentals.length !== rentals.length) {
      console.log('Actualizando rentals basado en selectedItems:', {
        previous: rentals.length,
        current: updatedRentals.length
      });
      setRentals(updatedRentals);
      
      // Recalcular precio total
      const newTotal = updatedRentals.reduce((sum, rental) => sum + rental.totalPrice, 0);
      setTotalPrice(newTotal);
    }
  }, [rentals]);

  const clearItems = useCallback(() => {
    setRentals([]);
    setSelectedItems({});
    setTotalPrice(0);
  }, []);

  const addItem = useCallback((itemId: string) => {
    setSelectedItems((prevItems) => {
      const currentQuantity = prevItems[itemId] || 0;
      console.log('FormItemsContext - Actualizando selectedItems:', {
        ...prevItems,
        [itemId]: currentQuantity + 1
      });
      return {
        ...prevItems,
        [itemId]: currentQuantity + 1
      };
    });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setSelectedItems((prevItems) => {
      const { [itemId]: removed, ...rest } = prevItems;
      return rest;
    });
  }, []);

  const updateItemQuantity = useCallback((itemId: string, quantity: number) => {
    setSelectedItems((prevItems) => {
      if (quantity <= 0) {
        const { [itemId]: removed, ...rest } = prevItems;
        return rest;
      }
      console.log('FormItemsContext - Actualizando selectedItems:', {
        ...prevItems,
        [itemId]: quantity
      });
      return {
        ...prevItems,
        [itemId]: quantity
      };
    });
  }, []);

  const getItemsCount = useCallback(() => {
    return Object.keys(selectedItems).length;
  }, [selectedItems]);

  const getItemQuantity = useCallback((itemId: string) => {
    return selectedItems[itemId] || 0;
  }, [selectedItems]);

  // Nueva función para transformar selectedItems en rentalItems
  const transformSelectedItemsToRentals = useCallback((items: Item[], durationInMinutes: number): RentalSelection[] => {
    const rentals: RentalSelection[] = [];
    
    // Iterar sobre cada item seleccionado
    Object.entries(selectedItems).forEach(([itemId, quantity]) => {
      // Encontrar el item correspondiente en la lista de items
      const item = items.find(i => i.id === itemId);
      
      if (item && quantity > 0) {
        // Obtener el precio según la duración
        const priceKey = durationInMinutes.toString();
        const pricePerUnit = item.duration_pricing?.[priceKey] || 0;
        
        // Crear el objeto RentalSelection
        const rental: RentalSelection = {
          itemId,
          quantity,
          duration: durationInMinutes,
          pricePerUnit,
          price: pricePerUnit,
          totalPrice: pricePerUnit * quantity
        };
        
        rentals.push(rental);
        console.log('FormItemsContext - Transformando item a rental:', rental);
      }
    });
    
    console.log('FormItemsContext - Rentals transformados:', rentals);
    return rentals;
  }, [selectedItems]);

  return (
    <FormItemsContext.Provider
      value={{
        rentals,
        selectedItems,
        totalPrice,
        updateRentals,
        updateSelectedItems,
        clearItems,
        addItem,
        removeItem,
        updateItemQuantity,
        getItemsCount,
        getItemQuantity,
        transformSelectedItemsToRentals
      }}
    >
      {children}
    </FormItemsContext.Provider>
  );
}

export function useFormItems() {
  const context = useContext(FormItemsContext);
  if (context === undefined) {
    throw new Error('useFormItems must be used within a FormItemsProvider');
  }
  return context;
} 