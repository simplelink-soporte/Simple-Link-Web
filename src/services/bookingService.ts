import { createSupabaseClient } from '@/lib/supabase'
import { type Database } from '@/types/supabase'
import { type BookingCreationData, PaymentStatusEnum, PaymentMethodEnum, PaymentTypeEnum } from '@/types/bookings'
import type { BookingParticipant, SelectedBooking } from '@/types/bookings'
import { PAYMENT_METHODS, PAYMENT_STATUS } from '@/types/bookings'
import { timeToMinutes } from '@/lib/time-utils'
import type { RentalSelection } from '@/types/items'
import { formatInTimeZone } from 'date-fns-tz'
import { DateTime } from 'luxon'
import { StripeInvoiceService } from './stripe-invoice.service'
import { Stripe } from 'stripe'

// Instanciar el servicio de facturas
const stripeInvoiceService = StripeInvoiceService.getInstance();

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

  // Transformar participantes
  const transformedParticipants = data.participants?.map(p => ({
    user_id: p.user_id || p.id,
    role: p.role
  })) || [];

  console.log('Participantes transformados:', {
    original: data.participants,
    transformed: transformedParticipants
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
    p_empresa_id: data.empresaId,
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
      const bookingDateUTC = data.date; // Usar siempre la fecha original seleccionada

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
        user_id: p.user_id || p.id,
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
        p_empresa_id: data.empresaId,
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

      let result;
      let error;
      
      try {
        // Añadir un log justo antes de la llamada a RPC para mejor diagnóstico
        console.log('🔄 Llamando al procedimiento create_booking_v2 con los parámetros mostrados');
        
        const response = await this.getSupabase()
          .rpc('create_booking_v2', bookingParams);
          
        result = response.data;
        error = response.error;
        
        // Log detallado de la respuesta completa
        console.log('📊 Respuesta completa del procedimiento create_booking_v2:', {
          success: !response.error,
          statusCode: response.status,
          errorMessage: response.error?.message,
          errorDetails: response.error?.details,
          resultType: typeof result,
          resultValue: result
        });
      } catch (unexpectedError) {
        // Capturar y registrar cualquier error que ocurra durante la llamada
        console.error('❌ Excepción al llamar create_booking_v2:', {
          errorType: typeof unexpectedError,
          errorMessage: unexpectedError instanceof Error ? unexpectedError.message : String(unexpectedError),
          errorStack: unexpectedError instanceof Error ? unexpectedError.stack : undefined,
          errorObject: unexpectedError instanceof Object 
            ? JSON.stringify(unexpectedError, Object.getOwnPropertyNames(unexpectedError), 2) 
            : String(unexpectedError)
        });
        
        // Re-lanzar para continuar con el flujo normal de manejo de errores
        throw unexpectedError;
      }

      // El resultado puede ser directamente el UUID como string o un objeto
      let bookingId = null;
      
      if (error) {
        console.error('❌ Error al crear reserva:', error);
        return {
          error: this.getDBErrorMessage(error)
        };
      }
      
      // Determinar bookingId basado en el tipo de resultado
      if (typeof result === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result)) {
        // El resultado es directamente un UUID
        bookingId = result;
        console.log('✅ UUID de reserva obtenido directamente:', bookingId);
      } else if (result && typeof result === 'object' && 'id' in result) {
        // El resultado es un objeto con propiedad id
        bookingId = result.id;
        console.log('✅ ID de reserva obtenido del objeto:', bookingId);
      } else if (typeof result === 'number' || (typeof result === 'string' && !isNaN(Number(result)))) {
        // El resultado es un número o string numérico
        bookingId = result;
        console.log('✅ ID de reserva obtenido como valor numérico:', bookingId);
      } else {
        console.warn('⚠️ No se pudo determinar ID directamente del resultado:', result);
        
        // En caso de que no podamos obtener el ID del resultado, buscar la reserva recién creada
        try {
          console.log('🔍 Buscando la reserva recién creada por criterios únicos...');
          
          const { data: recentBookings, error: searchError } = await this.getSupabase()
            .from('bookings')
            .select('id')
            .eq('court_id', data.courtId)
            .eq('date', data.date)
            .eq('start_time', bookingParams.p_start_time)
            .eq('end_time', bookingParams.p_end_time)
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (searchError || !recentBookings || recentBookings.length === 0) {
            console.error('❌ Error al buscar la reserva recién creada:', searchError || 'No se encontró ninguna reserva');
            return { data: { success: true } }; // Indicamos éxito genérico sin ID
          }
          
          bookingId = recentBookings[0].id;
          console.log('✅ ID de reserva encontrado mediante búsqueda:', bookingId);
        } catch (searchError) {
          console.error('❌ Error durante la búsqueda de reserva recién creada:', searchError);
          return { data: { success: true } }; // Indicamos éxito genérico sin ID
        }
      }

      // Si no pudimos obtener un ID de reserva pero la creación fue exitosa
      if (!bookingId) {
        console.warn('⚠️ No se pudo determinar el ID de la reserva, pero parece que se creó correctamente');
        return { data: { success: true } };
      }

      // Generar factura automáticamente si:
      // 1. El pago es completo (type='booking', status='completed')
      // 2. Es un pago con seña (type='deposit', status='partial')
      // Y siempre respetando la opción del usuario si está definida
      const shouldGenerateInvoice = 
        // Si la bandera generateInvoice está definida explícitamente, usar ese valor
        data.generateInvoice !== undefined 
          ? data.generateInvoice 
          : // Si no está definida, usar la lógica anterior
            ((data.paymentType === 'booking' && data.paymentStatus === 'completed') || 
            (data.paymentType === 'deposit' && data.paymentStatus === 'partial'));
      
      if (shouldGenerateInvoice && bookingId) {
        console.log('🧾 Intentando generar factura para reserva:', {
          bookingId: bookingId,
          paymentType: data.paymentType,
          paymentStatus: data.paymentStatus,
          empresaId: data.empresaId,
          isDepositPayment: data.paymentType === 'deposit',
          generateInvoice: data.generateInvoice
        });
        
        try {
          // Obtener información necesaria de la cancha (siempre la necesitaremos para el nombre)
          const { data: courtDetails, error: courtDetailsError } = await this.getSupabase()
            .from('courts')
            .select('name, branch_id, sedes:branch_id(id, name, empresa_id)')
            .eq('id', data.courtId)
            .single();
          
          if (courtDetailsError || !courtDetails) {
            console.error('❌ Error al obtener detalles de la cancha para factura:', courtDetailsError);
            return { data: { id: bookingId } }; // Devolvemos el ID que encontramos
          }
          
          // Asegurarnos de que tenemos un ID de empresa
          if (!data.empresaId) {
            console.warn('⚠️ No se proporcionó empresaId en los datos de la reserva, obteniendo de la cancha');
            
            // Determinar el ID de la empresa desde los datos de la cancha
            data.empresaId = courtDetails.sedes?.empresa_id;
            
            console.log('✅ ID de empresa obtenido desde la cancha:', {
              empresaId: data.empresaId,
              courtId: data.courtId,
              branchId: courtDetails.branch_id
            });
          }
          
          // Verificar explícitamente si ya tenemos un empresaId
          if (!data.empresaId) {
            console.error('❌ No se pudo determinar el ID de la empresa');
            return { data: { id: bookingId } }; // Devolvemos el ID que encontramos
          }
          
          // Obtener la conexión de Stripe para esta empresa desde la tabla stripe_connections
          const { data: stripeConnection, error: stripeConnectionError } = await this.getSupabase()
            .from('stripe_connections')
            .select('stripe_account_id')
            .eq('empresa_id', data.empresaId)
            .single();
            
          if (stripeConnectionError || !stripeConnection || !stripeConnection.stripe_account_id) {
            console.error('❌ Error al obtener cuenta Stripe de la empresa:', stripeConnectionError || 'No se encontró conexión de Stripe');
            return { data: { id: bookingId } }; // Devolvemos el ID que encontramos
          }
          
          // Obtener información del cliente para la factura
          const clientInfo = await this.getClientInfoForInvoice(data, bookingId);
          
          // Determinar el monto a facturar según el tipo de pago
          let amount = data.courtPrice + (data.rentalItemsPrice || 0);
          let description = `Reserva: ${courtDetails.name || 'Cancha'}`;
          
          // Parámetros adicionales para indicar si es pago parcial o completo
          let paymentType: 'booking' | 'deposit' = 'booking';
          let isPartialPayment = false;
          
          // Si es un pago con seña, ajustar el monto y la descripción
          if (data.paymentType === 'deposit') {
            amount = data.depositAmount || 0;
            description = `Seña para reserva: ${courtDetails.name || 'Cancha'}`;
            paymentType = 'deposit';
            isPartialPayment = true;
            
            console.log('💵 Generando factura por pago de SEÑA:', {
              fullAmount: data.courtPrice + (data.rentalItemsPrice || 0),
              depositAmount: amount,
              isPartialPayment: true
            });
          } else {
            console.log('💵 Generando factura por pago COMPLETO:', {
              amount: amount,
              isPartialPayment: false
            });
          }
          
          // Ahora crear la factura directamente
          if (typeof window !== 'undefined') {
            // Estamos en el navegador, usar API
            console.log('🌐 Llamando a API para generar factura desde el cliente...');
            try {
              const invoiceApiResponse = await fetch('/api/stripe/invoices', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  endpoint: 'manual-booking', // Identificador para el backend
                  stripeAccountId: stripeConnection.stripe_account_id,
                  customerId: clientInfo.stripeCustomerId,
                  customerEmail: clientInfo.email,
                  customerName: clientInfo.name,
                  amount: amount,
                  description: description,
                  bookingId: bookingId,
                  empresaId: data.empresaId,
                  courtId: data.courtId,
                  branchId: courtDetails.branch_id,
                  paymentType: paymentType,
                  isPartialPayment: isPartialPayment,
                  totalAmount: data.courtPrice + (data.rentalItemsPrice || 0)
                }),
              });
              
              // Verificamos primero si la respuesta tiene un formato válido
              let responseText;
              try {
                responseText = await invoiceApiResponse.text();
              } catch (textError) {
                console.error('❌ Error al leer la respuesta como texto:', textError);
                throw new Error('Error al leer la respuesta de la API');
              }
              
              // Si la respuesta no es OK, mostrar los detalles del error
              if (!invoiceApiResponse.ok) {
                console.error(`❌ Error en API de facturación: ${invoiceApiResponse.status} - ${responseText}`);
                throw new Error(`Error en API de facturación: ${invoiceApiResponse.status} - ${responseText.substring(0, 200)}`);
              }
              
              // Intentar parsear la respuesta como JSON
              let invoiceResult;
              try {
                invoiceResult = JSON.parse(responseText);
              } catch (jsonError) {
                console.error('❌ Error al parsear la respuesta como JSON:', jsonError, 'Texto:', responseText.substring(0, 200));
                throw new Error('Respuesta de API no es un JSON válido');
              }
              
              console.log('✅ Resultado de generación de factura vía API:', invoiceResult);
              
              // No actualizamos la reserva con datos de factura ya que las columnas no existen
              if (invoiceResult.success && invoiceResult.invoiceId) {
                console.log('✅ Factura generada correctamente a través de API:', {
                  invoiceId: invoiceResult.invoiceId,
                  invoiceUrl: invoiceResult.invoiceUrl || null
                });
              }
            } catch (apiError) {
              console.error('❌ Error al comunicarse con API de facturas:', apiError);
              // No re-lanzamos el error para que no interrumpa el flujo de creación de reserva
            }
          } else {
            // Estamos en el servidor, podemos usar el servicio directamente
            const invoiceResult = await stripeInvoiceService.createManualBookingInvoice({
              stripeAccountId: stripeConnection.stripe_account_id,
              customerId: clientInfo.stripeCustomerId,
              customerEmail: clientInfo.email,
              customerName: clientInfo.name,
              amount: amount,
              description: description,
              bookingId: bookingId,
              empresaId: data.empresaId,
              courtId: data.courtId,
              branchId: courtDetails.branch_id,
              paymentType: paymentType,
              isPartialPayment: isPartialPayment,
              totalAmount: data.courtPrice + (data.rentalItemsPrice || 0)
            });
            
            console.log('✅ Resultado de generación de factura directa:', invoiceResult);
            
            if (invoiceResult.success && invoiceResult.invoiceId) {
              console.log('✅ Factura generada correctamente en el servidor:', {
                invoiceId: invoiceResult.invoiceId,
                invoiceUrl: invoiceResult.invoiceUrl || null
              });
            }
          }
        } catch (invoiceError) {
          console.error('❌ Error al generar factura para reserva:', {
            error: invoiceError,
            bookingId: bookingId
          });
          
          // Intentar obtener más información sobre el error para diagnóstico
          let errorDetails = 'Error desconocido';
          if (invoiceError instanceof Error) {
            errorDetails = invoiceError.message;
            
            // Log detallado del error para diagnóstico
            console.error('❌ Detalles del error de facturación:', {
              message: invoiceError.message,
              stack: invoiceError.stack,
              name: invoiceError.name
            });
          } else if (typeof invoiceError === 'object') {
            try {
              errorDetails = JSON.stringify(invoiceError);
            } catch (e) {
              errorDetails = 'Error no serializable: ' + Object.prototype.toString.call(invoiceError);
            }
          } else if (invoiceError !== undefined && invoiceError !== null) {
            errorDetails = String(invoiceError);
          }
          
          // Registrar el error más específicamente para análisis posterior
          console.error(`❌ Error al generar factura para reserva ${bookingId}: ${errorDetails}`);
          
          // No fallamos la creación de la reserva si hay error en la factura
        }
      } else {
        console.log('ℹ️ No se genera factura. Tipo de pago o estado no elegible:', {
          paymentType: data.paymentType,
          paymentStatus: data.paymentStatus,
          shouldGenerate: shouldGenerateInvoice
        });
      }

      return { data: { id: bookingId } };
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
  },

  // Método para obtener información del cliente para la factura
  async getClientInfoForInvoice(data: BookingCreationData, bookingId: string): Promise<{
    email: string;
    name: string;
    stripeCustomerId?: string;
  }> {
    console.log('🔍 Buscando información de cliente para factura:', {
      bookingData: data,
      bookingId
    });

    // 1. Primero verificar si hay participantes en los datos de reserva
    if (data.participants && data.participants.length > 0) {
      const participant = data.participants[0]; // Tomar el primer participante
      
      // Si tenemos un userId, intentar obtener datos del usuario desde la base de datos
      if ('userId' in participant && participant.userId || 'id' in participant && participant.id) {
        const userId = ('userId' in participant ? participant.userId : '') || ('id' in participant ? participant.id : '');
        const { data: usuario, error } = await this.getSupabase()
          .from('usuarios')
          .select('id, email, nombre')
          .eq('id', userId)
          .single();
          
        if (!error && usuario) {
          console.log('✅ Cliente encontrado en datos del participante (usuario):', usuario);
          
          // Buscar o crear cliente en Stripe
          const stripeCustomer = await this.findOrCreateStripeCustomer({
            email: usuario.email as string,
            name: usuario.nombre as string,
            empresaId: data.empresaId
          });
          
          return {
            email: usuario.email as string,
            name: usuario.nombre as string,
            stripeCustomerId: stripeCustomer?.id
          };
        } else {
          console.warn('⚠️ No se encontró usuario para el participante:', {
            userId,
            error
          });
        }
      }
      
      // Si no tenemos datos de usuario pero el participante tiene email (para el caso de participantes añadidos directamente)
      if ('email' in participant && participant.email) {
        console.log('✅ Cliente encontrado en datos del participante directo');
        
        // Determinar el nombre a partir de diferentes propiedades disponibles
        let name = 'Cliente';
        if ('firstName' in participant && 'lastName' in participant && participant.firstName && participant.lastName) {
          name = `${participant.firstName as string} ${participant.lastName as string}`;
        } else if ('firstName' in participant && participant.firstName) {
          name = participant.firstName as string;
        } else if ('name' in participant && participant.name) {
          name = participant.name as string;
        }
        
        // Buscar o crear cliente en Stripe
        const stripeCustomer = await this.findOrCreateStripeCustomer({
          email: participant.email as string,
          name,
          empresaId: data.empresaId
        });
        
        return {
          email: participant.email as string,
          name,
          stripeCustomerId: stripeCustomer?.id
        };
      }
    }
    
    // 2. Si no hay participantes, buscar en booking_participants de la reserva recién creada
    const { data: participants, error: participantsError } = await this.getSupabase()
      .from('booking_participants')
      .select(`
        id,
        user_id,
        role,
        usuarios:user_id(id, email, nombre)
      `)
      .eq('booking_id', bookingId)
      .limit(1);
      
    if (!participantsError && participants && participants.length > 0) {
      const participant = participants[0];
      const usuarioData = participant.usuarios;
      
      if (usuarioData && typeof usuarioData === 'object' && 'email' in usuarioData && usuarioData.email) {
        console.log('✅ Cliente encontrado en booking_participants:', usuarioData);
        
        const email = usuarioData.email as string;
        const nombre = ('nombre' in usuarioData && usuarioData.nombre) ? (usuarioData.nombre as string) : 'Cliente';
        
        // Buscar o crear cliente en Stripe
        const stripeCustomer = await this.findOrCreateStripeCustomer({
          email,
          name: nombre,
          empresaId: data.empresaId
        });
        
        return {
          email,
          name: nombre,
          stripeCustomerId: stripeCustomer?.id
        };
      }
    }
    
    // 3. Si todavía no tenemos cliente, buscar en stripe_customers asociados a la empresa
    if (data.empresaId) {
      const { data: stripeCustomers, error: stripeError } = await this.getSupabase()
        .from('stripe_customers')
        .select('*')
        .eq('empresa_id', data.empresaId)
        .limit(1);
        
      if (!stripeError && stripeCustomers && stripeCustomers.length > 0) {
        const customer = stripeCustomers[0];
        console.log('✅ Cliente encontrado en stripe_customers:', customer);
        
        return {
          email: (customer.email as string) || 'cliente@example.com',
          name: (customer.name as string) || 'Cliente',
          stripeCustomerId: customer.stripe_customer_id as string
        };
      }
    }
    
    // 4. Si no encontramos ninguna información de cliente, usar valores predeterminados
    console.warn('⚠️ No se encontró información de cliente, usando valores predeterminados');
    
    // Intentar crear un cliente genérico en Stripe
    const defaultEmail = 'cliente@example.com';
    const defaultName = 'Cliente';
    
    // Buscar o crear cliente en Stripe
    const stripeCustomer = await this.findOrCreateStripeCustomer({
      email: defaultEmail,
      name: defaultName,
      empresaId: data.empresaId
    });
    
    return {
      email: defaultEmail,
      name: defaultName,
      stripeCustomerId: stripeCustomer?.id
    };
  },
  
  // Método para buscar o crear un cliente en Stripe
  async findOrCreateStripeCustomer({
    email,
    name,
    empresaId
  }: {
    email: string;
    name: string;
    empresaId?: string;
  }): Promise<{id: string} | null> {
    try {
      if (!empresaId) {
        console.warn('⚠️ No se proporcionó empresaId para buscar/crear cliente Stripe');
        return null;
      }
      
      // Obtener la conexión de Stripe para esta empresa
      const { data: stripeConnection, error: stripeConnectionError } = await this.getSupabase()
        .from('stripe_connections')
        .select('stripe_account_id')
        .eq('empresa_id', empresaId)
        .single();
        
      if (stripeConnectionError || !stripeConnection || !stripeConnection.stripe_account_id) {
        console.error('❌ Error al obtener cuenta Stripe de la empresa:', stripeConnectionError || 'No se encontró conexión de Stripe');
        return null;
      }

      // Generar un ID temporal para simular un usuario
      // En un flujo real, debería ser el ID del usuario autenticado
      const tempUserId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Utilizar el endpoint de API para crear/obtener el cliente en lugar de Stripe directamente
      console.log('🔄 Buscando/creando cliente en Stripe mediante API:', {
        email,
        name,
        stripeAccountId: stripeConnection.stripe_account_id
      });
      
      // Crear customer a través del endpoint seguro
      const response = await fetch('/api/stripe/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          name,
          stripeAccountId: stripeConnection.stripe_account_id,
          userId: tempUserId,
          metadata: { 
            empresaId,
            source: 'booking_creation'
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error al crear cliente: ${errorData.error || response.statusText}`);
      }
      
      const customerData = await response.json();
      
      if (!customerData || !customerData.stripeCustomerId) {
        console.error('❌ Respuesta de API sin ID de cliente:', customerData);
        return null;
      }
      
      console.log('✅ Cliente Stripe obtenido mediante API:', customerData);
      
      return { id: customerData.stripeCustomerId };
    } catch (error) {
      console.error('❌ Error al buscar/crear cliente en Stripe:', error);
      return null;
    }
  }
}