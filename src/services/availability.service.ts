import { createClient } from '@supabase/supabase-js';
import { format, addMinutes, parseISO, isWithinInterval } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { DateTime } from 'luxon';
import { 
  AvailabilityParams, 
  AvailabilitySlot, 
  TimeRange, 
  HoldReservation,
  OpeningHours,
  DaySchedule
} from '@/types/availability';
import { TIME_SLOTS, TIME_RANGES, HOLD_DURATION } from '@/config/availability';

// Inicializar cliente de Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface TimeSlot {
  start: string;
  end: string;
  isAvailable: boolean;
  price: number;
}

interface CustomTimeRange {
  startTime: string;
  endTime: string;
  percentage: number;
}

interface BranchSchedule {
  schedule: OpeningHours;
  timezone: string;
}

class AvailabilityService {
  private static instance: AvailabilityService;
  private holdReservations: Map<string, HoldReservation> = new Map();

  private constructor() {
    setInterval(() => this.cleanupExpiredHolds(), 60000);
  }

  public static getInstance(): AvailabilityService {
    if (!AvailabilityService.instance) {
      AvailabilityService.instance = new AvailabilityService();
    }
    return AvailabilityService.instance;
  }

  private generateSlotId(courtId: string, date: string, startTime: string): string {
    return `${courtId}-${date}-${startTime}`;
  }

  private async getCourts(params?: { courtType?: string, branchId: string }) {
    console.log('AvailabilityService - getCourts - params:', params);
    const query = supabase.from('courts')
      .select('*')
      .eq('is_active', true)
      .eq('branch_id', params?.branchId);
    
    if (params?.courtType) {
      query.eq('court_type', params.courtType);
    }

    const { data: courts, error } = await query;
    console.log('AvailabilityService - getCourts - resultado:', { courts, error });
    
    if (error) throw error;
    return courts;
  }

  private async getBookings(date: Date, courtIds: string[]) {
    console.log('AvailabilityService - getBookings - params:', { date, courtIds });
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('date', format(date, 'yyyy-MM-dd'))
      .in('court_id', courtIds)
      .neq('payment_status', 'cancelled');

    console.log('AvailabilityService - getBookings - resultado:', { bookings, error });
    if (error) throw error;
    return bookings;
  }

  // Nuevo método para obtener clases programadas para una fecha y canchas específicas
  private async getClassSchedules(date: Date, courtIds: string[], branchId: string) {
    console.log('AvailabilityService - getClassSchedules - params:', { date, courtIds, branchId });
    
    // Obtener el día de la semana (0: domingo, 1: lunes, ..., 6: sábado)
    const dayOfWeek = date.getDay();
    const formattedDate = format(date, 'yyyy-MM-dd');
    
    const { data: classes, error } = await supabase
      .from('classes')
      .select('*')
      .eq('branch_id', branchId)
      .eq('status', 'active')
      .lte('start_date', formattedDate);
    
    console.log('AvailabilityService - getClassSchedules - classes raw:', classes);
    
    if (error) {
      console.error('AvailabilityService - getClassSchedules - error:', error);
      return [];
    }
    
    if (!classes || classes.length === 0) {
      return [];
    }
    
    // Filtrar las clases relevantes (con sesiones regulares o específicas para esta fecha)
    const relevantClasses = classes.filter(classItem => {
      // Verificar si tiene sesiones específicas para esta fecha
      const hasSpecificSessions = classItem.schedule_config?.specificSessions?.some((session: any) => {
        if (session.date !== formattedDate) return false;
        
        // Verificar si la sesión específica usa alguna de las canchas especificadas
        const sessionCourtIds = Array.isArray(session.courtIds) 
          ? session.courtIds 
          : [session.courtIds];
          
        return sessionCourtIds.some((id: string) => courtIds.includes(id));
      });
      
      // Si tiene sesiones específicas para esta fecha, incluirla
      if (hasSpecificSessions) {
        console.log('AvailabilityService - Clase incluida por sesiones específicas:', {
          classId: classItem.id,
          className: classItem.name,
          date: formattedDate
        });
        return true;
      }
      
      // Si no tiene configuración de horarios regulares, no incluirla
      if (!classItem.schedule_config || !classItem.schedule_config.days) {
        return false;
      }
      
      // Verificar si la clase está programada para este día de la semana
      if (!classItem.schedule_config.days.includes(dayOfWeek)) {
        return false;
      }
      
      // Verificar si la clase termina en alguna fecha (si existe end_date)
      if (classItem.end_date && new Date(classItem.end_date) < date) {
        return false;
      }
      
      // Verificar si la clase usa alguna de las canchas especificadas
      const hasRelevantCourt = classItem.schedule_config.timeSlots?.some((slot: any) => 
        slot.courtIds?.some((id: string) => courtIds.includes(id))
      );
      
      return hasRelevantCourt;
    });
    
    console.log('AvailabilityService - getClassSchedules - relevantClasses:', relevantClasses);
    return relevantClasses;
  }

  // Nuevo método para verificar si un slot de tiempo está ocupado por una clase
  private isTimeSlotOccupiedByClass(
    startTime: string,
    endTime: string,
    classSchedules: any[],
    courtId: string,
    date: Date
  ): boolean {
    // Convertir los tiempos del slot a minutos para comparación
    const slotStartMinutes = this.timeToMinutes(startTime);
    const slotEndMinutes = this.timeToMinutes(endTime);
    const formattedDate = format(date, 'yyyy-MM-dd');
    
    // Revisar si alguna clase ocupa este horario y cancha
    for (const classItem of classSchedules) {
      // Verificar sesiones regulares (timeSlots)
      if (classItem.schedule_config?.timeSlots) {
        for (const timeSlot of classItem.schedule_config.timeSlots) {
          // Verificar si esta clase usa esta cancha
          if (!timeSlot.courtIds?.includes(courtId)) continue;
          
          // Verificar si esta sesión está suspendida para la fecha actual
          const isSuspended = classItem.schedule_config?.suspendedSessions?.some(
            (suspendedSession: any) => 
              suspendedSession.date === formattedDate &&
              suspendedSession.courtId === courtId &&
              suspendedSession.startTime === timeSlot.startTime &&
              suspendedSession.endTime === timeSlot.endTime
          );
          
          // Si la sesión está suspendida, no bloquea el horario
          if (isSuspended) {
            console.log('AvailabilityService - Sesión suspendida, no bloquea horario:', {
              date: formattedDate,
              slot: { start: timeSlot.startTime, end: timeSlot.endTime },
              class: { name: classItem.name }
            });
            continue;
          }
          
          // Convertir horarios de la clase a minutos
          const classStartMinutes = this.timeToMinutes(timeSlot.startTime);
          const classEndMinutes = this.timeToMinutes(timeSlot.endTime);
          
          // Verificar si hay superposición (solapamiento) entre horarios
          // Un solapamiento ocurre cuando no es verdad que uno termina antes de que comience el otro
          const overlap = !(slotEndMinutes <= classStartMinutes || slotStartMinutes >= classEndMinutes);
          
          if (overlap) {
            console.log('AvailabilityService - Slot ocupado por clase regular:', {
              slot: { start: startTime, end: endTime },
              class: { name: classItem.name, start: timeSlot.startTime, end: timeSlot.endTime }
            });
            return true; // El slot está ocupado por una clase regular
          }
        }
      }
      
      // Verificar sesiones específicas para esta fecha
      if (classItem.schedule_config?.specificSessions) {
        for (const specificSession of classItem.schedule_config.specificSessions) {
          // Verificar si la sesión específica es para la fecha actual
          if (specificSession.date !== formattedDate) continue;
          
          // Verificar si la sesión específica usa esta cancha
          // Nota: specificSessions puede tener courtIds como string o array
          const sessionCourtIds = Array.isArray(specificSession.courtIds) 
            ? specificSession.courtIds 
            : [specificSession.courtIds];
            
          if (!sessionCourtIds.includes(courtId)) continue;
          
          // Convertir horarios de la sesión específica a minutos
          const sessionStartMinutes = this.timeToMinutes(specificSession.startTime);
          const sessionEndMinutes = this.timeToMinutes(specificSession.endTime);
          
          // Verificar solapamiento
          const overlap = !(slotEndMinutes <= sessionStartMinutes || slotStartMinutes >= sessionEndMinutes);
          
          if (overlap) {
            console.log('AvailabilityService - Slot ocupado por sesión específica:', {
              slot: { start: startTime, end: endTime },
              class: { name: classItem.name, start: specificSession.startTime, end: specificSession.endTime }
            });
            return true; // El slot está ocupado por una sesión específica
          }
        }
      }
    }
    
    return false; // El slot no está ocupado por clases
  }

  private isTimeSlotAvailable(
    startTime: string,
    endTime: string,
    bookings: any[],
    date: Date,
    courtId: string,
    timezone: string = 'UTC',
    timeRanges: { openTime: string; closeTime: string; }[] = [],
    classSchedules: any[] = []
  ): boolean {
    const slotStartMinutes = this.timeToMinutes(startTime);
    const slotEndMinutes = this.timeToMinutes(endTime);

    // Verificar que el slot está dentro de alguno de los rangos de horarios de apertura
    if (timeRanges.length > 0) {
      let isWithinOpeningHours = false;
      
      for (const range of timeRanges) {
        const rangeStartMinutes = this.timeToMinutes(range.openTime);
        const rangeEndMinutes = this.timeToMinutes(range.closeTime);
        
        // El slot está disponible si está completamente dentro del rango
        if (slotStartMinutes >= rangeStartMinutes && slotEndMinutes <= rangeEndMinutes) {
          isWithinOpeningHours = true;
          break;
        }
      }
      
      if (!isWithinOpeningHours) {
        console.log('AvailabilityService - Slot fuera de horarios de apertura:', {
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
      const localStartTime = this.convertBookingTimeToLocal(booking.start_time, timezone, date);
      const localEndTime = this.convertBookingTimeToLocal(booking.end_time, timezone, date);
      
      const bookingStartMinutes = this.timeToMinutes(localStartTime);
      const bookingEndMinutes = this.timeToMinutes(localEndTime);

      // Un slot está disponible si:
      // 1. Termina antes o en el inicio de la reserva, o
      // 2. Comienza después o en el final de la reserva
      const overlaps = !(
        slotEndMinutes <= bookingStartMinutes ||
        slotStartMinutes >= bookingEndMinutes
      );

      if (overlaps) {
        console.log('AvailabilityService - Solapamiento detectado:', {
          slot: { start: startTime, end: endTime },
          booking: { 
            original: { start: booking.start_time, end: booking.end_time },
            convertido: { start: localStartTime, end: localEndTime }
          }
        });
      }

      return overlaps;
    });

    // Verificar si el slot está ocupado por una clase
    const isOccupiedByClass = this.isTimeSlotOccupiedByClass(startTime, endTime, classSchedules, courtId, date);

    return !hasOverlap && !isOccupiedByClass;
  }

  private calculatePrice(court: any, durationInMinutes: number, startTime: string, date: Date): number | null {
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
        const startMinutes = this.timeToMinutes(startTime);

        // Buscar si el horario cae en algún rango personalizado
        const matchingRange = customPricing.timeRanges.find((range: CustomTimeRange) => {
          const rangeStartMinutes = this.timeToMinutes(range.startTime);
          const rangeEndMinutes = this.timeToMinutes(range.endTime);
          return startMinutes >= rangeStartMinutes && startMinutes < rangeEndMinutes;
        });

        // Aplicar porcentaje si encontramos un rango que coincida
        if (matchingRange) {
          const adjustment = basePrice * (matchingRange.percentage / 100);
          basePrice += adjustment;
        }
      }
    }

    console.log('AvailabilityService - Calculando precio:', {
      courtName: court.name,
      durationInMinutes,
      basePrice,
      date: format(date, 'yyyy-MM-dd'),
      startTime,
      customPricing: court.custom_pricing
    });

    return basePrice;
  }

  private determineStatus(
    timeSlot: string,
    bookings: any[],
    date: Date
  ): 'available' | 'popular' | 'lastCall' {
    const hour = parseInt(timeSlot.split(':')[0]);
    
    if (hour >= 17 && hour <= 20) return 'popular';
    if (hour >= 21) return 'lastCall';
    return 'available';
  }

  private async getBranchSchedule(branchId: string, date: Date): Promise<DaySchedule | null> {
    console.log('AvailabilityService - getBranchSchedule:', { branchId, date });
    
    try {
      const { data: branch, error } = await supabase
        .from('sedes')
        .select('opening_hours, settings')
        .eq('id', branchId)
        .single();

      if (error) throw error;
      if (!branch?.opening_hours) {
        console.log('AvailabilityService - No se encontraron horarios para la sede');
        return null;
      }

      console.log('AvailabilityService - Datos de horarios obtenidos:', branch.opening_hours);
      
      // Detectar formato de horarios
      let branchSchedule: BranchSchedule;
      
      // Verificar si es formato nuevo (con propiedad schedule)
      if (typeof branch.opening_hours === 'object' && 'schedule' in branch.opening_hours) {
        console.log('AvailabilityService - Usando formato nuevo de horarios');
        branchSchedule = branch.opening_hours as BranchSchedule;
      } else {
        // Formato antiguo (el objeto es directamente OpeningHours)
        console.log('AvailabilityService - Usando formato antiguo de horarios');
        branchSchedule = {
          schedule: branch.opening_hours as OpeningHours,
          timezone: branch.settings?.timezone || 'UTC'
        };
      }
      
      if (!branchSchedule.schedule) {
        console.log('AvailabilityService - La propiedad schedule no existe en los horarios');
        return null;
      }

      const dayOfWeek = format(date, 'EEEE').toLowerCase();
      console.log('AvailabilityService - Día de la semana:', dayOfWeek);
      
      const schedule = branchSchedule.schedule[dayOfWeek as keyof OpeningHours];
      console.log('AvailabilityService - Horario del día:', schedule);

      // No convertimos los horarios de apertura/cierre a la zona horaria local
      // En lugar de esto, mantenemos los horarios originales y convertiremos las reservas
      // cuando sea necesario compararlas con estos horarios.
      
      console.log('AvailabilityService - Horarios obtenidos:', {
        dayOfWeek,
        schedule,
        timezone: branchSchedule.timezone
      });

      return schedule || null;
    } catch (error) {
      console.error('Error al obtener horarios de la sede:', error);
      return null;
    }
  }

  private adjustTimeForTimezone(time: string, timezone: string, date: Date): string {
    const [hours, minutes] = time.split(':').map(Number);
    const dateObj = new Date(date);
    dateObj.setHours(hours, minutes, 0, 0);
    
    // Usar Luxon para una conversión más precisa de zona horaria
    const utcDateTime = DateTime.fromJSDate(dateObj, { zone: 'UTC' });
    const localDateTime = utcDateTime.setZone(timezone);
    
    // Formatear la hora con Luxon para mayor consistencia
    return localDateTime.toFormat('HH:mm');
  }

  /**
   * Convierte un tiempo en formato HH:mm desde UTC a la zona horaria local.
   * Utilizamos este método para convertir los horarios de las reservas al comparar con slots.
   */
  private convertBookingTimeToLocal(time: string, timezone: string, date: Date): string {
    const [hours, minutes] = time.split(':').map(Number);
    const dateObj = new Date(date);
    dateObj.setHours(hours, minutes, 0, 0);
    
    // Las reservas están almacenadas en UTC, convertimos a la zona horaria local
    const utcDateTime = DateTime.fromJSDate(dateObj, { zone: 'UTC' });
    const localDateTime = utcDateTime.setZone(timezone);
    
    return localDateTime.toFormat('HH:mm');
  }

  private findAvailableRanges(
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
        const aStartLocal = this.convertBookingTimeToLocal(a.start_time, timezone, date);
        const bStartLocal = this.convertBookingTimeToLocal(b.start_time, timezone, date);
        return this.timeToMinutes(aStartLocal) - this.timeToMinutes(bStartLocal);
      });

    // Procesar cada rango de horarios por separado
    timeRanges.forEach(range => {
      const rangeStartMinutes = this.timeToMinutes(range.openTime);
      const rangeEndMinutes = this.timeToMinutes(range.closeTime);
      const rangeBookings: any[] = [];

      // Filtrar las reservas que intersectan con este rango específico
      for (const booking of sortedBookings) {
        const bookingStartLocal = this.convertBookingTimeToLocal(booking.start_time, timezone, date);
        const bookingEndLocal = this.convertBookingTimeToLocal(booking.end_time, timezone, date);
        
        const bookingStartMinutes = this.timeToMinutes(bookingStartLocal);
        const bookingEndMinutes = this.timeToMinutes(bookingEndLocal);

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
          console.log(`AvailabilityService - Evaluando rango antes de reserva:`, {
            start: this.minutesToTime(currentStartMinutes),
            end: booking.startLocal,
            size: rangeSize
          });
          
          ranges.push({
            start: this.minutesToTime(currentStartMinutes),
            end: booking.startLocal
          });
        }

        currentStartMinutes = booking.endMinutes;

        // Procesar espacio entre reservas
        if (i < rangeBookings.length - 1) {
          const nextBooking = rangeBookings[i + 1];
          
          if (booking.endMinutes < nextBooking.startMinutes) {
            const gapSize = nextBooking.startMinutes - booking.endMinutes;
            console.log(`AvailabilityService - Evaluando espacio entre reservas:`, {
              start: booking.endLocal,
              end: nextBooking.startLocal,
              size: gapSize
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
        console.log(`AvailabilityService - Evaluando rango final:`, {
          start: this.minutesToTime(currentStartMinutes),
          end: range.closeTime,
          size: finalRangeSize
        });
        
        ranges.push({
          start: this.minutesToTime(currentStartMinutes),
          end: range.closeTime
        });
      }
    });

    // Filtrar rangos demasiado cortos
    const filteredRanges = ranges.filter(range => {
      const duration = this.timeToMinutes(range.end) - this.timeToMinutes(range.start);
      return duration >= 30;
    });

    console.log(`AvailabilityService - Rangos disponibles después de filtrado:`, {
      totalRanges: filteredRanges.length,
      ranges: filteredRanges
    });

    // No fusionamos rangos entre diferentes horarios de apertura/cierre
    return filteredRanges;
  }

  private generateTimeSlots(
    timeRanges: { openTime: string; closeTime: string; }[], 
    durationInHours: number,
    court: any,
    bookings: any[] = [],
    date: Date,
    timezone: string = 'UTC',
    classSchedules: any[] = []
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const SLOT_INTERVAL = 15; // Intervalo de slots en minutos
    const durationInMinutes = durationInHours;

    // Filtrar solo las reservas de la pista actual
    const filteredBookings = bookings.filter(booking => booking.court_id === court.id);
    console.log(`AvailabilityService - generateTimeSlots - booking filtradas para ${court.name}:`, filteredBookings);

    // Procesar cada rango de horario
    for (const range of timeRanges) {
      const startMinutes = this.timeToMinutes(range.openTime);
      const endMinutes = this.timeToMinutes(range.closeTime);

      // Generar slots en intervalos regulares
      for (let currentMinutes = startMinutes; currentMinutes + durationInMinutes <= endMinutes; currentMinutes += SLOT_INTERVAL) {
        const slotEndMinutes = currentMinutes + durationInMinutes;
        const startTime = this.minutesToTime(currentMinutes);
        const endTime = this.minutesToTime(slotEndMinutes);

        // Verificar disponibilidad del slot (pasando el timezone y los horarios de apertura)
        const isAvailable = this.isTimeSlotAvailable(
          startTime, 
          endTime, 
          filteredBookings, 
          date, 
          court.id, 
          timezone,
          timeRanges,
          classSchedules
        );
        
        if (isAvailable) {
          const price = this.calculatePrice(court, durationInMinutes, startTime, date);
          
          console.log(`AvailabilityService - Slot válido encontrado:`, {
            start: startTime,
            end: endTime,
            court: court.name,
            price
          });
          
          slots.push({
            start: startTime,
            end: endTime,
            isAvailable: true,
            price: price || 0
          });
        }
      }
    }

    console.log(`AvailabilityService - Total slots generados para ${court.name}:`, {
      totalSlots: slots.length,
      durationInMinutes
    });

    return slots;
  }

  private mergeOverlappingRanges(
    ranges: Array<{ start: string; end: string; }>,
    limitByTimeRanges: boolean = false,
    timeRanges: { openTime: string; closeTime: string; }[] = []
  ): Array<{ start: string; end: string; }> {
    if (ranges.length <= 1) return ranges;

    // Si limitByTimeRanges es true y no hay timeRanges, no fusionar
    if (limitByTimeRanges && timeRanges.length === 0) {
      return ranges;
    }

    // Si limitamos por timeRanges, solo fusionamos rangos dentro del mismo timeRange
    if (limitByTimeRanges) {
      const result: Array<{ start: string; end: string; }> = [];
      
      // Para cada timeRange, fusionar los rangos que estén dentro
      timeRanges.forEach(timeRange => {
        const rangeStartMinutes = this.timeToMinutes(timeRange.openTime);
        const rangeEndMinutes = this.timeToMinutes(timeRange.closeTime);
        
        // Filtrar los rangos que están dentro de este timeRange
        const rangesInThisTimeRange = ranges.filter(range => {
          const startMinutes = this.timeToMinutes(range.start);
          const endMinutes = this.timeToMinutes(range.end);
          
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
      this.timeToMinutes(a.start) - this.timeToMinutes(b.start)
    );

    const mergedRanges: Array<{ start: string; end: string; }> = [sortedRanges[0]];

    for (let i = 1; i < sortedRanges.length; i++) {
      const currentRange = sortedRanges[i];
      const lastMergedRange = mergedRanges[mergedRanges.length - 1];

      // Si hay solapamiento, extender el último rango
      if (this.timeToMinutes(currentRange.start) <= this.timeToMinutes(lastMergedRange.end)) {
        if (this.timeToMinutes(currentRange.end) > this.timeToMinutes(lastMergedRange.end)) {
          lastMergedRange.end = currentRange.end;
        }
      } else {
        // Si no hay solapamiento, agregar nuevo rango
        mergedRanges.push(currentRange);
      }
    }

    return mergedRanges;
  }

  private findAvailableGaps(
    rangeStartMinutes: number,
    rangeEndMinutes: number,
    bookings: any[],
    date: Date
  ): Array<{start: number, end: number}> {
    // Ordenar las reservas por hora de inicio
    const sortedBookings = [...bookings]
      .filter(booking => booking.date === format(date, 'yyyy-MM-dd'))
      .sort((a, b) => {
        // Convertir los horarios de las reservas a la zona horaria local
        const aStart = this.timeToMinutes(a.start_time);
        const bStart = this.timeToMinutes(b.start_time);
        return aStart - bStart;
      });

    const gaps: Array<{start: number, end: number}> = [];
    let currentStart = rangeStartMinutes;

    // Procesar cada reserva para encontrar gaps
    sortedBookings.forEach(booking => {
      const bookingStart = this.timeToMinutes(booking.start_time);
      const bookingEnd = this.timeToMinutes(booking.end_time);

      // Si hay espacio antes de la reserva, agregar gap
      if (currentStart < bookingStart) {
        gaps.push({
          start: currentStart,
          end: bookingStart
        });
      }

      currentStart = bookingEnd;
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

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private canCreateSlot(start: string, end: string, durationInMinutes: number): boolean {
    const startMinutes = parseInt(start.split(':')[0]) * 60 + parseInt(start.split(':')[1]);
    const endMinutes = parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1]);
    return (endMinutes - startMinutes) >= durationInMinutes;
  }

  public async findAvailableSlots(params: AvailabilityParams): Promise<AvailabilitySlot[]> {
    console.log('AvailabilityService - findAvailableSlots - params:', params);
    try {
      // Obtener la sede para acceder a su zona horaria primero
      const { data: branch, error: branchError } = await supabase
        .from('sedes')
        .select('opening_hours, settings')
        .eq('id', params.branchId)
        .single();
      
      if (branchError || !branch?.opening_hours) {
        console.error('Error al obtener información de la sede:', branchError);
        return [];
      }
      
      // Extraer la zona horaria de la sede
      let timezone = 'UTC';
      if (typeof branch.opening_hours === 'object') {
        if ('timezone' in branch.opening_hours) {
          timezone = (branch.opening_hours as BranchSchedule).timezone;
        } else if (branch.settings?.timezone) {
          timezone = branch.settings.timezone;
        }
      }
      
      console.log('AvailabilityService - Zona horaria de la sede:', timezone);
      
      // Obtener el horario ya ajustado a la zona horaria de la sede
      const schedule = await this.getBranchSchedule(params.branchId, params.date);
      
      if (!schedule || !schedule.isOpen) {
        console.log('AvailabilityService - Sede cerrada en la fecha seleccionada');
        return [];
      }

      console.log('AvailabilityService - Horarios de la sede:', 
        schedule.timeRanges.map(r => `${r.openTime}-${r.closeTime}`));

      const courts = await this.getCourts({ 
        courtType: params.courtType,
        branchId: params.branchId
      });
      
      if (!courts.length) return [];

      const courtIds = courts.map(court => court.id);
      const bookings = await this.getBookings(params.date, courtIds);
      
      // Obtener las clases programadas para este día y estas canchas
      const classSchedules = await this.getClassSchedules(params.date, courtIds, params.branchId);
      console.log('AvailabilityService - Clases programadas:', classSchedules);
      
      const availableSlots: AvailabilitySlot[] = [];

      // Procesar cada pista por separado
      for (const court of courts) {
        // Convertir duración de horas a minutos
        const durationInMinutes = params.duration * 60;
        
        // Los slots ya se generan con horarios en la zona horaria de la sede
        const slots = this.generateTimeSlots(
          schedule.timeRanges, 
          durationInMinutes, 
          court, 
          bookings, 
          params.date, 
          timezone,
          classSchedules
        );
        console.log(`AvailabilityService - Slots generados para ${court.name}:`, slots);

        // Procesar cada slot generado para esta pista
        for (const timeSlot of slots) {
          if (this.isTimeSlotAvailable(
            timeSlot.start, 
            timeSlot.end, 
            bookings, 
            params.date, 
            court.id, 
            timezone, 
            undefined,
            classSchedules
          )) {
            // Ya no necesitamos convertir los horarios, ya están en la zona horaria correcta
            const slotId = this.generateSlotId(court.id, format(params.date, 'yyyy-MM-dd'), timeSlot.start);
            
            const hold = this.holdReservations.get(slotId);
            if (hold) {
              continue;
            }

            const price = this.calculatePrice(court, durationInMinutes, timeSlot.start, params.date);

            console.log(`AvailabilityService - Agregando slot con precio:`, {
              court: court.name,
              start: timeSlot.start,
              end: timeSlot.end,
              price,
              durationInMinutes
            });

            availableSlots.push({
              id: slotId,
              startTime: timeSlot.start,
              endTime: timeSlot.end,
              courtId: court.id,
              courtName: court.name,
              courtType: court.court_type,
              price: price || 0,
              status: this.determineStatus(timeSlot.start, bookings, params.date)
            });
          }
        }
      }

      if (params.timeOfDay) {
        console.log('AvailabilityService - Aplicando filtro por momento del día:', params.timeOfDay);
        return this.filterByTimeOfDay(availableSlots, params.timeOfDay);
      }

      console.log('AvailabilityService - findAvailableSlots - slots encontrados:', {
        total: availableSlots.length,
        slotsConPrecios: availableSlots.map(slot => ({
          court: slot.courtName,
          time: `${slot.startTime}-${slot.endTime}`,
          price: slot.price
        }))
      });
      
      return availableSlots;

    } catch (error) {
      console.error('AvailabilityService - Error finding available slots:', error);
      throw error;
    }
  }

  private filterByTimeOfDay(slots: AvailabilitySlot[], timeOfDay: string): AvailabilitySlot[] {
    const range = TIME_RANGES[timeOfDay as keyof typeof TIME_RANGES];
    
    return slots.filter(slot => {
      // Los horarios de los slots están en UTC, igual que los rangos definidos en TIME_RANGES
      // No es necesario convertir aquí, ya que la comparación es consistente
      const slotTime = slot.startTime;
      return slotTime >= range.start && slotTime <= range.end;
    });
  }

  public async holdSlot(slotId: string, courtId: string, date: Date, timeRange: TimeRange): Promise<boolean> {
    if (this.holdReservations.has(slotId)) {
      return false;
    }

    const hold: HoldReservation = {
      slotId,
      courtId,
      date,
      timeRange,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + HOLD_DURATION)
    };

    this.holdReservations.set(slotId, hold);
    return true;
  }

  public releaseHold(slotId: string): void {
    this.holdReservations.delete(slotId);
  }

  private cleanupExpiredHolds(): void {
    const now = new Date();
    Array.from(this.holdReservations.entries()).forEach(([slotId, hold]) => {
      if (hold.expiresAt <= now) {
        this.holdReservations.delete(slotId);
      }
    });
  }

  public subscribeToChanges(date: string, callback: (payload: any) => void) {
    return supabase
      .channel('bookings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `date=eq.${date}`
        },
        callback
      )
      .subscribe();
  }
}

export default AvailabilityService.getInstance(); 