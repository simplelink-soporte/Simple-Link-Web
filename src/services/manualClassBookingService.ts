import { createSupabaseClient } from '@/lib/supabase'
import type {
  BookingCreationData,
  PaymentMethodEnum,
  PaymentStatusEnum,
  PaymentTypeEnum,
  ParticipantRoleEnum
} from '@/types/bookings'
import { v4 as uuidv4 } from 'uuid'
import { DateTime } from 'luxon'
import { ClassBookingTransformService } from './classBookingTransformService'
import { ClassInvoiceService } from './class-invoice.service'

// Definición del participante
export interface Participant {
  id: string
  userId: string
  fullName: string
  email?: string
  role: ParticipantRoleEnum
}

// Definición del resultado de la reserva
export interface BookingResult {
  id?: string
  error?: {
    message: string
    details?: string
    code?: string
  }
}

interface ManualBookingOptions {
  userId: string
  empresaId: string
  classId: string
  sessionId: string
  paymentMethod?: PaymentMethodEnum
  paymentStatus?: PaymentStatusEnum
  depositAmount?: number
  date?: string
  startTime?: string
  endTime?: string
  courtId?: string
  sessionPrice?: number
  classTitle?: string
  branchId?: string
  className?: string
  stripeAccountId?: string
  generateInvoice?: boolean // Nueva opción para controlar si se genera factura
}

export class ManualClassBookingService {
  private supabase = createSupabaseClient()
  private classInvoiceService = new ClassInvoiceService()

  /**
   * Convierte los horarios locales a UTC basado en la zona horaria de la sede
   * @param courtId ID de la pista para obtener la sede y su zona horaria
   * @param date Fecha local
   * @param startTime Hora de inicio local
   * @param endTime Hora de fin local
   * @returns Objeto con la fecha y horarios convertidos a UTC
   */
  private async convertTimesToUTC(
    courtId: string,
    date: string,
    startTime: string,
    endTime: string
  ): Promise<{
    bookingDateUTC: string
    startTimeUTC: string
    endTimeUTC: string
    timezone: string
  } | undefined> {
    try {
      if (!courtId) {
        console.warn('❌ Se requiere una pista válida para la conversión de horarios')
        return undefined
      }

      // Obtener información de la pista para conseguir el branch_id
      const { data: court, error: courtError } = await this.supabase
        .from('courts')
        .select('branch_id')
        .eq('id', courtId)
        .single()

      if (courtError || !court) {
        console.error('❌ Error al obtener información de la pista:', courtError)
        return undefined
      }

      // Obtener la zona horaria de la sede
      const { data: branch, error: branchError } = await this.supabase
        .from('sedes')
        .select('timezone')
        .eq('id', court.branch_id)
        .single()

      if (branchError || !branch) {
        console.error('❌ Error al obtener información de la sede:', branchError)
        return undefined
      }

      // Validar y establecer zona horaria por defecto si es necesario
      const timezone = branch.timezone || 'UTC'
      console.log('✅ Zona horaria de la sede:', timezone)

      // Crear fechas usando Luxon con la zona horaria de la sede
      const localStartDateTime = DateTime.fromFormat(
        `${date} ${startTime}`,
        'yyyy-MM-dd HH:mm',
        { zone: timezone }
      )

      // Verificar si el horario cruza la medianoche
      const isOvernightBooking = parseInt(endTime.split(':')[0]) < parseInt(startTime.split(':')[0])
      
      // Si cruza la medianoche, ajustar la fecha del endDateTime para que sea el día siguiente
      let localEndDateTime: DateTime
      if (isOvernightBooking) {
        // Tomar la fecha del día siguiente para la hora de fin
        const nextDay = DateTime.fromFormat(date, 'yyyy-MM-dd').plus({ days: 1 }).toFormat('yyyy-MM-dd')
        localEndDateTime = DateTime.fromFormat(
          `${nextDay} ${endTime}`,
          'yyyy-MM-dd HH:mm',
          { zone: timezone }
        )
      } else {
        localEndDateTime = DateTime.fromFormat(
          `${date} ${endTime}`,
          'yyyy-MM-dd HH:mm',
          { zone: timezone }
        )
      }

      // Convertir a UTC
      const utcStartDateTime = localStartDateTime.toUTC();
      const utcEndDateTime = localEndDateTime.toUTC();
      
      // Formato completo para timestamp (YYYY-MM-DD HH:MM:SS)
      const startTimeUTC = utcStartDateTime.toSQL({ includeOffset: false });
      const endTimeUTC = utcEndDateTime.toSQL({ includeOffset: false });
      const bookingDateUTC = date; // Usar la fecha original seleccionada por el usuario

      // Verificar si la hora de fin es 00:00:00 o si la hora de fin es menor que la hora de inicio
      // Esto indica que la reserva cruza la medianoche en UTC
      const isOvernightUTC = (endTimeUTC && endTimeUTC.includes('00:00:00')) || 
        (startTimeUTC && endTimeUTC && 
         parseInt(endTimeUTC.split(' ')[1]?.split(':')[0] || '0') < 
         parseInt(startTimeUTC.split(' ')[1]?.split(':')[0] || '0'));
      
      // Ajustar la hora de fin si cruza la medianoche en UTC
      let adjustedEndTimeUTC = endTimeUTC;
      let bookingDateToUse = bookingDateUTC;
      let startDateTimeUTC = startTimeUTC || '';
      let endDateTimeUTC = endTimeUTC || '';
      
      // Si la reserva cruza la medianoche en UTC, necesitamos ajustar:
      if (isOvernightUTC) {
        if (endTimeUTC && endTimeUTC.includes('00:00:00')) {
          // Caso especial para 00:00:00 - simplemente ajustar a un segundo antes
          adjustedEndTimeUTC = utcStartDateTime.set({ hour: 23, minute: 59, second: 59 }).toSQL({ includeOffset: false });
          
          // Crear timestamps completos en UTC
          startDateTimeUTC = startTimeUTC || '';
          endDateTimeUTC = adjustedEndTimeUTC || '';
        } else {
          // Para otros casos donde la hora de fin es después de la medianoche (ej. 00:30:00)
          
          // Ya tenemos timestamps completos, no necesitamos hacer ajustes adicionales
          startDateTimeUTC = startTimeUTC || '';
          endDateTimeUTC = endTimeUTC || '';
        }
      } else {
        // Caso normal - mismo día
        startDateTimeUTC = startTimeUTC || '';
        endDateTimeUTC = endTimeUTC || '';
      }

      // Log para verificar la conversión
      console.log('🕒 Conversión de horarios en manualClassBookingService:', {
        local: {
          date,
          startTime,
          endTime,
          isOvernightBooking,
          timezone,
          localStart: localStartDateTime.toISO(),
          localEnd: localEndDateTime.toISO()
        },
        utc: {
          originalDate: bookingDateUTC,
          adjustedDate: bookingDateToUse,
          startTime: startTimeUTC,
          endTime: endTimeUTC,
          adjustedEndTime: adjustedEndTimeUTC,
          isOvernightUTC,
          fullStartUTC: startDateTimeUTC,
          fullEndUTC: endDateTimeUTC
        }
      })

      return {
        bookingDateUTC: bookingDateUTC, // Usar siempre la fecha original
        startTimeUTC: startDateTimeUTC, // Timestamp completo, asegurar que no sea null
        endTimeUTC: endDateTimeUTC, // Timestamp completo, asegurar que no sea null
        timezone
      }
    } catch (err) {
      console.error('❌ Error en la conversión de horarios:', err)
      return undefined
    }
  }

  /**
   * Crea una reserva manual para un participante en una clase específica
   * @param participant El participante a agregar a la clase
   * @param options Opciones para la reserva manual
   * @returns Resultado de la operación con ID o error
   */
  async createManualBooking(
    participant: Participant,
    options: ManualBookingOptions
  ): Promise<BookingResult> {
    try {
      // Validación de datos mejorada con mensajes más específicos
      if (!participant.userId || !participant.id) {
        console.error('❌ Error: ID de participante no válido', participant);
        return {
          error: {
            message: 'El participante seleccionado no tiene un ID válido',
            details: 'Se requiere un ID válido para crear la reserva',
            code: 'INVALID_PARTICIPANT_ID'
          }
        };
      }

      if (!options.sessionId || !options.classId || !options.courtId || !options.empresaId) {
        const missingFields = [];
        if (!options.sessionId) missingFields.push('sessionId');
        if (!options.classId) missingFields.push('classId');
        if (!options.courtId) missingFields.push('courtId');
        if (!options.empresaId) missingFields.push('empresaId');
        
        console.error('❌ Error: Datos incompletos para la reserva manual', {
          missingFields,
          options
        });
        
        return {
          error: {
            message: 'Datos incompletos para la reserva manual',
            details: `Campos faltantes: ${missingFields.join(', ')}`,
            code: 'MANUAL_BOOKING_INVALID_DATA'
          }
        };
      }

      console.log('📝 Iniciando creación de reserva manual para:', {
        participantName: participant.fullName,
        participantId: participant.userId,
        sessionId: options.sessionId,
        classId: options.classId,
        courtId: options.courtId
      });

      // Obtener información de la clase
      const { data: classData, error: classError } = await this.supabase
        .from('classes')
        .select('*')
        .eq('id', options.classId)
        .single();

      if (classError || !classData) {
        console.error('❌ Error al obtener información de la clase:', classError);
        return {
          error: {
            message: 'No se pudo obtener la información de la clase',
            details: classError?.message || 'La clase no existe o ha sido eliminada',
            code: 'CLASS_NOT_FOUND'
          }
        };
      }

      console.log('✅ Información de clase obtenida:', {
        className: classData.name,
        classId: classData.id
      });

      // Convertir los horarios a UTC
      let bookingDate = options.date || '';
      let startTimeUTC = options.startTime || '';
      let endTimeUTC = options.endTime || '';

      console.log('🕒 Horarios originales:', {
        bookingDate,
        startTime: options.startTime,
        endTime: options.endTime
      });

      if (options.date && options.startTime && options.endTime && options.courtId) {
        console.log('🔄 Convirtiendo horarios a UTC para courtId:', options.courtId);
        
        const converted = await this.convertTimesToUTC(
          options.courtId,
          options.date,
          options.startTime,
          options.endTime
        );

        if (converted) {
          console.log('✅ Conversión de horarios exitosa:', converted);
          bookingDate = converted.bookingDateUTC;
          startTimeUTC = converted.startTimeUTC;
          endTimeUTC = converted.endTimeUTC;
        } else {
          console.warn('⚠️ No se pudieron convertir los horarios a UTC, se usarán los valores originales');
        }
      } else {
        console.warn('⚠️ Datos insuficientes para convertir horarios a UTC:', {
          date: options.date,
          startTime: options.startTime,
          endTime: options.endTime,
          courtId: options.courtId
        });
      }

      // Verificamos que todos los campos requeridos estén presentes
      const requiredFields = [
        { field: 'court_id', value: options.courtId, message: 'ID de la pista' },
        { field: 'date', value: bookingDate, message: 'Fecha de la reserva' },
        { field: 'start_time', value: startTimeUTC, message: 'Hora de inicio' },
        { field: 'end_time', value: endTimeUTC, message: 'Hora de fin' },
        { field: 'empresa_id', value: options.empresaId, message: 'ID de la empresa' }
      ];

      const missingFields = requiredFields.filter(f => !f.value);
      if (missingFields.length > 0) {
        const missingFieldNames = missingFields.map(f => f.message).join(', ');
        console.error('❌ Faltan campos obligatorios para la reserva:', missingFieldNames);
        return {
          error: {
            message: `Faltan campos obligatorios para la reserva: ${missingFieldNames}`,
            details: 'Todos los campos requeridos deben tener un valor válido',
            code: 'MISSING_REQUIRED_FIELDS'
          }
        };
      }

      // Extraer el precio de la clase si está disponible
      let sessionPrice = 0;
      
      // Si tenemos un precio de sesión desde el modal, lo usamos
      if (options.sessionPrice !== undefined && options.sessionPrice !== null) {
        sessionPrice = options.sessionPrice;
        console.log('💰 Usando precio de sesión proporcionado:', sessionPrice);
      }
      // Si no, intentamos extraerlo del schedule_config
      else if (classData.schedule_config && classData.schedule_config.timeSlots) {
        const timeSlots = classData.schedule_config.timeSlots;
        for (const slot of timeSlots) {
          if (slot.startTime === options.startTime && slot.endTime === options.endTime) {
            sessionPrice = slot.price || 0;
            console.log('💰 Precio de sesión extraído de timeSlots:', sessionPrice);
            break;
          }
        }
      }

      if (sessionPrice === 0) {
        console.warn('⚠️ No se encontró un precio específico para la sesión, usando 0 como valor predeterminado');
      }

      // Asegurarnos de que los valores numéricos sean del tipo correcto
      const formattedSessionPrice = parseFloat(sessionPrice.toFixed(2));
      const formattedDepositAmount = parseFloat((options.depositAmount || 0).toFixed(2));
      
      console.log('💰 Precios formateados:', {
        sessionPrice: formattedSessionPrice,
        depositAmount: formattedDepositAmount
      });

      // Asegurarnos de que las fechas y horas estén en el formato correcto
      // Para PostgreSQL, date debe ser 'YYYY-MM-DD' y timestamp debe ser 'YYYY-MM-DD HH:MM:SS'
      // Verificamos que bookingDate tenga el formato correcto
      if (!bookingDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        bookingDate = DateTime.fromISO(bookingDate).toFormat('yyyy-MM-dd');
      }

      // Para los nuevos timestamps completos, ya no necesitamos estos ajustes
      // porque startTimeUTC y endTimeUTC ya están en formato SQL completo

      // Preparar los participantes en el formato esperado por el RPC
      const participants = [{
        // Asegurar que el user_id sea un string (porque luego se hace un cast a UUID en el RPC)
        user_id: participant.userId,
        // Asegurar que role sea uno de los valores válidos del enum participant_role_enum
        role: participant.role || 'player'
      }];

      // Verificar que el user_id tenga formato UUID válido
      if (!participant.userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(participant.userId)) {
        console.error('❌ Error: user_id no tiene formato UUID válido:', participant.userId);
        return {
          error: {
            message: 'ID de usuario inválido',
            details: 'El ID del usuario no tiene un formato UUID válido',
            code: 'INVALID_UUID_FORMAT'
          }
        };
      }

      // Título y descripción de la reserva
      const title = `Reserva manual para clase: ${classData.name}`;
      const description = `Participante: ${participant.fullName}`;

      // Normalizar el tipo de pago utilizando el mismo servicio que usa classBookingService
      // Esto garantiza que usemos un valor válido para el enum payment_type
      const paymentType = ClassBookingTransformService.normalizePaymentType('booking');
      
      console.log('💳 Tipo de pago normalizado:', paymentType);

      // Validación adicional para los tipos de datos
      // Asegurar que los parámetros UUID sean strings válidos
      if (!options.courtId || !options.empresaId || !options.classId) {
        console.error('❌ Error: UUIDs invalidos:', {
          courtId: options.courtId,
          empresaId: options.empresaId,
          classId: options.classId
        });
        return {
          error: {
            message: 'Datos de identificación inválidos',
            details: 'Los IDs de pista, empresa o clase no son válidos',
            code: 'INVALID_UUID_FORMAT'
          }
        };
      }

      // Validar formato de fecha y horas
      if (!bookingDate || !startTimeUTC || !endTimeUTC) {
        console.error('❌ Error: Datos de fecha/hora inválidos:', {
          date: bookingDate,
          startTime: startTimeUTC,
          endTime: endTimeUTC
        });
        return {
          error: {
            message: 'Datos de fecha u hora inválidos',
            details: 'La fecha, hora de inicio o hora de fin no tienen un formato válido',
            code: 'INVALID_DATETIME_FORMAT'
          }
        };
      }
      
      // Validar que los participantes tengan user_id válido
      if (participants.length === 0 || !participants[0].user_id) {
        console.error('❌ Error: Datos de participante inválidos:', participants);
        return {
          error: {
            message: 'Datos de participante inválidos',
            details: 'El participante debe tener un ID de usuario válido',
            code: 'INVALID_PARTICIPANT_DATA'
          }
        };
      }

      // Log detallado para debugging
      console.log('Datos para crear reserva manual mediante RPC:', {
        p_court_id: options.courtId,
        p_date: bookingDate,
        p_start_time: startTimeUTC,
        p_end_time: endTimeUTC,
        p_court_price: 0,
        p_deposit_amount: formattedDepositAmount,
        p_payment_method: options.paymentMethod || 'cash',
        p_payment_status: options.paymentStatus || 'pending',
        p_payment_type: paymentType,
        p_rental_items: [],
        p_rental_items_price: 0,
        p_title: title,
        p_description: description,
        p_participants: participants,
        p_empresa_id: options.empresaId,
        p_stripe_payment_method_id: null,
        p_reservation_type: 'class',
        p_class_id: options.classId,
        p_class_session_price: formattedSessionPrice
      });

      // Llamar al RPC para crear la reserva (siguiendo exactamente el orden de la definición del RPC)
      const { data: bookingId, error: bookingError } = await this.supabase.rpc('create_booking_v2', {
        p_court_id: options.courtId,
        p_date: bookingDate,
        p_start_time: startTimeUTC,
        p_end_time: endTimeUTC,
        p_court_price: 0, // Las reservas de clase normalmente no tienen precio de pista específico
        p_rental_items_price: 0, // No hay items rentados en reservas manuales de clase
        p_payment_method: options.paymentMethod || 'cash',
        p_payment_status: options.paymentStatus || 'pending',
        p_payment_type: paymentType,
        p_deposit_amount: formattedDepositAmount,
        p_title: title,
        p_description: description,
        p_participants: participants,
        p_rental_items: [],
        p_empresa_id: options.empresaId,
        p_stripe_payment_method_id: null, // Parámetro opcional pero requerido
        p_reservation_type: 'class',
        p_class_id: options.classId,
        p_class_session_price: formattedSessionPrice
      });

      if (bookingError) {
        // Imprimir error completo para depuración
        console.error('❌ Error detallado al crear la reserva manual:', JSON.stringify(bookingError, null, 2));
        
        // Extraer los detalles completos del error PostgreSQL
        const pgError = bookingError.message || '';
        
        // Mejorar la detección de errores específicos
        let errorMessage = 'Error al crear la reserva manual';
        let errorDetails = bookingError.message || 'Error desconocido';
        let errorCode = 'MANUAL_BOOKING_CREATION_FAILED';
        
        // Verificar si el mensaje contiene JSON con más detalles (a veces ocurre)
        try {
          // Intentar extraer un objeto JSON del mensaje de error
          const jsonMatch = pgError.match(/\{.*\}/);
          if (jsonMatch) {
            const jsonError = JSON.parse(jsonMatch[0]);
            if (jsonError.detail) {
              errorDetails = jsonError.detail;
            }
            if (jsonError.hint) {
              errorDetails += ` (Sugerencia: ${jsonError.hint})`;
            }
            if (jsonError.code) {
              errorCode = `PG_${jsonError.code}`;
            }
          }
        } catch (e) {
          // Si no se puede parsear JSON, continuar con el manejo normal
          console.log('No se pudo extraer JSON del error:', e);
        }
        
        // Patrones de error comunes (ampliados para cubrir más casos)
        if (pgError.includes('violates foreign key constraint')) {
          if (pgError.includes('bookings_court_id_fkey')) {
            errorMessage = 'La pista seleccionada no existe o no está disponible';
            errorCode = 'INVALID_COURT';
          } else if (pgError.includes('bookings_class_id_fkey')) {
            errorMessage = 'La clase seleccionada no existe o no está disponible';
            errorCode = 'INVALID_CLASS';
          } else if (pgError.includes('bookings_empresa_id_fkey')) {
            errorMessage = 'La empresa seleccionada no existe o no está disponible';
            errorCode = 'INVALID_EMPRESA';
          } else if (pgError.includes('booking_participants_user_id_fkey')) {
            errorMessage = 'Uno o más participantes no existen en el sistema';
            errorCode = 'INVALID_PARTICIPANT';
          }
        } else if (pgError.includes('Ya existe una reserva')) {
          errorMessage = 'Ya existe una reserva para este horario';
          errorCode = 'BOOKING_OVERLAP';
        } else if (pgError.includes('not-null constraint')) {
          // Extraer el nombre de la columna null
          const columnMatch = pgError.match(/column "([^"]+)"/);
          const columnName = columnMatch ? columnMatch[1] : 'desconocida';
          errorMessage = `El campo "${columnName}" es obligatorio`;
          errorCode = 'MISSING_REQUIRED_FIELD';
        } else if (pgError.includes('invalid input syntax')) {
          if (pgError.includes('for type uuid')) {
            errorMessage = 'Formato de UUID inválido';
            errorCode = 'INVALID_UUID';
          } else if (pgError.includes('for type numeric')) {
            errorMessage = 'Formato de valor numérico inválido';
            errorCode = 'INVALID_NUMERIC';
          } else if (pgError.includes('for type timestamp')) {
            errorMessage = 'Formato de fecha/hora inválido';
            errorCode = 'INVALID_TIMESTAMP';
          } else {
            errorMessage = 'Formato de datos inválido';
            errorCode = 'INVALID_DATA_FORMAT';
          }
        } else if (pgError.includes('permission denied')) {
          errorMessage = 'No tienes permisos para crear reservas';
          errorCode = 'PERMISSION_DENIED';
        } else if (pgError.includes('value too long')) {
          errorMessage = 'Uno de los valores es demasiado largo';
          errorCode = 'VALUE_TOO_LONG';
        } else if (pgError.includes('invalid enum value') || pgError.includes('invalid input value for enum')) {
          // Extraer la información sobre el enum del error
          const enumMatch = pgError.match(/invalid\s+(?:input\s+value\s+for\s+enum|enum\s+value)\s+"?([^"]+)"?\s+(?:for\s+enum\s+"?([^"]+)"?)?/i);
          if (enumMatch) {
            const [_, value, enumType] = enumMatch;
            const enumName = enumType || 'desconocido';
            
            // Si es un error de payment_type, proporcionar valores válidos
            if (pgError.includes('payment_type')) {
              errorMessage = `Valor inválido "${value}" para payment_type. Valores válidos: 'booking', 'deposit', 'remaining', 'guarantee', 'no_show_charge'`;
              errorCode = 'INVALID_PAYMENT_TYPE';
            } else {
              errorMessage = `Valor inválido "${value}" para el tipo enum "${enumName}"`;
              errorCode = 'INVALID_ENUM_VALUE';
            }
          } else {
            errorMessage = 'Valor de enumeración inválido';
            errorCode = 'INVALID_ENUM_VALUE';
          }
        }
        
        // Loguear error con más detalle para facilitar depuración
        console.error(`❌ Error RPC (${errorCode}): ${errorMessage}`, {
          details: errorDetails,
          participantId: participant.id,
          classId: options.classId,
          sessionId: options.sessionId,
          courtId: options.courtId,
          // Información adicional del error para depuración
          errorObject: bookingError,
          errorMessage: pgError
        });
        
        return {
          error: {
            message: errorMessage,
            details: errorDetails,
            code: errorCode
          }
        };
      }

      console.log('✅ Reserva manual creada exitosamente:', bookingId);
      
      // Verificar si se debe generar factura
      if (options.generateInvoice !== false) {
        try {
          // Utilizar el título de clase proporcionado directamente en las opciones
          const sessionTitle = options.classTitle || 'Clase';
          const formattedDate = options.date ? new Date(options.date).toLocaleDateString() : '';
          
          // Determinar tipo de pago
          const isDeposit = !!options.depositAmount;
          const depositPercentage = options.depositAmount 
            ? Math.round((options.depositAmount / (options.sessionPrice || 1)) * 100) 
            : 0;

          // Obtener la conexión Stripe del club si no se proporciona en las opciones
          let stripeAccountId = options.stripeAccountId;
          if (!stripeAccountId) {
            try {
              const { data: connection } = await this.supabase
                .from('stripe_connections')
                .select('stripe_account_id')
                .eq('empresa_id', options.empresaId)
                .single();
              
              if (connection?.stripe_account_id) {
                stripeAccountId = connection.stripe_account_id;
                console.log('✅ Conexión Stripe encontrada para empresa:', stripeAccountId);
              } else {
                console.error('⚠️ No se encontró cuenta Stripe para la empresa:', options.empresaId);
              }
            } catch (stripeConnError) {
              console.error('❌ Error al obtener cuenta Stripe:', stripeConnError);
            }
          }

          // Obtener el país de la empresa para establecer la moneda correcta
          let country = null;
          try {
            const { data: empresaData } = await this.supabase
              .from('empresas')
              .select('country')
              .eq('id', options.empresaId)
              .single();
            
            if (empresaData?.country) {
              country = empresaData.country;
              console.log('🌎 País de la empresa detectado:', country);
            }
          } catch (countryError) {
            console.error('⚠️ Error al obtener el país de la empresa:', countryError);
            // Continuar sin país, se usará EUR por defecto
          }
          
          // Verificar que tengamos una cuenta Stripe antes de intentar crear la factura
          if (!stripeAccountId) {
            console.error('❌ No se puede generar factura: falta la cuenta de Stripe');
            // Continuar sin generar factura
            return { id: bookingId };
          }

          // Crear la factura
          console.log('📋 Generando factura para la reserva de clase:', {
            bookingId,
            sessionTitle,
            paymentMethod: options.paymentMethod,
            paymentStatus: options.paymentStatus,
            isDeposit,
            stripeAccountId, // Log de la cuenta Stripe que se usará
            country // Log del país detectado
          });
          
          const invoiceData = {
            customerId: participant.userId,
            amount: isDeposit ? options.depositAmount || 0 : options.sessionPrice || 0,
            // Añadir prefijo de Seña en la descripción visible para el cliente
            description: isDeposit 
              ? `Seña (${depositPercentage}%): ${sessionTitle}${formattedDate ? ` - ${formattedDate}` : ''}` 
              : `${sessionTitle}${formattedDate ? ` - ${formattedDate}` : ''}`,
            // Añadir información completa del cliente para evitar consultas adicionales
            customerEmail: participant.email,
            customerName: participant.fullName,
            // Pasar parámetro de tipo de pago explícitamente
            paymentType: isDeposit ? 'deposit' as const : 'full' as const,
            empresaId: options.empresaId, // Asegurar que se pasa el empresaId
            metadata: {
              resource_type: 'class',
              is_class_booking: 'true',
              booking_type: 'class',
              deposit_percentage: isDeposit ? depositPercentage.toString() : '',
              // Usar el mismo formato que en las facturas del formulario
              payment_description: isDeposit 
                ? `Seña (${depositPercentage}%)` 
                : 'Pago completo',
              payment_type: isDeposit ? 'deposit' : 'full',
              booking_id: bookingId,
              class_id: options.classId,
              session_id: options.sessionId,
              // Añadir país explícitamente en los metadatos para determinar la moneda
              country: country || '',
              empresa_id: options.empresaId
            },
            stripeAccountId // Añadir cuenta Stripe del club
          };
          
          const invoiceResult = await this.classInvoiceService.createInvoice(invoiceData);
          
          if (invoiceResult.success) {
            console.log('✅ Factura generada exitosamente:', invoiceResult.invoiceId);
          } else {
            console.error('⚠️ Error al generar factura:', invoiceResult.error);
            // No bloqueamos la creación de reserva por error en factura
          }
        } catch (invoiceError) {
          console.error('⚠️ Error al intentar generar factura:', invoiceError);
          // No bloqueamos la creación de reserva por error en factura
        }
      }
      
      return {
        id: bookingId
      }
    } catch (err) {
      console.error('Error inesperado en la reserva manual:', err)
      return {
        error: {
          message: 'Error inesperado al procesar la reserva manual',
          details: err instanceof Error ? err.message : String(err),
          code: 'UNEXPECTED_ERROR'
        }
      }
    }
  }

  /**
   * Verifica disponibilidad de espacio en una sesión de clase
   * @param sessionId ID de la sesión de clase
   * @returns Información sobre la disponibilidad
   */
  async checkSessionAvailability(sessionId: string): Promise<{
    available: boolean
    availableSpots: number
    totalCapacity: number
    error?: string
  }> {
    try {
      // Extraer el ID de la clase y el courtId del sessionId compuesto
      // El formato esperado es {classId}-{courtId}-{startTime}-{endTime}
      const parts = sessionId.split('-');
      if (parts.length < 2) {
        return {
          available: false,
          availableSpots: 0,
          totalCapacity: 0,
          error: 'Formato de sessionId inválido'
        };
      }

      const classId = parts[0];
      
      // Obtener la información de la clase
      const { data: classData, error: classError } = await this.supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single();

      if (classError || !classData) {
        return {
          available: false,
          availableSpots: 0,
          totalCapacity: 0,
          error: classError?.message || 'No se encontró la clase'
        };
      }

      // Buscar el slot de tiempo correspondiente
      let timeSlot = null;
      if (classData.schedule_config && classData.schedule_config.timeSlots) {
        // Reconstruir startTime y endTime del sessionId
        const startTimeIndex = 2;
        const startTime = parts.length > startTimeIndex ? parts[startTimeIndex] : '';
        
        for (const slot of classData.schedule_config.timeSlots) {
          if (slot.startTime === startTime) {
            timeSlot = slot;
            break;
          }
        }
      }

      if (!timeSlot) {
        return {
          available: false,
          availableSpots: 0,
          totalCapacity: 0,
          error: 'No se encontró el horario en la clase'
        };
      }

      // Contar cuántas reservas existen para esta clase y sesión
      const { count, error: countError } = await this.supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', classId)
        .eq('start_time', timeSlot.startTime)
        .eq('end_time', timeSlot.endTime);

      if (countError) {
        return {
          available: false,
          availableSpots: 0,
          totalCapacity: 0,
          error: countError.message
        };
      }

      const totalCapacity = timeSlot.capacity || 0;
      const bookedSpots = count || 0;
      const availableSpots = Math.max(0, totalCapacity - bookedSpots);

      return {
        available: availableSpots > 0,
        availableSpots,
        totalCapacity
      };
    } catch (err) {
      return {
        available: false,
        availableSpots: 0,
        totalCapacity: 0,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }
}