import { format } from 'date-fns';
import bookingTransformer from './bookingTransformerService';

interface CustomTimeRange {
  startTime: string;
  endTime: string;
  percentage: number;
}

/**
 * Servicio especializado en cálculo de precios para reservas
 */
class PricingService {
  private static instance: PricingService;

  private constructor() {}

  public static getInstance(): PricingService {
    if (!PricingService.instance) {
      PricingService.instance = new PricingService();
    }
    return PricingService.instance;
  }

  /**
   * Calcula el precio para una reserva basado en la pista, duración y hora
   */
  public calculatePrice(court: any, durationInMinutes: number, startTime: string, date: Date): number | null {
    // Obtener precio base
    const durationPricing = court.duration_pricing;
    if (!durationPricing) return null;

    let basePrice = durationPricing[durationInMinutes.toString()];
    if (!basePrice) return null;

    // Verificar precios personalizados
    if (court.custom_pricing) {
      const dayOfWeek = format(date, 'i'); // Obtiene número de día (1-7, donde 1 es lunes)
      const customPricing = court.custom_pricing[dayOfWeek];

      if (customPricing?.isSelected && customPricing.timeRanges) {
        // Convertir hora de inicio a minutos para comparación
        const startMinutes = bookingTransformer.timeToMinutes(startTime);

        // Buscar si el horario cae en algún rango personalizado
        const matchingRange = customPricing.timeRanges.find((range: CustomTimeRange) => {
          const rangeStartMinutes = bookingTransformer.timeToMinutes(range.startTime);
          const rangeEndMinutes = bookingTransformer.timeToMinutes(range.endTime);
          return startMinutes >= rangeStartMinutes && startMinutes < rangeEndMinutes;
        });

        // Aplicar porcentaje si encontramos un rango que coincida
        if (matchingRange) {
          const adjustment = basePrice * (matchingRange.percentage / 100);
          basePrice += adjustment;
        }
      }
    }

    console.log('PricingService - Calculando precio:', {
      courtName: court.name,
      durationInMinutes,
      basePrice,
      date: format(date, 'yyyy-MM-dd'),
      startTime,
      customPricing: court.custom_pricing
    });

    return basePrice;
  }

  /**
   * Determina el estado de popularidad de un slot basado en la hora
   */
  public determineStatus(
    timeSlot: string,
    bookings: any[],
    date: Date
  ): 'available' | 'popular' | 'lastCall' {
    const hour = parseInt(timeSlot.split(':')[0]);
    
    if (hour >= 17 && hour <= 20) return 'popular';
    if (hour >= 21) return 'lastCall';
    return 'available';
  }
}

export default PricingService.getInstance();
