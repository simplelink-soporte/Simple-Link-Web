import { createSupabaseClient } from '@/lib/supabase'
import { type SelectedBooking, type PaymentStatusEnum, type PaymentTypeEnum, type PaymentMethodEnum, type ReservationTypeEnum } from '@/types/bookings'
import { DateTime } from 'luxon'

interface ServiceResponse<T> {
  data?: T
  error?: {
    message: string
    code: string
    details?: string
  }
}

interface RentalItemDB {
  id: string
  item_id: string
  quantity: number
  price_per_unit: number
  items?: {
    name: string
  }
}

// Tipos para las respuestas de Supabase
interface BookingDB {
  id: string
  court_id: string
  date: string
  start_time: string
  end_time: string
  total_price: number
  deposit_amount: number
  court_price: number
  rental_items_price: number
  payment_status: PaymentStatusEnum
  payment_method: PaymentMethodEnum
  payment_type: PaymentTypeEnum
  title: string
  description: string | null
  courts?: CourtDB | null
  booking_participants?: ParticipantDB[]
  booking_rentals?: RentalItemDB[]
  payments?: PaymentDB[]
  reservation_type: string
  class_id: string
  class_session_price: number
  guarantee_percentage: number
}

interface CourtDB {
  id: string
  name: string
  branch_id: string
}

interface ParticipantDB {
  id: string
  user_id: string
  role: string
  usuarios?: {
    nombre: string | null
  } | null
}

interface PaymentDB {
  id: string
  payment_method: PaymentMethodEnum
  payment_status: PaymentStatusEnum
  stripe_payment_method_id?: string
}

interface TransformedBookingData extends BookingDB {
  branch_timezone?: string;
  courts?: CourtDB;
}

// Crear una instancia de Supabase memoizada
let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null

const getSupabaseInstance = () => {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient()
  }
  return supabaseInstance
}

// Función helper para convertir horarios UTC a la zona horaria local
const convertUTCToLocalTime = (
  timestampStr: string,
  date: string,
  timezone: string = 'UTC'
): string => {
  try {
    // Verificar si ya tenemos un timestamp completo (el nuevo formato)
    if (timestampStr.includes('T') || timestampStr.includes(' ')) {
      // Es un timestamp completo, solo necesitamos extraer la parte de tiempo
      const dateTime = DateTime.fromISO(timestampStr, { zone: 'UTC' }) || DateTime.fromSQL(timestampStr, { zone: 'UTC' });
      
      // Convertir a la zona horaria local de la sede
      const localDateTime = dateTime.setZone(timezone);
      
      // Retornar solo el tiempo en formato HH:mm:ss
      return localDateTime.toFormat('HH:mm:ss');
    } else {
      // Formato antiguo, mantener compatibilidad con registros existentes
      // Crear un objeto DateTime de Luxon en UTC con la fecha y hora
      const utcDateTime = DateTime.fromFormat(
        `${date}T${timestampStr}`,
        "yyyy-MM-dd'T'HH:mm:ss",
        { zone: 'UTC' }
      );

      // Convertir a la zona horaria local de la sede
      const localDateTime = utcDateTime.setZone(timezone);

      // Retornar solo el tiempo en formato HH:mm:ss
      return localDateTime.toFormat('HH:mm:ss');
    }
  } catch (error) {
    console.error('Error al convertir timestamp:', timestampStr, error);
    return timestampStr; // Devolver el original en caso de error
  }
};

// Funciones helper para transformación de datos
const transformParticipant = (participant: ParticipantDB) => {
  const [firstName = '', lastName = ''] = participant.usuarios?.nombre?.split(' ') || ['', '']
  return {
    id: participant.id,
    memberId: participant.user_id,
    role: participant.role,
    firstName,
    lastName
  }
}

const transformRentalItem = (rental: RentalItemDB) => ({
  id: rental.item_id,
  name: rental.items?.name || 'Item sin nombre',
  quantity: rental.quantity,
  pricePerUnit: rental.price_per_unit
})

const transformBooking = (booking: unknown): SelectedBooking => {
  // Casting para acceder a las propiedades
  const bookingData = booking as TransformedBookingData;
  
  return {
    id: bookingData.id,
    courtId: bookingData.court_id,
    court: bookingData.courts?.name || '',
    date: bookingData.date,
    startTime: convertUTCToLocalTime(bookingData.start_time, bookingData.date, bookingData.branch_timezone || 'UTC'),
    endTime: convertUTCToLocalTime(bookingData.end_time, bookingData.date, bookingData.branch_timezone || 'UTC'),
    totalAmount: bookingData.total_price || 0,
    depositAmount: bookingData.deposit_amount || 0,
    courtPrice: bookingData.court_price || 0,
    rentalItemsPrice: bookingData.rental_items_price || 0,
    paymentStatus: bookingData.payment_status || 'pending',
    paymentMethod: bookingData.payment_method || 'cash',
    paymentType: bookingData.payment_type || 'booking',
    title: bookingData.title || '',
    description: bookingData.description || '',
    participants: bookingData.booking_participants?.map(transformParticipant) || [],
    rentedItems: bookingData.booking_rentals?.map(transformRentalItem) || [],
    reservation_type: (bookingData.reservation_type || 'booking') as ReservationTypeEnum,
    class_id: bookingData.class_id,
    class_session_price: bookingData.class_session_price,
    guarantee_percentage: bookingData.guarantee_percentage
  };
};

export const bookingQueryService = {
  async getBookingById(id: string): Promise<SelectedBooking> {
    try {
      console.log('🔍 BookingQueryService - Consultando reserva por ID:', id)

      const supabase = getSupabaseInstance()
      const { data: booking, error } = await supabase
        .from('bookings')
        .select(`
          id,
          court_id,
          date,
          start_time,
          end_time,
          total_price,
          deposit_amount,
          court_price,
          rental_items_price,
          payment_status,
          payment_method,
          payment_type,
          title,
          description,
          guarantee_percentage,
          courts (
            id,
            name,
            branch_id
          ),
          booking_participants (
            id,
            user_id,
            role,
            usuarios (
              nombre
            )
          ),
          booking_rentals (
            id,
            item_id,
            quantity,
            price_per_unit,
            items (
              name
            )
          ),
          reservation_type,
          class_id,
          class_session_price
        `)
        .eq('id', id)
        .single()

      if (error) {
        console.error('❌ Error al consultar reserva:', error)
        throw error
      }

      if (!booking) {
        console.error('❌ No se encontró la reserva:', id)
        throw new Error(`No se encontró la reserva con ID: ${id}`)
      }

      // Obtener la zona horaria de la sede
      let branchTimezone = 'UTC';
      if (booking.courts && booking.courts.branch_id) {
        const { data: branch, error: branchError } = await supabase
          .from('sedes')
          .select('timezone')
          .eq('id', booking.courts.branch_id)
          .single();
          
        if (!branchError && branch?.timezone) {
          branchTimezone = branch.timezone;
          console.log(`📍 Zona horaria de la sede: ${branchTimezone}`);
        } else {
          console.warn('⚠️ No se pudo obtener la zona horaria de la sede, usando UTC por defecto');
        }
      }

      // Añadir la zona horaria a la reserva antes de transformarla
      const bookingWithTimezone = {
        ...booking,
        branch_timezone: branchTimezone
      };

      return transformBooking(bookingWithTimezone)
    } catch (error) {
      console.error('❌ Error general en getBookingById:', error)
      throw error
    }
  },

  async getBookingsByDate(date: string, branchId?: string): Promise<SelectedBooking[]> {
    try {
      console.log('🔍 BookingQueryService - Consultando reservas para fecha:', {
        date,
        branchId,
        timestamp: new Date().toISOString()
      })

      const supabase = getSupabaseInstance()
      
      // Primero, obtener la zona horaria de la sede
      let branchTimezone = 'UTC';
      if (branchId) {
        const { data: branch, error: branchError } = await supabase
          .from('sedes')
          .select('timezone')
          .eq('id', branchId)
          .single();
          
        if (!branchError && branch?.timezone) {
          branchTimezone = branch.timezone;
          console.log(`📍 Zona horaria de la sede: ${branchTimezone}`);
        } else {
          console.warn('⚠️ No se pudo obtener la zona horaria de la sede, usando UTC por defecto');
        }
      }

      // Consultar las reservas
      let query = supabase
        .from('bookings')
        .select(`
          id,
          court_id,
          date,
          start_time,
          end_time,
          total_price,
          deposit_amount,
          court_price,
          rental_items_price,
          payment_status,
          payment_method,
          payment_type,
          title,
          description,
          guarantee_percentage,
          courts (
            id,
            name,
            branch_id
          ),
          booking_participants (
            id,
            user_id,
            role,
            usuarios (
              nombre
            )
          ),
          booking_rentals (
            id,
            item_id,
            quantity,
            price_per_unit,
            items (
              name
            )
          ),
          reservation_type,
          class_id,
          class_session_price
        `)
        .eq('date', date)
        .or('payment_status.is.null,and(payment_status.neq.cancelled,payment_status.neq.refunded)')

      if (branchId) {
        query = query.eq('courts.branch_id', branchId)
      }

      const { data: bookings, error } = await query

      if (error) throw error
      if (!bookings) return []

      // Añadir la zona horaria a cada reserva antes de transformarla
      const bookingsWithTimezone = bookings.map(booking => ({
        ...booking,
        branch_timezone: branchTimezone
      }));

      const transformedBookings = bookingsWithTimezone.map(booking => transformBooking(booking))

      return transformedBookings
    } catch (error) {
      console.error('❌ Error en getBookingsByDate:', error)
      throw error
    }
  },

  async registerPayment(params: {
    bookingId: string
    depositAmount: number
    paymentMethod: PaymentMethodEnum
    notes?: string
  }): Promise<ServiceResponse<any>> {
    try {
      console.log('💰 Registrando pago:', {
        ...params,
        timestamp: new Date().toISOString()
      })

      const supabase = getSupabaseInstance()
      
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .update({
          payment_status: 'completed' as const,
          payment_method: params.paymentMethod,
          deposit_amount: params.depositAmount,
          payment_notes: params.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.bookingId)
        .select()
        .single()

      if (fetchError) {
        console.error('❌ Error al registrar pago:', fetchError)
        return {
          error: {
            message: 'Error al registrar el pago',
            code: 'DB_ERROR',
            details: fetchError.message
          }
        }
      }

      console.log('✅ Pago registrado exitosamente:', booking)
      return { data: booking }
    } catch (error: any) {
      console.error('❌ Error general al registrar pago:', error)
      return {
        error: {
          message: 'Error inesperado al registrar el pago',
          code: 'UNEXPECTED_ERROR',
          details: error.message
        }
      }
    }
  },

  async cancelBooking(
    bookingId: string, 
    reason?: string,
    shouldCharge?: boolean
  ): Promise<ServiceResponse<any>> {
    try {
      const supabase = getSupabaseInstance()

      // Obtener la reserva actual para verificar si es elegible para cargo por no-show
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single()

      if (fetchError) {
        return {
          error: {
            message: 'Error al obtener la reserva',
            code: 'FETCH_ERROR',
            details: fetchError.message
          }
        }
      }

      if (!booking) {
        return {
          error: {
            message: 'Reserva no encontrada',
            code: 'BOOKING_NOT_FOUND'
          }
        }
      }

      // Verificar si se debe aplicar el cargo por no-show
      if (shouldCharge && booking.payment_type === 'guarantee') {
        const chargeAmount = booking.total_price * 0.3 // 30% del total

        // Registrar el cargo por no-show
        const { error: chargeError } = await supabase
          .from('bookings_payments')
          .insert({
            booking_id: bookingId,
            amount: chargeAmount,
            type: 'no_show_charge',
            status: 'pending',
            notes: `Cargo por no-show: ${reason || 'No se presentó'}`
          })

        if (chargeError) {
          return {
            error: {
              message: 'Error al registrar el cargo por no-show',
              code: 'CHARGE_ERROR',
              details: chargeError.message
            }
          }
        }
      }

      // Actualizar el estado de la reserva a cancelada
      const { error: cancelError } = await supabase
        .from('bookings')
        .update({
          payment_status: 'cancelled',
          cancellation_reason: reason,
          cancelled_at: new Date().toISOString()
        })
        .eq('id', bookingId)

      if (cancelError) {
        return {
          error: {
            message: 'Error al cancelar la reserva',
            code: 'CANCEL_ERROR',
            details: cancelError.message
          }
        }
      }

      return {
        data: {
          message: 'Reserva cancelada exitosamente',
          charged: shouldCharge || false
        }
      }
    } catch (error) {
      console.error('❌ Error en cancelBooking:', error)
      return {
        error: {
          message: 'Error al procesar la cancelación',
          code: 'PROCESS_ERROR',
          details: (error as Error).message
        }
      }
    }
  }
} 