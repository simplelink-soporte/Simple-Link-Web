import { createSupabaseClient } from '@/lib/supabase'
import type { ParticipantRoleEnum } from '@/types/bookings'
import { DateTime } from 'luxon'

// Detalles de la reserva
export interface BookingDetails {
  id: string
  date: string
  start_time: string
  end_time: string
  total_price: number
  deposit_amount: number
  payment_status: string
  payment_method: string
  payment_type?: string  // Tipo de pago (normal, guarantee)
  court_price: number
  rental_items_price: number
  class_session_price: number
  cancelled_at?: string
  cancellation_reason?: string
  title?: string
  description?: string
}

// Definición del participante
export interface ClassParticipant {
  id: string
  userId: string
  fullName: string
  email?: string
  phone?: string
  role: ParticipantRoleEnum
  bookingId?: string
  bookingDetails?: BookingDetails
}

// Interfaz para los datos que devuelve Supabase
interface ParticipantRecord {
  id: string
  user_id: string
  role: string
  booking_id: string
  usuarios: {
    id: string
    first_name: string
    last_name: string
    email: string
    phone: string
  } | null
}

/**
 * Obtiene la zona horaria de una sede
 * @param branchId - ID de la sede
 * @returns La zona horaria de la sede o 'UTC' por defecto
 */
async function getBranchTimezone(branchId?: string): Promise<string> {
  if (!branchId) return 'UTC';
  
  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from('sedes')
      .select('timezone')
      .eq('id', branchId)
      .single();
    
    if (error || !data) {
      console.error('❌ Error al obtener zona horaria de la sede:', error);
      return 'UTC';
    }
    
    return data.timezone || 'UTC';
  } catch (error) {
    console.error('❌ Error inesperado al obtener zona horaria:', error);
    return 'UTC';
  }
}

/**
 * Convierte horarios locales a UTC para consultas
 * @param timezone - Zona horaria de origen
 * @param date - Fecha en formato local
 * @param startTime - Hora de inicio local
 * @param endTime - Hora de fin local
 * @returns Horarios convertidos a UTC
 */
function convertToUTC(timezone: string, date: string, startTime?: string, endTime?: string) {
  // Si no hay horarios, retornar valores por defecto
  if (!startTime && !endTime) {
    return {
      startTimeUTC: undefined,
      endTimeUTC: undefined
    };
  }
  
  let startTimeUTC: string | undefined;
  let endTimeUTC: string | undefined;
  
  // Convertir hora de inicio a UTC si está presente
  if (startTime) {
    const localStartDateTime = DateTime.fromFormat(
      `${date} ${startTime}`, 
      'yyyy-MM-dd HH:mm',
      { zone: timezone }
    );
    
    // Verificar que la conversión sea válida
    if (localStartDateTime.isValid) {
      // Convertir a UTC y formatear como timestamp completo en formato PostgreSQL
      startTimeUTC = localStartDateTime.toUTC().toSQL({ includeOffset: false });
      console.log(`🕒 Hora de inicio convertida: ${startTime} (${timezone}) → ${startTimeUTC} (UTC)`);
    } else {
      console.error('❌ Error al convertir hora de inicio a UTC:', localStartDateTime.invalidReason);
    }
  }
  
  // Convertir hora de fin a UTC si está presente
  if (endTime) {
    const localEndDateTime = DateTime.fromFormat(
      `${date} ${endTime}`, 
      'yyyy-MM-dd HH:mm',
      { zone: timezone }
    );
    
    // Verificar que la conversión sea válida
    if (localEndDateTime.isValid) {
      // Convertir a UTC y formatear como timestamp completo en formato PostgreSQL
      endTimeUTC = localEndDateTime.toUTC().toSQL({ includeOffset: false });
      console.log(`🕒 Hora de fin convertida: ${endTime} (${timezone}) → ${endTimeUTC} (UTC)`);
    } else {
      console.error('❌ Error al convertir hora de fin a UTC:', localEndDateTime.invalidReason);
    }
  }
  
  return {
    startTimeUTC,
    endTimeUTC
  };
}

export class ClassParticipantService {
  private supabase = createSupabaseClient()

  /**
   * Obtiene los participantes de una clase específica o sesión específica
   * @param classId ID de la clase
   * @param options Opciones para filtrar participantes (fecha, hora)
   * @returns Lista de participantes de la clase o sesión
   */
  async getClassParticipants(
    classId: string, 
    options?: {
      date?: string,
      startTime?: string,
      endTime?: string,
      branchId?: string
    }
  ): Promise<ClassParticipant[]> {
    try {
      console.log('🔍 Buscando participantes para la clase:', classId, options ? 'con filtros' : 'sin filtros');

      if (!classId) {
        console.warn('❌ ClassId no proporcionado');
        return [];
      }
      
      // Obtener la zona horaria de la sede para hacer conversiones
      const timezone = await getBranchTimezone(options?.branchId);
      console.log(`🌐 Zona horaria de la sede: ${timezone}`);
      
      // Construir la consulta base para las reservas
      let query = this.supabase
        .from('bookings')
        .select(`
          id, 
          title, 
          description, 
          date,
          start_time,
          end_time,
          total_price,
          deposit_amount,
          court_price,
          rental_items_price,
          class_session_price,
          payment_status,
          payment_method,
          payment_type,
          reservation_type,
          cancelled_at,
          cancellation_reason
        `)
        .eq('class_id', classId)
        .eq('reservation_type', 'class')
        .is('cancelled_at', null);

      // Aplicar filtros adicionales si se proporcionan
      if (options?.date) {
        console.log('📅 Filtrando por fecha:', options.date);
        query = query.eq('date', options.date);
      }

      // Si hay horarios, convertirlos a UTC para las consultas
      if (options?.startTime || options?.endTime) {
        const { startTimeUTC, endTimeUTC } = convertToUTC(
          timezone, 
          options?.date || new Date().toISOString().split('T')[0],
          options?.startTime,
          options?.endTime
        );
        
        // Si se proporciona startTime y endTime, filtrar por el rango horario exacto
        if (startTimeUTC && endTimeUTC) {
          console.log('⏰ Filtrando por horario UTC:', startTimeUTC, '-', endTimeUTC);
          query = query.eq('start_time', startTimeUTC).eq('end_time', endTimeUTC);
        }
        // Si solo se proporciona startTime, filtrar por ese horario de inicio
        else if (startTimeUTC) {
          console.log('⏰ Filtrando por horario de inicio UTC:', startTimeUTC);
          query = query.eq('start_time', startTimeUTC);
        }
        // Si solo se proporciona endTime, filtrar por ese horario de fin
        else if (endTimeUTC) {
          console.log('⏰ Filtrando por horario de fin UTC:', endTimeUTC);
          query = query.eq('end_time', endTimeUTC);
        }
      }

      // Ejecutar la consulta
      const { data: bookings, error: bookingsError } = await query;

      if (bookingsError) {
        console.error('❌ Error al obtener reservas de la clase:', bookingsError);
        return [];
      }

      // Agregar detalle de cada reserva encontrada para depuración
      if (bookings && bookings.length > 0) {
        console.log(`✅ Se encontraron ${bookings.length} reservas para la clase ${classId}:`);
        bookings.forEach((booking, index) => {
          console.log(`   Reserva ${index + 1}:`, {
            id: booking.id,
            date: booking.date,
            startTime: booking.start_time,
            endTime: booking.end_time
          });
        });
      }

      if (!bookings || bookings.length === 0) {
        const filterDescription = options ? 
          `con filtros: ${options.date ? 'fecha=' + options.date + ', ' : ''}${options.startTime ? 'inicio=' + options.startTime + ', ' : ''}${options.endTime ? 'fin=' + options.endTime : ''}` : 
          'sin filtros';
        console.log(`⚠️ No se encontraron reservas para la clase: ${classId} ${filterDescription}`);
        
        // Intentar realizar una consulta sin filtros de hora para debug
        if (options?.startTime || options?.endTime) {
          console.log('🔍 Realizando consulta sin filtros de hora para debug...');
          const { data: allBookings } = await this.supabase
            .from('bookings')
            .select('id, date, start_time, end_time')
            .eq('class_id', classId)
            .eq('reservation_type', 'class')
            .is('cancelled_at', null);
            
          if (allBookings && allBookings.length > 0) {
            console.log(`🔍 Se encontraron ${allBookings.length} reservas para la clase ${classId} sin filtrar por hora:`);
            allBookings.forEach((booking, index) => {
              console.log(`   Reserva ${index + 1}:`, {
                id: booking.id,
                date: booking.date,
                startTime: booking.start_time,
                endTime: booking.end_time
              });
            });
          } else {
            console.log('🔍 No hay reservas para esta clase incluso sin filtrar por hora');
          }
        }
        
        return [];
      }

      console.log(`✅ Se encontraron ${bookings.length} reservas para la clase:`, bookings.map(b => b.id));

      // Creamos un mapa de reservas para acceder rápidamente
      const bookingsMap = new Map<string, BookingDetails>();
      bookings.forEach(booking => {
        bookingsMap.set(booking.id, {
          id: booking.id,
          date: booking.date,
          start_time: booking.start_time,
          end_time: booking.end_time,
          total_price: booking.total_price,
          deposit_amount: booking.deposit_amount,
          payment_status: booking.payment_status,
          payment_method: booking.payment_method,
          payment_type: booking.payment_type, // Agregamos payment_type
          court_price: booking.court_price,
          rental_items_price: booking.rental_items_price,
          class_session_price: booking.class_session_price,
          cancelled_at: booking.cancelled_at,
          cancellation_reason: booking.cancellation_reason,
          title: booking.title,
          description: booking.description
        });
      });

      // 2. Obtener todos los participantes de esas reservas
      // Extraemos los IDs de las reservas para usarlos en la próxima consulta
      const bookingIds = bookings.map(booking => booking.id);
      
      // Esta es una consulta unida que obtiene los participantes y su información de usuario
      // Ajustamos los campos para que coincidan con la estructura real de la tabla usuarios
      const { data: participants, error: participantsError } = await this.supabase
        .from('booking_participants')
        .select(`
          id,
          booking_id,
          user_id,
          role,
          usuarios:user_id (
            id,
            nombre,
            email,
            telefono
          )
        `)
        .in('booking_id', bookingIds);

      if (participantsError) {
        console.error('❌ Error al obtener participantes:', participantsError);
        return [];
      }

      console.log(`✅ Se encontraron ${participants?.length || 0} participantes para las reservas`);

      if (!participants || participants.length === 0) {
        console.log('⚠️ No se encontraron participantes para las reservas:', bookingIds);
        return [];
      }

      // 3. Transformar los datos a nuestro formato
      const formattedParticipants: ClassParticipant[] = participants.map(p => {
        // Convertimos el registro a un formato conocido, con los campos correctos
        const participant = p as unknown as {
          id: string;
          booking_id: string;
          user_id: string;
          role: string;
          usuarios: {
            id: string;
            nombre: string;
            email: string;
            telefono: string;
          } | null;
        };
        
        // Si no hay información de usuario, proporcionamos valores por defecto
        const user = participant.usuarios || {
          id: '',
          nombre: '',
          email: '',
          telefono: ''
        };

        // Obtenemos detalles de la reserva
        const bookingDetails = bookingsMap.get(participant.booking_id);

        return {
          id: participant.id,
          userId: participant.user_id,
          bookingId: participant.booking_id,
          fullName: user.nombre || 'Usuario sin nombre', // Usamos el campo nombre directamente
          email: user.email,
          phone: user.telefono, // Usamos telefono en lugar de phone
          role: participant.role as ParticipantRoleEnum,
          bookingDetails // Añadimos los detalles de la reserva
        };
      });

      return formattedParticipants;
    } catch (error) {
      console.error('❌ Error al obtener participantes de la clase:', error);
      return [];
    }
  }
}