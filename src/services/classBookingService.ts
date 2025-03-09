/**
 * Servicio dedicado a la creación de reservas de clases
 * 
 * Este servicio independiente maneja la creación de reservas de clase
 * sin depender de hooks de formulario, siguiendo las mejores prácticas
 * de separación de responsabilidades.
 * 
 * IMPORTANTE: Implementación de transformación de zona horaria
 * -------------------------------------------------------------
 * Este servicio ahora implementa la misma lógica de transformación de zona horaria
 * que el servicio bookingService.ts para mantener la consistencia:
 * 
 * 1. Se obtiene la zona horaria de la sede (branch) asociada a la cancha
 * 2. Se convierten los horarios locales (en zona horaria de la sede) a UTC
 * 3. Se almacenan los horarios en UTC en la base de datos
 * 
 * Esto garantiza que todas las reservas, ya sean normales o de clase, se almacenen
 * de manera consistente con la misma referencia horaria (UTC).
 */

import { createSupabaseClient } from '@/lib/supabase';
import type { BookingCreationData } from '@/types/bookings';
import { ClassBookingTransformService } from './classBookingTransformService';
import type { PublicClass, ClassSession } from '@/components/classes-registration/types/models';
import type { PaymentMethodEnum, PaymentStatusEnum } from '@/types/bookings';
import { DateTime } from 'luxon'; // Importamos DateTime de Luxon para manejar zonas horarias

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
   * Convierte horarios locales a UTC basándose en la zona horaria de la sede
   * 
   * @private
   * @param courtId - ID de la cancha
   * @param date - Fecha en formato local yyyy-MM-dd
   * @param startTime - Hora de inicio en formato local HH:mm
   * @param endTime - Hora de fin en formato local HH:mm
   * @returns Objeto con fecha y horarios convertidos a UTC o undefined si hay error
   */
  private async convertTimesToUTC(
    courtId: string,
    date: string,
    startTime: string,
    endTime: string
  ): Promise<{
    bookingDateUTC: string;
    startTimeUTC: string;
    endTimeUTC: string;
    timezone: string;
  } | undefined> {
    try {
      if (!courtId) {
        console.warn('❌ Se requiere un ID de cancha válido para la conversión de horarios');
        return undefined;
      }
      
      // Obtener información de la cancha para conseguir el branch_id
      const { data: court, error: courtError } = await this.supabase
        .from('courts')
        .select('branch_id')
        .eq('id', courtId)
        .single();
      
      if (courtError || !court) {
        console.error('❌ Error al obtener información de la cancha:', courtError);
        return undefined;
      }
      
      // Obtener la zona horaria de la sede
      const { data: branch, error: branchError } = await this.supabase
        .from('sedes')
        .select('timezone')
        .eq('id', court.branch_id)
        .single();
      
      if (branchError || !branch) {
        console.error('❌ Error al obtener información de la sede:', branchError);
        return undefined;
      }
      
      // Validar y establecer zona horaria por defecto si es necesario
      const timezone = branch.timezone || 'UTC';
      console.log('✅ Zona horaria de la sede:', timezone);
      
      // Crear fechas usando Luxon con la zona horaria de la sede
      const localStartDateTime = DateTime.fromFormat(
        `${date} ${startTime}`,
        'yyyy-MM-dd HH:mm',
        { zone: timezone }
      );
      
      const localEndDateTime = DateTime.fromFormat(
        `${date} ${endTime}`,
        'yyyy-MM-dd HH:mm',
        { zone: timezone }
      );
      
      // Convertir a UTC
      const startTimeUTC = localStartDateTime.toUTC().toFormat('HH:mm:ss');
      const endTimeUTC = localEndDateTime.toUTC().toFormat('HH:mm:ss');
      const bookingDateUTC = localStartDateTime.toUTC().toFormat('yyyy-MM-dd');
      
      console.log('🕒 Conversión de horarios:', {
        local: {
          date,
          start: startTime,
          end: endTime,
          timezone,
          localStart: localStartDateTime.toISO(),
          localEnd: localEndDateTime.toISO()
        },
        utc: {
          date: bookingDateUTC,
          start: startTimeUTC,
          end: endTimeUTC,
          fullStartUTC: localStartDateTime.toUTC().toISO(),
          fullEndUTC: localEndDateTime.toUTC().toISO()
        }
      });
      
      return {
        bookingDateUTC,
        startTimeUTC,
        endTimeUTC,
        timezone
      };
    } catch (error) {
      console.error('❌ Error en la conversión de horarios:', error);
      return undefined;
    }
  }

  /**
   * Crea una reserva de clase a partir de los datos de clase y sesión
   * 
   * Esta función:
   * 1. Transforma los datos de la sesión a formato de reserva
   * 2. Obtiene la zona horaria de la sede asociada a la cancha
   * 3. Convierte los horarios locales a UTC para almacenar correctamente en la BD
   * 4. Crea la reserva usando el procedimiento RPC
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
      
      // 2. Obtener la información de la cancha para obtener la sede
      let courtId = bookingData.courtId;
      
      if (!courtId && session.courts && session.courts.length > 0) {
        courtId = session.courts[0].id;
      }
      
      if (!courtId) {
        console.warn('❌ No se encontró una cancha válida para la sesión de clase');
        return {
          error: {
            message: 'No se encontró una cancha válida para la sesión',
            code: 'INVALID_COURT'
          }
        };
      }
      
      // 3. Convertir horarios locales a UTC
      const timeConversion = await this.convertTimesToUTC(
        courtId,
        bookingData.date,
        bookingData.startTime,
        bookingData.endTime
      );
      
      if (!timeConversion) {
        return {
          error: {
            message: 'Error al convertir los horarios a UTC',
            code: 'TIMEZONE_ERROR'
          }
        };
      }
      
      // 4. Llamar a la RPC para crear la reserva (ahora con horarios en UTC)
      const { data, error } = await this.supabase.rpc('create_booking_v2', {
        p_court_id: courtId,
        p_date: timeConversion.bookingDateUTC,             // Fecha en UTC
        p_start_time: timeConversion.startTimeUTC,         // Hora de inicio en UTC
        p_end_time: timeConversion.endTimeUTC,             // Hora de fin en UTC
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
   * 
   * Esta función:
   * 1. Valida los datos de las sesiones seleccionadas
   * 2. Para cada sesión, llama a createClassBooking que maneja la conversión de zona horaria
   * 3. Devuelve un resumen de los resultados
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