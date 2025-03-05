import { useState, useCallback } from 'react';
import { useBookingTransformer } from './use-booking-transformer';
import { bookingService } from '@/services/bookingService';
import { toast } from 'sonner';
import type { RentalSelection } from '@/types/items';
import type { PaymentMethodEnum, PaymentTypeEnum } from '@/types/bookings';

interface UseBookingCreationOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  maxRetries?: number;
  retryDelay?: number;
  rentals: RentalSelection[];
  rentalItemsPrice: number;
  paymentMethod: PaymentMethodEnum;
  paymentType: PaymentTypeEnum;
}

const DEFAULT_OPTIONS = {
  maxRetries: 3,
  retryDelay: 1000
};

export function useBookingCreation(options: UseBookingCreationOptions) {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const { transformedData, isValid, validationErrors, hasWarnings } = useBookingTransformer();

  const { maxRetries = DEFAULT_OPTIONS.maxRetries, retryDelay = DEFAULT_OPTIONS.retryDelay } = options;

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const createBookingWithRetry = useCallback(async (attempt = 1): Promise<any> => {
    try {
      if (!transformedData) {
        throw new Error('No hay datos para crear la reserva');
      }

      console.log('Intentando crear reserva con datos:', {
        ...transformedData,
        rentals: transformedData.rentalItems
      });

      // Verificar disponibilidad
      const availabilityCheck = await bookingService.checkAvailability(transformedData);
      if (availabilityCheck.error) {
        throw new Error(availabilityCheck.error.message);
      }

      // Crear la reserva
      const result = await bookingService.createBooking(transformedData);
      
      if (result.error) {
        throw new Error(result.error.message);
      }

      return result;
    } catch (err) {
      const error = err as Error;
      
      // Determinar si el error es recuperable
      const isRecoverable = 
        error.message.includes('timeout') ||
        error.message.includes('network') ||
        error.message.includes('connection');

      if (isRecoverable && attempt < maxRetries) {
        console.log(`Reintento ${attempt} de ${maxRetries}...`);
        await sleep(retryDelay * attempt);
        return createBookingWithRetry(attempt + 1);
      }

      throw error;
    }
  }, [transformedData, maxRetries, retryDelay]);

  const createBooking = useCallback(async () => {
    if (!isValid || !transformedData) {
      console.error('No se puede crear la reserva:', {
        isValid,
        hasTransformedData: !!transformedData,
        validationErrors
      });
      
      const criticalErrors = validationErrors
        .filter(err => err.severity === 'error')
        .map(err => err.message)
        .join('\n');
      
      toast.error('No se puede crear la reserva:\n' + criticalErrors);
      return { error: { message: criticalErrors } };
    }

    if (hasWarnings) {
      console.warn('Advertencias presentes:', validationErrors.filter(err => err.severity === 'warning'));
      const warnings = validationErrors
        .filter(err => err.severity === 'warning')
        .map(err => err.message)
        .join('\n');
      
      toast.warning('Advertencias:\n' + warnings);
    }

    try {
      setIsCreating(true);
      setError(null);

      // Verificar disponibilidad
      console.log('Verificando disponibilidad con datos:', {
        ...transformedData,
        rentals: transformedData.rentalItems
      });
      
      const availabilityCheck = await bookingService.checkAvailability(transformedData);
      if (availabilityCheck.error) {
        throw new Error(availabilityCheck.error.message);
      }

      // Crear la reserva
      console.log('Creando reserva con datos:', {
        ...transformedData,
        rentals: transformedData.rentalItems
      });
      
      const result = await bookingService.createBooking(transformedData);
      
      if (result.error) {
        throw new Error(result.error.message);
      }

      console.log('Reserva creada exitosamente:', result);
      toast.success('Reserva creada exitosamente');
      options.onSuccess?.();
      return result;

    } catch (err) {
      const error = err as Error;
      console.error('Error al crear la reserva:', {
        error,
        transformedData,
        validationErrors
      });
      setError(error);

      // Mensajes de error más descriptivos
      const errorMessage = error.message.includes('overlap')
        ? 'El horario seleccionado no está disponible. Por favor, seleccione otro horario.'
        : error.message.includes('stock')
        ? 'Algunos artículos ya no están disponibles. Por favor, revise su selección.'
        : error.message || 'Error al crear la reserva';

      toast.error(errorMessage);
      options.onError?.(error);
      return { error: { message: errorMessage } };
    } finally {
      setIsCreating(false);
    }
  }, [transformedData, isValid, validationErrors, hasWarnings, options]);

  return {
    createBooking,
    isCreating,
    error,
    isValid,
    validationErrors,
    hasWarnings
  };
} 