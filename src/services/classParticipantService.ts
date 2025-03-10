import { createSupabaseClient } from '@/lib/supabase'
import type { ParticipantRoleEnum } from '@/types/bookings'

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

export class ClassParticipantService {
  private supabase = createSupabaseClient()

  /**
   * Obtiene los participantes de una clase específica
   * @param classId ID de la clase
   * @returns Lista de participantes de la clase
   */
  async getClassParticipants(classId: string): Promise<ClassParticipant[]> {
    try {
      console.log('🔍 Buscando participantes para la clase:', classId);

      if (!classId) {
        console.warn('❌ ClassId no proporcionado');
        return [];
      }

      // 1. Buscar todas las reservas asociadas con la clase
      // En la tabla "bookings", filtramos por class_id
      const { data: bookings, error: bookingsError } = await this.supabase
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
          reservation_type,
          cancelled_at,
          cancellation_reason
        `)
        .eq('class_id', classId)
        .eq('reservation_type', 'class') // Asegurarnos que son reservas de clase
        .is('cancelled_at', null); // Excluir reservas canceladas

      if (bookingsError) {
        console.error('❌ Error al obtener reservas de la clase:', bookingsError);
        return [];
      }

      if (!bookings || bookings.length === 0) {
        console.log('⚠️ No se encontraron reservas para la clase:', classId);
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