/**
 * Servicio para transformar datos de sesiones de clases al formato requerido por el sistema de reservas
 * 
 * Este servicio mantiene la responsabilidad única de transformar los datos de las clases
 * y sesiones seleccionadas al formato esperado por bookingService.ts
 */

import type { PublicClass, ClassSession } from '@/components/classes-registration/types/models';
import type { BookingCreationData } from '@/types/bookings';
import type { PaymentMethodEnum, PaymentStatusEnum, PaymentTypeEnum } from '@/types/bookings';

interface ClassBookingTransformOptions {
  paymentMethod?: PaymentMethodEnum;
  paymentStatus?: PaymentStatusEnum;
  paymentType?: string;
  depositAmount?: number;
  empresaId?: string;
  userId?: string;
  stripePaymentMethodId?: string;
}

/**
 * Servicio para transformar datos de sesiones de clase en datos de reserva
 */
export class ClassBookingTransformService {
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
      case 'class':
        return 'booking';
      default:
        // Verificamos que el valor sea uno de los aceptados
        return (['booking', 'deposit', 'remaining', 'guarantee', 'no_show_charge'] as const).includes(paymentType as any) 
          ? paymentType as PaymentTypeEnum
          : 'booking';
    }
  }

  /**
   * Transforma los datos de una sesión de clase seleccionada en datos de reserva
   * compatibles con bookingService.createBooking()
   * 
   * @param classData - Datos de la clase seleccionada
   * @param session - Sesión específica a transformar
   * @param options - Opciones adicionales para la transformación
   * @returns Datos formateados para la creación de una reserva
   */
  static transformSessionToBookingData(
    classData: PublicClass, 
    session: ClassSession, 
    options: ClassBookingTransformOptions = {}
  ): BookingCreationData {
    if (!classData || !session) {
      throw new Error('Se requieren datos de clase y sesión válidos');
    }
    
    // Asegurarnos de que hay al menos una pista asignada
    if (!session.courts || session.courts.length === 0) {
      console.warn('La sesión no tiene pistas asignadas, esto puede causar problemas');
    }
    
    return {
      // Campos específicos para el tipo de reserva de clase
      reservationType: 'class',
      classId: classData.id,
      
      // Campos básicos de la reserva
      courtId: session.courts && session.courts.length > 0 ? session.courts[0].id : '',
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      title: `Clase: ${classData.title}`,
      description: classData.description || '',
      
      // Participantes (por ahora solo el usuario actual)
      participants: [
        {
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
          user_id: options.userId || '',
          role: 'player'
        }
      ],
      
      // Campos de precios
      courtPrice: 0, // La pista no se cobra directamente en reservas de clase
      classSessionPrice: session.price || 0, // Precio de la sesión de clase
      rentalItemsPrice: 0,
      rentalItems: [],
      
      // Campos de pago
      paymentMethod: options.paymentMethod || 'cash',
      paymentStatus: options.paymentStatus || 'pending',
      paymentType: this.normalizePaymentType(options.paymentType || 'booking'),
      depositAmount: options.depositAmount || 0,
      
      // Identificador de empresa
      empresa_id: options.empresaId,
      
      // ID del método de pago de Stripe
      stripe_payment_method_id: options.stripePaymentMethodId
    };
  }
  
  /**
   * Calcula el precio total para una lista de sesiones seleccionadas
   * 
   * @param sessions - Lista de sesiones
   * @returns Suma total de los precios de las sesiones
   */
  static calculateTotalPrice(sessions: ClassSession[]): number {
    return sessions.reduce((total, session) => total + (session.price || 0), 0);
  }
  
  /**
   * Genera un resumen de las sesiones seleccionadas para mostrar al usuario
   * 
   * @param classData - Datos de la clase
   * @param sessionIds - IDs de las sesiones seleccionadas
   * @returns Objeto con el resumen de sesiones o null si no hay datos válidos
   */
  static generateSessionsSummary(classData: PublicClass, sessionIds: string[]): any {
    if (!classData || !classData.sessions) return null;
    
    const selectedSessions = classData.sessions.filter(s => sessionIds.includes(s.id));
    
    if (selectedSessions.length === 0) return null;
    
    return {
      className: classData.title,
      sessionCount: selectedSessions.length,
      totalPrice: this.calculateTotalPrice(selectedSessions),
      sessions: selectedSessions.map(s => ({
        id: s.id,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        price: s.price || 0,
        court: s.courts && s.courts.length > 0 ? s.courts[0].name : 'Sin pista asignada',
        instructor: s.instructor || 'Sin instructor asignado'
      }))
    };
  }
  
  /**
   * Valida si los datos de clase y sesión son aptos para crear una reserva
   * 
   * @param classData - Datos de la clase
   * @param sessionIds - IDs de las sesiones seleccionadas
   * @returns Objeto con la validación {isValid: boolean, errors: string[]}
   */
  static validateSessionsForBooking(classData: PublicClass, sessionIds: string[]): {isValid: boolean, errors: string[]} {
    const errors: string[] = [];
    
    if (!classData) {
      errors.push('No se ha seleccionado ninguna clase');
      return { isValid: false, errors };
    }
    
    if (!sessionIds || sessionIds.length === 0) {
      errors.push('No se ha seleccionado ninguna sesión');
      return { isValid: false, errors };
    }
    
    if (!classData.sessions) {
      errors.push('La clase no tiene sesiones disponibles');
      return { isValid: false, errors };
    }
    
    // Verificar que todas las sesiones seleccionadas existan
    const selectedSessions = classData.sessions.filter(s => sessionIds.includes(s.id));
    if (selectedSessions.length !== sessionIds.length) {
      errors.push('Algunas sesiones seleccionadas no existen en la clase');
    }
    
    // Verificar que todas las sesiones tengan pistas asignadas
    const sessionsWithoutCourts = selectedSessions.filter(s => !s.courts || s.courts.length === 0);
    if (sessionsWithoutCourts.length > 0) {
      errors.push('Algunas sesiones no tienen pistas asignadas');
    }
    
    // Verificar que todas las sesiones tengan fecha y hora
    const incompleteTimeSessions = selectedSessions.filter(s => !s.date || !s.startTime || !s.endTime);
    if (incompleteTimeSessions.length > 0) {
      errors.push('Algunas sesiones tienen información de fecha u hora incompleta');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
} 