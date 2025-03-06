"use client"

import { createSupabaseClient } from '@/lib/supabase'
import type { Database } from '@/types/supabase'
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

// Tipo para el payment_config
interface PaymentConfig {
  status: string
  currency: string
}

// Tipo para la clase desde la base de datos
interface ClassFromDB {
  id: string
  empresa_id: string
  created_at: string
  updated_at: string
  name: string
  description: string | null
  visibility: 'public' | 'private'
  start_date: string
  end_date: string | null
  is_recurring: boolean
  schedule_config: ScheduleConfig | null
  available_payment_methods: string[]
  payment_config: PaymentConfig | null
  status: 'active' | 'cancelled' | 'completed'
  created_by: string
  min_students: number
  branch_id: string | null
  branch?: {
    id: string
    name: string
    address: string | null
    phone: string | null
  } | null
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

interface SessionAvailabilityOptions {
  forceUpdate?: boolean; // Forzar actualización incluso si hay datos en caché
  throttleThreshold?: number; // Tiempo mínimo entre actualizaciones (ms)
}

export class ClassService {
  private supabase = createSupabaseClient()
  
  // Caché para almacenar información de disponibilidad y reducir consultas
  private availabilityCache: Record<string, SessionAvailabilityCache> = {};
  
  // Tiempo de expiración de la caché (1 minuto por defecto)
  private readonly CACHE_EXPIRATION_MS = 60 * 1000;
  
  // Último timestamp de actualización por clase
  private lastClassUpdateTimestamp: Record<string, number> = {};

  private async generateSessions(dbClass: ClassFromDB, courts: Array<{ id: string; name: string; description: string | null }> = []): Promise<ClassSession[]> {
    const sessions: ClassSession[] = []
    const scheduleConfig = dbClass.schedule_config || { days: [], timeSlots: [] }
    const days = Array.isArray(scheduleConfig.days) ? scheduleConfig.days : []
    const timeSlots = Array.isArray(scheduleConfig.timeSlots) ? scheduleConfig.timeSlots : []
    
    // Mapear los IDs de las pistas a sus detalles
    const courtsMap = new Map(courts.map(court => [court.id, court]))

    // Fecha actual para filtrar sesiones pasadas
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Fecha límite para mostrar sesiones (1 semana hacia adelante)
    const oneWeekFromNow = new Date(today)
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7)

    // Para cada día en el horario
    days.forEach(dayNumber => {
      // Para cada franja horaria
      timeSlots.forEach(slot => {
        // Validar que el slot tenga la estructura esperada
        if (!slot || typeof slot !== 'object') {
          console.warn('Slot inválido encontrado:', slot)
          return
        }

        // Obtener las pistas para este horario
        const slotCourts = Array.isArray(slot.courtIds)
          ? slot.courtIds
              .map(id => courtsMap.get(id))
              .filter((court): court is NonNullable<typeof court> => court !== undefined)
          : []

        // Calcular la fecha para este día
        const sessionDate = new Date(dbClass.start_date)
        sessionDate.setDate(sessionDate.getDate() + (dayNumber - sessionDate.getDay() + 7) % 7)
        
        // Ajustar la fecha para que sea la próxima ocurrencia del día de la semana
        while (sessionDate < today) {
          sessionDate.setDate(sessionDate.getDate() + 7)
        }
        
        // Verificar si la sesión está dentro del rango de tiempo deseado (hasta una semana adelante)
        if (sessionDate > oneWeekFromNow) {
          return // No incluir esta sesión si está más allá de una semana
        }

        // Crear una sesión por cada cancha en el slot
        slotCourts.forEach(court => {
          const session: ClassSession = {
            // Incluir el ID de la cancha en el identificador único de la sesión
            id: `${dbClass.id}-${dayNumber}-${slot.startTime || ''}-${court.id}`,
            date: sessionDate.toISOString().split('T')[0],
            startTime: slot.startTime || '',
            endTime: slot.endTime || '',
            spotsLeft: slot.spotsLeft ?? slot.capacity ?? 0,
            totalSpots: slot.capacity || 0,
            courts: [court], // Ahora cada sesión tiene su propia cancha
            instructor: Array.isArray(slot.instructors) && slot.instructors.length > 0
              ? slot.instructors[0]
              : 'Sin instructor',
            price: typeof slot.price === 'number' ? slot.price : 0
          }

          // Log para debugging
          console.log('Generando sesión:', {
            dayNumber,
            slot,
            court: court.name,
            session
          })

          sessions.push(session)
        })
      })
    })

    return sessions
  }

  private async transformClassFromDB(dbClass: ClassFromDB): Promise<PublicClass> {
    // Validar que schedule_config tenga la estructura esperada
    const scheduleConfig = dbClass.schedule_config || { days: [], timeSlots: [] }
    const timeSlots = Array.isArray(scheduleConfig.timeSlots) ? scheduleConfig.timeSlots : []
    const days = Array.isArray(scheduleConfig.days) ? scheduleConfig.days : []

    // Obtener los IDs de todas las pistas de todos los time slots
    const courtIds = new Set<string>()
    timeSlots.forEach(slot => {
      if (slot.courtIds && Array.isArray(slot.courtIds)) {
        slot.courtIds.forEach(id => courtIds.add(id))
      }
    })

    // Obtener los detalles de todas las pistas solo si hay IDs
    let courts: Array<{ id: string; name: string; description: string | null }> = []
    if (courtIds.size > 0) {
      try {
        const { data: courtsData, error } = await this.supabase
          .from('courts')
          .select(`
            id,
            name,
            sport,
            surface,
            court_type,
            is_active
          `)
          .in('id', Array.from(courtIds))
          .eq('is_active', true)

        if (!error && courtsData) {
          courts = courtsData.map(court => ({
            id: court.id,
            name: court.name,
            description: `${court.surface} - ${court.court_type}`
          }))
        }
      } catch (error) {
        console.error('Error al obtener detalles de las pistas:', error)
      }
    }

    const sessions = await this.generateSessions(
      { ...dbClass, schedule_config: { days, timeSlots } },
      courts
    )

    return {
      id: dbClass.id,
      title: dbClass.name,
      description: dbClass.description || '',
      is_active: dbClass.status === 'active',
      created_at: dbClass.created_at,
      updated_at: dbClass.updated_at,
      schedule: {
        days,
        timeSlots: timeSlots.map(slot => ({
          startTime: slot.startTime || '',
          endTime: slot.endTime || '',
          capacity: slot.capacity || 0,
          spotsLeft: slot.spotsLeft ?? slot.capacity ?? 0,
          instructors: Array.isArray(slot.instructors) ? slot.instructors : [],
          courtIds: Array.isArray(slot.courtIds) ? slot.courtIds : [],
          price: slot.price || 0
        })),
        daysOfWeek: days.map(day => {
          const date = new Date(2024, 0, day)
          return date.toLocaleDateString('es-ES', { weekday: 'long' })
        }),
        startDate: dbClass.start_date,
        endDate: dbClass.end_date
      },
      availablePaymentMethods: Array.isArray(dbClass.available_payment_methods) 
        ? dbClass.available_payment_methods.map(method => method as 'cash' | 'card' | 'transfer')
        : [],
      visibility: dbClass.visibility,
      is_recurring: dbClass.is_recurring,
      instructor: timeSlots[0]?.instructors?.[0] || 'Sin instructor',
      sessions,
      branchInfo: dbClass.branch ? {
        id: dbClass.branch.id,
        name: dbClass.branch.name,
        address: dbClass.branch.address,
        phone: dbClass.branch.phone
      } : null,
      courts
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

      // 1. Obtener la información de la clase y contar reservas en paralelo
      const [classResult, bookingsResult] = await Promise.all([
        this.supabase
          .from('classes')
          .select('schedule_config')
          .eq('id', classId)
          .single(),
        
        this.supabase
          .from('bookings')
          .select('*', { count: 'exact', head: false })
          .eq('class_id', classId)
          .eq('date', sessionDate)
          .eq('start_time', startTime)
          .eq('end_time', endTime)
          .eq('reservation_type', 'class')
          .is('cancelled_at', null)
      ]);

      const { data: classData, error: classError } = classResult;
      const { count: bookedSpots, error: countError } = bookingsResult;

      // Actualizar timestamp de última actualización para esta clase
      this.lastClassUpdateTimestamp[classId] = now;

      if (classError) {
        console.error('❌ Error al obtener información de la clase:', classError);
        return {
          available: false,
          totalCapacity: 0,
          bookedSpots: 0,
          availableSpots: 0,
          error: {
            message: 'Error al obtener información de la clase',
            code: 'class_fetch_error',
            details: classError.message
          }
        };
      }

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

      if (!classData || !classData.schedule_config) {
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

      // 2. Encontrar la capacidad para este horario específico
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

      // 3. Calcular plazas disponibles
      const availableSpots = Math.max(0, totalCapacity - (bookedSpots || 0));
      const isAvailable = availableSpots > 0;

      // 4. Guardar resultado en caché
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
   * @param classId - ID de la clase
   * @param sessions - Array de sesiones a verificar
   * @returns Mapa de ID de sesión a información de disponibilidad
   */
  async checkMultipleSessionsAvailability(
    classId: string,
    sessions: ClassSession[]
  ): Promise<Map<string, SessionAvailabilityResponse>> {
    try {
      if (!sessions.length) {
        return new Map();
      }

      const result = new Map<string, SessionAvailabilityResponse>();
      const now = Date.now();

      // 1. Filtrar solo las sesiones que necesitan actualización (no en caché o caché expirado)
      const sessionsToCheck = sessions.filter(session => {
        const cacheKey = this.createCacheKey(classId, session.date, session.startTime, session.endTime);
        const cachedData = this.availabilityCache[cacheKey];
        
        if (cachedData && (now - cachedData.timestamp) < this.CACHE_EXPIRATION_MS) {
          // Usar caché para esta sesión
          result.set(session.id, cachedData.data);
          return false;
        }
        
        return true;
      });

      if (!sessionsToCheck.length) {
        console.log('🔄 Todas las sesiones tienen disponibilidad en caché');
        
        // Llenar el resultado con los datos en caché
        sessions.forEach(session => {
          const cacheKey = this.createCacheKey(classId, session.date, session.startTime, session.endTime);
          result.set(session.id, this.availabilityCache[cacheKey].data);
        });
        
        return result;
      }

      // 2. Obtener información de la clase
      const { data: classData, error: classError } = await this.supabase
        .from('classes')
        .select('schedule_config')
        .eq('id', classId)
        .single();

      if (classError || !classData || !classData.schedule_config) {
        console.error('❌ Error al obtener configuración de la clase:', classError);
        
        // Llenar con error para todas las sesiones
        sessionsToCheck.forEach(session => {
          result.set(session.id, {
            available: false,
            totalCapacity: 0,
            bookedSpots: 0,
            availableSpots: 0,
            error: {
              message: 'Error al obtener configuración de la clase',
              code: 'class_config_error',
              details: classError?.message
            }
          });
        });
        
        return result;
      }

      const scheduleConfig: ScheduleConfig = classData.schedule_config;

      // 3. Preparar consulta para obtener todas las reservas de una vez
      // Crear filtros para fechas y horas específicas
      const dateTimeConditions = sessionsToCheck.map(session => {
        return `(date = '${session.date}' AND start_time = '${session.startTime}' AND end_time = '${session.endTime}')`;
      }).join(' OR ');

      // 4. Obtener todas las reservas para estas sesiones en una sola consulta
      const { data: bookings, error: bookingsError } = await this.supabase
        .from('bookings')
        .select('date, start_time, end_time, id')
        .eq('class_id', classId)
        .eq('reservation_type', 'class')
        .is('cancelled_at', null)
        .or(dateTimeConditions);

      if (bookingsError) {
        console.error('❌ Error al consultar reservas:', bookingsError);
        
        // Llenar con error para todas las sesiones
        sessionsToCheck.forEach(session => {
          result.set(session.id, {
            available: false,
            totalCapacity: 0,
            bookedSpots: 0,
            availableSpots: 0,
            error: {
              message: 'Error al consultar reservas',
              code: 'bookings_query_error',
              details: bookingsError.message
            }
          });
        });
        
        return result;
      }

      // 5. Contar reservas por fecha/hora
      const bookingCounts = new Map<string, number>();
      
      bookings?.forEach(booking => {
        const key = `${booking.date}:${booking.start_time}:${booking.end_time}`;
        bookingCounts.set(key, (bookingCounts.get(key) || 0) + 1);
      });

      // 6. Procesar cada sesión
      sessionsToCheck.forEach(session => {
        const { date, startTime, endTime } = session;
        
        // Buscar el time slot correspondiente
        const timeSlot = scheduleConfig.timeSlots.find(slot => 
          slot.startTime === startTime && slot.endTime === endTime
        );
        
        if (!timeSlot) {
          result.set(session.id, {
            available: false,
            totalCapacity: 0,
            bookedSpots: 0,
            availableSpots: 0,
            error: {
              message: 'Horario no encontrado en la configuración',
              code: 'time_slot_not_found'
            }
          });
          return;
        }
        
        const totalCapacity = timeSlot.capacity;
        const bookingKey = `${date}:${startTime}:${endTime}`;
        const bookedSpots = bookingCounts.get(bookingKey) || 0;
        const availableSpots = Math.max(0, totalCapacity - bookedSpots);
        
        const availability = {
          available: availableSpots > 0,
          totalCapacity,
          bookedSpots,
          availableSpots
        };
        
        // Guardar en caché
        const cacheKey = this.createCacheKey(classId, date, startTime, endTime);
        this.availabilityCache[cacheKey] = {
          timestamp: now,
          data: availability
        };
        
        // Guardar en resultado
        result.set(session.id, availability);
      });
      
      return result;
    } catch (error: any) {
      console.error('❌ Error al verificar disponibilidad múltiple:', error);
      
      // Devolver un map vacío en caso de error
      return new Map();
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
          
          // Actualizar la sesión con la información de disponibilidad
          updatedSessions[i] = {
            ...session,
            spotsLeft: availability.availableSpots,
            totalSpots: availability.totalCapacity,
            selected: session.selected
          };
        }
      }

      updatedClass.sessions = updatedSessions;
      return updatedClass;
    } catch (error) {
      console.error('❌ Error al actualizar disponibilidad de sesiones:', error);
      return classData; // Devolver datos originales en caso de error
    }
  }

  async testConnection(empresaId: string): Promise<boolean> {
    try {
      const { data: { session }, error: sessionError } = await this.supabase.auth.getSession()
      
      if (sessionError) {
        console.error('❌ Error al obtener la sesión:', sessionError)
        return false
      }

      if (!session) {
        console.warn('⚠️ No hay sesión activa')
        return false
      }

      const { data, error } = await this.supabase
        .from('empresas')
        .select('id, name, is_active')
        .eq('id', empresaId)
        .maybeSingle()

      if (error) {
        console.error('Error al verificar conexión:', error)
        return false
      }

      return data?.is_active ?? false
    } catch (error) {
      console.error('Error al probar conexión:', error)
      return false
    }
  }

  async getPublicClasses(empresaId: string): Promise<PublicClass[]> {
    try {
      const { data: { session }, error: sessionError } = await this.supabase.auth.getSession()
      
      if (sessionError || !session) {
        console.error('Error de sesión:', sessionError)
        return []
      }

      const { data: classes, error } = await this.supabase
        .from('classes')
        .select(`
          id,
          empresa_id,
          created_at,
          updated_at,
          name,
          description,
          visibility,
          start_date,
          end_date,
          is_recurring,
          schedule_config,
          available_payment_methods,
          payment_config,
          status,
          created_by,
          min_students,
          branch_id,
          branch:sedes (
            id,
            name,
            address,
            phone
          )
        `)
        .eq('empresa_id', empresaId)
        .eq('status', 'active')
        .or(`and(is_recurring.eq.false,start_date.gte.${new Date().toISOString().split('T')[0]}),and(is_recurring.eq.true,or(end_date.is.null,end_date.gte.${new Date().toISOString().split('T')[0]}))`)

      if (error) throw error

      const transformedClasses = await Promise.all(
        (classes || []).map(async (cls) => {
          const classData = cls as unknown as ClassFromDB
          return this.transformClassFromDB(classData)
        })
      )

      return transformedClasses
    } catch (error) {
      console.error('Error al obtener las clases:', error)
      return []
    }
  }

  async getClassById(classId: string): Promise<PublicClass | null> {
    try {
      const { data, error } = await this.supabase
        .from('classes')
        .select(`
          id,
          empresa_id,
          created_at,
          updated_at,
          name,
          description,
          visibility,
          start_date,
          end_date,
          is_recurring,
          schedule_config,
          available_payment_methods,
          payment_config,
          status,
          created_by,
          min_students,
          branch_id,
          branch:sedes (
            id,
            name,
            address,
            phone
          )
        `)
        .eq('id', classId)
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      const classData = data as unknown as ClassFromDB
      return this.transformClassFromDB(classData)
    } catch (error) {
      console.error('Error al obtener clase:', error)
      return null
    }
  }
} 