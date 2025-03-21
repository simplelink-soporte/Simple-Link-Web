import { format } from 'date-fns';
import bookingTransformer from './bookingTransformerService';

interface TimeRange {
  start: string;
  end: string;
}

/**
 * Servicio especializado en la generación y validación de slots de tiempo
 */
class TimeSlotService {
  private static instance: TimeSlotService;

  private constructor() {}

  public static getInstance(): TimeSlotService {
    if (!TimeSlotService.instance) {
      TimeSlotService.instance = new TimeSlotService();
    }
    return TimeSlotService.instance;
  }

  /**
   * Genera slots de tiempo basados en rangos y duración
   */
  public generateTimeSlots(
    timeRanges: { openTime: string; closeTime: string }[],
    durationInMinutes: number,
    court: any,
    bookings: any[],
    date: Date,
    timezone: string = 'UTC'
  ): TimeRange[] {
    console.log(`TimeSlotService - Generando slots:`, {
      courtName: court.name,
      timeRanges: timeRanges.map(r => `${r.openTime}-${r.closeTime}`),
      durationInMinutes
    });

    // Usar gaps más eficientes basados en los rangos y las reservas
    const slots: TimeRange[] = [];
    
    timeRanges.forEach(range => {
      const rangeStartMinutes = bookingTransformer.timeToMinutes(range.openTime);
      const rangeEndMinutes = bookingTransformer.timeToMinutes(range.closeTime);

      // Filtrar las reservas que están dentro de este rango por pista
      const relevantBookings = bookings.filter(booking => 
        booking.court_id === court.id && 
        booking.date === format(date, 'yyyy-MM-dd')
      );

      // Encontrar huecos disponibles en este rango horario
      const gaps = this.findAvailableGaps(rangeStartMinutes, rangeEndMinutes, relevantBookings, date);

      // Para cada gap, generar slots de la duración especificada
      gaps.forEach(gap => {
        let slotStart = gap.start;
        
        while (this.canCreateSlot(
          bookingTransformer.minutesToTime(slotStart), 
          bookingTransformer.minutesToTime(slotStart + durationInMinutes), 
          durationInMinutes)
          && slotStart + durationInMinutes <= gap.end) {
          
          const startTime = bookingTransformer.minutesToTime(slotStart);
          const endTime = bookingTransformer.minutesToTime(slotStart + durationInMinutes);
          
          slots.push({
            start: startTime,
            end: endTime
          });
          
          // Incrementar en intervalos más cortos para mayor granularidad
          slotStart += 30; // Incrementar de media en media hora
        }
      });
    });

    // Ordenar slots por hora de inicio
    return slots.sort((a, b) => 
      bookingTransformer.timeToMinutes(a.start) - bookingTransformer.timeToMinutes(b.start)
    );
  }

  /**
   * Encuentra huecos disponibles entre reservas
   */
  private findAvailableGaps(
    rangeStartMinutes: number,
    rangeEndMinutes: number,
    bookings: any[],
    date: Date
  ): Array<{start: number, end: number}> {
    // Ordenar las reservas por hora de inicio
    const sortedBookings = [...bookings].sort((a, b) => {
      // Convertir a minutos para comparación, considerando que ahora son timestamps
      const aStart = bookingTransformer.extractTimeMinutesFromTimestamp(a.start_time);
      const bStart = bookingTransformer.extractTimeMinutesFromTimestamp(b.start_time);
      return aStart - bStart;
    });

    const gaps: Array<{start: number, end: number}> = [];
    let currentStart = rangeStartMinutes;

    // Procesar cada reserva para encontrar gaps
    sortedBookings.forEach(booking => {
      const bookingStart = bookingTransformer.extractTimeMinutesFromTimestamp(booking.start_time);
      const bookingEnd = bookingTransformer.extractTimeMinutesFromTimestamp(booking.end_time);

      // Si hay espacio antes de la reserva, agregar gap
      if (currentStart < bookingStart) {
        gaps.push({
          start: currentStart,
          end: bookingStart
        });
      }

      currentStart = Math.max(currentStart, bookingEnd);
    });

    // Agregar el último gap si queda espacio
    if (currentStart < rangeEndMinutes) {
      gaps.push({
        start: currentStart,
        end: rangeEndMinutes
      });
    }

    return gaps;
  }

  /**
   * Comprueba si un slot puede ser creado basado en su duración
   */
  private canCreateSlot(start: string, end: string, durationInMinutes: number): boolean {
    const startMinutes = bookingTransformer.timeToMinutes(start);
    const endMinutes = bookingTransformer.timeToMinutes(end);
    const actualDuration = endMinutes - startMinutes;
    
    return actualDuration === durationInMinutes;
  }

  /**
   * Verifica si un slot de tiempo está disponible
   */
  public isTimeSlotAvailable(
    startTime: string,
    endTime: string,
    bookings: any[],
    date: Date,
    courtId: string,
    timezone: string = 'UTC',
    timeRanges: { openTime: string; closeTime: string; }[] = []
  ): boolean {
    const slotStartMinutes = bookingTransformer.timeToMinutes(startTime);
    const slotEndMinutes = bookingTransformer.timeToMinutes(endTime);

    // Verificar que el slot está dentro de alguno de los rangos de horarios de apertura
    if (timeRanges.length > 0) {
      let isWithinOpeningHours = false;
      
      for (const range of timeRanges) {
        const rangeStartMinutes = bookingTransformer.timeToMinutes(range.openTime);
        const rangeEndMinutes = bookingTransformer.timeToMinutes(range.closeTime);
        
        // El slot está disponible si está completamente dentro del rango
        if (slotStartMinutes >= rangeStartMinutes && slotEndMinutes <= rangeEndMinutes) {
          isWithinOpeningHours = true;
          break;
        }
      }
      
      if (!isWithinOpeningHours) {
        console.log('TimeSlotService - Slot fuera de horarios de apertura:', {
          slot: { start: startTime, end: endTime },
          timeRanges: timeRanges.map(r => `${r.openTime}-${r.closeTime}`)
        });
        return false;
      }
    }

    // Filtrar reservas del mismo día y pista
    const relevantBookings = bookings.filter(booking => 
      booking.court_id === courtId && 
      booking.date === format(date, 'yyyy-MM-dd')
    );

    // Verificar si el slot se solapa con alguna reserva
    const hasOverlap = relevantBookings.some(booking => {
      // Convertir los horarios de la reserva a la zona horaria local
      const localStartTime = bookingTransformer.convertBookingTimeToLocal(booking.start_time, timezone, date);
      const localEndTime = bookingTransformer.convertBookingTimeToLocal(booking.end_time, timezone, date);
      
      const bookingStartMinutes = bookingTransformer.timeToMinutes(localStartTime);
      const bookingEndMinutes = bookingTransformer.timeToMinutes(localEndTime);

      // Un slot está disponible si:
      // 1. Termina antes o en el inicio de la reserva, o
      // 2. Comienza después o en el final de la reserva
      const overlaps = !(
        slotEndMinutes <= bookingStartMinutes ||
        slotStartMinutes >= bookingEndMinutes
      );

      if (overlaps) {
        console.log('TimeSlotService - Solapamiento detectado:', {
          slot: { start: startTime, end: endTime },
          booking: { 
            original: { 
              start: booking.start_time, 
              end: booking.end_time,
              type: typeof booking.start_time
            },
            convertido: { start: localStartTime, end: localEndTime }
          }
        });
      }

      return overlaps;
    });

    return !hasOverlap;
  }

  /**
   * Encuentra rangos de tiempo disponibles combinando horarios y reservas
   */
  public findAvailableRanges(
    timeRanges: { openTime: string; closeTime: string; }[],
    courtBookings: any[],
    date: Date,
    timezone: string = 'UTC'
  ): Array<{ start: string; end: string; }> {
    const ranges: Array<{ start: string; end: string; }> = [];
    
    // Filtrar y ordenar reservas una sola vez
    const sortedBookings = courtBookings
      .filter(booking => booking.date === format(date, 'yyyy-MM-dd'))
      .sort((a, b) => {
        // Convertir los horarios de las reservas a la zona horaria local
        const aStartLocal = bookingTransformer.convertBookingTimeToLocal(a.start_time, timezone, date);
        const bStartLocal = bookingTransformer.convertBookingTimeToLocal(b.start_time, timezone, date);
        return bookingTransformer.timeToMinutes(aStartLocal) - bookingTransformer.timeToMinutes(bStartLocal);
      });

    // Procesar cada rango de horarios por separado
    timeRanges.forEach(range => {
      const rangeStartMinutes = bookingTransformer.timeToMinutes(range.openTime);
      const rangeEndMinutes = bookingTransformer.timeToMinutes(range.closeTime);
      const rangeBookings: any[] = [];

      // Filtrar las reservas que intersectan con este rango específico
      for (const booking of sortedBookings) {
        const bookingStartLocal = bookingTransformer.convertBookingTimeToLocal(booking.start_time, timezone, date);
        const bookingEndLocal = bookingTransformer.convertBookingTimeToLocal(booking.end_time, timezone, date);
        
        const bookingStartMinutes = bookingTransformer.timeToMinutes(bookingStartLocal);
        const bookingEndMinutes = bookingTransformer.timeToMinutes(bookingEndLocal);

        // Verificar si la reserva intersecta con este rango
        if (!(bookingEndMinutes <= rangeStartMinutes || bookingStartMinutes >= rangeEndMinutes)) {
          rangeBookings.push({
            ...booking,
            // Guardamos las versiones convertidas para no tener que convertirlas de nuevo
            startLocal: bookingStartLocal,
            endLocal: bookingEndLocal,
            startMinutes: bookingStartMinutes,
            endMinutes: bookingEndMinutes
          });
        }
      }

      // Si no hay reservas en este rango, agregar el rango completo
      if (rangeBookings.length === 0) {
        ranges.push({ start: range.openTime, end: range.closeTime });
        return; // Continuar con el siguiente rango
      }

      let currentStartMinutes = rangeStartMinutes;

      // Procesar cada reserva dentro de este rango
      for (let i = 0; i < rangeBookings.length; i++) {
        const booking = rangeBookings[i];
        
        // Agregar rango antes de la reserva si hay espacio
        if (currentStartMinutes < booking.startMinutes) {
          const rangeSize = booking.startMinutes - currentStartMinutes;
          console.log(`TimeSlotService - Evaluando rango antes de reserva:`, {
            start: bookingTransformer.minutesToTime(currentStartMinutes),
            end: booking.startLocal,
            size: rangeSize
          });
          
          ranges.push({
            start: bookingTransformer.minutesToTime(currentStartMinutes),
            end: booking.startLocal
          });
        }

        currentStartMinutes = booking.endMinutes;

        // Procesar espacio entre reservas
        if (i < rangeBookings.length - 1) {
          const nextBooking = rangeBookings[i + 1];
          
          if (booking.endMinutes < nextBooking.startMinutes) {
            const gapSize = nextBooking.startMinutes - booking.endMinutes;
            console.log(`TimeSlotService - Evaluando espacio entre reservas:`, {
              start: booking.endLocal,
              end: nextBooking.startLocal,
              size: gapSize,
              booking: {
                original: {
                  start: booking.start_time,
                  end: booking.end_time
                },
                convertido: {
                  start: booking.startLocal,
                  end: booking.endLocal
                }
              }
            });
            
            ranges.push({
              start: booking.endLocal,
              end: nextBooking.startLocal
            });
          }
        }
      }

      // Agregar rango final si hay espacio después de la última reserva
      if (currentStartMinutes < rangeEndMinutes) {
        const finalRangeSize = rangeEndMinutes - currentStartMinutes;
        console.log(`TimeSlotService - Evaluando rango final:`, {
          start: bookingTransformer.minutesToTime(currentStartMinutes),
          end: range.closeTime,
          size: finalRangeSize
        });
        
        ranges.push({
          start: bookingTransformer.minutesToTime(currentStartMinutes),
          end: range.closeTime
        });
      }
    });

    // Filtrar rangos demasiado cortos
    const filteredRanges = ranges.filter(range => {
      const duration = bookingTransformer.timeToMinutes(range.end) - bookingTransformer.timeToMinutes(range.start);
      return duration >= 30;
    });

    console.log(`TimeSlotService - Rangos disponibles después de filtrado:`, {
      totalRanges: filteredRanges.length,
      ranges: filteredRanges
    });

    // No fusionamos rangos entre diferentes horarios de apertura/cierre
    return filteredRanges;
  }

  /**
   * Fusiona rangos de tiempo que se solapan
   */
  public mergeOverlappingRanges(
    ranges: Array<{ start: string; end: string }>,
    timeRanges: { openTime: string; closeTime: string; }[] = [],
    limitByTimeRanges: boolean = false
  ): Array<{ start: string; end: string }> {
    // Si no hay rangos que fusionar, devolver array vacío
    if (!ranges.length) return [];
    
    // Si limitamos por timeRanges, solo fusionamos rangos dentro del mismo timeRange
    if (limitByTimeRanges) {
      const result: Array<{ start: string; end: string; }> = [];
      
      // Para cada timeRange, fusionar los rangos que estén dentro
      timeRanges.forEach(timeRange => {
        const rangeStartMinutes = bookingTransformer.timeToMinutes(timeRange.openTime);
        const rangeEndMinutes = bookingTransformer.timeToMinutes(timeRange.closeTime);
        
        // Filtrar los rangos que están dentro de este timeRange
        const rangesInThisTimeRange = ranges.filter(range => {
          const startMinutes = bookingTransformer.timeToMinutes(range.start);
          const endMinutes = bookingTransformer.timeToMinutes(range.end);
          
          return startMinutes >= rangeStartMinutes && endMinutes <= rangeEndMinutes;
        });
        
        // Fusionar estos rangos
        if (rangesInThisTimeRange.length > 0) {
          const mergedRangesInThisTimeRange = this.mergeOverlappingRanges(rangesInThisTimeRange);
          result.push(...mergedRangesInThisTimeRange);
        }
      });
      
      return result;
    }

    // Ordenar rangos por tiempo de inicio
    const sortedRanges = [...ranges].sort((a, b) => 
      bookingTransformer.timeToMinutes(a.start) - bookingTransformer.timeToMinutes(b.start)
    );
    
    const mergedRanges: Array<{ start: string; end: string }> = [];
    let currentRange = sortedRanges[0];
    
    // Iterar por los rangos ordenados y fusionar los que se solapan
    for (let i = 1; i < sortedRanges.length; i++) {
      const nextRange = sortedRanges[i];
      const currentEndMinutes = bookingTransformer.timeToMinutes(currentRange.end);
      const nextStartMinutes = bookingTransformer.timeToMinutes(nextRange.start);
      
      // Si los rangos se solapan, fusionarlos
      if (nextStartMinutes <= currentEndMinutes) {
        const nextEndMinutes = bookingTransformer.timeToMinutes(nextRange.end);
        const currentEndMinutes = bookingTransformer.timeToMinutes(currentRange.end);
        
        // Tomar el tiempo de finalización más tardío
        if (nextEndMinutes > currentEndMinutes) {
          currentRange.end = nextRange.end;
        }
      } else {
        // Si no se solapan, guardar el rango actual y pasar al siguiente
        mergedRanges.push(currentRange);
        currentRange = nextRange;
      }
    }
    
    // Agregar el último rango
    mergedRanges.push(currentRange);
    
    return mergedRanges;
  }
}

export default TimeSlotService.getInstance();
