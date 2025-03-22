/**
 * Servicio para transformar datos de turnos al formato requerido por el sistema de reservas
 * 
 * Este servicio mantiene la responsabilidad única de transformar los datos de los turnos
 * seleccionados al formato esperado por bookingService.ts
 */

import type { BookingCreationData } from '@/types/bookings';
import type { PaymentMethodEnum, PaymentStatusEnum, PaymentTypeEnum, ReservationTypeEnum } from '@/types/bookings';

// Interfaz para representar los detalles de un turno seleccionado
export interface ShiftDetails {
  startTime: string;
  endTime: string;
  courtId: string;
  courtName: string;
  price: number;
  date: string;
}

interface ShiftBookingTransformOptions {
  paymentMethod?: PaymentMethodEnum;
  paymentStatus?: PaymentStatusEnum;
  paymentType?: string;
  depositAmount?: number;
  empresaId?: string;
  userId?: string;
  stripePaymentMethodId?: string;
  guaranteePercentage?: number;
  rentalItems?: Record<string, number>;
  rentalItemsPrice?: number;
  itemsData?: any[];
}

/**
 * Servicio para transformar datos de turnos en datos de reserva
 */
export class ShiftBookingTransformService {
  /**
   * Normaliza el tipo de pago para asegurarse de que sea compatible con la base de datos
   * 
   * @param paymentType - Tipo de pago a normalizar
   * @returns Tipo de pago normalizado
   */
  static normalizePaymentType(paymentType: string): PaymentTypeEnum {
    // Mapeamos tipos no estándar a valores aceptados por la base de datos
    switch(paymentType) {
      case 'full':
        return 'booking';
      default:
        // Verificamos que el valor sea uno de los aceptados
        return (['booking', 'deposit', 'remaining', 'guarantee', 'no_show_charge'] as const).includes(paymentType as any) 
          ? paymentType as PaymentTypeEnum
          : 'booking';
    }
  }

  /**
   * Normaliza el estado de pago para asegurarse de que sea compatible con la base de datos
   * 
   * @param paymentStatus - Estado de pago a normalizar
   * @returns Estado de pago normalizado
   */
  static normalizePaymentStatus(paymentStatus: string): PaymentStatusEnum {
    // Mapeamos estados no estándar a valores aceptados por la base de datos
    switch(paymentStatus) {
      case 'partially_paid':
        return 'partial';
      default:
        // Verificamos que el valor sea uno de los aceptados
        return (['pending', 'partial', 'completed', 'cancelled'] as const).includes(paymentStatus as any) 
          ? paymentStatus as PaymentStatusEnum
          : 'pending';
    }
  }

  /**
   * Normaliza el tipo de reserva para asegurarse de que sea compatible con la base de datos
   * 
   * @param reservationType - Tipo de reserva a normalizar
   * @returns Tipo de reserva normalizado
   */
  static normalizeReservationType(reservationType: string): ReservationTypeEnum {
    // Mapeamos tipos de reserva no estándar a valores aceptados por la base de datos
    switch(reservationType) {
      case 'normal':
      case 'shift':
        return 'booking';
      default:
        // Verificamos que el valor sea uno de los aceptados
        return (['booking', 'class'] as const).includes(reservationType as any) 
          ? reservationType as ReservationTypeEnum
          : 'booking';
    }
  }

  /**
   * Transforma los datos de un turno seleccionado en datos de reserva
   * compatibles con bookingService.createBooking()
   * 
   * @param shiftDetails - Detalles del turno seleccionado
   * @param options - Opciones adicionales para la transformación
   * @returns Datos formateados para la creación de una reserva
   */
  static transformShiftToBookingData(
    shiftDetails: ShiftDetails, 
    options: ShiftBookingTransformOptions = {}
  ): BookingCreationData {
    // Validar que los datos del turno sean válidos
    const validation = this.validateShiftForBooking(shiftDetails);
    if (!validation.isValid) {
      console.error('❌ [ShiftBookingTransformService] Datos de turno inválidos:', validation.errors);
    }
    
    // Calcular la duración del turno en minutos
    const startTime = shiftDetails.startTime?.split(':');
    const endTime = shiftDetails.endTime?.split(':');
    let durationInMinutes = 60; // Valor por defecto: 1 hora (60 minutos)
    
    if (startTime?.length === 2 && endTime?.length === 2) {
      const startHour = parseInt(startTime[0], 10);
      const startMinute = parseInt(startTime[1], 10);
      const endHour = parseInt(endTime[0], 10);
      const endMinute = parseInt(endTime[1], 10);
      
      const startTotalMinutes = startHour * 60 + startMinute;
      const endTotalMinutes = endHour * 60 + endMinute;
      
      durationInMinutes = endTotalMinutes - startTotalMinutes;
      if (durationInMinutes <= 0) {
        // Asumimos que cruza la medianoche
        durationInMinutes += 24 * 60;
      }
    }
    
    // Transformar los items alquilados al formato esperado por el RPC
    let totalItemsPrice = 0;
    const rentalItems = options.rentalItems 
      ? Object.entries(options.rentalItems).map(([itemId, quantity]) => {
          // Intentamos obtener el precio real basado en la duración
          // Si tenemos un precio total ya calculado del contexto, lo usamos en su lugar
          let pricePerUnit = 10; // Valor por defecto
          let sedeId = null;
          let empresaId = options.empresaId || '';
          
          if (options.itemsData) {
            // Buscar el item en la lista de datos de items (si está disponible)
            const itemData = options.itemsData.find(item => item.id === itemId);
            if (itemData?.duration_pricing) {
              const pricingData = typeof itemData.duration_pricing === 'string' 
                ? JSON.parse(itemData.duration_pricing) 
                : itemData.duration_pricing;
              
              // Obtener el precio para la duración exacta o la más cercana
              pricePerUnit = pricingData[durationInMinutes.toString()] || 
                            pricingData['60'] || // Duración típica (1 hora)
                            Object.values(pricingData)[0] || // Primer precio disponible
                            10; // Valor por defecto si no hay precios
            }
            
            // Obtener sede_id y empresa_id si están disponibles en los datos del item
            if (itemData?.sede_id) {
              sedeId = itemData.sede_id;
            }
            if (itemData?.empresa_id) {
              empresaId = itemData.empresa_id;
            }
          }
          
          const totalPrice = pricePerUnit * quantity;
          totalItemsPrice += totalPrice;
          
          // Log para depuración
          console.log('📋 [ShiftBookingTransformService] Transformando item para backend:', {
            itemId,
            quantity,
            pricePerUnit,
            totalPrice,
            sedeId,
            empresaId
          });
          
          // Formato específico que espera el backend para cada ítem
          // Incluimos todos los campos posibles que podría esperar el backend
          return {
            id: itemId,
            itemId: itemId,     // Mantenemos ambas propiedades para compatibilidad
            item_id: itemId,    // Variante con guión bajo por si acaso
            quantity: quantity,
            pricePerUnit: pricePerUnit,
            price_per_unit: pricePerUnit, // Variante con guión bajo
            totalPrice: totalPrice,
            total_price: totalPrice,  // Variante con guión bajo
            sede_id: sedeId,
            empresa_id: empresaId
          };
        })
      : [];
      
    // Si tenemos un precio total predefinido, lo usamos (en lugar del calculado)
    const rentalItemsPrice = options.rentalItemsPrice || totalItemsPrice;
    
    return {
      // Información básica de la reserva
      reservationType: this.normalizeReservationType('shift'),
      courtId: shiftDetails.courtId,
      date: shiftDetails.date,
      startTime: shiftDetails.startTime,
      endTime: shiftDetails.endTime,
      title: `Turno: ${shiftDetails.courtName}`,
      description: `Reserva de cancha ${shiftDetails.courtName}`,
      
      // Participantes (siempre incluye al usuario que hace la reserva)
      participants: [
        {
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
          user_id: options.userId || '',
          role: 'player'
        }
      ],
      
      // Campos de precios
      courtPrice: shiftDetails.price,
      classSessionPrice: 0, // No aplicable para turnos
      rentalItemsPrice: rentalItemsPrice,
      rentalItems: rentalItems,
      
      // Campos de pago
      paymentMethod: options.paymentMethod || 'cash',
      paymentStatus: this.normalizePaymentStatus(options.paymentStatus || 'pending'),
      paymentType: this.normalizePaymentType(options.paymentType || 'booking'),
      depositAmount: options.depositAmount || 0,
      guaranteePercentage: options.guaranteePercentage || undefined,
      
      // ID de empresa (necesario para la relación en la base de datos)
      empresaId: options.empresaId || '',
      
      // ID del método de pago de Stripe (si aplica)
      stripe_payment_method_id: options.stripePaymentMethodId || undefined
    };
  }
  
  /**
   * Valida si los datos del turno son aptos para crear una reserva
   * 
   * @param shiftDetails - Detalles del turno a validar
   * @returns Objeto con la validación {isValid: boolean, errors: string[]}
   */
  static validateShiftForBooking(shiftDetails: ShiftDetails | null): {isValid: boolean, errors: string[]} {
    const errors: string[] = [];
    
    if (!shiftDetails) {
      errors.push('No se ha seleccionado ningún turno');
      return { isValid: false, errors };
    }
    
    if (!shiftDetails.courtId) {
      errors.push('El turno no tiene una cancha asignada');
    }
    
    if (!shiftDetails.date) {
      errors.push('El turno no tiene una fecha asignada');
    }
    
    if (!shiftDetails.startTime || !shiftDetails.endTime) {
      errors.push('El turno no tiene horario definido');
    }
    
    return { 
      isValid: errors.length === 0,
      errors 
    };
  }
}

// Exportamos una instancia por defecto para facilitar su uso
export const shiftBookingTransformService = ShiftBookingTransformService;
