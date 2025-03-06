/**
 * Servicio dedicado a la creación de reservas de clases
 * 
 * Este servicio independiente maneja la creación de reservas de clase
 * sin depender de hooks de formulario, siguiendo las mejores prácticas
 * de separación de responsabilidades.
 */

import { createSupabaseClient } from '@/lib/supabase';
import type { BookingCreationData } from '@/types/bookings';
import { ClassBookingTransformService } from './classBookingTransformService';
import type { PublicClass, ClassSession } from '@/components/classes-registration/types/models';
import type { PaymentMethodEnum, PaymentStatusEnum } from '@/types/bookings';

// Interfaces para el servicio
interface BookingResult {
  id?: string;
  error?: {
    message: string;
    details?: string;
    code?: string;
  };
}

interface BookingOptions {
  userId: string;
  empresaId: string;
  paymentMethod?: PaymentMethodEnum;
  paymentStatus?: PaymentStatusEnum;
  depositAmount?: number;
}

/**
 * Clase que implementa el servicio de reservas de clases
 */
export class ClassBookingService {
  private supabase = createSupabaseClient();

  /**
   * Crea una reserva de clase a partir de los datos de clase y sesión
   */
  async createClassBooking(
    classData: PublicClass,
    session: ClassSession,
    options: BookingOptions
  ): Promise<BookingResult> {
    try {
      console.log('Creando reserva para la clase:', classData.title, 'sesión:', session.date);
      
      // 1. Transformar los datos de sesión a formato de reserva
      const bookingData = ClassBookingTransformService.transformSessionToBookingData(classData, session, {
        paymentMethod: options.paymentMethod,
        paymentStatus: options.paymentStatus,
        depositAmount: options.depositAmount,
        empresaId: options.empresaId,
        userId: options.userId
      });
      
      // Asegurarnos de que el tipo de pago sea válido
      const normalizedPaymentType = ClassBookingTransformService.normalizePaymentType(bookingData.paymentType);
      
      // 2. Llamar a la RPC para crear la reserva
      const { data, error } = await this.supabase.rpc('create_booking_v2', {
        p_court_id: bookingData.courtId || null,
        p_date: bookingData.date,
        p_start_time: bookingData.startTime,
        p_end_time: bookingData.endTime,
        p_court_price: bookingData.courtPrice || 0,
        p_deposit_amount: bookingData.depositAmount || 0,
        p_payment_method: bookingData.paymentMethod || 'cash',
        p_payment_status: bookingData.paymentStatus || 'pending',
        p_payment_type: normalizedPaymentType,
        p_rental_items: bookingData.rentalItems || [],
        p_rental_items_price: bookingData.rentalItemsPrice || 0,
        p_title: bookingData.title || '',
        p_description: bookingData.description || '',
        p_participants: bookingData.participants || [],
        p_empresa_id: options.empresaId,
        p_reservation_type: 'class',
        p_class_id: classData.id,
        p_class_session_price: session.price || 0
      });

      if (error) {
        console.error('❌ Error creating class booking:', error);
        return {
          error: {
            message: 'Error al crear la reserva de clase',
            details: error.message,
            code: error.code
          }
        };
      }

      return { id: data };
    } catch (error: any) {
      console.error('❌ Exception creating class booking:', error);
      return {
        error: {
          message: 'Error inesperado al crear la reserva de clase',
          details: error.message
        }
      };
    }
  }

  /**
   * Crea múltiples reservas de clase para sesiones seleccionadas
   */
  async createMultipleClassBookings(
    classData: PublicClass,
    sessionIds: string[],
    options: BookingOptions
  ): Promise<{
    success: boolean;
    bookingIds: string[];
    errors: string[];
  }> {
    // Validar datos
    const validation = ClassBookingTransformService.validateSessionsForBooking(
      classData,
      sessionIds
    );

    if (!validation.isValid) {
      return {
        success: false,
        bookingIds: [],
        errors: validation.errors
      };
    }

    // Obtener las sesiones seleccionadas
    const selectedSessions = classData.sessions.filter(
      session => sessionIds.includes(session.id)
    );

    // Crear cada reserva de manera secuencial
    const results: BookingResult[] = [];
    const errors: string[] = [];
    const bookingIds: string[] = [];

    for (const session of selectedSessions) {
      const result = await this.createClassBooking(classData, session, options);
      results.push(result);

      if (result.error) {
        errors.push(result.error.message);
      } else if (result.id) {
        bookingIds.push(result.id);
      }
    }

    return {
      success: errors.length === 0 && bookingIds.length > 0,
      bookingIds,
      errors
    };
  }
}

// Exportar una instancia por defecto para facilitar su uso
export const classBookingService = new ClassBookingService(); 