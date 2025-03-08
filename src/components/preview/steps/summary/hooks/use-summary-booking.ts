import { useSummaryState } from './useSummaryState';
import { useCallback, useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { useForm } from '@/contexts/FormContext';
import { useAuth } from '@/contexts/AuthContext';
import { PAYMENT_TYPE_MAPPINGS, PaymentTypeEnum, ParticipantRoleEnum } from '@/types/bookings';
import { BookingCreationData } from '@/types/bookings';
import { bookingService } from '@/services/bookingService';
import { useFormItems } from '@/contexts/FormItemsContext';
import { PaymentState, BookingPaymentData } from '@/types/payments';
import { Item } from '@/types/items';
import { useItems } from '@/hooks/useItems';

interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

interface UseSummaryBookingOptions {
  onSuccess?: (booking: BookingPaymentData) => void;
  onError?: (error: Error) => void;
}

export function useSummaryBooking(options: UseSummaryBookingOptions = {}) {
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isConfigurationStep, setIsConfigurationStep] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const creationAttempted = useRef(false);
  const { setPayment, state } = useForm();
  const { user } = useAuth();
  const { rentals, selectedItems, totalPrice: formItemsPrice, transformSelectedItemsToRentals } = useFormItems();
  
  // Utilizar useItems para cargar los items de la sede
  const { data: items = [] } = useItems(state.location.branchId || undefined, {
    onError: (error) => {
      console.error('[useSummaryBooking] Error al cargar items:', error);
    }
  });

  const {
    selectedPaymentMethod,
    selectedPaymentType,
    calculations
  } = useSummaryState();

  // Sincronizar el estado de pago con el contexto global
  useEffect(() => {
    if (selectedPaymentType) {
      console.log('Sincronizando estado de pago:', {
        type: selectedPaymentType,
        mapping: PAYMENT_TYPE_MAPPINGS[selectedPaymentType as PaymentTypeEnum],
        currentType: state.payment.type
      });
      
      // Verificar si el tipo ya está establecido para evitar ciclos
      if (state.payment.type !== selectedPaymentType) {
        console.log('Actualizando tipo de pago en el contexto global:', selectedPaymentType);
        
        // Actualizar el estado global con el tipo seleccionado
        setPayment({
          type: selectedPaymentType as PaymentTypeEnum,
          method: state.payment.method,  // Mantener el método existente
          selectedPaymentMethod: state.payment.selectedPaymentMethod  // Mantener el método seleccionado
        });

        console.log('Estado actualizado después de sincronización:', {
          payment: state.payment,
          mapping: PAYMENT_TYPE_MAPPINGS[selectedPaymentType as PaymentTypeEnum]
        });
      } else {
        console.log('El tipo de pago ya está sincronizado con el contexto global');
      }
    }
  }, [selectedPaymentType, setPayment, state.payment]);

  // También sincronizar cuando cambia el método seleccionado
  useEffect(() => {
    if (selectedPaymentMethod && selectedPaymentType && !state.payment.type) {
      console.log('Detectado método seleccionado sin tipo en contexto global. Sincronizando tipo:', selectedPaymentType);
      
      setPayment({
        type: selectedPaymentType as PaymentTypeEnum,
        method: state.payment.method,
        selectedPaymentMethod: state.payment.selectedPaymentMethod
      });
    }
  }, [selectedPaymentMethod, selectedPaymentType, state.payment, setPayment]);

  // Validar la configuración del pago
  const validatePaymentConfig = useCallback((): ValidationError[] => {
    const errors: ValidationError[] = [];

    console.log('[useSummaryBooking] Validando configuración de pago:', {
      payment: state.payment,
      selectedMethod: state.payment.selectedPaymentMethod,
      type: state.payment.type,
      hasMethod: !!state.payment.method,
      hasSelectedMethod: !!state.payment.selectedPaymentMethod,
      hasType: !!state.payment.type
    });

    // Verificación detallada del método de pago
    const hasValidMethod = !!state.payment.method || 
                          (state.payment.selectedPaymentMethod && 
                           !!state.payment.selectedPaymentMethod.id);
    
    if (!hasValidMethod) {
      console.error('[useSummaryBooking] Método de pago inválido o faltante:', {
        method: state.payment.method,
        selectedMethod: state.payment.selectedPaymentMethod
      });
      
      errors.push({
        field: 'paymentMethod',
        message: 'Selecciona un método de pago',
        severity: 'error'
      });
    } else {
      console.log('[useSummaryBooking] Método de pago válido encontrado');
    }

    // Verificación detallada del tipo de pago
    if (!state.payment.type) {
      console.error('[useSummaryBooking] Tipo de pago faltante');
      
      errors.push({
        field: 'paymentType',
        message: 'Selecciona un tipo de pago',
        severity: 'error'
      });
    } else {
      console.log('[useSummaryBooking] Tipo de pago válido:', state.payment.type);
    }

    // Validar montos
    if (calculations.total <= 0) {
      errors.push({
        field: 'total',
        message: 'El total debe ser mayor a 0',
        severity: 'error'
      });
    }

    // Validar empresa_id
    if (!state.empresa_id) {
      errors.push({
        field: 'empresa',
        message: 'No se encontró la empresa asociada',
        severity: 'error'
      });
    }

    return errors;
  }, [state.payment, calculations.total, state.empresa_id]);

  // Actualizar errores cuando cambian los valores relevantes
  useEffect(() => {
    const errors = validatePaymentConfig();
    setValidationErrors(errors);
  }, [validatePaymentConfig]);

  // Función para calcular el depósito según el tipo de pago
  // IMPORTANTE: Esta función calcula el monto del depósito que se guardará
  // en la reserva. Para 'deposit' (pago con seña), calculamos el 30% del total,
  // y asegúrate de que PAYMENT_TYPE_MAPPINGS.deposit tiene defaultStatus = 'partial'
  // para que se refleje correctamente como un pago parcial en el sistema.
  const calculateDeposit = useCallback((paymentType: PaymentTypeEnum, total: number) => {
    switch (paymentType) {
      case 'guarantee':
        return 0; // Sin depósito para garantías
      case 'deposit':
        return total * 0.3; // 30% para depósitos (señas) - esto debe coincidir con un estado 'partial'
      case 'booking':
        return total; // Pago completo
      default:
        return 0;
    }
  }, []);

  // Función para crear la reserva
  const handleCreateBooking = useCallback(async () => {
    if (isCreating || creationAttempted.current) {
      console.log('Creación en progreso o ya intentada, ignorando llamada');
      return null;
    }

    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    if (!state.empresa_id) {
      throw new Error('No se encontró la empresa asociada');
    }

    try {
      setIsCreating(true);
      creationAttempted.current = true;

      console.log('Iniciando creación de reserva con estado:', {
        payment: state.payment,
        calculations,
        validationErrors,
        userId: user.id,
        empresa_id: state.empresa_id,
        rentals,
        selectedItems
      });

      const errors = validatePaymentConfig();
      if (errors.length > 0) {
        const errorMessages = errors.map(e => e.message).join('\n');
        throw new Error(`Validación fallida:\n${errorMessages}`);
      }

      // Obtener la configuración del tipo de pago
      const paymentType = state.payment.type;
      if (!paymentType) {
        throw new Error('Tipo de pago no seleccionado');
      }

      // Mapear 'full' a 'booking' si es necesario
      const normalizedPaymentType = paymentType === 'full' as any ? 'booking' : paymentType as PaymentTypeEnum;
      
      // Buscar configuración basada en el tipo normalizado
      const paymentConfig = PAYMENT_TYPE_MAPPINGS[normalizedPaymentType as PaymentTypeEnum];
      if (!paymentConfig) {
        console.error('Configuración de tipo de pago no válida:', {
          originalType: paymentType,
          normalizedType: normalizedPaymentType,
          availableMappings: Object.keys(PAYMENT_TYPE_MAPPINGS)
        });
        throw new Error('Configuración de tipo de pago no válida');
      }

      // Determinar el método de pago adecuado según el tipo
      let effectivePaymentMethod = paymentConfig.defaultMethod;
      
      // Si es tipo 'full', 'deposit' o 'guarantee', usamos 'card' (independiente del valor por defecto)
      if (paymentType === 'full' || paymentType === 'deposit' || paymentType === 'guarantee') {
        effectivePaymentMethod = 'card';
      }
      
      // Preparar datos para la creación
      const bookingData: BookingCreationData = {
        courtId: state.shift.courtId!,
        date: state.shift.date!,
        startTime: state.shift.startTime!,
        endTime: state.shift.endTime!,
        courtPrice: state.shift.price || 0,
        rentalItemsPrice: calculations.itemsTotal,
        paymentMethod: effectivePaymentMethod, // Usamos el método efectivo determinado
        paymentType: normalizedPaymentType,
        paymentStatus: paymentConfig.defaultStatus,
        depositAmount: calculateDeposit(normalizedPaymentType, calculations.total),
        participants: [{ 
          id: user.id,
          userId: user.id,
          role: 'player' as ParticipantRoleEnum
        }],
        rentalItems: [],
        empresa_id: state.empresa_id,
        stripe_payment_method_id: normalizedPaymentType === 'guarantee' ? state.payment.selectedPaymentMethod?.id : undefined
      };

      // Asegurar que el método de pago sea 'card' para tipos específicos
      // IMPORTANTE: Los pagos con seña (deposit), pago completo (full) y garantía (guarantee) siempre deben usar card
      if (paymentType === 'deposit' || paymentType === 'guarantee' || paymentType === 'full') {
        console.log(`[useSummaryBooking] Forzando método de pago 'card' para tipo: ${paymentType}`);
        bookingData.paymentMethod = 'card';
        
        // Asegurar que tenemos un paymentMethodId para Stripe (para procesamiento en el backend)
        if (state.payment.selectedPaymentMethod?.id) {
          bookingData.stripe_payment_method_id = state.payment.selectedPaymentMethod.id;
        }
      }

      // Convertir selectedItems a rentalItems
      if (Object.keys(selectedItems).length > 0 && items.length > 0) {
        // Calculamos la duración en minutos desde startTime y endTime
        const startTime = state.shift.startTime!;
        const endTime = state.shift.endTime!;
        
        // Convertir hh:mm a minutos totales
        const getMinutes = (time: string) => {
          const [hours, minutes] = time.split(':').map(Number);
          return hours * 60 + minutes;
        };
        
        const startMinutes = getMinutes(startTime);
        const endMinutes = getMinutes(endTime);
        
        // Calcular duración, manejo caso de día siguiente
        let durationInMinutes = endMinutes - startMinutes;
        if (durationInMinutes <= 0) {
          // Si termina al día siguiente, sumamos 24 horas
          durationInMinutes += 24 * 60;
        }
        
        console.log(`[useSummaryBooking] Calculando duración: ${startTime} a ${endTime} = ${durationInMinutes} minutos`);
        
        // Transformar los items seleccionados a rentals utilizando los items cargados
        const generatedRentals = transformSelectedItemsToRentals(items, durationInMinutes);
        
        if (generatedRentals.length > 0) {
          console.log('[useSummaryBooking] Items transformados a rentals:', generatedRentals);
          
          // Actualizar los rentalItems en los datos de la reserva
          bookingData.rentalItems = generatedRentals.map(rental => ({
            itemId: rental.itemId,
            quantity: rental.quantity,
            pricePerUnit: rental.pricePerUnit,
            totalPrice: rental.totalPrice
          }));
        } else {
          console.warn('[useSummaryBooking] No se pudieron transformar los items a rentals');
        }
      } else {
        console.log('[useSummaryBooking] No hay items seleccionados o no hay items disponibles', {
          selectedItemsCount: Object.keys(selectedItems).length,
          itemsCount: items.length
        });
      }

      console.log('Datos de reserva preparados:', {
        ...bookingData,
        rentals: bookingData.rentalItems,
        paymentConfig,
        originalPaymentType: state.payment.type
      });

      // Validar configuración especial para pago completo
      if (state.payment.type === 'full') {
        // Añadir logs detallados para diagnóstico
        console.log('[useSummaryBooking] Verificando pago completo:', {
          paymentIntentId: state.payment.paymentIntentId,
          method: state.payment.method,
          hasPaymentMethod: !!state.payment.method,
          hasSelectedPaymentMethod: !!state.payment.selectedPaymentMethod,
          processed: state.payment.processed
        });
        
        // Intentar obtener el paymentIntentId de diferentes fuentes
        let effectivePaymentIntentId = state.payment.paymentIntentId;
        
        // Si no tenemos un paymentIntentId, buscar en otros lugares
        if (!effectivePaymentIntentId) {
          console.warn('[useSummaryBooking] PaymentIntentId no encontrado en la ubicación principal, buscando alternativas');
          
          // 1. Verificar si está en selectedPaymentMethod
          if (state.payment.selectedPaymentMethod && 
              (state.payment.selectedPaymentMethod as any).paymentIntentId) {
            effectivePaymentIntentId = (state.payment.selectedPaymentMethod as any).paymentIntentId;
            console.info('[useSummaryBooking] PaymentIntentId encontrado en selectedPaymentMethod:', effectivePaymentIntentId);
          }
          // 2. Verificar si está en config
          else if (state.payment.config && (state.payment.config as any).paymentIntentId) {
            effectivePaymentIntentId = (state.payment.config as any).paymentIntentId;
            console.info('[useSummaryBooking] PaymentIntentId encontrado en config:', effectivePaymentIntentId);
          }
          // 3. Recuperar desde localStorage como último recurso
          else {
            try {
              const storedPaymentIntentId = localStorage.getItem('lastPaymentIntentId');
              const timestamp = localStorage.getItem('lastPaymentTimestamp');
              
              if (storedPaymentIntentId && timestamp) {
                // Verificar que el timestamp no sea muy antiguo (5 minutos máximo)
                const storedTime = new Date(timestamp).getTime();
                const now = new Date().getTime();
                const fiveMinutes = 5 * 60 * 1000;
                
                if (now - storedTime < fiveMinutes) {
                  effectivePaymentIntentId = storedPaymentIntentId;
                  console.info('[useSummaryBooking] PaymentIntentId recuperado de localStorage:', effectivePaymentIntentId);
                } else {
                  console.warn('[useSummaryBooking] PaymentIntentId en localStorage es demasiado antiguo:', timestamp);
                }
              }
            } catch (storageError) {
              console.warn('[useSummaryBooking] Error al acceder a localStorage:', storageError);
            }
          }
          
          // Verificación final: si aún no tenemos un paymentIntentId, lanzar error
          if (!effectivePaymentIntentId) {
            console.error('[useSummaryBooking] Pago completo sin PaymentIntent después de buscar en todas las fuentes:', state.payment);
            throw new Error('Es necesario procesar el pago antes de crear la reserva');
          } else {
            console.log('[useSummaryBooking] PaymentIntentId recuperado correctamente:', effectivePaymentIntentId);
          }
        }
        
        // Ya no verificamos que el método sea 'stripe', porque ahora usamos 'card'
        
        // Forzar configuración correcta para pago completo
        bookingData.paymentMethod = 'card'; // Aseguramos que siempre sea 'card' para pago completo
        bookingData.paymentStatus = 'completed';
        
        // Asignar el paymentIntentId recuperado
        if ('stripe_payment_intent_id' in bookingData) {
          bookingData.stripe_payment_intent_id = effectivePaymentIntentId;
        } else {
          // Si el campo no existe en bookingData, añadirlo
          (bookingData as any).stripe_payment_intent_id = effectivePaymentIntentId;
        }
        
        console.log('[useSummaryBooking] Reserva configurada con PaymentIntentId:', {
          paymentIntentId: effectivePaymentIntentId,
          method: bookingData.paymentMethod, // Ahora debería ser siempre 'card'
          status: bookingData.paymentStatus
        });
      }

      // Verificar disponibilidad antes de crear
      const availabilityCheck = await bookingService.checkAvailability(bookingData);
      if (availabilityCheck.error) {
        throw new Error(availabilityCheck.error.message);
      }

      // Crear la reserva
      const result = await bookingService.createBooking(bookingData);
      
      if (result.error) {
        throw new Error(result.error.message);
      }

      // Llamar al callback con el resultado de la creación
      if (options.onSuccess) {
        options.onSuccess(result as BookingPaymentData);
      }
      
      return result;

    } catch (error) {
      console.error('Error al crear la reserva:', error);
      options.onError?.(error as Error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  }, [state, calculations, validatePaymentConfig, options, isCreating, calculateDeposit, user, rentals, selectedItems, transformSelectedItemsToRentals, items]);

  // Función para finalizar configuración
  const finishConfiguration = useCallback(() => {
    console.log('[SummaryBooking] Validando configuración para avanzar', {
      payment: state.payment,
      calculations,
      currentState: state.payment
    });
    
    const errors = validatePaymentConfig();
    setValidationErrors(errors);

    if (errors.length === 0) {
      console.log('[SummaryBooking] Configuración válida, permitiendo navegación');
      setIsConfigurationStep(false);
      
      // No hay un booking específico en este punto, pasar un objeto vacío que cumpla con la interfaz
      if (options.onSuccess) {
        options.onSuccess({} as BookingPaymentData);
      }
      
      return true;
    }

    console.log('[SummaryBooking] Configuración inválida:', errors);
    const errorMessages = errors
      .filter(error => error.severity === 'error')
      .map(error => error.message)
      .join('\n');

    toast.error('Por favor, completa la configuración:\n' + errorMessages);
    return false;
  }, [validatePaymentConfig, options, state.payment, calculations]);

  // Limpiar el estado de creación al desmontar
  useEffect(() => {
    return () => {
      creationAttempted.current = false;
      setIsCreating(false);
    };
  }, []);

  return {
    isValid: validationErrors.length === 0,
    validationErrors,
    hasWarnings: validationErrors.some(error => error.severity === 'warning'),
    calculations,
    isConfigurationStep,
    finishConfiguration,
    currentPayment: state.payment,
    handleCreateBooking,
    isCreating
  };
} 