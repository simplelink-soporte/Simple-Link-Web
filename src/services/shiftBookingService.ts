/**
 * Servicio dedicado a la creación de reservas de turnos
 * 
 * Este servicio independiente maneja la creación de reservas de turnos
 * sin depender de hooks de formulario, siguiendo las mejores prácticas
 * de separación de responsabilidades.
 * 
 * IMPORTANTE: Implementación de transformación de zona horaria
 * -------------------------------------------------------------
 * Este servicio implementa la misma lógica de transformación de zona horaria
 * que el servicio bookingService.ts y classBookingService.ts para mantener la consistencia:
 * 
 * 1. Se obtiene la zona horaria de la sede (branch) asociada a la cancha
 * 2. Se convierten los horarios locales (en zona horaria de la sede) a UTC
 * 3. Se almacenan los horarios en UTC en la base de datos
 * 
 * Esto garantiza que todas las reservas se almacenen de manera consistente
 * con la misma referencia horaria (UTC).
 */

import { createSupabaseClient } from '@/lib/supabase';
import type { BookingCreationData } from '@/types/bookings';
import { ShiftBookingTransformService, type ShiftDetails } from './shiftBookingTransformService';
import type { PaymentMethodEnum, PaymentStatusEnum, PaymentTypeEnum } from '@/types/bookings';
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
  paymentType?: PaymentTypeEnum;
  stripePaymentMethodId?: string;
  guaranteePercentage?: number;
  rentalItems?: Record<string, number>;
  rentalItemsPrice?: number;
  itemsData?: any[];
}

/**
 * Clase que implementa el servicio de reservas de turnos
 */
export class ShiftBookingService {
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
      // Validaciones iniciales
      if (!courtId) {
        console.warn('❌ Se requiere un ID de cancha válido para la conversión de horarios');
        return undefined;
      }
      
      if (!date || !startTime || !endTime) {
        console.warn('❌ Se requieren fecha y horarios válidos para la conversión', { date, startTime, endTime });
        return undefined;
      }

      if (!this.isValidDateFormat(date) || !this.isValidTimeFormat(startTime) || !this.isValidTimeFormat(endTime)) {
        console.warn('❌ Formato de fecha u horario inválido', { date, startTime, endTime });
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
      
      // Formatear la fecha y hora correctamente para asegurar que Luxon pueda parsearlo
      const formattedDate = date.trim();
      const formattedStartTime = startTime.trim();
      const formattedEndTime = endTime.trim();
      
      // Crear fechas usando Luxon con la zona horaria de la sede
      const localStartDateTime = DateTime.fromFormat(
        `${formattedDate} ${formattedStartTime}`,
        'yyyy-MM-dd HH:mm',
        { zone: timezone }
      );
      
      const localEndDateTime = DateTime.fromFormat(
        `${formattedDate} ${formattedEndTime}`,
        'yyyy-MM-dd HH:mm',
        { zone: timezone }
      );
      
      // Verificar si las fechas son válidas
      if (!localStartDateTime.isValid) {
        console.error('❌ Error: Fecha de inicio inválida', localStartDateTime.invalidReason, localStartDateTime.invalidExplanation);
        return undefined;
      }
      
      if (!localEndDateTime.isValid) {
        console.error('❌ Error: Fecha de fin inválida', localEndDateTime.invalidReason, localEndDateTime.invalidExplanation);
        return undefined;
      }
      
      // Convertir a UTC
      const utcStartDateTime = localStartDateTime.toUTC();
      const utcEndDateTime = localEndDateTime.toUTC();
      
      // Obtener solo el componente de hora en formato 'HH:mm:ss'
      const startTimeUTCHour = utcStartDateTime.toFormat('HH:mm:ss');
      const endTimeUTCHour = utcEndDateTime.toFormat('HH:mm:ss');
      
      // Verificar si la hora de fin es 00:00:00 o si la hora de fin es menor que la hora de inicio
      // Esto indica que la reserva cruza la medianoche en UTC
      const isOvernightUTC = endTimeUTCHour === '00:00:00' || 
        parseInt(endTimeUTCHour.split(':')[0]) < parseInt(startTimeUTCHour.split(':')[0]);
      
      // Crear timestamp completo para la hora de inicio
      const startTimeUTC = utcStartDateTime.toFormat('yyyy-MM-dd HH:mm:ss');
      
      // Para la hora de fin, depende de si la reserva cruza la medianoche
      let endTimeUTC;
      
      if (isOvernightUTC) {
        if (endTimeUTCHour === '00:00:00') {
          // Caso especial para 00:00:00 - ajustar a un segundo antes
          const adjustedEndDateTime = utcStartDateTime.set({ hour: 23, minute: 59, second: 59 });
          endTimeUTC = adjustedEndDateTime.toFormat('yyyy-MM-dd HH:mm:ss');
        } else {
          // Para reservas que cruzan la medianoche, ajustar la fecha a un día después
          endTimeUTC = utcEndDateTime.plus({ days: 1 }).toFormat('yyyy-MM-dd HH:mm:ss');
        }
      } else {
        // Caso normal - mismo día
        endTimeUTC = utcEndDateTime.toFormat('yyyy-MM-dd HH:mm:ss');
      }
      
      // Usar la fecha original como fecha de reserva
      const bookingDateUTC = formattedDate;
      
      console.log('🕒 Conversión de horarios:', {
        local: {
          start: formattedStartTime,
          end: formattedEndTime,
          timezone,
          localStart: localStartDateTime.isValid ? localStartDateTime.toISO() : null,
          localEnd: localEndDateTime.isValid ? localEndDateTime.toISO() : null
        },
        utc: {
          date: bookingDateUTC,
          start: startTimeUTC,
          end: endTimeUTC,
          isOvernightUTC,
          fullStartUTC: utcStartDateTime.isValid ? utcStartDateTime.toISO() : null,
          fullEndUTC: utcEndDateTime.isValid ? utcEndDateTime.toISO() : null
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
   * Valida si una cadena tiene el formato de fecha YYYY-MM-DD
   */
  private isValidDateFormat(date: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(date);
  }

  /**
   * Valida si una cadena tiene el formato de hora HH:MM
   */
  private isValidTimeFormat(time: string): boolean {
    return /^\d{2}:\d{2}$/.test(time);
  }

  /**
   * Crea una reserva de turno a partir de los datos del turno
   * 
   * Esta función:
   * 1. Transforma los datos del turno a formato de reserva
   * 2. Obtiene la zona horaria de la sede asociada a la cancha
   * 3. Convierte los horarios locales a UTC para almacenar correctamente en la BD
   * 4. Crea la reserva usando el procedimiento RPC
   */
  async createShiftBooking(
    shiftDetails: ShiftDetails,
    options: BookingOptions
  ): Promise<BookingResult> {
    try {
      console.log('📋 [ShiftBookingService] Creando reserva para el turno:', shiftDetails.courtName, 'fecha:', shiftDetails.date);
      console.log('📋 [ShiftBookingService] Opciones recibidas:', JSON.stringify(options, null, 2));
      
      // Verificar específicamente los ítems recibidos
      if (options.rentalItems) {
        console.log('📋 [ShiftBookingService] Items recibidos:', JSON.stringify({
          items: options.rentalItems,
          totalPrice: options.rentalItemsPrice,
          itemsDataLength: options.itemsData ? options.itemsData.length : 0
        }, null, 2));
      }
      
      // 1. Transformar los datos de turno a formato de reserva
      const bookingData = ShiftBookingTransformService.transformShiftToBookingData(shiftDetails, {
        paymentMethod: options.paymentMethod,
        paymentStatus: options.paymentStatus,
        paymentType: options.paymentType,
        stripePaymentMethodId: options.stripePaymentMethodId,
        depositAmount: options.depositAmount,
        guaranteePercentage: options.guaranteePercentage,
        empresaId: options.empresaId,
        userId: options.userId,
        rentalItems: options.rentalItems,
        rentalItemsPrice: options.rentalItemsPrice,
        itemsData: options.itemsData // Pasamos los datos completos de los ítems
      });
      
      console.log('📋 [ShiftBookingService] Datos de reserva transformados:', JSON.stringify(bookingData, null, 2));
      
      // Asegurarnos de que el tipo de pago sea válido
      const normalizedPaymentType = ShiftBookingTransformService.normalizePaymentType(bookingData.paymentType);
      console.log('📋 [ShiftBookingService] Tipo de pago normalizado:', normalizedPaymentType);
      
      // Asegurarnos de que el estado de pago sea válido
      const normalizedPaymentStatus = ShiftBookingTransformService.normalizePaymentStatus(bookingData.paymentStatus);
      console.log('📋 [ShiftBookingService] Estado de pago normalizado:', normalizedPaymentStatus);
      
      // Asegurarnos de que el tipo de reserva sea válido
      const normalizedReservationType = ShiftBookingTransformService.normalizeReservationType(
        bookingData.reservationType || 'shift'
      );
      console.log('📋 [ShiftBookingService] Tipo de reserva normalizado:', normalizedReservationType);
      
      // 2. Convertir los horarios a UTC usando la zona horaria de la sede
      const utcTimes = await this.convertTimesToUTC(
        bookingData.courtId,
        bookingData.date,
        bookingData.startTime,
        bookingData.endTime
      );
      
      if (!utcTimes) {
        console.error('❌ [ShiftBookingService] Error al convertir los horarios a UTC');
        return {
          error: {
            message: 'No se pudieron convertir los horarios a UTC',
            details: 'Error al obtener zona horaria de la sede'
          }
        };
      }
      
      // 3. Preparar los datos para la llamada RPC con horarios en UTC
      const rpcParams = {
        p_court_id: bookingData.courtId,
        p_date: utcTimes.bookingDateUTC,                     // Fecha en UTC
        p_start_time: utcTimes.startTimeUTC,                 // Hora de inicio en UTC
        p_end_time: utcTimes.endTimeUTC,                     // Hora de fin en UTC
        p_court_price: bookingData.courtPrice || 0,
        p_deposit_amount: bookingData.depositAmount || 0,
        p_payment_method: bookingData.paymentMethod || 'cash',
        p_payment_status: normalizedPaymentStatus,
        p_payment_type: normalizedPaymentType,
        p_rental_items: bookingData.rentalItems || options.rentalItems || [],
        p_rental_items_price: bookingData.rentalItemsPrice || options.rentalItemsPrice || 0,
        p_title: bookingData.title || '',
        p_description: bookingData.description || '',
        p_participants: bookingData.participants || [],
        p_empresa_id: options.empresaId,
        p_reservation_type: normalizedReservationType,
        p_class_id: null,                                    // No es una clase
        p_class_session_price: 0,                            // No hay precio de sesión
        p_stripe_payment_method_id: options.stripePaymentMethodId || bookingData.stripe_payment_method_id,
        p_guarantee_percentage: options.guaranteePercentage || bookingData.guaranteePercentage
      };
      
      console.log('📋 [ShiftBookingService] Datos finales para RPC:', JSON.stringify(rpcParams, null, 2));
      
      // 4. Llamar al procedimiento RPC para crear la reserva
      console.log('📋 [ShiftBookingService] Parámetros enviados a RPC create_booking_v2:', JSON.stringify(rpcParams, null, 2));
      
      const { data, error } = await this.supabase.rpc('create_booking_v2', rpcParams);
      
      if (error) {
        console.error('❌ [ShiftBookingService] Error al crear la reserva:', error);
        return {
          error: {
            message: 'Error al crear la reserva',
            details: error.message,
            code: error.code
          }
        };
      }
      
      // Extraer el ID de la reserva creada (si está disponible)
      const bookingId = data && data.length > 0 ? data[0].id : null;
      
      // Registramos si se recibió un ID o no, pero no consideramos un error si no hay ID
      if (!bookingId) {
        console.warn('⚠️ [ShiftBookingService] No se recibió un ID para la reserva creada, pero la operación fue exitosa');
      } else {
        console.log('✅ [ShiftBookingService] Reserva creada exitosamente con ID:', bookingId);
      }
      
      // Devolvemos un resultado exitoso incluso si no hay ID
      return { id: bookingId || 'unknown' };
    } catch (error: any) {
      console.error('❌ [ShiftBookingService] Error inesperado al crear la reserva:', error);
      return {
        error: {
          message: 'Error inesperado al crear la reserva',
          details: error?.message || 'Error desconocido'
        }
      };
    }
  }
}

// Exportar una instancia por defecto para facilitar su uso
export const shiftBookingService = new ShiftBookingService();
