"use client"

/**
 * Servicio de Validación de Stock
 * 
 * Este servicio maneja todas las operaciones relacionadas con la verificación de disponibilidad
 * de plazas en sesiones de clases, incluyendo:
 * - Verificación de disponibilidad para sesiones individuales
 * - Verificación de disponibilidad para múltiples sesiones
 * - Actualización de información de disponibilidad en clases
 * 
 * Implementa un sistema de caché para reducir consultas duplicadas y mejorar el rendimiento.
 * 
 * IMPORTANTE: Implementación de transformación de zona horaria
 * -------------------------------------------------------------
 * Para mantener la consistencia con el servicio de reservas, este servicio implementa 
 * la transformación de zona horaria al verificar la disponibilidad de sesiones:
 * 
 * 1. Obtiene la zona horaria de la sede (branch) asociada a la clase
 * 2. Convierte los horarios locales a UTC antes de consultar las reservas existentes
 * 3. Compara los horarios en la misma referencia temporal (UTC) para obtener resultados precisos
 */

import { createSupabaseClient } from '@/lib/supabase'
import { DateTime } from 'luxon'
import type { PublicClass, ClassSession } from '../types/models'

// Tipo para el schedule_config
interface ScheduleConfig {
  days: number[]
  timeSlots: Array<{
    price: number
    endTime: string
    capacity: number
    startTime: string
    instructors: string[]
    courtIds: string[]
    spotsLeft?: number
  }>
}

// Respuesta de disponibilidad de sesión
interface SessionAvailabilityResponse {
  available: boolean;
  totalCapacity: number;
  bookedSpots: number;
  availableSpots: number;
  error?: {
    message: string;
    code: string;
    details?: string;
  };
}

// Caché de disponibilidad para reducir consultas duplicadas
interface SessionAvailabilityCache {
  timestamp: number;
  data: SessionAvailabilityResponse;
}

// Opciones para la verificación de disponibilidad
interface SessionAvailabilityOptions {
  forceUpdate?: boolean; // Forzar actualización incluso si hay datos en caché
  throttleThreshold?: number; // Tiempo mínimo entre actualizaciones (ms)
}

export class StockValidationService {
  private supabase = createSupabaseClient()
  
  // Caché para almacenar información de disponibilidad y reducir consultas
  private availabilityCache: Record<string, SessionAvailabilityCache> = {};
  
  // Tiempo de expiración de la caché (1 minuto por defecto)
  private readonly CACHE_EXPIRATION_MS = 60 * 1000;
  
  // Último timestamp de actualización por clase
  private lastClassUpdateTimestamp: Record<string, number> = {};

  /**
   * Obtiene la zona horaria de una sede
   * 
   * @private
   * @param branchId - ID de la sede
   * @returns La zona horaria de la sede o 'UTC' por defecto
   */
  private async getBranchTimezone(branchId: string): Promise<string> {
    try {
      if (!branchId) {
        console.warn('⚠️ No se proporcionó ID de sede, usando UTC por defecto');
        return 'UTC';
      }

      const { data: branch, error } = await this.supabase
        .from('sedes')
        .select('timezone')
        .eq('id', branchId)
        .single();

      if (error || !branch) {
        console.error('❌ Error al obtener la zona horaria de la sede:', error);
        return 'UTC';
      }

      const timezone = branch.timezone || 'UTC';
      console.log('✅ Zona horaria de la sede:', timezone);
      return timezone;
    } catch (error) {
      console.error('❌ Error al obtener la zona horaria:', error);
      return 'UTC';
    }
  }

  /**
   * Convierte los horarios locales a UTC según la zona horaria de la sede
   * 
   * @private
   * @param branchId - ID de la sede
   * @param date - Fecha en formato local (YYYY-MM-DD)
   * @param startTime - Hora de inicio en formato local (HH:MM)
   * @param endTime - Hora de fin en formato local (HH:MM)
   * @returns Objeto con las fechas y horas convertidas a UTC, o los valores originales si hay error
   */
  private async convertLocalToUTC(
    branchId: string,
    date: string,
    startTime: string,
    endTime: string
  ): Promise<{
    dateUTC: string;
    startTimeUTC: string;
    endTimeUTC: string;
    timezone: string;
  }> {
    try {
      // Obtener la zona horaria de la sede
      const timezone = await this.getBranchTimezone(branchId);
      
      // Crear fechas usando Luxon con la zona horaria de la sede
      const localStartDateTime = DateTime.fromFormat(
        `${date} ${startTime}`,
        'yyyy-MM-dd HH:mm',
        { zone: timezone }
      );
      
      const localEndDateTime = DateTime.fromFormat(
        `${date} ${endTime}`,
        'yyyy-MM-dd HH:mm',
        { zone: timezone }
      );
      
      // Convertir a UTC
      const startTimeUTC = localStartDateTime.toUTC().toFormat('HH:mm:ss');
      const endTimeUTC = localEndDateTime.toUTC().toFormat('HH:mm:ss');
      const dateUTC = localStartDateTime.toUTC().toFormat('yyyy-MM-dd');
      
      console.log('🕒 Conversión de horarios para verificación de disponibilidad:', {
        local: {
          date,
          start: startTime,
          end: endTime,
          timezone,
          localStart: localStartDateTime.toISO(),
          localEnd: localEndDateTime.toISO()
        },
        utc: {
          date: dateUTC,
          start: startTimeUTC,
          end: endTimeUTC,
          fullStartUTC: localStartDateTime.toUTC().toISO(),
          fullEndUTC: localEndDateTime.toUTC().toISO()
        }
      });
      
      return {
        dateUTC,
        startTimeUTC,
        endTimeUTC,
        timezone
      };
    } catch (error) {
      console.error('❌ Error en la conversión de horarios:', error);
      // En caso de error, devolvemos los valores originales
      return {
        dateUTC: date,
        startTimeUTC: startTime,
        endTimeUTC: endTime,
        timezone: 'UTC'
      };
    }
  }

  /**
   * Crea una clave única para el caché de disponibilidad
   */
  private createCacheKey(classId: string, sessionDate: string, startTime: string, endTime: string): string {
    return `${classId}:${sessionDate}:${startTime}:${endTime}`;
  }

  /**
   * Verifica si es necesario actualizar la información de disponibilidad
   * @param classId - ID de la clase para verificar
   * @param options - Opciones de la verificación
   * @returns true si es necesario actualizar, false si no
   */
  public shouldUpdateAvailability(classId: string, options: SessionAvailabilityOptions = {}): boolean {
    const now = Date.now();
    const lastUpdate = this.lastClassUpdateTimestamp[classId] || 0;
    const timeSinceLastUpdate = now - lastUpdate;
    
    // Si se fuerza la actualización, siempre retornar true
    if (options.forceUpdate) {
      console.log('🔄 Forzando actualización de disponibilidad para clase:', classId);
      return true;
    }
    
    // Si no ha pasado suficiente tiempo desde la última actualización, evitar la actualización
    const threshold = options.throttleThreshold || 5000; // 5 segundos por defecto
    if (timeSinceLastUpdate < threshold) {
      console.log(`🛑 Evitando actualización de disponibilidad (muy reciente: ${timeSinceLastUpdate}ms < ${threshold}ms)`);
      return false;
    }
    
    return true;
  }

  /**
   * Verifica la disponibilidad de plazas para una sesión específica de clase
   * 
   * Esta función:
   * 1. Convierte los horarios locales a UTC según la zona horaria de la sede
   * 2. Consulta las reservas existentes para ese horario en UTC
   * 3. Calcula la disponibilidad de plazas
   */
  async checkSessionAvailability(
    classId: string,
    sessionDate: string,
    startTime: string,
    endTime: string,
    options: SessionAvailabilityOptions = {}
  ): Promise<SessionAvailabilityResponse> {
    try {
      // Verificar si tenemos la información en caché y no ha expirado
      const cacheKey = this.createCacheKey(classId, sessionDate, startTime, endTime);
      const cachedData = this.availabilityCache[cacheKey];
      const now = Date.now();

      if (!options.forceUpdate && cachedData && (now - cachedData.timestamp) < this.CACHE_EXPIRATION_MS) {
        console.log('🔄 Usando datos de disponibilidad en caché para:', cacheKey);
        return cachedData.data;
      }

      console.log('🔍 Verificando disponibilidad para sesión:', {
        classId,
        sessionDate,
        startTime,
        endTime
      });

      // 1. Obtener la información de la clase
      const { data: classData, error: classError } = await this.supabase
        .from('classes')
        .select('schedule_config, branch_id')
        .eq('id', classId)
        .single();

      if (classError || !classData) {
        console.error('❌ Error al obtener información de la clase:', classError);
        return {
          available: false,
          totalCapacity: 0,
          bookedSpots: 0,
          availableSpots: 0,
          error: {
            message: 'Error al obtener información de la clase',
            code: 'class_fetch_error',
            details: classError?.message
          }
        };
      }

      // 2. Convertir horarios locales a UTC basados en la zona horaria de la sede
      const { dateUTC, startTimeUTC, endTimeUTC } = await this.convertLocalToUTC(
        classData.branch_id,
        sessionDate,
        startTime,
        endTime
      );

      // 3. Consultar reservas con horarios en UTC
      const { count: bookedSpots, error: countError } = await this.supabase
        .from('bookings')
        .select('*', { count: 'exact', head: false })
        .eq('class_id', classId)
        .eq('date', dateUTC)              // Fecha en UTC
        .eq('start_time', startTimeUTC)   // Hora de inicio en UTC
        .eq('end_time', endTimeUTC)       // Hora de fin en UTC
        .eq('reservation_type', 'class')
        .is('cancelled_at', null);

      // Actualizar timestamp de última actualización para esta clase
      this.lastClassUpdateTimestamp[classId] = now;

      if (countError) {
        console.error('❌ Error al contar reservas existentes:', countError);
        return {
          available: false,
          totalCapacity: 0,
          bookedSpots: 0,
          availableSpots: 0,
          error: {
            message: 'Error al contar reservas existentes',
            code: 'bookings_count_error',
            details: countError.message
          }
        };
      }

      if (!classData.schedule_config) {
        console.error('❌ La clase no tiene configuración de horario:', classId);
        return {
          available: false,
          totalCapacity: 0,
          bookedSpots: 0,
          availableSpots: 0,
          error: {
            message: 'La clase no tiene configuración de horario',
            code: 'no_schedule_config'
          }
        };
      }

      // 4. Encontrar la capacidad para este horario específico
      const scheduleConfig: ScheduleConfig = classData.schedule_config;
      const timeSlot = scheduleConfig.timeSlots.find(slot => 
        slot.startTime === startTime && slot.endTime === endTime
      );

      if (!timeSlot) {
        console.error('❌ No se encontró el horario especificado en la configuración de la clase');
        return {
          available: false,
          totalCapacity: 0,
          bookedSpots: 0,
          availableSpots: 0,
          error: {
            message: 'Horario no encontrado en la configuración de la clase',
            code: 'time_slot_not_found'
          }
        };
      }

      const totalCapacity = timeSlot.capacity;

      // 5. Calcular plazas disponibles
      const availableSpots = Math.max(0, totalCapacity - (bookedSpots || 0));
      const isAvailable = availableSpots > 0;

      // 6. Guardar resultado en caché
      const result = {
        available: isAvailable,
        totalCapacity,
        bookedSpots: bookedSpots || 0,
        availableSpots
      };
      
      this.availabilityCache[cacheKey] = {
        timestamp: now,
        data: result
      };

      console.log('✅ Disponibilidad de sesión:', {
        classId,
        sessionDate,
        startTime,
        endTime,
        totalCapacity,
        bookedSpots,
        availableSpots,
        isAvailable
      });

      return result;
    } catch (error: any) {
      console.error('❌ Error inesperado al verificar disponibilidad de sesión:', error);
      return {
        available: false,
        totalCapacity: 0,
        bookedSpots: 0,
        availableSpots: 0,
        error: {
          message: 'Error inesperado al verificar disponibilidad',
          code: 'unexpected_error',
          details: error.message
        }
      };
    }
  }

  /**
   * Verifica la disponibilidad de plazas para múltiples sesiones en una sola operación
   * 
   * Esta función:
   * 1. Obtiene la información de la clase
   * 2. Convierte cada sesión a UTC basado en la zona horaria de la sede
   * 3. Consulta las reservas existentes para todas las sesiones
   * 4. Calcula la disponibilidad para cada sesión
   */
  async checkMultipleSessionsAvailability(
    classId: string,
    sessions: ClassSession[]
  ): Promise<Map<string, SessionAvailabilityResponse>> {
    const results = new Map<string, SessionAvailabilityResponse>();
    
    try {
      if (!sessions || sessions.length === 0) {
        console.log('📝 No hay sesiones para verificar');
        return results;
      }
      
      console.log(`🔍 Verificando disponibilidad para ${sessions.length} sesiones de clase ${classId}`);
      
      // 1. Obtener información de la clase
      const { data: classData, error: classError } = await this.supabase
        .from('classes')
        .select('schedule_config, branch_id')
        .eq('id', classId)
        .single();
        
      if (classError || !classData) {
        console.error('❌ Error al obtener información de la clase:', classError);
        
        // Crear respuesta de error para todas las sesiones
        const errorResponse: SessionAvailabilityResponse = {
          available: false,
          totalCapacity: 0,
          bookedSpots: 0,
          availableSpots: 0,
          error: {
            message: 'Error al obtener información de la clase',
            code: 'class_fetch_error',
            details: classError?.message
          }
        };
        
        sessions.forEach(session => {
          results.set(session.id, errorResponse);
        });
        
        return results;
      }
      
      // 2. Convertir cada sesión a UTC basado en la zona horaria de la sede
      const branchId = classData.branch_id;
      const sessionsUTC = await Promise.all(
        sessions.map(async (session) => {
          const { dateUTC, startTimeUTC, endTimeUTC } = await this.convertLocalToUTC(
            branchId,
            session.date,
            session.startTime,
            session.endTime
          );
          
          return {
            sessionId: session.id,
            originalSession: session,
            dateUTC,
            startTimeUTC,
            endTimeUTC
          };
        })
      );
      
      // Crear condiciones para consultar todas las sesiones de una vez
      const sessionsToCheck = sessionsUTC.filter(s => s !== undefined);
      
      if (sessionsToCheck.length === 0) {
        console.warn('⚠️ No se pudieron convertir las sesiones a UTC');
        return results;
      }
      
      // 3. Preparar la consulta para obtener todas las reservas de las sesiones
      const dateTimeConditions = sessionsToCheck.map(session => {
        return `and(date.eq.${session.dateUTC},start_time.eq.${session.startTimeUTC},end_time.eq.${session.endTimeUTC})`;
      });
      
      const query = this.supabase
        .from('bookings')
        .select('date, start_time, end_time, count')
        .eq('class_id', classId)
        .eq('reservation_type', 'class')
        .is('cancelled_at', null)
        .or(dateTimeConditions.join(','));  // Unimos las condiciones con coma para obtener un string
      
      const { data: bookings, error: bookingsError } = await query;
      
      if (bookingsError) {
        console.error('❌ Error al obtener reservas:', bookingsError);
        
        // Crear respuesta de error para todas las sesiones
        const errorResponse: SessionAvailabilityResponse = {
          available: false,
          totalCapacity: 0,
          bookedSpots: 0,
          availableSpots: 0,
          error: {
            message: 'Error al obtener reservas',
            code: 'bookings_fetch_error',
            details: bookingsError.message
          }
        };
        
        sessions.forEach(session => {
          results.set(session.id, errorResponse);
        });
        
        return results;
      }
      
      // 4. Procesar los resultados para cada sesión
      for (const sessionUTC of sessionsToCheck) {
        const session = sessionUTC.originalSession;
        
        // Encontrar las reservas para esta sesión
        const sessionBookings = bookings?.filter(b => 
          b.date === sessionUTC.dateUTC && 
          b.start_time === sessionUTC.startTimeUTC && 
          b.end_time === sessionUTC.endTimeUTC
        ) || [];
        
        // Contar reservas
        const bookedSpots = sessionBookings.length;
        
        // Encontrar la capacidad para este horario específico
        const scheduleConfig: ScheduleConfig = classData.schedule_config || { days: [], timeSlots: [] };
        const timeSlot = scheduleConfig.timeSlots?.find(slot => 
          slot.startTime === session.startTime && slot.endTime === session.endTime
        );
        
        if (!timeSlot) {
          console.warn(`⚠️ No se encontró el horario para la sesión ${session.id}`);
          results.set(session.id, {
            available: false,
            totalCapacity: 0,
            bookedSpots: 0,
            availableSpots: 0,
            error: {
              message: 'Horario no encontrado en la configuración de la clase',
              code: 'time_slot_not_found'
            }
          });
          continue;
        }
        
        const totalCapacity = timeSlot.capacity || 0;
        const availableSpots = Math.max(0, totalCapacity - bookedSpots);
        const isAvailable = availableSpots > 0;
        
        results.set(session.id, {
          available: isAvailable,
          totalCapacity,
          bookedSpots,
          availableSpots
        });
        
        // Actualizar la caché para esta sesión
        const cacheKey = this.createCacheKey(classId, session.date, session.startTime, session.endTime);
        this.availabilityCache[cacheKey] = {
          timestamp: Date.now(),
          data: {
            available: isAvailable,
            totalCapacity,
            bookedSpots,
            availableSpots
          }
        };
      }
      
      return results;
    } catch (error: any) {
      console.error('❌ Error inesperado al verificar múltiples sesiones:', error);
      
      // Crear respuesta de error para todas las sesiones
      const errorResponse: SessionAvailabilityResponse = {
        available: false,
        totalCapacity: 0,
        bookedSpots: 0,
        availableSpots: 0,
        error: {
          message: 'Error inesperado al verificar disponibilidad',
          code: 'unexpected_error',
          details: error.message
        }
      };
      
      sessions.forEach(session => {
        results.set(session.id, errorResponse);
      });
      
      return results;
    }
  }

  /**
   * Actualiza la información de plazas disponibles para una clase
   */
  async updateSessionsAvailability(
    classData: PublicClass, 
    options: SessionAvailabilityOptions = {}
  ): Promise<PublicClass> {
    try {
      if (!classData.sessions || classData.sessions.length === 0) {
        return classData;
      }

      // Verificar si se debe actualizar
      if (!this.shouldUpdateAvailability(classData.id, options)) {
        return classData; // No actualizar si no es necesario
      }

      console.log(`🔄 Actualizando disponibilidad para clase: ${classData.id}`);

      // Filtrar solo sesiones futuras
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const futureSessions = classData.sessions.filter(session => {
        const sessionDate = new Date(session.date);
        return sessionDate >= today;
      });
      
      if (futureSessions.length === 0) {
        return classData;
      }

      // Crear una copia de la clase para no modificar el objeto original
      const updatedClass = { ...classData };
      const updatedSessions = [...updatedClass.sessions];

      // Verificar cada sesión
      for (let i = 0; i < updatedSessions.length; i++) {
        const session = updatedSessions[i];
        
        // Solo verificar sesiones futuras (fecha >= hoy)
        const sessionDate = new Date(session.date);
        
        if (sessionDate >= today) {
          const availability = await this.checkSessionAvailability(
            classData.id,
            session.date,
            session.startTime,
            session.endTime,
            options
          );
          
          // Actualizar información de disponibilidad
          updatedSessions[i] = {
            ...session,
            spotsLeft: availability.availableSpots,
            totalSpots: availability.totalCapacity
          };
        }
      }
      
      // Actualizar el objeto de clase
      updatedClass.sessions = updatedSessions;
      
      // Actualizar el timestamp de última actualización
      this.lastClassUpdateTimestamp[classData.id] = Date.now();
      
      return updatedClass;
    } catch (error) {
      console.error('❌ Error al actualizar disponibilidad de sesiones:', error);
      // En caso de error, devolver la clase sin modificar
      return classData;
    }
  }
}

// Exportamos una instancia singleton del servicio para uso global
export const stockValidationService = new StockValidationService();
