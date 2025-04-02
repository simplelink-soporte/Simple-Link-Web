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
import { StripeInvoiceService } from './stripe-invoice.service'; // Importamos el servicio de facturas

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
  generateInvoice?: boolean;
}

/**
 * Clase que implementa el servicio de reservas de turnos
 */
export class ShiftBookingService {
  private supabase = createSupabaseClient();
  private invoiceService = new StripeInvoiceService();

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
      
      // Generar factura después de crear la reserva
      // Solo intentamos generar factura si está habilitada la opción y no es un pago con tarjeta online,
      // ya que esos pagos generan factura automáticamente durante el proceso de pago
      if (options.generateInvoice !== false && options.paymentType !== 'deposit' && options.paymentMethod !== 'card') {
        const invoiceResult = await this.generateInvoice(bookingId, bookingData, options);
        
        if (invoiceResult.error) {
          console.warn('⚠️ [ShiftBookingService] Error al generar la factura, pero la reserva se creó correctamente:', invoiceResult.error);
          // No fallamos la creación de reserva por error en factura
        }
      } else {
        if (options.generateInvoice === false) {
          console.log('ℹ️ [ShiftBookingService] Generación de factura deshabilitada por el usuario');
        } else {
          console.log('ℹ️ [ShiftBookingService] Omitiendo generación de factura para pago con tarjeta/seña, ya que se generó durante el procesamiento del pago');
        }
      }
      
      // Devolvemos un resultado exitoso incluso si hay error en factura
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

  /**
   * Genera una factura para la reserva creada
   * 
   * @param bookingId - ID de la reserva
   * @param bookingData - Datos de la reserva
   * @param options - Opciones adicionales
   * @returns Resultado de la generación de la factura
   */
  async generateInvoice(
    bookingId: string | null,
    bookingData: BookingCreationData,
    options: BookingOptions
  ): Promise<{ error?: { message: string; code?: string } }> {
    try {
      if (!bookingId) {
        console.error('❌ [ShiftBookingService] No se puede generar una factura sin un ID de reserva');
        return { error: { message: 'No se puede generar una factura sin un ID de reserva' } };
      }

      // Obtener información necesaria (court name, email) para la factura
      const { data: courtDetails, error: courtDetailsError } = await this.supabase
        .from('courts')
        .select('name, branch_id, sedes:branch_id(id, name, empresa_id)')
        .eq('id', bookingData.courtId)
        .single();
        
      if (courtDetailsError || !courtDetails) {
        console.error('❌ [ShiftBookingService] Error al obtener detalles de la cancha para factura:', courtDetailsError);
        return { error: { message: 'No se pudieron obtener detalles de la cancha para la factura' } };
      }

      // Obtener información del usuario para la factura (email)
      const { data: userDetails, error: userDetailsError } = await this.supabase
        .from('users')
        .select('email, user_metadata')
        .eq('id', options.userId)
        .single();
        
      if (userDetailsError || !userDetails || !userDetails.email) {
        console.error('❌ [ShiftBookingService] Error al obtener detalles del usuario para factura:', userDetailsError);
        return { error: { message: 'No se pudieron obtener detalles del usuario para la factura' } };
      }

      // Obtener la conexión de Stripe para esta empresa desde la tabla stripe_connections
      const { data: stripeConnection, error: stripeConnectionError } = await this.supabase
        .from('stripe_connections')
        .select('stripe_account_id')
        .eq('empresa_id', options.empresaId)
        .single();
            
      if (stripeConnectionError || !stripeConnection || !stripeConnection.stripe_account_id) {
        console.error('❌ [ShiftBookingService] Error al obtener cuenta Stripe de la empresa:', stripeConnectionError || 'No se encontró conexión de Stripe');
        return { error: { message: 'No se pudo obtener la configuración de Stripe para la factura' } };
      }

      // Construir el nombre del cliente a partir de los metadatos o usar el email como alternativa
      const userName = userDetails.user_metadata?.name || 
                      (userDetails.user_metadata?.first_name && userDetails.user_metadata?.last_name 
                        ? `${userDetails.user_metadata.first_name} ${userDetails.user_metadata.last_name}`
                        : userDetails.email);

      // Generar el customer ID de Stripe si es necesario
      let stripeCustomerId = options.stripePaymentMethodId 
                           ? (await this.findOrCreateStripeCustomer({
                              email: userDetails.email,
                              name: userName,
                              empresaId: options.empresaId
                             }))?.id 
                           : undefined;

      // Determinar el monto a facturar según el tipo de pago
      let amount = bookingData.courtPrice + (bookingData.rentalItemsPrice || 0);
      let description = `Reserva: ${courtDetails.name || 'Cancha'}`;
      
      // Parámetros adicionales para indicar si es pago parcial o completo
      let paymentType: 'booking' | 'deposit' = 'booking';
      let isPartialPayment = false;
      
      // Si es un pago con seña, ajustar el monto y la descripción
      if (bookingData.paymentType === 'deposit') {
        amount = bookingData.depositAmount || 0;
        description = `Seña para reserva: ${courtDetails.name || 'Cancha'}`;
        paymentType = 'deposit';
        isPartialPayment = true;
        
        console.log('💵 [ShiftBookingService] Generando factura por pago de SEÑA:', {
          fullAmount: bookingData.courtPrice + (bookingData.rentalItemsPrice || 0),
          depositAmount: amount,
          isPartialPayment: true
        });
      } else {
        console.log('💵 [ShiftBookingService] Generando factura por pago COMPLETO:', {
          amount: amount,
          isPartialPayment: false
        });
      }
      
      // Ahora crear la factura utilizando el servicio existente
      const invoiceResult = await this.invoiceService.createManualBookingInvoice({
        stripeAccountId: stripeConnection.stripe_account_id,
        customerId: stripeCustomerId,
        customerEmail: userDetails.email,
        customerName: userName,
        amount: amount,
        description: description,
        bookingId: bookingId,
        empresaId: options.empresaId,
        courtId: bookingData.courtId,
        branchId: courtDetails.branch_id,
        paymentType: paymentType,
        isPartialPayment: isPartialPayment,
        totalAmount: bookingData.courtPrice + (bookingData.rentalItemsPrice || 0)
      });
      
      if (!invoiceResult.success) {
        console.error('❌ [ShiftBookingService] Error al generar factura para reserva:', invoiceResult.error);
        return { error: { message: 'Error al generar factura', code: invoiceResult.error?.code } };
      }
      
      console.log('✅ [ShiftBookingService] Factura generada exitosamente:', {
        invoiceId: invoiceResult.invoiceId,
        invoiceUrl: invoiceResult.invoiceUrl || null
      });
      
      return {};
    } catch (error: any) {
      console.error('❌ [ShiftBookingService] Error inesperado al generar la factura:', error);
      return { error: { message: 'Error inesperado al generar la factura', code: error?.code } };
    }
  }

  /**
   * Busca o crea un cliente en Stripe para generar la factura
   */
  private async findOrCreateStripeCustomer({
    email,
    name,
    empresaId
  }: {
    email: string;
    name: string;
    empresaId?: string;
  }): Promise<{id: string} | null> {
    try {
      console.log('🔍 [ShiftBookingService] Buscando cliente de Stripe por email:', email);
      
      // Primero, intentar encontrar la conexión de Stripe para esta empresa
      const { data: stripeConnection, error: stripeConnectionError } = await this.supabase
        .from('stripe_connections')
        .select('stripe_account_id')
        .eq('empresa_id', empresaId)
        .single();
      
      if (stripeConnectionError || !stripeConnection) {
        console.error('❌ [ShiftBookingService] No se encontró la conexión de Stripe para la empresa:', empresaId);
        return null;
      }
      
      // Luego, verificar si ya existe un cliente de Stripe para este email
      const { data: stripeCustomers, error: customerError } = await this.supabase
        .from('stripe_customers')
        .select('customer_id')
        .eq('email', email)
        .eq('empresa_id', empresaId)
        .maybeSingle();
      
      if (customerError) {
        console.error('❌ [ShiftBookingService] Error al buscar cliente de Stripe:', customerError);
        return null;
      }
      
      // Si ya existe, devolver su ID
      if (stripeCustomers?.customer_id) {
        console.log('✅ [ShiftBookingService] Cliente de Stripe encontrado:', stripeCustomers.customer_id);
        return { id: stripeCustomers.customer_id };
      }
      
      // Si no existe, crear un nuevo cliente en Stripe usando RPC
      console.log('➕ [ShiftBookingService] Creando nuevo cliente de Stripe para:', email);
      
      // Formatear el nombre del cliente
      const customerName = name || email.split('@')[0];
      
      // Utilizar una RPC personalizada para crear el cliente
      const { data: newCustomer, error: createError } = await this.supabase.rpc(
        'create_stripe_customer',
        {
          p_email: email,
          p_name: customerName,
          p_stripe_account_id: stripeConnection.stripe_account_id,
          p_empresa_id: empresaId
        }
      );
      
      if (createError || !newCustomer || !newCustomer.customer_id) {
        console.error('❌ [ShiftBookingService] Error al crear cliente de Stripe mediante RPC:', createError || 'Respuesta sin customer_id');
        return null;
      }
      
      console.log('✅ [ShiftBookingService] Cliente de Stripe creado exitosamente:', newCustomer.customer_id);
      return { id: newCustomer.customer_id };
    } catch (error) {
      console.error('❌ [ShiftBookingService] Error al buscar o crear cliente de Stripe:', error);
      return null;
    }
  }
}

// Exportar una instancia por defecto para facilitar su uso
export const shiftBookingService = new ShiftBookingService();
