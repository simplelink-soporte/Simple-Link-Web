import { format } from 'date-fns';
import bookingTransformer from './bookingTransformerService';
import { TimeRange } from '@/types/availability';

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
   * Calcula los rangos de tiempo disponibles para un día y horario específicos
   */
  public calculateAvailableRanges(
    timeRanges: Array<{ openTime: string; closeTime: string }>,
    existingBookings: any[],
    courtId: string,
    date: Date,
    timezone: string = 'UTC'
  ): TimeRange[] {
    console.log('TimeSlotService - calculateAvailableRanges:', { 
      rangos: timeRanges.map(r => `${r.openTime}-${r.closeTime}`),
      courtId,
      date: format(date, 'yyyy-MM-dd'),
      bookingsCount: existingBookings.length 
    });
    
    // Filtrar bookings relevantes para esta cancha
    const relevantBookings = existingBookings.filter(booking => 
      booking.court_id === courtId && 
      booking.date === format(date, 'yyyy-MM-dd')
    );
    
    // Si no hay rangos definidos, no hay disponibilidad
    if (!timeRanges || timeRanges.length === 0) {
      console.log('TimeSlotService - No hay rangos horarios definidos para esta fecha');
      return [];
    }
    
    // Si no hay reservas, devolver todos los rangos completos
    if (relevantBookings.length === 0) {
      console.log('TimeSlotService - No hay reservas para esta cancha, devolviendo rangos completos');
      return timeRanges.map(range => ({ 
        start: range.openTime, 
        end: range.closeTime 
      }));
    }
    
    // Usar findAvailableRanges para procesar las reservas existentes
    return this.findAvailableRanges(
      timeRanges,
      relevantBookings,
      date,
      timezone
    );
  }

  /**
   * Genera slots de tiempo basados en los rangos disponibles
   */
  public generateTimeSlots(
    timeRanges: TimeRange[],
    durationInMinutes: number,
    courtId: string,
    date: Date,
    courtName: string,
    courtType: string,
    timezone: string = 'UTC'
  ): Array<{
    id: string;
    startTime: string;
    endTime: string;
    courtId: string;
    courtName: string;
    courtType: string;
    date: string;
  }> {
    console.log(`TimeSlotService - Generando slots:`, {
      courtName,
      timeRanges: timeRanges.map(r => `${r.start}-${r.end}`),
      durationInMinutes,
      timezone
    });
    
    const slots: Array<{
      id: string;
      startTime: string;
      endTime: string;
      courtId: string;
      courtName: string;
      courtType: string;
      date: string;
    }> = [];
    
    const formattedDate = format(date, 'yyyy-MM-dd');
    const SLOT_INTERVAL = 30; // Intervalo fijo de 30 minutos entre slots
    
    // Para cada rango disponible, generar slots
    timeRanges.forEach(range => {
      // Convertir los tiempos a minutos para facilitar cálculos
      const rangeStartMinutes = bookingTransformer.timeToMinutes(range.start);
      const rangeEndMinutes = bookingTransformer.timeToMinutes(range.end);
      
      // Para rangos cortos (menos de la duración solicitada), no generar slots
      if (rangeEndMinutes - rangeStartMinutes < durationInMinutes) {
        console.log('TimeSlotService - Rango demasiado corto para generar slots:', {
          range: `${range.start}-${range.end}`,
          duracionRango: rangeEndMinutes - rangeStartMinutes,
          duracionRequerida: durationInMinutes
        });
        return;
      }

      // Generar slots en intervalos de 30 minutos
      for (let currentMinute = rangeStartMinutes; currentMinute + durationInMinutes <= rangeEndMinutes; currentMinute += SLOT_INTERVAL) {
        // Convertir de minutos a strings de tiempo
        const startTime = bookingTransformer.minutesToTime(currentMinute);
        const endTime = bookingTransformer.minutesToTime(currentMinute + durationInMinutes);
        
        // Crear un ID único para el slot con un sufijo aleatorio para garantizar unicidad
        // Generamos un número aleatorio de 5 dígitos (10000-99999) como sufijo
        const randomSuffix = Math.floor(10000 + Math.random() * 90000);
        const slotId = `${courtId}-${formattedDate}-${startTime}-${randomSuffix}`;
        
        // Crear el objeto de slot
        slots.push({
          id: slotId,
          startTime,
          endTime,
          courtId,
          courtName,
          courtType,
          date: formattedDate
        });
      }
    });
    
    console.log(`TimeSlotService - Total de slots generados: ${slots.length}`);
    
    return slots;
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

    // Filtrar reservas del mismo día y pista - IMPORTANTE incluir todas las reservas válidas
    const relevantBookings = bookings.filter(booking => 
      booking.court_id === courtId && 
      booking.date === format(date, 'yyyy-MM-dd')
    );
    
    if (relevantBookings.length === 0) {
      return true; // No hay reservas para esta cancha en este día
    }

    console.log(`TimeSlotService - Verificando disponibilidad para slot ${startTime}-${endTime}, cancha ${courtId}. Hay ${relevantBookings.length} reservas a considerar.`);

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
      // Por lo tanto, hay solapamiento si no se cumple ninguna de esas condiciones
      const overlaps = !(
        slotEndMinutes <= bookingStartMinutes ||
        slotStartMinutes >= bookingEndMinutes
      );

      if (overlaps) {
        console.log(`TimeSlotService - SOLAPAMIENTO DETECTADO para slot ${startTime}-${endTime}, cancha ${courtId}. Reserva ${booking.id} (estado: ${booking.payment_status})`, {
          slot: { start: startTime, end: endTime, startMinutes: slotStartMinutes, endMinutes: slotEndMinutes },
          booking: { 
            id: booking.id,
            estado: booking.payment_status,
            original: { 
              start: booking.start_time,
              end: booking.end_time
            },
            convertido: {
              start: localStartTime, 
              end: localEndTime,
              startMinutes: bookingStartMinutes,
              endMinutes: bookingEndMinutes 
            }
          }
        });
      }

      return overlaps;
    });

    if (!hasOverlap) {
      console.log(`TimeSlotService - Slot ${startTime}-${endTime} para cancha ${courtId} está DISPONIBLE.`);
    }

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
    
    console.log('TimeSlotService - findAvailableRanges iniciando:', {
      fecha: format(date, 'yyyy-MM-dd'),
      cantidadRangos: timeRanges.length,
      cantidadReservas: courtBookings.length,
      zonaHoraria: timezone,
      reservas: courtBookings.map(b => ({
        id: b.id,
        estado: b.payment_status,
        inicio: b.start_time,
        fin: b.end_time
      }))
    });
    
    // Filtrar las reservas solo para la fecha actual y ordenarlas
    const sortedBookings = courtBookings
      .filter(booking => {
        const isRelevant = booking.date === format(date, 'yyyy-MM-dd');
        if (!isRelevant) {
          console.log(`TimeSlotService - Excluyendo reserva ${booking.id} por fecha diferente:`, {
            reservaFecha: booking.date,
            fechaBuscada: format(date, 'yyyy-MM-dd')
          });
        }
        return isRelevant;
      })
      .sort((a, b) => {
        // Convertir los horarios de las reservas a la zona horaria de la sede
        const aStartLocal = bookingTransformer.convertBookingTimeToLocal(a.start_time, timezone, date);
        const bStartLocal = bookingTransformer.convertBookingTimeToLocal(b.start_time, timezone, date);
        return bookingTransformer.timeToMinutes(aStartLocal) - bookingTransformer.timeToMinutes(bStartLocal);
      });
    
    console.log('TimeSlotService - Reservas filtradas y ordenadas:', {
      cantidad: sortedBookings.length,
      zonaHoraria: timezone,
      reservas: sortedBookings.map(b => ({
        id: b.id,
        estado: b.payment_status,
        inicio_original: b.start_time,
        fin_original: b.end_time,
        inicio_local: bookingTransformer.convertBookingTimeToLocal(b.start_time, timezone, date),
        fin_local: bookingTransformer.convertBookingTimeToLocal(b.end_time, timezone, date)
      }))
    });

    // Procesar cada rango de horarios por separado
    timeRanges.forEach(range => {
      // Convertir los horarios de inicio y fin del rango a minutos para facilitar los cálculos
      const rangeStartMinutes = bookingTransformer.timeToMinutes(range.openTime);
      const rangeEndMinutes = bookingTransformer.timeToMinutes(range.closeTime);
      
      console.log(`TimeSlotService - Procesando rango horario:`, {
        rango: `${range.openTime} - ${range.closeTime}`,
        minutos: `${rangeStartMinutes} - ${rangeEndMinutes}`,
        zonaHoraria: timezone
      });
      
      // Filtrar solo las reservas que intersectan con este rango específico
      const rangeBookings: any[] = [];

      // Filtrar las reservas que intersectan con este rango específico
      for (const booking of sortedBookings) {
        // Convertir los tiempos de la reserva a la zona horaria de la sede
        const bookingStartLocal = bookingTransformer.convertBookingTimeToLocal(booking.start_time, timezone, date);
        const bookingEndLocal = bookingTransformer.convertBookingTimeToLocal(booking.end_time, timezone, date);
        
        const bookingStartMinutes = bookingTransformer.timeToMinutes(bookingStartLocal);
        const bookingEndMinutes = bookingTransformer.timeToMinutes(bookingEndLocal);

        // Una reserva intersecta con el rango si su inicio está antes del fin del rango
        // y su fin está después del inicio del rango
        const isIntersecting = !(bookingEndMinutes <= rangeStartMinutes || bookingStartMinutes >= rangeEndMinutes);
        
        if (isIntersecting) {
          console.log(`TimeSlotService - Reserva ${booking.id} (${booking.payment_status}) intersecta con rango ${range.openTime}-${range.closeTime}:`, {
            rangoHorario: `${range.openTime} - ${range.closeTime}`,
            reservaOriginal: `${booking.start_time} - ${booking.end_time}`,
            reservaLocal: `${bookingStartLocal} - ${bookingEndLocal}`,
            minutos: {
              rangoInicio: rangeStartMinutes,
              rangoFin: rangeEndMinutes,
              reservaInicio: bookingStartMinutes,
              reservaFin: bookingEndMinutes
            }
          });
          
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

      // Si no hay reservas en este rango, agregar el rango completo como disponible
      if (rangeBookings.length === 0) {
        console.log(`TimeSlotService - No hay reservas en rango ${range.openTime}-${range.closeTime}, añadiendo rango completo`);
        ranges.push({ start: range.openTime, end: range.closeTime });
        return; // Continuar con el siguiente rango
      }

      // Inicializar desde el inicio del rango
      let currentStartMinutes = rangeStartMinutes;

      // Procesar cada reserva dentro de este rango para encontrar los huecos disponibles
      for (let i = 0; i < rangeBookings.length; i++) {
        const booking = rangeBookings[i];
        
        // Agregar hueco disponible antes de la reserva actual (si existe)
        if (currentStartMinutes < booking.startMinutes) {
          const rangeSize = booking.startMinutes - currentStartMinutes;
          console.log(`TimeSlotService - Añadiendo rango disponible antes de reserva:`, {
            inicio: bookingTransformer.minutesToTime(currentStartMinutes),
            fin: booking.startLocal,
            duracion: rangeSize,
            reservaId: booking.id
          });
          
          ranges.push({
            start: bookingTransformer.minutesToTime(currentStartMinutes),
            end: booking.startLocal
          });
        }

        // Avanzar el tiempo actual al final de la reserva actual
        currentStartMinutes = booking.endMinutes;

        // Procesar hueco entre la reserva actual y la siguiente (si existe)
        if (i < rangeBookings.length - 1) {
          const nextBooking = rangeBookings[i + 1];
          
          // Si hay un hueco entre reservas, añadirlo como disponible
          if (booking.endMinutes < nextBooking.startMinutes) {
            const gapSize = nextBooking.startMinutes - booking.endMinutes;
            console.log(`TimeSlotService - Añadiendo hueco entre reservas:`, {
              inicio: booking.endLocal,
              fin: nextBooking.startLocal,
              duracion: gapSize,
              reservaActual: booking.id,
              reservaSiguiente: nextBooking.id
            });
            
            ranges.push({
              start: booking.endLocal,
              end: nextBooking.startLocal
            });
          }
        }
      }

      // Agregar hueco disponible después de la última reserva (si existe)
      if (currentStartMinutes < rangeEndMinutes) {
        const finalRangeSize = rangeEndMinutes - currentStartMinutes;
        console.log(`TimeSlotService - Añadiendo rango final después de última reserva:`, {
          inicio: bookingTransformer.minutesToTime(currentStartMinutes),
          fin: range.closeTime,
          duracion: finalRangeSize
        });
        
        ranges.push({
          start: bookingTransformer.minutesToTime(currentStartMinutes),
          end: range.closeTime
        });
      }
    });

    // Filtrar rangos demasiado cortos (menos de 15 minutos) y eliminar duplicados
    const filteredRanges = ranges.filter(range => {
      const startMinutes = bookingTransformer.timeToMinutes(range.start);
      const endMinutes = bookingTransformer.timeToMinutes(range.end);
      return endMinutes - startMinutes >= 15; // Mínimo 15 minutos para considerarlo útil
    });
    
    console.log(`TimeSlotService - Rangos disponibles encontrados:`, {
      cantidad: filteredRanges.length,
      rangos: filteredRanges.map(r => `${r.start}-${r.end}`)
    });
    
    return filteredRanges;
  }

  /**
   * Elimina rangos duplicados de la lista
   */
  private removeDuplicateRanges(ranges: Array<{ start: string; end: string; }>): Array<{ start: string; end: string; }> {
    const uniqueRanges: Array<{ start: string; end: string; }> = [];
    const rangeMap = new Map<string, { start: string; end: string; }>();
    
    // Usar un Map para eliminar duplicados basados en la concatenación de start-end
    ranges.forEach(range => {
      const key = `${range.start}-${range.end}`;
      if (!rangeMap.has(key)) {
        // Verificar que el rango tenga al menos 30 minutos
        const duration = bookingTransformer.timeToMinutes(range.end) - bookingTransformer.timeToMinutes(range.start);
        if (duration >= 30) {
          rangeMap.set(key, range);
        }
      }
    });
    
    // Convertir el Map de vuelta a un array
    rangeMap.forEach(range => {
      uniqueRanges.push(range);
    });
    
    return uniqueRanges;
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
