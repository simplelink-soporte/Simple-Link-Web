'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useForm } from '@/contexts/FormContext';
import { useSummaryState } from '@/components/preview/steps/summary/hooks/useSummaryState';
import { useBookingCreation } from './use-booking-creation';
import { toast } from 'sonner';
import type { PaymentTypeEnum } from '@/types/bookings';

export interface FormPublishConfig {
  title: string;
  description?: string;
  fields: any[];
  theme?: 'light' | 'dark';
  customization?: {
    colors?: {
      primary?: string;
    };
    logo?: {
      url?: string;
    };
  };
}

interface UseFormPublishingOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export type ReservationState = 'configuring' | 'ready' | 'creating' | 'completed' | 'error';

export function useFormPublishing(options: UseFormPublishingOptions = {}) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const { user, isLoading: authLoading } = useAuth();
  const { organization, isLoading: orgLoading } = useOrganization();
  
  const { state } = useForm();
  const { 
    selectedPaymentMethod, 
    selectedPaymentType,
    calculations 
  } = useSummaryState();

  // Manejar estados de carga de manera más granular
  const isLoading = authLoading || orgLoading;

  // Transformar los items seleccionados al formato de rentals
  const rentals = calculations.selectedItems.map(item => ({
    itemId: item.id,
    quantity: item.quantity,
    pricePerUnit: item.price,
    totalPrice: item.total,
    price: item.price,
    duration: state.shift.duration || 0
  }));

  // Transformar el tipo de pago al enum correcto
  const getPaymentType = (): PaymentTypeEnum => {
    if (!selectedPaymentType) return 'booking';
    return selectedPaymentType === 'guarantee' ? 'guarantee' : 'booking';
  };

  const {
    createBooking,
    isCreating,
    error: bookingError,
    isValid: bookingValid,
    validationErrors,
    hasWarnings
  } = useBookingCreation({
    onSuccess: options.onSuccess,
    onError: options.onError,
    rentals,
    rentalItemsPrice: calculations.itemsTotal,
    paymentMethod: selectedPaymentMethod?.type === 'card' ? 'stripe' : (selectedPaymentMethod?.type || 'cash'),
    paymentType: getPaymentType()
  });

  // Verificar si la configuración está completa
  const isConfigurationComplete = useCallback(() => {
    console.log('[FormPublishing] Verificando configuración:', {
      selectedPaymentMethod,
      selectedPaymentType,
      hasValidPayment: !!(selectedPaymentMethod && selectedPaymentType)
    });

    if (!selectedPaymentMethod || !selectedPaymentType) {
      return false;
    }
    return true;
  }, [selectedPaymentMethod, selectedPaymentType]);

  // Crear la reserva
  const handlePublish = useCallback(async () => {
    console.log('[FormPublishing] Iniciando publicación:', {
      isConfigComplete: isConfigurationComplete(),
      bookingValid,
      hasValidationErrors: validationErrors.length > 0,
      state
    });

    if (!isConfigurationComplete()) {
      console.log('[FormPublishing] Configuración incompleta');
      toast.error('Por favor, completa la configuración de pago');
      return false;
    }

    if (!bookingValid) {
      const errors = validationErrors
        .filter(err => err.severity === 'error')
        .map(err => err.message)
        .join('\n');
      
      console.error('[FormPublishing] Errores de validación:', errors);
      toast.error('No se puede crear la reserva:\n' + errors);
      return false;
    }

    try {
      setIsPublishing(true);
      setError(null);

      console.log('[FormPublishing] Creando reserva...');
      const result = await createBooking();
      console.log('[FormPublishing] Resultado de creación:', result);

      if (result?.error) {
        throw new Error(result.error.message || 'Error al crear la reserva');
      }

      console.log('[FormPublishing] Reserva creada exitosamente');
      toast.success('¡Reserva creada exitosamente!');
      options.onSuccess?.();
      return true;

    } catch (err) {
      const error = err as Error;
      console.error('[FormPublishing] Error al crear la reserva:', {
        message: error.message,
        stack: error.stack
      });
      setError(error);
      options.onError?.(error);
      return false;
    } finally {
      setIsPublishing(false);
    }
  }, [
    isConfigurationComplete,
    bookingValid,
    validationErrors,
    createBooking,
    options,
    state
  ]);

  return {
    handlePublish,
    isPublishing: isPublishing || isCreating,
    error: error || bookingError,
    isValid: bookingValid,
    validationErrors,
    hasWarnings,
    isConfigurationComplete
  };
} 