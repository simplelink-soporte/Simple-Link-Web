import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { DateTime } from 'luxon';
import { AvailabilitySlot, AvailabilityParams, TimeRange, DaySchedule } from '@/types/availability';
import timeSlotService from './timeSlotService';
import bookingTransformer from './bookingTransformerService';
import holdReservationService from './holdReservationService';
import pricingService from './pricingService';
import classSessionService from './classSessionService';

interface BranchSchedule {
  openingDays: Record<string, boolean>;
  schedule: Record<string, { open: string; close: string }>;
  timezone: string;
}

interface Booking {
  id: string;
  court_id: string;
  date: string;
  start_time: string;
  end_time: string;
  payment_status: string;
  reservation_type?: string; // Añadimos este campo para identificar si es una reserva normal o una clase
}

class AvailabilityService {
  private static instance: AvailabilityService;

  private constructor() {}

  public static getInstance(): AvailabilityService {
    if (!AvailabilityService.instance) {
      AvailabilityService.instance = new AvailabilityService();
    }
    return AvailabilityService.instance;
  }

  /**
   * Obtiene las canchas disponibles según parámetros especificados
   */
  private async getCourts(params?: { courtType?: string, branchId: string }) {
    console.log('AvailabilityService - getCourts - params:', params);
  
    const query = supabase.from('courts')
      .select('*')
      .eq('is_active', true)
      .neq('sport', 'swimming'); // Excluir pistas de tipo 'swimming'
    
    if (params?.branchId) {
      query.eq('branch_id', params.branchId);
    }
    
    if (params?.courtType) {
      query.eq('court_type', params.courtType);
    }
    
    const { data: courts, error } = await query;
    
    if (error) {
      console.error('Error al obtener canchas:', error);
      return [];
    }
    
    console.log('AvailabilityService - getCourts - resultado:', { 
      cantidad: courts?.length, 
      primeraCancha: courts?.[0] 
    });
    
    return courts || [];
  }

  /**
   * Obtiene las reservas existentes para una fecha y cancha específicas
   */
  private async getBookings(date: Date, courtIds: string[] = []): Promise<Booking[]> {
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      
      // Recuperar todas las reservas para esta fecha y canchas
      // FILTRADO IMPORTANTE:
      // 1. Excluimos solo 'cancelled' - mantenemos 'pending', 'confirmed', 'partially_paid' y 'completed'
      // 2. Solo consideramos reservas de tipo 'booking' (no clases)
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('date', formattedDate)
        .in('court_id', courtIds)
        .neq('payment_status', 'cancelled')
        .eq('reservation_type', 'booking');
      
      if (error) {
        console.error('Error al obtener reservas:', error);
        return [];
      }
      
      if (!bookings || !Array.isArray(bookings)) {
        console.warn('No se encontraron reservas o el resultado no es un array', {
          date: formattedDate,
          courts: courtIds
        });
        return [];
      }

      // Registramos para depuración
      console.log(`AvailabilityService - Se encontraron ${bookings.length} reservas para la fecha ${formattedDate}, ids canchas: ${courtIds.join(',')}:`, 
        bookings.map(b => ({
          id: b.id,
          court_id: b.court_id,
          start: b.start_time,
          end: b.end_time,
          status: b.payment_status
        }))
      );
      
      // Obtener las sesiones de clases para esta fecha y canchas
      const classSessions = await classSessionService.getClassSessions(date, courtIds);
      
      // Convertir las sesiones de clase a formato de reserva
      const sessionBookings: Booking[] = classSessions.map(session => ({
        id: `class-session-${session.class_id}-${session.date}-${session.start_time}`,
        court_id: session.court_id,
        date: session.date,
        start_time: session.start_time,
        end_time: session.end_time,
        payment_status: 'confirmed', // Para que se considere como ocupado
        reservation_type: 'class'    // Para identificar que es una clase
      }));
      
      console.log(`AvailabilityService - Se encontraron ${sessionBookings.length} sesiones de clase para la fecha ${formattedDate}, ids canchas: ${courtIds.join(',')}:`, 
        sessionBookings.map(b => ({
          id: b.id,
          court_id: b.court_id,
          start: b.start_time,
          end: b.end_time,
          status: b.payment_status
        }))
      );
      
      // Combinar reservas regulares y sesiones de clase
      const allBookings = [...bookings, ...sessionBookings];
      
      return allBookings;
    } catch (error) {
      console.error('Error en getBookings:', error);
      return [];
    }
  }

  /**
   * Obtiene la configuración de horarios para una sede específica
   */
  private async getBranchSchedule(branchId: string): Promise<BranchSchedule | null> {
    console.log('AvailabilityService - getBranchSchedule:', { branchId });
    
    try {
      const { data: branch, error } = await supabase
        .from('sedes')
        .select('opening_hours, settings, timezone')
        .eq('id', branchId)
        .single();
    
      if (error) {
        console.error('Error al obtener horarios de la sede:', error);
        return null;
      }
      
      if (!branch?.opening_hours) {
        console.log('AvailabilityService - No se encontraron horarios para la sede');
        return null;
      }

      console.log('AvailabilityService - Datos de horarios obtenidos:', branch.opening_hours);
      
      // Detectar formato de horarios
      let openingDays: Record<string, boolean> = {};
      let schedule: Record<string, { open: string; close: string }> = {};
      
      // Usar la zona horaria desde el campo timezone de la sede directamente, 
      // o desde settings como plan B, o UTC como último recurso
      let timezone = branch.timezone || branch.settings?.timezone || 'UTC';
      
      console.log('AvailabilityService - Usando zona horaria:', {
        timezone,
        timezone_origen: branch.timezone ? 'campo_timezone' : 
                         (branch.settings?.timezone ? 'settings_timezone' : 'default_UTC')
      });
      
      // Verificar si es formato nuevo (con propiedad days y hours)
      if (typeof branch.opening_hours === 'object') {
        console.log('AvailabilityService - Analizando estructura de opening_hours');
        
        if ('days' in branch.opening_hours) {
          console.log('AvailabilityService - Usando días del formato opening_hours.days');
          openingDays = branch.opening_hours.days || {};
        }
        
        if ('hours' in branch.opening_hours) {
          console.log('AvailabilityService - Usando horarios del formato opening_hours.hours');
          schedule = branch.opening_hours.hours || {};
        } else if ('schedule' in branch.opening_hours) {
          console.log('AvailabilityService - Usando horarios del formato opening_hours.schedule');
          
          // Convertir el formato { day: { isOpen: boolean, timeRanges: Array<{openTime, closeTime}> } }
          const originalSchedule = branch.opening_hours.schedule || {};
          
          // Procesamos cada día
          Object.entries(originalSchedule).forEach(([day, value]) => {
            if (value && typeof value === 'object' && 'isOpen' in value && value.isOpen) {
              // Usamos type assertion para ayudar a TypeScript a entender la estructura
              const scheduleValue = value as { isOpen: boolean; timeRanges?: Array<{openTime: string, closeTime: string}> };
              const timeRanges = scheduleValue.timeRanges || [];
              
              // Marcar el día como abierto si tiene isOpen=true, independientemente de los timeRanges
              openingDays[day] = true;
              
              if (timeRanges.length > 0) {
                // Para compatibilidad con la estructura actual, tomamos el primer y último rango 
                // para formar un único rango que englobe todo el horario del día
                const firstRange = timeRanges[0];
                const lastRange = timeRanges[timeRanges.length - 1];
                
                schedule[day] = {
                  open: firstRange.openTime,
                  close: lastRange.closeTime
                };
              }
            }
          });
        }
      }
      
      // Asegurarnos de que todos los días con horario estén marcados como abiertos
      Object.keys(schedule).forEach(day => {
        if (!openingDays[day] && schedule[day].open && schedule[day].close) {
          openingDays[day] = true;
        }
      });
      
      console.log('AvailabilityService - Horarios procesados:', { openingDays, schedule, timezone });
      
      return { openingDays, schedule, timezone };
    } catch (error) {
      console.error('Error inesperado al obtener horarios de la sede:', error);
      return null;
    }
  }

  /**
   * Determina si un horario específico está disponible basado en reservas existentes
   */
  private isTimeSlotAvailable(
    startTime: string,
    endTime: string,
    date: Date,
    courtId: string,
    bookings: Booking[],
    timezone: string
  ): boolean {
    // Filtrar bookings relevantes para esta cancha y fecha específica
    const formattedDate = format(date, 'yyyy-MM-dd');
    const relevantBookings = bookings.filter(booking => 
      booking.court_id === courtId && 
      booking.date === formattedDate
    );
    
    if (relevantBookings.length === 0) {
      // No hay reservas para esta cancha en esta fecha, por lo que el slot está disponible
      console.log(`AvailabilityService - No hay reservas para la cancha ${courtId} en la fecha ${formattedDate}. Slot ${startTime}-${endTime} disponible.`);
      return true;
    }
    
    // Convertir strings de tiempo del slot a objetos DateTime de Luxon para precisión
    // IMPORTANTE: Asegurarnos de que los tiempos del slot estén en la misma zona horaria que las reservas
    const slotStart = bookingTransformer.convertTimeStringToDateTime(startTime, date, timezone);
    const slotEnd = bookingTransformer.convertTimeStringToDateTime(endTime, date, timezone);
    
    if (!slotStart.isValid || !slotEnd.isValid) {
      console.error(`AvailabilityService - Error: Tiempos de slot inválidos: ${startTime}-${endTime}`);
      return false; // Si no podemos validar el slot, lo marcamos como no disponible por seguridad
    }
    
    // Registrar detalle del slot para depuración
    console.log(`AvailabilityService - Verificando disponibilidad de slot ${startTime}-${endTime} en zona horaria ${timezone}`);
    console.log(`AvailabilityService - Slot convertido: ${slotStart.toFormat('HH:mm')} - ${slotEnd.toFormat('HH:mm')} (${timezone})`);
    console.log(`AvailabilityService - Cantidad de reservas a verificar: ${relevantBookings.length}`);
    
    // Verificar si hay superposición con alguna reserva existente
    const hasOverlap = relevantBookings.some((booking, index) => {
      // Extraer estado de la reserva para diagnóstico
      const bookingStatus = booking.payment_status || 'desconocido';
      
      // Convertir strings de tiempo de la reserva a objetos DateTime de Luxon
      // Asegurarnos de que se respete la zona horaria de la sede
      const bookingStart = bookingTransformer.convertDatabaseTimeToDateTime(booking.start_time, date, timezone);
      const bookingEnd = bookingTransformer.convertDatabaseTimeToDateTime(booking.end_time, date, timezone);
      
      // Validación de seguridad: si las fechas son inválidas, considerar como superposición
      if (!bookingStart.isValid || !bookingEnd.isValid) {
        console.warn(`AvailabilityService - [Reserva ${index+1}/${relevantBookings.length}] - ADVERTENCIA: Fechas inválidas en reserva ${booking.id} (${bookingStatus})`, {
          bookingTime: `${booking.start_time} - ${booking.end_time}`,
          slotTime: `${startTime} - ${endTime}`
        });
        return true; // Considerar como superposición para evitar mostrar turnos con datos inválidos
      }
      
      // Registrar información detallada de la reserva para depuración
      console.log(`AvailabilityService - [Reserva ${index+1}/${relevantBookings.length}] - Comparando:`, {
        reserva: {
          id: booking.id,
          estado: bookingStatus,
          inicio_original: booking.start_time,
          fin_original: booking.end_time,
          inicio_convertido: bookingStart.toFormat('yyyy-MM-dd HH:mm:ss ZZ'),
          fin_convertido: bookingEnd.toFormat('yyyy-MM-dd HH:mm:ss ZZ')
        },
        slot: {
          inicio_original: startTime,
          fin_original: endTime,
          inicio_convertido: slotStart.toFormat('yyyy-MM-dd HH:mm:ss ZZ'),
          fin_convertido: slotEnd.toFormat('yyyy-MM-dd HH:mm:ss ZZ')
        }
      });
      
      // Verificar superposición - Una superposición ocurre si:
      // 1. El inicio del slot está dentro de la reserva
      // 2. El fin del slot está dentro de la reserva
      // 3. El slot engloba completamente a la reserva
      const overlap = (
        (slotStart < bookingEnd && slotStart >= bookingStart) || // Inicio del slot dentro de la reserva
        (slotEnd > bookingStart && slotEnd <= bookingEnd) ||     // Fin del slot dentro de la reserva
        (slotStart <= bookingStart && slotEnd >= bookingEnd)     // Slot engloba a la reserva
      );
      
      if (overlap) {
        console.log(`AvailabilityService - [Reserva ${index+1}/${relevantBookings.length}] - ¡SOLAPAMIENTO DETECTADO! con reserva ${booking.id} (estado: ${bookingStatus})`);
      }
      
      return overlap;
    });
    
    // Reportar resultado final
    if (hasOverlap) {
      console.log(`AvailabilityService - RESULTADO FINAL: Slot ${startTime}-${endTime} para cancha ${courtId} está OCUPADO por reservas existentes.`);
    } else {
      console.log(`AvailabilityService - RESULTADO FINAL: Slot ${startTime}-${endTime} para cancha ${courtId} está DISPONIBLE.`);
    }
    
    return !hasOverlap;
  }

  /**
   * Encuentra los rangos disponibles para un día y cancha específicos
   */
  private async findAvailableRanges(daySchedule: DaySchedule, existingBookings: Booking[], courtId: string, date: Date): Promise<TimeRange[]> {
    // Verificar si el día está abierto
    if (!daySchedule.isOpen || !daySchedule.timeRanges || daySchedule.timeRanges.length === 0) {
      console.log('AvailabilityService - No hay horarios disponibles para este día');
      return [];
    }
    
    // Obtener la zona horaria del día o usar UTC por defecto
    const timezone = daySchedule.timezone || 'UTC';
    
    try {
      // Filtrar solo las reservas (incluidas las sesiones de clase) para esta cancha específica
      const formattedDate = format(date, 'yyyy-MM-dd');
      const relevantBookings = existingBookings.filter(
        booking => booking.court_id === courtId && booking.date === formattedDate
      );
      
      // Registrar información para depuración, distinguiendo entre reservas regulares y sesiones de clase
      const regularBookings = relevantBookings.filter(b => b.reservation_type !== 'class');
      const classBookings = relevantBookings.filter(b => b.reservation_type === 'class');
      
      console.log(`AvailabilityService - Calculando disponibilidad para la cancha ${courtId} en la fecha ${formattedDate}:`);
      console.log(`- Reservas regulares: ${regularBookings.length}`);
      console.log(`- Sesiones de clase: ${classBookings.length}`);
      
      // Generar rangos disponibles usando la lógica existente
      return timeSlotService.calculateAvailableRanges(
        daySchedule.timeRanges,
        relevantBookings,
        courtId,
        date,
        timezone
      );
    } catch (error) {
      console.error('Error al calcular rangos disponibles:', error);
      return [];
    }
  }

  /**
   * Encuentra slots disponibles según los parámetros especificados
   */
  public async findAvailableSlots(params: AvailabilityParams): Promise<AvailabilitySlot[]> {
    try {
      console.log('AvailabilityService - findAvailableSlots - params:', params);
      
      const { date, branchId, courtType, duration } = params;
      const searchDate = new Date(date);
      
      // 1. Obtener canchas disponibles
      const courts = await this.getCourts({ courtType, branchId });
      if (!courts.length) {
        console.log('No se encontraron canchas disponibles con los criterios especificados');
        return [];
      }
      
      // 2. Obtener horarios de la sede
      const branchSchedule = await this.getBranchSchedule(branchId);
      if (!branchSchedule) {
        console.log('No se pudo obtener la configuración de horarios de la sede');
        return [];
      }
      
      // 3. Verificar si el día está abierto
      const dayOfWeek = format(searchDate, 'EEEE').toLowerCase();
      console.log('AvailabilityService - día de la semana:', dayOfWeek);
      console.log('AvailabilityService - días abiertos:', branchSchedule.openingDays);
      
      // 4. Obtener el horario para este día específico
      const schedule = branchSchedule.schedule[dayOfWeek];
      const daySchedule: DaySchedule = {
        isOpen: !!branchSchedule.openingDays[dayOfWeek],
        timeRanges: [],
        timezone: branchSchedule.timezone
      };
      
      // Si hay un horario específico definido para este día, usarlo
      if (schedule && schedule.open && schedule.close) {
        daySchedule.timeRanges = [{
          openTime: schedule.open,
          closeTime: schedule.close
        }];
        daySchedule.isOpen = true;
      }
      
      console.log('AvailabilityService - horario del día:', daySchedule);
      
      // Verificar si el día está abierto y tiene rangos horarios
      if (!daySchedule.isOpen || !daySchedule.timeRanges || daySchedule.timeRanges.length === 0) {
        console.log('La sede está cerrada el día ' + dayOfWeek + ' o no tiene horarios definidos');
        return [];
      }
      
      // Obtener duración en minutos - Convertir de ID a minutos reales
      let durationInMinutes = 60; // Valor predeterminado (1 hora)
      
      // Si se proporciona una duración numérica, verificarla
      if (params.duration) {
        // Verificar si la duración es un ID (1, 1.5, 2, etc.) o ya es un valor en minutos
        if (typeof params.duration === 'number' && params.duration < 10) {
          // Es probablemente un ID de duración, convertirlo a minutos reales
          const durationMap: { [key: number]: number } = {
            1: 60,    // 1 hora
            1.5: 90,  // 1.5 horas (90 minutos)
            2: 120,   // 2 horas
            2.5: 150, // 2.5 horas (150 minutos)
            3: 180,   // 3 horas
            // Mantener compatibilidad con los valores anteriores
            4: 30,    // 30 minutos
            5: 45,    // 45 minutos
            6: 180    // 3 horas
          };
          
          // Buscar la duración en el mapa o usar el valor por defecto
          durationInMinutes = durationMap[params.duration] || 60;
          
          console.log(`AvailabilityService - Duración convertida: ${params.duration} → ${durationInMinutes} minutos`);
        } else {
          // Ya es un valor en minutos
          durationInMinutes = params.duration;
        }
      }
      
      console.log(`AvailabilityService - Usando duración de ${durationInMinutes} minutos`);
      
      // 5. Obtener bookings existentes
      const courtIds = courts.map(court => court.id);
      const existingBookings = await this.getBookings(searchDate, courtIds);
      
      console.log(`AvailabilityService - Se encontraron ${existingBookings.length} reservas para la fecha ${format(searchDate, 'yyyy-MM-dd')}, ids canchas: ${courtIds.join(',')}:`, existingBookings);
      
      // 6. Generar slots disponibles para cada cancha
      let allSlots: AvailabilitySlot[] = [];
      
      for (const court of courts) {
        try {
          // Encontrar rangos disponibles
          const availableRanges = await this.findAvailableRanges(
            daySchedule, 
            existingBookings, 
            court.id, 
            searchDate
          );
          
          console.log('AvailabilityService - rangos disponibles para la cancha:', court.name, availableRanges);
          
          // Generar slots a partir de los rangos disponibles
          const slots = timeSlotService.generateTimeSlots(
            availableRanges,
            durationInMinutes, // Usar la duración en minutos calculada
            court.id,
            searchDate,
            court.name,
            court.court_type,
            daySchedule.timezone || 'UTC'
          );
          
          console.log('AvailabilityService - slots generados para la cancha:', court.name, slots.length);
          
          // Calcular precios para cada slot
          const slotsWithPrices = slots.map(slot => {
            const price = pricingService.calculatePrice(
              court,
              durationInMinutes, // Usar la duración en minutos calculada
              slot.startTime,
              searchDate
            );
            
            // Determinar el estado del slot (available, popular, lastCall)
            const status = pricingService.determineStatus(
              slot.startTime,
              existingBookings,
              searchDate
            );
            
            return {
              ...slot,
              price,
              status // Añadir el campo status requerido por AvailabilitySlot
            };
          });
          
          // Filtrar slots sin precio configurado (como en la versión original)
          const validSlots = slotsWithPrices.filter(slot => slot.price !== null);
          
          allSlots = [...allSlots, ...validSlots];
        } catch (error) {
          console.error(`Error al procesar la cancha ${court.name}:`, error);
        }
      }
      
      console.log(`AvailabilityService - Total de slots disponibles encontrados: ${allSlots.length}`);
      
      // Ordenar slots por hora
      return allSlots.sort((a, b) => {
        return bookingTransformer.timeToMinutes(a.startTime) - bookingTransformer.timeToMinutes(b.startTime);
      });
    } catch (error) {
      console.error('Error al buscar slots disponibles:', error);
      return [];
    }
  }

  /**
   * Crea una reservación temporal para un slot
   */
  public async holdSlot(
    slotId: string, 
    courtId: string, 
    date: string, 
    startTime: string, 
    endTime: string, 
    userId: string
  ): Promise<boolean> {
    return holdReservationService.holdSlot(
      slotId, 
      courtId, 
      date, 
      startTime, 
      endTime, 
      userId
    );
  }

  /**
   * Libera una reservación temporal
   */
  public releaseHold(slotId: string): void {
    holdReservationService.releaseHold(slotId);
  }

  /**
   * Se suscribe a cambios en las reservas para actualizar automáticamente
   */
  public subscribeToChanges(callback: () => void): () => void {
    const subscription = supabase
      .channel('bookings-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          console.log('AvailabilityService - Cambios detectados en reservas');
          callback();
        }
      )
      .subscribe();

    // Retornar función para desuscribirse
    return () => {
      subscription.unsubscribe();
    };
  }
}

// Exportar instancia singleton
export default AvailabilityService.getInstance();
