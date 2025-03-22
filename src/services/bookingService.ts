import { createSupabaseClient } from '@/lib/supabase'
import { type Database } from '@/types/supabase'
import { type BookingCreationData, PaymentStatusEnum, PaymentMethodEnum, PaymentTypeEnum } from '@/types/bookings'
import type { BookingParticipant, SelectedBooking } from '@/types/bookings'
import { PAYMENT_METHODS, PAYMENT_STATUS } from '@/types/bookings'
import { timeToMinutes } from '@/lib/time-utils'
import type { RentalSelection } from '@/types/items'
import { formatInTimeZone } from 'date-fns-tz'
import { DateTime } from 'luxon'

// Crear una instancia de Supabase memoizada
let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null;

const getSupabaseInstance = () => {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient();
  }
  return supabaseInstance;
};

// Función para reiniciar la instancia de Supabase si es necesario
const resetSupabaseInstance = () => {
  supabaseInstance = null;
};

export interface ServiceResponse<T> {
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: string;
  };
}

interface BookingFromDB {
  id: string
  court_id: string
  date: string
  start_time: string
  end_time: string
  total_price: number
  court_price: number
  rental_items_price: number
  payment_status: PaymentStatusEnum
  payment_method: PaymentMethodEnum
  deposit_amount: number
  title?: string
  description?: string
  courts: {
    id: string
    name: string
    branch_id: string
  }
  booking_participants: Array<{
    id: string
    member_id: string
    role: string
    members?: {
      id: string
      first_name: string
      last_name: string
      email?: string
      phone?: string
    }
  }>
}

interface BookingParticipantDB {
  id: string;
  member_id: string;
  role: string;
}

interface RentalItemDB {
  item_id: string;
  quantity: number;
  price_per_unit: number;
  total_price: number;
}

export interface CreateBookingParams {
  p_court_id: string;
  p_date: string;
  p_start_time: string;
  p_end_time: string;
  p_court_price: number;
  p_rental_items_price: number;
  p_payment_method: PaymentMethodEnum;
  p_payment_status: PaymentStatusEnum;
  p_payment_type: PaymentTypeEnum;
  p_deposit_amount: number;
  p_title?: string;
  p_description?: string;
  p_participants: Array<{
    user_id: string;
    role: string;
  }>;
  p_rental_items: RentalItemDB[];
  p_empresa_id?: string;
  p_stripe_payment_method_id?: string;
}

const validatePaymentMethod = (method: string): PaymentMethodEnum => {
  const validMethods = ['cash', 'stripe', 'transfer', 'card']
  if (!validMethods.includes(method)) {
    console.warn(`Método de pago inválido: ${method}, usando 'cash' por defecto`)
    return 'cash'
  }
  return method as PaymentMethodEnum
}

const validatePaymentStatus = (status: string): PaymentStatusEnum => {
  const validStatus = ['pending', 'partial', 'completed']
  if (!validStatus.includes(status)) {
    console.warn(`Estado de pago inválido: ${status}, usando 'pending' por defecto`)
    return 'pending'
  }
  return status as PaymentStatusEnum
}

const transformBookingDataForDB = (data: BookingCreationData): CreateBookingParams => {
  console.log('Transformando datos para DB:', {
    ...data,
    participants: data.participants
  });
  
  // Respetar el estado de pago enviado desde el frontend
  // Si no se especificó uno, usar 'completed' como predeterminado
  const paymentStatus = data.paymentStatus || 'completed' as PaymentStatusEnum;
  
  // Determinar el tipo de pago basado en el estado
  const paymentType = data.paymentType || (
    paymentStatus === 'completed' ? 'booking' :
    paymentStatus === 'partial' ? 'deposit' :
    'booking'
  ) as PaymentTypeEnum;

  // Transformar participantes - usando exactamente la lógica antigua
  const transformedParticipants = data.participants?.map(p => ({
    user_id: p.userId || p.id,
    role: p.role
  })) || [];

  console.log('Participantes transformados:', {
    original: data.participants,
    transformed: transformedParticipants,
    count: transformedParticipants.length
  });

  // Asegurar que los rentals estén presentes y transformarlos
  const transformedRentals = (data.rentalItems || []).map(rental => ({
    item_id: rental.itemId,
    quantity: rental.quantity,
    price_per_unit: rental.pricePerUnit,
    total_price: rental.totalPrice
  }));

  const transformedData = {
    p_court_id: data.courtId,
    p_date: data.date,
    p_start_time: data.startTime,
    p_end_time: data.endTime,
    p_court_price: data.courtPrice,
    p_rental_items_price: data.rentalItemsPrice,
    p_payment_method: data.paymentMethod,
    p_payment_status: paymentStatus,
    p_payment_type: paymentType,
    p_deposit_amount: data.depositAmount || 0,
    p_title: data.title,
    p_description: data.description,
    p_participants: transformedParticipants,
    p_rental_items: transformedRentals,
    p_empresa_id: data.empresa_id,
    p_stripe_payment_method_id: data.stripe_payment_method_id
  };

  // Log final usando el formato de la versión antigua
  console.log('Datos transformados para RPC:', {
    ...transformedData,
    rentals: transformedRentals
  });

  return transformedData;
};

const validateBookingDataTypes = (data: any): boolean => {
  try {
    // Validar UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.p_court_id)) {
      console.error('UUID inválido:', data.p_court_id);
      return false;
    }

    // Validar fecha
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.p_date)) {
      console.error('Fecha inválida:', data.p_date);
      return false;
    }

    // Validar horas
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(data.p_start_time)) {
      console.error('Hora de inicio inválida:', data.p_start_time);
      return false;
    }
    if (!timeRegex.test(data.p_end_time)) {
      console.error('Hora de fin inválida:', data.p_end_time);
      return false;
    }

    // Validar precios
    if (typeof data.p_court_price !== 'number' || isNaN(data.p_court_price) || data.p_court_price < 0) {
      console.error('Precio de cancha inválido:', data.p_court_price);
      return false;
    }

    if (typeof data.p_rental_items_price !== 'number' || isNaN(data.p_rental_items_price) || data.p_rental_items_price < 0) {
      console.error('Precio de rentals inválido:', data.p_rental_items_price);
      return false;
    }

    if (typeof data.p_deposit_amount !== 'number' || isNaN(data.p_deposit_amount) || data.p_deposit_amount < 0) {
      console.error('Depósito inválido:', data.p_deposit_amount);
      return false;
    }

    const totalPrice = data.p_court_price + data.p_rental_items_price;

    // Validar estado de pago
    if (!['pending', 'partial', 'completed'].includes(data.p_payment_status)) {
      console.error('Estado de pago inválido:', data.p_payment_status);
      return false;
    }

    // Validar método de pago
    if (!['cash', 'stripe', 'transfer'].includes(data.p_payment_method)) {
      console.error('Método de pago inválido:', data.p_payment_method);
      return false;
    }

    // Validar consistencia de pagos
    if (data.p_payment_status === 'completed' && data.p_deposit_amount !== totalPrice) {
      console.error('Inconsistencia en pago completed:', {
        deposit: data.p_deposit_amount,
        total: totalPrice
      });
      return false;
    }

    if (data.p_payment_status === 'partial' && 
        (data.p_deposit_amount >= totalPrice || data.p_deposit_amount <= 0)) {
      console.error('Inconsistencia en pago partial:', {
        deposit: data.p_deposit_amount,
        total: totalPrice
      });
      return false;
    }

    if (data.p_payment_status === 'pending' && data.p_deposit_amount > 0) {
      console.error('Inconsistencia en pago pending:', {
        deposit: data.p_deposit_amount
      });
      return false;
    }

    // Validar participantes
    try {
      const participants = JSON.parse(data.p_participants)
      if (!Array.isArray(participants)) {
        console.error('Formato de participantes inválido:', participants)
        return false
      }
      
      // Validar estructura de cada participante
      for (const participant of participants) {
        if (!participant.user_id || typeof participant.user_id !== 'string' || 
            !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(participant.user_id)) {
          console.error('ID de participante inválido:', participant)
          return false
        }
        if (!participant.role || !['player', 'guest'].includes(participant.role)) {
          console.error('Rol de participante inválido:', participant)
          return false
        }
      }
    } catch (error) {
      console.error('Error al parsear participantes:', error)
      return false
    }

    // Validar items rentados
    if (data.p_rental_items) {
      try {
        const rentals = JSON.parse(data.p_rental_items)
        if (!Array.isArray(rentals)) {
          console.error('Formato de rentals inválido:', rentals)
          return false
        }
        
        // Validar estructura de cada rental
        for (const rental of rentals) {
          if (!rental.item_id || typeof rental.item_id !== 'string' ||
              !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rental.item_id)) {
            console.error('ID de item inválido:', rental)
            return false
          }
          if (typeof rental.quantity !== 'number' || rental.quantity <= 0) {
            console.error('Cantidad inválida:', rental)
            return false
          }
          if (typeof rental.price_per_unit !== 'number' || rental.price_per_unit <= 0) {
            console.error('Precio por unidad inválido:', rental)
            return false
          }
        }
      } catch (error) {
        console.error('Error al parsear rentals:', error)
        return false
      }
    }

    return true
  } catch (error) {
    console.error('Error en validación de tipos:', error)
    return false
  }
};

const transformRentalForDB = (rental: RentalSelection) => {
  console.log('Transformando rental para DB:', {
    original: rental,
    transformed: {
      item_id: rental.itemId,
      quantity: rental.quantity,
      price_per_unit: rental.pricePerUnit
    }
  });

  if (!rental.quantity || !rental.pricePerUnit) {
    throw new Error('Cantidad y precio por unidad son requeridos');
  }

  return {
    item_id: rental.itemId,
    quantity: rental.quantity,
    price_per_unit: rental.pricePerUnit
  };
};

const validateStock = async (rentals: RentalSelection[]): Promise<boolean> => {
  try {
    const itemIds = rentals.map(r => r.itemId);
    
    // Obtener stock actual
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('id, stock')
      .in('id', itemIds);

    if (itemsError) throw itemsError;

    // Obtener rentals activos
    const { data: activeRentals, error: rentalsError } = await supabase
      .from('booking_rentals')
      .select(`
        item_id,
        quantity,
        bookings!inner (
          payment_status
        )
      `)
      .in('item_id', itemIds)
      .neq('bookings.payment_status', 'cancelled');

    if (rentalsError) throw rentalsError;

    // Validar stock para cada item
    for (const rental of rentals) {
      const item = items?.find(i => i.id === rental.itemId);
      if (!item) return false;

      const rentedQuantity = activeRentals
        ?.filter(r => r.item_id === rental.itemId)
        .reduce((sum, r) => sum + r.quantity, 0) || 0;

      const availableStock = item.stock - rentedQuantity;

      if (rental.quantity > availableStock) {
        console.error('Stock insuficiente:', {
          itemId: rental.itemId,
          requested: rental.quantity,
          available: availableStock
        });
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error al validar stock:', error);
    return false;
  }
};

export const bookingService = {
  getSupabase() {
    try {
      const instance = getSupabaseInstance();
      if (!instance) {
        throw new Error('No se pudo inicializar Supabase');
      }
      return instance;
    } catch (error) {
      console.error('Error al obtener instancia de Supabase:', error);
      resetSupabaseInstance();
      throw error;
    }
  },

  async checkFutureAvailability(
    itemId: string,
    date: string,
    startTime: string,
    endTime: string
  ): Promise<number> {
    try {
      const supabase = this.getSupabase()
      // Obtener primero el stock base del item
      const { data: itemData, error: itemError } = await supabase
        .from('items')
        .select('stock')
        .eq('id', itemId)
        .single();

      if (itemError) {
        console.error('❌ Error al obtener información del item:', {
          error: itemError,
          itemId
        });
        throw itemError;
      }

      if (!itemData || typeof itemData.stock !== 'number') {
        console.error('❌ No se encontró stock para el item:', itemId);
        return 0;
      }

      console.log('📦 Stock base obtenido:', {
        itemId,
        baseStock: itemData.stock,
        itemData
      })

      console.log('🔄 Consultando get_available_stock con parámetros:', {
        p_item_id: itemId,
        p_booking_date: date,
        p_start_time: startTime,
        p_end_time: endTime
      })

      const { data, error } = await supabase
        .rpc('get_available_stock', {
          p_item_id: itemId,
          p_booking_date: date,
          p_start_time: startTime,
          p_end_time: endTime
        } as any)

      if (error) {
        console.error('❌ Error al verificar disponibilidad:', {
          error,
          params: { itemId, date, startTime, endTime },
          errorDetails: {
            message: error.message,
            hint: error.hint,
            details: error.details,
            code: error.code
          }
        })
        throw error
      }

      return data || 0
    } catch (error) {
      console.error('❌ Error en checkFutureAvailability:', {
        error,
        params: { itemId, date, startTime, endTime }
      })
      throw error
    }
  },

  async checkAvailability(data: BookingCreationData): Promise<ServiceResponse<boolean>> {
    try {
      console.log('Verificando disponibilidad para:', {
        courtId: data.courtId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime
      })

      // Validación básica de datos
      if (!data.courtId || !data.date || !data.startTime || !data.endTime) {
        return {
          error: {
            message: 'Datos incompletos para verificar disponibilidad',
            code: 'MISSING_DATA'
          }
        }
      }

      try {
        // Verificar si la cancha existe y está activa
        const supabase = this.getSupabase()
        const { data: court, error: courtError } = await supabase
          .from('courts')
          .select('id, is_active, name')
          .eq('id', data.courtId)
          .single()

        if (courtError) {
          console.error('Error al verificar la cancha:', courtError)
          return {
            error: {
              message: 'Error al verificar la cancha',
              code: 'DB_ERROR',
              details: courtError.message
            }
          }
        }

        if (!court) {
          return {
            error: {
              message: 'La cancha seleccionada no existe',
              code: 'INVALID_COURT'
            }
          }
        }

        if (!court.is_active) {
          return {
            error: {
              message: `La cancha ${court.name} no está disponible para reservas`,
              code: 'INACTIVE_COURT'
            }
          }
        }

        // Convertir horarios a minutos para validación inicial
        const requestedStart = this.timeToMinutes(data.startTime)
        const requestedEnd = this.timeToMinutes(data.endTime)

        if (requestedStart >= requestedEnd) {
          return {
            error: {
              message: 'La hora de inicio debe ser menor a la hora de fin',
              code: 'INVALID_TIME_RANGE'
            }
          }
        }

        // Buscar reservas existentes que puedan causar conflicto
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('id, start_time, end_time, payment_status')
          .eq('court_id', data.courtId)
          .eq('date', data.date)
          .neq('payment_status', 'cancelled')

        if (bookingsError) {
          console.error('Error al buscar reservas:', bookingsError)
          return {
            error: {
              message: 'Error al verificar disponibilidad',
              code: 'DB_ERROR',
              details: bookingsError.message
            }
          }
        }

        // Si no hay reservas, la cancha está disponible
        if (!bookings || bookings.length === 0) {
          console.log('No hay reservas existentes para esta fecha y cancha')
          return { data: true }
        }

        console.log('Reservas encontradas:', bookings.map(b => ({
          id: b.id,
          start: b.start_time,
          end: b.end_time,
          status: b.payment_status
        })))

        // Verificar superposiciones
        const hasOverlap = bookings.some(booking => {
          const bookingStart = this.timeToMinutes(booking.start_time)
          const bookingEnd = this.timeToMinutes(booking.end_time)

          const overlap = (
            (requestedStart >= bookingStart && requestedStart < bookingEnd) ||
            (requestedEnd > bookingStart && requestedEnd <= bookingEnd) ||
            (requestedStart <= bookingStart && requestedEnd >= bookingEnd)
          )

          if (overlap) {
            console.log('Superposición detectada:', {
              existing: {
                start: booking.start_time,
                end: booking.end_time,
                status: booking.payment_status
              },
              requested: {
                start: data.startTime,
                end: data.endTime
              }
            })
          }

          return overlap
        })

        if (hasOverlap) {
          return {
            error: {
              message: `La cancha ${court.name} no está disponible en el horario seleccionado`,
              code: 'OVERLAP'
            }
          }
        }

        console.log('Cancha disponible:', {
          court: court.name,
          date: data.date,
          time: `${data.startTime} - ${data.endTime}`
        })

        return { data: true }
      } catch (dbError: any) {
        console.error('Error en la base de datos:', {
          error: dbError,
          message: dbError.message,
          details: dbError.details || dbError.hint
        })
        return {
          error: {
            message: 'Error al verificar disponibilidad en la base de datos',
            code: 'DB_ERROR',
            details: dbError.message
          }
        }
      }
    } catch (error: any) {
      console.error('Error inesperado en checkAvailability:', error)
      return {
        error: {
          message: 'Error inesperado al verificar disponibilidad',
          code: 'UNEXPECTED_ERROR',
          details: error.message
        }
      }
    }
  },

  validateBookingData(data: BookingCreationData): boolean {
    if (!data) return false;

    // Log inicial de validación
    console.log('🔍 Iniciando validación de datos de reserva:', {
      paymentType: data.paymentType,
      paymentMethod: data.paymentMethod,
      stripePaymentMethodId: data.stripe_payment_method_id,
      isGuarantee: data.paymentType === 'guarantee'
    });

    // Validación básica
    const isBasicValid = !!(
      data.courtId &&
      data.date &&
      data.startTime &&
      data.endTime &&
      Number(data.courtPrice) >= 0 &&
      Number(data.rentalItemsPrice) >= 0
    );

    if (!isBasicValid) {
      console.error('❌ Validación básica fallida:', {
        courtId: !data.courtId,
        date: !data.date,
        startTime: !data.startTime,
        endTime: !data.endTime,
        invalidCourtPrice: Number(data.courtPrice) < 0,
        invalidRentalPrice: Number(data.rentalItemsPrice) < 0
      });
      return false;
    }

    // Validación de método de pago para garantías
    if (data.paymentType === 'guarantee') {
      if (!data.stripe_payment_method_id) {
        console.error('❌ Error en método de pago para garantía:', {
          type: data.paymentType,
          method: data.paymentMethod,
          stripe_payment_method_id: data.stripe_payment_method_id
        });
        return false;
      }
      
      console.log('✅ Validación de garantía exitosa:', {
        paymentMethodId: data.stripe_payment_method_id,
        method: data.paymentMethod
      });
    }

    // Validación específica para rentals
    if (data.rentalItems && data.rentalItems.length > 0) {
      const rentalItemsTotal = data.rentalItems.reduce(
        (total: number, rental: RentalSelection) => total + (Number(rental.pricePerUnit || 0) * Number(rental.quantity || 1)),
        0
      );
      
      // Verificar que el total de rentals coincide
      const priceDifference = Math.abs(rentalItemsTotal - Number(data.rentalItemsPrice));
      if (priceDifference > 0.01) {
        console.error('❌ Error en el cálculo de rentals:', {
          expected: data.rentalItemsPrice,
          calculated: rentalItemsTotal,
          difference: priceDifference,
          items: data.rentalItems
        });
        return false;
      }
    }

    // Validación de depósito
    if (data.depositAmount) {
      const totalAmount = Number(data.courtPrice) + Number(data.rentalItemsPrice);
      if (Number(data.depositAmount) > totalAmount) {
        console.error('❌ Error en el depósito:', {
          deposit: data.depositAmount,
          total: totalAmount
        });
        return false;
      }
    }

    return true;
  },

  calculateCourtPrice(data: BookingCreationData): number {
    // Calcular el precio de la cancha basado en la duración
    const startMinutes = this.timeToMinutes(data.startTime);
    const endMinutes = this.timeToMinutes(data.endTime);
    const durationInMinutes = endMinutes - startMinutes;
    
    // Aquí deberías obtener el precio por hora de la cancha
    // Por ahora usamos un valor base como ejemplo
    const pricePerHour = 60; // Este valor debería venir de la configuración
    return (durationInMinutes / 60) * pricePerHour;
  },

  timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  },

  getDBErrorMessage(error: any): { message: string, code: string } {
    if (error.message.includes('payment_status')) {
      return {
        message: 'Estado de pago inválido',
        code: 'INVALID_PAYMENT_STATUS'
      }
    }

    if (error.message.includes('payment_method')) {
      return {
        message: 'Método de pago inválido',
        code: 'INVALID_PAYMENT_METHOD'
      }
    }

    if (error.message.includes('overlap')) {
      return {
        message: 'El horario seleccionado no está disponible',
        code: 'BOOKING_OVERLAP'
      }
    }

    if (error.message.includes('foreign key')) {
      return {
        message: 'Referencia inválida en la base de datos',
        code: 'INVALID_REFERENCE'
      }
    }

    return {
      message: 'Error al procesar la reserva en la base de datos',
      code: 'DB_ERROR'
    }
  },

  async createBooking(data: BookingCreationData): Promise<ServiceResponse<any>> {
    try {
      console.log('📝 Creando reserva con datos:', data);

      // Obtener la información de la cancha
      const { data: court, error: courtError } = await this.getSupabase()
        .from('courts')
        .select('branch_id')
        .eq('id', data.courtId)
        .single();

      if (courtError || !court) {
        console.error('❌ Error al obtener información de la cancha:', courtError);
        return {
          error: {
            message: 'No se pudo obtener la información de la cancha',
            code: 'INVALID_COURT'
          }
        };
      }

      // Obtener la zona horaria de la sede
      const { data: branch, error: branchError } = await this.getSupabase()
        .from('sedes')
        .select('timezone')
        .eq('id', court.branch_id)
        .single();

      if (branchError || !branch) {
        console.error('❌ Error al obtener información de la sede:', branchError);
        return {
          error: {
            message: 'Sede no encontrada',
            code: 'INVALID_BRANCH'
          }
        };
      }

      // Validar y establecer zona horaria por defecto si es necesario
      const timezone = branch.timezone || 'UTC';
      console.log('✅ Zona horaria de la sede:', timezone);

      // Crear fechas usando Luxon con la zona horaria de la sede
      const localStartDateTime = DateTime.fromFormat(
        `${data.date} ${data.startTime}`,
        'yyyy-MM-dd HH:mm',
        { zone: timezone }
      );
      const localEndDateTime = DateTime.fromFormat(
        `${data.date} ${data.endTime}`,
        'yyyy-MM-dd HH:mm',
        { zone: timezone }
      );

      // Convertir a UTC manteniendo la fecha original
      const startTimeUTC = localStartDateTime.toUTC().toFormat('HH:mm:ss');
      const endTimeUTC = localEndDateTime.toUTC().toFormat('HH:mm:ss');
      const bookingDateUTC = data.date; // Usar la fecha original

      // Verificar si la hora de fin es 00:00:00 o si la hora de fin es menor que la hora de inicio
      // Esto indica que la reserva cruza la medianoche en UTC
      const isOvernightUTC = endTimeUTC === '00:00:00' || 
        parseInt(endTimeUTC.split(':')[0]) < parseInt(startTimeUTC.split(':')[0]);
      
      // Ajustar la hora de fin si cruza la medianoche en UTC
      let adjustedEndTimeUTC = endTimeUTC;
      let bookingDateToUse = bookingDateUTC;
      let startDateTimeUTC, endDateTimeUTC;
      
      // Crear timestamp completo para la hora de inicio
      startDateTimeUTC = localStartDateTime.toUTC().toFormat('yyyy-MM-dd HH:mm:ss');
      
      // Para la hora de fin, depende de si la reserva cruza la medianoche
      if (isOvernightUTC) {
        if (endTimeUTC === '00:00:00') {
          // Caso especial para 00:00:00 - ajustar a un segundo antes
          const adjustedEndDateTime = localStartDateTime.toUTC().set({ hour: 23, minute: 59, second: 59 });
          endDateTimeUTC = adjustedEndDateTime.toFormat('yyyy-MM-dd HH:mm:ss');
        } else {
          // Para reservas que cruzan la medianoche, ajustar la fecha a un día después
          endDateTimeUTC = localEndDateTime.toUTC().plus({ days: 1 }).toFormat('yyyy-MM-dd HH:mm:ss');
        }
      } else {
        // Caso normal - mismo día
        endDateTimeUTC = localEndDateTime.toUTC().toFormat('yyyy-MM-dd HH:mm:ss');
      }

      console.log('🕒 Conversión de horarios:', {
        local: {
          date: data.date,
          start: data.startTime,
          end: data.endTime,
          timezone,
          localStart: localStartDateTime.toISO(),
          localEnd: localEndDateTime.toISO()
        },
        utc: {
          startDateTimeUTC,
          endDateTimeUTC,
          isOvernightUTC
        }
      });
      
      // Transformar participantes
      const transformedParticipants = data.participants?.map(p => ({
        user_id: p.userId || p.id,
        role: p.role
      })) || [];

      console.log('Participantes transformados:', {
        original: data.participants,
        transformed: transformedParticipants
      });

      // Transformar rentals si existen
      const transformedRentals = (data.rentalItems || []).map(rental => ({
        item_id: rental.itemId,
        quantity: rental.quantity,
        price_per_unit: rental.pricePerUnit,
        total_price: rental.totalPrice
      }));

      // Preparar los datos para la creación de la reserva
      const bookingParams = {
        p_court_id: data.courtId,
        p_date: bookingDateUTC, // Usar siempre la fecha original seleccionada
        p_start_time: startDateTimeUTC, // Timestamp completo en formato yyyy-MM-dd HH:mm:ss
        p_end_time: endDateTimeUTC, // Timestamp completo en formato yyyy-MM-dd HH:mm:ss
        p_court_price: data.courtPrice,
        p_rental_items_price: data.rentalItemsPrice || 0,
        p_payment_method: data.paymentMethod,
        p_payment_status: data.paymentStatus,
        p_payment_type: data.paymentType,
        p_deposit_amount: data.depositAmount || 0,
        p_title: data.title || null,
        p_description: data.description || null,
        p_participants: transformedParticipants,
        p_rental_items: transformedRentals,
        p_empresa_id: data.empresa_id,
        p_stripe_payment_method_id: data.stripe_payment_method_id,
        // Nuevos parámetros para reservas de clase
        p_reservation_type: data.reservationType || 'booking',
        p_class_id: data.classId || null,
        p_class_session_price: data.classSessionPrice || 0
      };

      console.log('📦 Parámetros de la reserva:', {
        ...bookingParams,
        p_participants: transformedParticipants
      });

      const { data: result, error } = await this.getSupabase()
        .rpc('create_booking_v2', bookingParams);

      if (error) {
        console.error('❌ Error al crear reserva:', error);
        return {
          error: this.getDBErrorMessage(error)
        };
      }

      return { data: result };
    } catch (error) {
      console.error('Error inesperado al crear reserva:', error);
      return {
        error: {
          message: 'Error al procesar la reserva en la base de datos',
          code: 'DB_ERROR',
          details: (error as Error).message
        }
      };
    }
  },

  async getBookingById(id: string): Promise<SelectedBooking> {
    try {
      // 1. Log inicial
      console.log('🔍 Iniciando getBookingById:', { 
        id,
        timestamp: new Date().toISOString()
      })
      
      const supabase = this.getSupabase()
      
      // 2. Log de la consulta
      console.log('📝 Ejecutando consulta SQL:', {
        table: 'bookings',
        id,
        fields: [
          'id',
          'court_id',
          'payment_type',
          'payment_status',
          'payment_method'
        ]
      })

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
          payment_status,
          payment_method,
          payment_type,
          title,
          description,
          courts:court_id (
            name
          ),
          booking_participants (
            id,
            member_id,
            role,
            members (
              first_name,
              last_name
            )
          )
        `)
        .eq('id', id)
        .single()

      // 3. Validación de errores
      if (error) {
        console.error('❌ Error al obtener la reserva:', {
          error,
          id,
          timestamp: new Date().toISOString()
        })
        throw error
      }

      if (!booking) {
        console.error('❌ Reserva no encontrada:', { 
          id,
          timestamp: new Date().toISOString()
        })
        throw new Error('Reserva no encontrada')
      }

      // 4. Log de datos crudos
      console.log('📦 Datos crudos de la reserva:', {
        id: booking.id,
        payment_type: booking.payment_type,
        raw_payment_type: typeof booking.payment_type,
        payment_status: booking.payment_status,
        payment_method: booking.payment_method,
        timestamp: new Date().toISOString()
      })

      // 5. Transformación explícita del payment_type
      const processedPaymentType = (() => {
        // Log del proceso
        console.log('🔄 Procesando payment_type:', {
          original: booking.payment_type,
          type: typeof booking.payment_type,
          timestamp: new Date().toISOString()
        })

        // Si existe payment_type, lo validamos y usamos
        if (booking.payment_type) {
          const validTypes: PaymentTypeEnum[] = ['booking', 'deposit', 'remaining', 'guarantee', 'no_show_charge']
          if (validTypes.includes(booking.payment_type as PaymentTypeEnum)) {
            return booking.payment_type as PaymentTypeEnum
          }
        }

        // Lógica de fallback basada en el estado
        if (booking.payment_status === 'completed') return 'booking'
        if (booking.payment_status === 'partial') return 'deposit'
        return 'booking'
      })()

      // 6. Transformación de participantes
      const participants = booking.booking_participants?.map(participant => {
        const [firstName = '', lastName = ''] = participant.members?.first_name?.split(' ') || ['', '']
        return {
          id: participant.id,
          memberId: participant.member_id,
          role: participant.role,
          firstName,
          lastName
        }
      }) || []

      // 7. Construcción del objeto final
      const transformedBooking: SelectedBooking = {
        id: booking.id,
        courtId: booking.court_id,
        court: booking.courts?.name || '',
        date: booking.date,
        startTime: booking.start_time,
        endTime: booking.end_time,
        totalAmount: booking.total_price || 0,
        depositAmount: booking.deposit_amount || 0,
        courtPrice: 0,
        rentalItemsPrice: 0,
        paymentStatus: booking.payment_status,
        paymentMethod: booking.payment_method,
        paymentType: processedPaymentType,
        title: booking.title || '',
        description: booking.description || '',
        participants,
        rentedItems: []
      }

      // 8. Log final
      console.log('✅ Booking transformado:', {
        id: transformedBooking.id,
        paymentType: transformedBooking.paymentType,
        isGuarantee: transformedBooking.paymentType === 'guarantee',
        paymentStatus: transformedBooking.paymentStatus,
        timestamp: new Date().toISOString()
      })

      return transformedBooking
    } catch (error) {
      console.error('❌ Error en getBookingById:', {
        error,
        id,
        timestamp: new Date().toISOString()
      })
      throw error
    }
  },

  async cancelBooking(bookingId: string, reason?: string): Promise<ServiceResponse<any>> {
    try {
      console.log('📝 Cancelando reserva:', { bookingId, reason })

      if (!bookingId) {
        return {
          error: {
            message: 'ID de reserva requerido',
            code: 'MISSING_ID'
          }
        }
      }

      const supabase = this.getSupabase()
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .update({
          payment_status: 'cancelled',
          cancellation_reason: reason || null,
          cancelled_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .select()
        .single()

      if (fetchError) {
        console.error('❌ Error al cancelar la reserva:', fetchError)
        return {
          error: {
            message: 'Error al cancelar la reserva',
            code: 'DB_ERROR',
            details: fetchError.message
          }
        }
      }

      console.info('✅ Reserva cancelada exitosamente:', booking)
      return { data: booking }
    } catch (error: any) {
      console.error('❌ Error general al cancelar la reserva:', error)
      return {
        error: {
          message: 'Error inesperado al cancelar la reserva',
          code: 'UNEXPECTED_ERROR',
          details: error.message
        }
      }
    }
  },

  async updateBooking(id: string, data: Partial<BookingCreationData>) {
    const supabase = this.getSupabase()
    // ... existing code ...
  },

  async deleteBooking(id: string) {
    const supabase = this.getSupabase()
    // ... existing code ...
  }
} 