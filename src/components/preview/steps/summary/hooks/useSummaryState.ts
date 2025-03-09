'use client';

import { useState, useMemo } from 'react';
import { useItems } from '@/hooks/useItems';
import { useForm } from '@/contexts/FormContext';
import { useFormItems } from '@/contexts/FormItemsContext';
import { PaymentType, PaymentMethod, Coupon, SummaryState, Calculations, PaymentTypeEnum, PAYMENT_TYPES } from '../types';
import type { Item } from '@/types/items';
import { useToast } from "@/components/ui/use-toast";
import { getAvailableCoupons } from "../services/coupon-service";
import { usePaymentContext } from "../contexts/payment-context";

// Actualizar la lista de cupones disponibles
const availableCoupons: Coupon[] = [
  {
    code: 'WELCOME2024',
    discount: 15,
    type: 'percentage',
    description: 'Descuento para nuevos usuarios'
  },
  {
    code: 'SUMMER',
    discount: 20,
    type: 'percentage',
    description: 'Descuento especial de verano'
  }
];

export function useSummaryState() {
  const [state, setState] = useState<SummaryState>({
    showItemsDetails: false,
    showPaymentMethods: false,
    showPaymentTypes: false,
    showCouponsPanel: false,
    couponCode: '',
    couponError: null,
    appliedCoupon: null,
    selectedPaymentMethod: null,
    selectedPaymentType: null,
    guaranteeConfig: {
      percentage: 30
    },
    calculations: {
      selectedItems: [],
      courtPrice: 0,
      itemsTotal: 0,
      subtotal: 0,
      discount: 0,
      total: 0
    }
  });

  const setShowItemsDetails = (show: boolean) => 
    setState(prev => ({ ...prev, showItemsDetails: show }));

  const setShowPaymentMethods = (show: boolean) =>
    setState(prev => ({ ...prev, showPaymentMethods: show }));

  const setShowPaymentTypes = (show: boolean) =>
    setState(prev => ({ ...prev, showPaymentTypes: show }));

  const setShowCouponsPanel = (show: boolean) =>
    setState(prev => ({ ...prev, showCouponsPanel: show }));

  const handleSelectPaymentMethod = (method: PaymentMethod | null) => {
    console.log('[useSummaryState] Actualizando método de pago:', method);
    
    // Actualizar el estado local
    setState(prev => ({ ...prev, selectedPaymentMethod: method }));
    
    // Aquí podríamos agregar lógica adicional si fuera necesario
    // para sincronizar con otros estados o contextos
    
    return method; // Devolver el método para que pueda ser usado por el componente padre
  };

  const handleSelectPaymentType = (typeId: PaymentTypeEnum | null) => {
    setState(prev => ({ ...prev, selectedPaymentType: typeId }));
    
    // Si se está desseleccionando, no hacer acciones adicionales
    if (typeId === null) {
      return;
    }
    
    // Verificar si el tipo requiere tarjeta
    const typeConfig = PAYMENT_TYPES.find(type => type.id === typeId);
    console.log('[useSummaryState] Tipo de pago seleccionado:', { typeId, config: typeConfig });
  };

  const handleApplyCoupon = (coupon: Coupon) =>
    setState(prev => ({ 
      ...prev, 
      appliedCoupon: coupon,
      showCouponsPanel: false,
      couponError: null,
      calculations: {
        ...prev.calculations,
        discount: calculateDiscount(prev.calculations.subtotal, coupon),
        total: calculateTotal(prev.calculations.subtotal, coupon)
      }
    }));

  const handleRemoveCoupon = () =>
    setState(prev => ({ 
      ...prev, 
      appliedCoupon: null,
      calculations: {
        ...prev.calculations,
        discount: 0,
        total: prev.calculations.subtotal
      }
    }));

  const setCouponCode = (code: string) =>
    setState(prev => ({ ...prev, couponCode: code }));

  const setCouponError = (error: string | null) =>
    setState(prev => ({ ...prev, couponError: error }));

  // Obtener estado del formulario y contexto de items
  const { state: formState } = useForm();
  const { location, shift } = formState;
  const { selectedItems, rentals } = useFormItems();

  // Obtener información de los artículos
  const { data: availableItems = [] } = useItems(location.branchId || undefined);

  // Cálculos
  const calculations = useMemo<Calculations>(() => {
    // Validar que tenemos los datos necesarios
    if (!selectedItems || !Array.isArray(availableItems)) {
      return {
        selectedItems: [],
        courtPrice: shift.price || 0,
        itemsTotal: 0,
        subtotal: shift.price || 0,
        discount: 0,
        total: shift.price || 0
      };
    }

    const calculatedItems = Object.entries(selectedItems).map(([itemId, quantity]) => {
      const item = (availableItems as Item[]).find((i: Item) => i.id === itemId);
      if (!item || !shift.duration) return null;

      const durationInMinutes = shift.duration * 60;
      const price = item.duration_pricing?.[durationInMinutes.toString()] || 0;
      
      return {
        id: itemId,
        name: item.name,
        price,
        quantity,
        total: price * quantity
      };
    }).filter(Boolean) as Calculations['selectedItems'];

    const itemsTotal = calculatedItems.reduce((sum, item) => sum + item.total, 0);
    const courtPrice = shift.price || 0;
    const subtotal = courtPrice + itemsTotal;

    const discount = state.appliedCoupon ? (
      state.appliedCoupon.type === 'percentage' 
        ? (subtotal * state.appliedCoupon.discount) / 100
        : state.appliedCoupon.discount
    ) : 0;

    return {
      selectedItems: calculatedItems,
      courtPrice,
      itemsTotal,
      subtotal,
      discount,
      total: subtotal - discount
    };
  }, [selectedItems, availableItems, shift.duration, shift.price, state.appliedCoupon]);

  return {
    ...state,
    setShowItemsDetails,
    setShowPaymentMethods,
    setShowPaymentTypes,
    setShowCouponsPanel,
    handleSelectPaymentMethod,
    handleSelectPaymentType,
    handleApplyCoupon,
    handleRemoveCoupon,
    setCouponCode,
    setCouponError,
    calculations
  };
}

function calculateDiscount(subtotal: number, coupon: Coupon): number {
  if (coupon.type === 'percentage') {
    return subtotal * (coupon.discount / 100);
  }
  return coupon.discount;
}

function calculateTotal(subtotal: number, coupon: Coupon | null): number {
  if (!coupon) return subtotal;
  return subtotal - calculateDiscount(subtotal, coupon);
} 