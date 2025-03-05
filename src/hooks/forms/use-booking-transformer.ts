import { useForm } from '@/contexts/FormContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';
import type { BookingCreationData, PaymentMethodEnum, PaymentTypeEnum, ParticipantRoleEnum } from '@/types/bookings';
import { PAYMENT_TYPE_MAPPINGS } from '@/types/bookings';
import { useFormItems } from '@/contexts/FormItemsContext';

interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export function useBookingTransformer() {
  const { state } = useForm();
  const { user } = useAuth();
  const { rentals, selectedItems, totalPrice: formItemsPrice } = useFormItems();

  const validationErrors = useMemo(() => {
    const errors: ValidationError[] = [];

    // Validaciones críticas
    if (!user) {
      errors.push({
        field: 'auth',
        message: 'Usuario no autenticado',
        severity: 'error'
      });
    }

    if (!state.location.branchId) {
      errors.push({
        field: 'location',
        message: 'Sucursal no seleccionada',
        severity: 'error'
      });
    }

    if (!state.shift.courtId) {
      errors.push({
        field: 'court',
        message: 'Cancha no seleccionada',
        severity: 'error'
      });
    }

    if (!state.shift.date || !state.shift.startTime || !state.shift.endTime) {
      errors.push({
        field: 'shift',
        message: 'Horario no seleccionado',
        severity: 'error'
      });
    }

    // Validación de items si hay seleccionados
    if (Object.keys(selectedItems).length > 0) {
      if (!rentals || rentals.length === 0) {
        errors.push({
          field: 'items',
          message: 'Error en la transformación de items',
          severity: 'error'
        });
      }

      // Validar que cada rental tenga los datos necesarios
      rentals.forEach(rental => {
        if (!rental.itemId || !rental.quantity || !rental.pricePerUnit || !rental.duration) {
          errors.push({
            field: 'items',
            message: `Datos incompletos para el item ${rental.itemId}`,
            severity: 'error'
          });
        }
      });
    }

    // Agregar validación para empresa_id
    if (!state.empresa_id) {
      errors.push({
        field: 'empresa_id',
        message: 'ID de empresa no encontrado',
        severity: 'error'
      });
    }

    return errors;
  }, [user, state.location.branchId, state.shift, state.empresa_id, selectedItems, rentals]);

  const transformedData = useMemo((): BookingCreationData | null => {
    if (validationErrors.some(error => error.severity === 'error')) {
      console.log('Errores de validación impiden la transformación:', validationErrors);
      return null;
    }

    // Obtener la configuración de pago según el tipo seleccionado
    const paymentType = state.payment.type as PaymentTypeEnum;
    const paymentMapping = PAYMENT_TYPE_MAPPINGS[paymentType];

    // Obtener el payment_method_id si es una reserva de tipo garantía
    console.log('Estado de pago en transformación:', {
      paymentState: state.payment,
      hasSelectedMethod: !!state.payment.selectedPaymentMethod,
      selectedMethod: state.payment.selectedPaymentMethod
    });

    const stripePaymentMethodId = state.payment.type === 'guarantee' && state.payment.selectedPaymentMethod
      ? state.payment.selectedPaymentMethod.id
      : undefined;

    // Log detallado para debugging del método de pago
    console.log('Método de pago seleccionado:', {
      paymentType: state.payment.type,
      isGuarantee: state.payment.type === 'guarantee',
      selectedPaymentMethod: state.payment.selectedPaymentMethod,
      stripePaymentMethodId,
      paymentState: state.payment
    });

    // Transformar rentals al formato esperado por la RPC
    const transformedRentals = rentals.map(rental => {
      // Asegurar que todos los campos necesarios estén presentes
      if (!rental.itemId || !rental.quantity || !rental.pricePerUnit || !rental.duration) {
        console.warn('Rental inválido, falta información:', rental);
        return null;
      }

      // Calcular el precio total
      const totalPrice = rental.quantity * rental.pricePerUnit;

      // Estructura que mantiene la compatibilidad de tipos
      return {
        itemId: rental.itemId,
        quantity: rental.quantity,
        pricePerUnit: rental.pricePerUnit,
        totalPrice,
        duration: rental.duration,
        price: totalPrice
      };
    }).filter((rental): rental is NonNullable<typeof rental> => rental !== null);

    // Log detallado de la transformación de rentals
    console.log('Transformación de rentals:', {
      rentalsOriginales: rentals,
      rentalsTransformados: transformedRentals,
      selectedItems,
      formItemsPrice
    });

    // Crear la estructura final de la reserva
    const bookingData: BookingCreationData = {
      // Datos de la cancha
      courtId: state.shift.courtId!,
      date: state.shift.date!,
      startTime: state.shift.startTime!,
      endTime: state.shift.endTime!,
      courtPrice: state.shift.price || 0,

      // Datos de pago
      paymentMethod: paymentMapping.defaultMethod,
      paymentStatus: paymentMapping.defaultStatus,
      paymentType: paymentType,
      depositAmount: 0,

      // Datos de rentals
      rentalItems: transformedRentals,
      rentalItemsPrice: formItemsPrice,

      // Datos de participantes
      participants: [{
        id: user!.id,
        userId: user!.id,
        role: 'player' as ParticipantRoleEnum
      }],

      // Datos de empresa
      empresa_id: state.empresa_id || undefined,

      stripe_payment_method_id: stripePaymentMethodId
    };

    // Log detallado de la estructura final
    console.log('Estructura final de la reserva:', {
      ...bookingData,
      rentalsFinales: bookingData.rentalItems,
      rentalsLength: bookingData.rentalItems?.length || 0,
      paymentMethod: stripePaymentMethodId
    });

    return bookingData;
  }, [state, user, rentals, selectedItems, formItemsPrice, validationErrors]);

  return {
    transformedData,
    isValid: !validationErrors.some(error => error.severity === 'error'),
    validationErrors,
    isReady: !!user && !!state.location.branchId && !!state.shift.courtId && !!state.empresa_id,
    hasWarnings: validationErrors.some(error => error.severity === 'warning')
  };
} 