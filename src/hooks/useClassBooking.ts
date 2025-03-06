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
  const submitClassBooking = async (options = {}) => {
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
      // Utilizar el nuevo servicio para crear las reservas
      const result = await classBookingService.createMultipleClassBookings(
        state.selectedClass,
        state.selectedSessions,
        {
          userId: user.id,
          empresaId: organization.id,
          paymentMethod: options.paymentMethod || 'cash',
          paymentStatus: 'pending',
          depositAmount: 0
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
            variant: 'warning'
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