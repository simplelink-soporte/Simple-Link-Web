/**
 * Hook para gestionar la creación de reservas de sesiones de clase
 * 
 * Este hook conecta el contexto de registro de clases con el servicio de reservas,
 * utilizando el servicio de transformación para convertir los datos de clase
 * en el formato esperado por el sistema de reservas.
 */

import { useState } from 'react';
import { useClassRegistration } from '@/components/classes-registration/context/ClassRegistrationContext';
import { ClassBookingTransformService } from '@/services/classBookingTransformService';
import { classBookingService } from '@/services/classBookingService';
import { useToast } from '@/components/ui/use-toast';
import { PaymentMethodEnum, PaymentTypeEnum, PaymentStatusEnum } from '@/types/bookings';

/**
 * Hook para el proceso de reserva de sesiones de clase
 */
export function useClassBooking() {
  const { state, organization, user, updateState } = useClassRegistration();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  /**
   * Valida que los datos de clase y sesiones sean correctos para crear reservas
   */
  const validateClassData = () => {
    if (!state.selectedClass) {
      return { 
        isValid: false, 
        errors: ['No se ha seleccionado ninguna clase'] 
      };
    }
    
    return ClassBookingTransformService.validateSessionsForBooking(
      state.selectedClass,
      state.selectedSessions
    );
  };
  
  /**
   * Procesa la reserva de todas las sesiones seleccionadas
   */
  const submitClassBooking = async (options: {
    paymentMethod?: PaymentMethodEnum;
    paymentType?: PaymentTypeEnum;
    paymentMethodDetails?: { id: string; [key: string]: any };
  } = {}) => {
    // Validar datos antes de proceder
    const validation = validateClassData();
    if (!validation.isValid) {
      return { 
        error: { 
          message: 'Datos de clase o sesiones inválidos', 
          details: validation.errors
        } 
      };
    }
    
    if (!state.selectedClass || !user?.id || !organization?.id) {
      return {
        error: {
          message: 'Datos incompletos para procesar la reserva',
          details: 'Falta información de la clase, usuario o empresa'
        }
      };
    }
    
    setIsSubmitting(true);
    updateState({ type: 'SET_BOOKING_STATUS', payload: 'submitting' });
    
    try {
      console.log('📋 [useClassBooking] Opciones recibidas para la reserva:', options);
      
      // Calcular importe para pagos completos
      let depositAmount = 0;
      let paymentStatus: PaymentStatusEnum = 'pending';
      
      // Determinar el estado de pago y el importe del depósito según el tipo de pago
      if (options.paymentType === 'full') {
        // Si es pago completo, establecer el importe al precio total y marcar como completado
        const sessionsSummary = getSessionsSummary();
        depositAmount = sessionsSummary.totalPrice;
        paymentStatus = 'completed';
        console.log('📋 [useClassBooking] Pago completo detectado, configurando importe:', depositAmount);
      } else if (options.paymentType === 'deposit') {
        // Si es pago con seña, calcular el 30% y establecer estado como parcial
        const sessionsSummary = getSessionsSummary();
        depositAmount = sessionsSummary.totalPrice * 0.3; // 30% como seña
        paymentStatus = 'partial'; // Establecer estado como parcial
        console.log('📋 [useClassBooking] Pago con seña detectado, configurando importe:', depositAmount);
        
        // Intentar recuperar información adicional del depósito si está disponible en localStorage
        try {
          const lastDepositInfo = localStorage.getItem('lastDepositAmount');
          if (lastDepositInfo) {
            const depositInfo = JSON.parse(lastDepositInfo);
            if (depositInfo.depositAmount) {
              // Usar el monto del depósito real procesado por Stripe
              depositAmount = depositInfo.depositAmount;
              console.log('📋 [useClassBooking] Usando monto de seña real de Stripe:', depositAmount);
            }
          }
        } catch (err) {
          console.warn('⚠️ [useClassBooking] No se pudo recuperar la información de depósito:', err);
        }
      }
      
      // Utilizar el nuevo servicio para crear las reservas
      console.log('📌 [useClassBooking] Iniciando creación de reserva con sessionIds:', state.selectedSessions);
      
      // Obtener la sesión seleccionada para mejor trazabilidad
      const selectedSessionId = state.selectedSessions[0];
      const selectedSession = state.selectedClass?.sessions?.find(
        session => session.id === selectedSessionId
      );
      
      if (selectedSession) {
        console.log('📌 [useClassBooking] Detalles de la sesión seleccionada:', {
          id: selectedSession.id,
          date: selectedSession.date,
          horario: `${selectedSession.startTime} - ${selectedSession.endTime}`,
          pistas: selectedSession.courts?.map(c => c.id) || []
        });
      }
      
      const result = await classBookingService.createMultipleClassBookings(
        state.selectedClass,
        state.selectedSessions,
        {
          userId: user.id,
          empresaId: organization.id,
          paymentMethod: options.paymentMethod || 'cash',
          paymentStatus: paymentStatus,
          depositAmount: depositAmount,
          paymentType: options.paymentType,
          // Añadir el ID del método de pago de Stripe si está presente
          stripePaymentMethodId: options.paymentMethodDetails?.id
        }
      );
      
      // Actualizar el estado del contexto con las reservas creadas
      updateState({ type: 'SET_BOOKING_IDS', payload: result.bookingIds });
      
      if (result.success) {
        updateState({ type: 'SET_BOOKING_STATUS', payload: 'success' });
        
        // Si hay errores parciales, mostrar advertencia
        if (result.errors.length > 0) {
          toast({
            title: 'Advertencia',
            description: 'Algunas sesiones no pudieron reservarse',
            variant: 'default'
          });
          
          updateState({ 
            type: 'SET_BOOKING_ERROR', 
            payload: `Algunas reservas fallaron: ${result.errors.join(', ')}` 
          });
        } else {
          updateState({ type: 'SET_BOOKING_ERROR', payload: null });
        }
        
        setIsSubmitting(false);
        return { 
          data: { 
            bookingIds: result.bookingIds,
            totalSessions: result.bookingIds.length 
          } 
        };
      } else {
        // Si todas las reservas fallaron
        updateState({ type: 'SET_BOOKING_STATUS', payload: 'error' });
        updateState({ 
          type: 'SET_BOOKING_ERROR', 
          payload: `Error al procesar las reservas: ${result.errors.join(', ')}` 
        });
        
        toast({
          title: 'Error',
          description: 'No se pudieron procesar las reservas',
          variant: 'destructive'
        });
        
        setIsSubmitting(false);
        return {
          error: {
            message: 'Error al procesar las reservas',
            details: result.errors.join(', ')
          }
        };
      }
    } catch (error: any) {
      console.error('Error inesperado al procesar las reservas de clase:', error);
      
      updateState({ 
        type: 'SET_BOOKING_STATUS', 
        payload: 'error' 
      });
      
      updateState({ 
        type: 'SET_BOOKING_ERROR', 
        payload: error?.message || 'Error desconocido al procesar las reservas' 
      });
      
      toast({
        title: 'Error',
        description: 'Ha ocurrido un error inesperado',
        variant: 'destructive'
      });
      
      setIsSubmitting(false);
      return {
        error: {
          message: 'Error al procesar las reservas',
          details: error?.message || 'Error desconocido'
        }
      };
    }
  };
  
  /**
   * Genera un resumen de las sesiones seleccionadas
   */
  const getSessionsSummary = () => {
    if (!state.selectedClass || state.selectedSessions.length === 0) {
      return null;
    }
    
    return ClassBookingTransformService.generateSessionsSummary(
      state.selectedClass,
      state.selectedSessions
    );
  };
  
  /**
   * Calcula el precio total de todas las sesiones seleccionadas
   */
  const calculateTotalPrice = () => {
    if (!state.selectedClass || !state.selectedSessions.length) {
      return 0;
    }
    
    const selectedSessionsData = state.selectedClass.sessions
      .filter(session => state.selectedSessions.includes(session.id));
      
    return ClassBookingTransformService.calculateTotalPrice(selectedSessionsData);
  };
  
  return {
    submitClassBooking,
    getSessionsSummary,
    calculateTotalPrice,
    isSubmitting,
    bookingStatus: state.bookingStatus,
    bookingError: state.bookingError,
    bookingIds: state.bookingIds,
    validateClassData
  };
} 