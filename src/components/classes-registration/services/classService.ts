/**
 * Servicio de clases
 * 
 * Este servicio maneja todas las operaciones relacionadas con las clases públicas,
 * incluyendo la obtención de datos, transformación y verificación de disponibilidad.
 * 
 * IMPORTANTE: Implementación de transformación de zona horaria
 * -------------------------------------------------------------
 * Para mantener la consistencia con el servicio de reservas, este servicio ahora implementa 
 * la transformación de zona horaria al verificar la disponibilidad de sesiones:
 * 
 * 1. Obtiene la zona horaria de la sede (branch) asociada a la clase
 * 2. Convierte los horarios locales a UTC antes de consultar las reservas existentes
 * 3. Compara los horarios en la misma referencia temporal (UTC) para obtener resultados precisos
 * 
 * Esto garantiza que la verificación de disponibilidad sea consistente con el proceso de creación
 * de reservas, evitando problemas de inconsistencia por diferencias de zona horaria.
 */

import { createSupabaseClient } from '@/lib/supabase'
import type { Database } from '@/types/supabase'
import type { PublicClass, ClassSession } from '../types/models'
import { DateTime } from 'luxon'
import { stockValidationService } from './stockValidationService'

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
  specificSessions?: Array<{
    date: string
    price: number
    endTime: string
    capacity: number
    courtIds: string | string[]
    createdAt: string
    startTime: string
    instructors: string[]
  }>
  suspendedSessions?: Array<{
    date: string
    reason: string
    courtId: string
    endTime: string
    startTime: string
    suspendedAt: string
  }>
}

// Tipo para el payment_config
interface PaymentConfig {
  status: string
  currency: string
  guaranteePercentage?: number
  partialPaymentPercentage?: number
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

// Importamos los tipos necesarios del servicio de validación de stock
import { 
  SessionAvailabilityResponse, 
  SessionAvailabilityOptions 
} from './stockValidationService'

// Opciones para transformar una clase de DB a PublicClass
interface TransformClassOptions {
  skipSessionGeneration?: boolean; // Si es true, no se generarán sesiones (mejora rendimiento)
  paginationOptions?: GenerateSessionsOptions; // Opciones para paginación de sesiones
}

interface GenerateSessionsOptions {
  limit?: number;        // Número máximo de sesiones a generar
  offset?: number;       // Número de sesiones a saltar
  pageSize?: number;     // Tamaño de página para generación paginada
  pageNumber?: number;   // Número de página (comienza en 0)
}

export class ClassService {
  private supabase = createSupabaseClient()

  // NUEVO: Sistema persistente para mantener valores validados de stock
  // Estas sesiones ya fueron validadas y sus valores no deben ser sobrescritos
  // con valores por defecto o placeholders
  private static validatedSessionsMap = new Map<string, Map<string, number>>();

  /**
   * NUEVO: Registra una sesión como validada para proteger su valor de stock
   * @param classId ID de la clase
   * @param sessionId ID de la sesión
   * @param spotsLeft Número de plazas disponibles verificado
   */
  public registerValidatedSessionStock(classId: string, sessionId: string, spotsLeft: number): void {
    if (!ClassService.validatedSessionsMap.has(classId)) {
      ClassService.validatedSessionsMap.set(classId, new Map<string, number>());
    }
    
    const sessionMap = ClassService.validatedSessionsMap.get(classId);
    // CORRECCIÓN: verificar explicitamente si spotsLeft es 0 o mayor
    // Para garantizar que el valor 0 (agotado) también se considere como un valor válido
    if (sessionMap && sessionId && spotsLeft !== undefined && spotsLeft !== null) {
      // Tratamos explicitamente el caso de stock cero (sesión agotada)
      if (spotsLeft === 0) {
        console.log(`🔒 Registrando sesión ${sessionId} como AGOTADA (stock=0)`);
      } else {
        console.log(`🔒 Registrando sesión ${sessionId} con stock validado: ${spotsLeft}`);
      }
      sessionMap.set(sessionId, spotsLeft);
    }
  }
  
  /**
   * NUEVO: Verifica si una sesión tiene un valor de stock validado
   * @param classId ID de la clase
   * @param sessionId ID de la sesión
   * @returns Valor de stock validado o null si no existe
   */
  public getValidatedSessionStock(classId: string, sessionId: string): number | null {
    const sessionMap = ClassService.validatedSessionsMap.get(classId);
    if (sessionMap && sessionMap.has(sessionId)) {
      return sessionMap.get(sessionId) || null;
    }
    return null;
  }
  
  /**
   * NUEVO: Verifica si una sesión ya tiene stock validado
   * @param classId ID de la clase
   * @param sessionId ID de la sesión
   * @returns true si la sesión ya tiene stock validado
   */
  public hasValidatedStock(classId: string, sessionId: string): boolean {
    const sessionMap = ClassService.validatedSessionsMap.get(classId);
    return !!sessionMap && sessionMap.has(sessionId);
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
      
      console.log(' Conversión de horarios para verificación de disponibilidad:', {
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
      console.error(' Error en la conversión de horarios:', error);
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
   * Obtiene la zona horaria de una sede
   * 
   * @private
   * @param branchId - ID de la sede
   * @returns La zona horaria de la sede o 'UTC' por defecto
   */
  private async getBranchTimezone(branchId: string): Promise<string> {
    try {
      if (!branchId) {
        console.warn(' No se proporcionó ID de sede, usando UTC por defecto');
        return 'UTC';
      }

      const { data: branch, error } = await this.supabase
        .from('sedes')
        .select('timezone')
        .eq('id', branchId)
        .single();

      if (error || !branch) {
        console.error(' Error al obtener la zona horaria de la sede:', error);
        return 'UTC';
      }

      const timezone = branch.timezone || 'UTC';
      console.log(' Zona horaria de la sede:', timezone);
      return timezone;
    } catch (error) {
      console.error(' Error al obtener la zona horaria:', error);
      return 'UTC';
    }
  }

  private async generateSessions(
    dbClass: ClassFromDB, 
    courts: Array<{ id: string; name: string; description: string | null }> = [],
    options: GenerateSessionsOptions = {}
  ): Promise<ClassSession[]> {
    const sessions: ClassSession[] = []
    const scheduleConfig = dbClass.schedule_config || { days: [], timeSlots: [] }
    const days = Array.isArray(scheduleConfig.days) ? scheduleConfig.days : []
    const timeSlots = Array.isArray(scheduleConfig.timeSlots) ? scheduleConfig.timeSlots : []
    const specificSessions = Array.isArray(scheduleConfig.specificSessions) ? scheduleConfig.specificSessions : []
    const suspendedSessions = Array.isArray(scheduleConfig.suspendedSessions) ? scheduleConfig.suspendedSessions : []
    
    // Crear un mapa de sesiones suspendidas para verificación rápida
    const suspendedSessionsMap = new Map<string, boolean>();
    
    suspendedSessions.forEach(session => {
      const key = `${session.date}-${session.startTime}-${session.endTime}-${session.courtId}`;
      suspendedSessionsMap.set(key, true);
      console.log(`🚫 Marcando sesión suspendida: ${key}`);
    });
    
    // Mapear los IDs de las pistas a sus detalles
    const courtsMap = new Map(courts.map(court => [court.id, court]))

    // Fecha actual para filtrar sesiones pasadas
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Fecha límite para mostrar sesiones (30 días hacia adelante)
    const thirtyDaysFromNow = new Date(today)
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    
    // Información de depuración
    console.log('Generando sesiones con rango de fechas:', {
      today: today.toISOString().split('T')[0],
      thirtyDaysFromNow: thirtyDaysFromNow.toISOString().split('T')[0],
      diasEnRango: Math.ceil((thirtyDaysFromNow.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    })

    // --- Parte nueva: Opciones de paginación ---
    const {
      limit = 0,           // 0 significa sin límite
      offset = 0,
      pageSize = 0,        // 0 significa sin paginación
      pageNumber = 0
    } = options;

    // Calcular el offset real basado en pageSize y pageNumber si están definidos
    const effectiveOffset = pageSize > 0 ? pageSize * pageNumber : offset;
    const effectiveLimit = pageSize > 0 ? pageSize : limit;
    
    console.log(' Opciones de paginación de sesiones:', {
      efectiveOffset: effectiveOffset,
      effectiveLimit: effectiveLimit,
      pageSize,
      pageNumber
    });
    // --- Fin parte nueva ---

    // Generar sesiones temporalmente para paginación
    const tempSessions: ClassSession[] = [];
    
    // Para cada día en el horario
    days.forEach(dayNumber => {
      console.log(`Procesando día de la semana: ${dayNumber} (${['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][dayNumber]})`)
      
      // Calcular la fecha actual más cercana para este día de la semana
      // Crear una copia de la fecha actual para no modificar 'today'
      const baseDate = new Date(today);
      
      // Avanzar o retroceder para llegar al día de la semana deseado
      const daysToAdd = (dayNumber - baseDate.getDay() + 7) % 7;
      baseDate.setDate(baseDate.getDate() + daysToAdd);
      
      console.log(`Primera fecha para día ${dayNumber}: ${baseDate.toISOString().split('T')[0]}`);
      
      // Generar todas las sesiones para este día de la semana dentro del rango de 30 días
      let currentDate = new Date(baseDate);
      let iterationCount = 0;
      const maxIterations = 10; // Límite de seguridad para evitar bucles infinitos
      
      while (currentDate <= thirtyDaysFromNow && iterationCount < maxIterations) {
        iterationCount++;
        console.log(`Generando sesión #${iterationCount} para ${currentDate.toISOString().split('T')[0]} (día ${dayNumber})`);
        
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

          // Si no hay pistas disponibles, saltar este slot
          if (slotCourts.length === 0) {
            console.log(`No hay pistas disponibles para el slot ${slot.startTime}-${slot.endTime}`)
            return
          }

          // Crear una sesión por cada cancha en el slot
          slotCourts.forEach(court => {
            const sessionDate = new Date(currentDate);
            
            // Verificar que la fecha está en el rango permitido (redundante pero seguro)
            if (sessionDate < today || sessionDate > thirtyDaysFromNow) {
              console.log(`Fecha fuera de rango (${sessionDate.toISOString().split('T')[0]}), no se genera sesión`);
              return;
            }
            
            const formattedDate = sessionDate.toISOString().split('T')[0];
            
            // Verificar si esta sesión está suspendida
            const suspendedSessionKey = `${formattedDate}-${slot.startTime}-${slot.endTime}-${court.id}`;
            if (suspendedSessionsMap.has(suspendedSessionKey)) {
              console.log(`🚫 Sesión suspendida, no se genera: ${suspendedSessionKey}`);
              return;
            }
            
            const session: ClassSession = {
              // Incluir la fecha específica en el ID para garantizar unicidad
              id: `${dbClass.id}-${formattedDate}-${slot.startTime || ''}-${court.id}`,
              date: formattedDate,
              startTime: slot.startTime || '',
              endTime: slot.endTime || '',
              spotsLeft: slot.spotsLeft ?? slot.capacity ?? 0,
              totalSpots: slot.capacity || 0,
              courts: [court],
              instructor: Array.isArray(slot.instructors) && slot.instructors.length > 0
                ? slot.instructors[0]
                : 'Sin instructor',
              price: typeof slot.price === 'number' ? slot.price : 0
            }

            // Log detallado
            console.log(` Sesión generada: ${formattedDate} (${['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'][sessionDate.getDay()]}) ${slot.startTime}-${slot.endTime} - ${court.name}`);

            // Añadir a lista temporal para posterior paginación
            tempSessions.push(session);
          })
        })
        
        // Avanzar al siguiente día de la semana (7 días más tarde)
        currentDate.setDate(currentDate.getDate() + 7)
      }
    })
    
    // Añadir sesiones específicas
    specificSessions.forEach(specificSession => {
      // Verificar que la fecha está en el rango permitido
      const sessionDate = new Date(specificSession.date);
      if (sessionDate < today || sessionDate > thirtyDaysFromNow) {
        console.log(`Fecha de sesión específica fuera de rango (${specificSession.date}), no se genera`);
        return;
      }
      
      // Obtener las canchas para esta sesión específica
      const courtIdsList = Array.isArray(specificSession.courtIds) 
        ? specificSession.courtIds 
        : [specificSession.courtIds];
      
      courtIdsList.forEach(courtId => {
        const court = courtsMap.get(courtId);
        
        // Si no se encuentra la cancha, omitir esta sesión
        if (!court) {
          console.log(`Cancha no encontrada para sesión específica: ${courtId}`);
          return;
        }
        
        // Verificar si esta sesión específica está suspendida
        const suspendedSessionKey = `${specificSession.date}-${specificSession.startTime}-${specificSession.endTime}-${courtId}`;
        if (suspendedSessionsMap.has(suspendedSessionKey)) {
          console.log(`🚫 Sesión específica suspendida, no se genera: ${suspendedSessionKey}`);
          return;
        }
        
        // Crear la sesión específica
        const session: ClassSession = {
          id: `${dbClass.id}-specific-${specificSession.date}-${specificSession.startTime}-${courtId}`,
          date: specificSession.date,
          startTime: specificSession.startTime,
          endTime: specificSession.endTime,
          spotsLeft: specificSession.capacity,
          totalSpots: specificSession.capacity,
          courts: [court],
          instructor: Array.isArray(specificSession.instructors) && specificSession.instructors.length > 0
            ? specificSession.instructors[0]
            : 'Sin instructor',
          price: specificSession.price
        };
        
        console.log(`✨ Sesión específica generada: ${specificSession.date} ${specificSession.startTime}-${specificSession.endTime} - ${court.name}`);
        
        // Añadir a la lista temporal
        tempSessions.push(session);
      });
    });

    // Ordenar las sesiones por fecha y hora para mostrarlas cronológicamente
    tempSessions.sort((a, b) => {
      // Primero comparar por fecha
      const dateComparison = a.date.localeCompare(b.date);
      if (dateComparison !== 0) return dateComparison;
      
      // Si la fecha es igual, comparar por hora de inicio
      return a.startTime.localeCompare(b.startTime);
    });

    // Aplicar paginación después de ordenar
    const paginatedSessions = effectiveLimit > 0
      ? tempSessions.slice(effectiveOffset, effectiveOffset + effectiveLimit)
      : tempSessions;

    // Transferir a la lista final de sesiones
    sessions.push(...paginatedSessions);

    console.log(`Total de sesiones generadas: ${sessions.length} de ${tempSessions.length} disponibles, rango: ${sessions.length > 0 ? sessions[0].date + ' a ' + sessions[sessions.length-1].date : 'ninguna'}`);
    
    return sessions
  }

  private async transformClassFromDB(dbClass: ClassFromDB, options: TransformClassOptions = {}): Promise<PublicClass> {
    // Validar que schedule_config tenga la estructura esperada
    const scheduleConfig = dbClass.schedule_config || { days: [], timeSlots: [] }
    const timeSlots = Array.isArray(scheduleConfig.timeSlots) ? scheduleConfig.timeSlots : []
    const days = Array.isArray(scheduleConfig.days) ? scheduleConfig.days : []
    const specificSessions = Array.isArray(scheduleConfig.specificSessions) ? scheduleConfig.specificSessions : []
    const suspendedSessions = Array.isArray(scheduleConfig.suspendedSessions) ? scheduleConfig.suspendedSessions : []

    // Obtener los IDs de todas las pistas de todos los time slots
    const courtIds = new Set<string>()
    timeSlots.forEach(slot => {
      if (slot.courtIds && Array.isArray(slot.courtIds)) {
        slot.courtIds.forEach(id => courtIds.add(id))
      }
    })
    
    // Añadir los IDs de pistas de sesiones específicas
    specificSessions.forEach(session => {
      if (session.courtIds) {
        if (Array.isArray(session.courtIds)) {
          session.courtIds.forEach(id => courtIds.add(id));
        } else {
          courtIds.add(session.courtIds);
        }
      }
    });
    
    // Añadir los IDs de pistas de sesiones suspendidas
    suspendedSessions.forEach(session => {
      if (session.courtId) {
        courtIds.add(session.courtId);
      }
    });

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

    // Generar sesiones solo si no se ha indicado omitirlo
    // Nueva opción: usar paginación para la generación de sesiones si está configurado
    const { 
      skipSessionGeneration = false,
      paginationOptions
    } = options;
    
    const sessions = skipSessionGeneration 
      ? [] // Array vacío si se omite la generación
      : await this.generateSessions(
          { ...dbClass, schedule_config: { days, timeSlots, specificSessions, suspendedSessions } },
          courts,
          paginationOptions // Pasar opciones de paginación
        );
    
    // Log informativo sobre la generación o no de sesiones
    if (skipSessionGeneration) {
      console.log(' Omitiendo generación de sesiones para optimizar rendimiento');
    } else if (paginationOptions) {
      console.log(' Generando sesiones con paginación:', paginationOptions);
    }

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
        endDate: dbClass.end_date,
        specificSessions: specificSessions.map(session => ({
          date: session.date,
          price: session.price,
          endTime: session.endTime,
          capacity: session.capacity,
          courtIds: session.courtIds,
          createdAt: session.createdAt,
          startTime: session.startTime,
          instructors: Array.isArray(session.instructors) ? session.instructors : []
        })),
        suspendedSessions: suspendedSessions.map(session => ({
          date: session.date,
          reason: session.reason,
          courtId: session.courtId,
          endTime: session.endTime,
          startTime: session.startTime,
          suspendedAt: session.suspendedAt
        }))
      },
      availablePaymentMethods: Array.isArray(dbClass.available_payment_methods) 
        ? dbClass.available_payment_methods.map(method => method as 'cash' | 'card' | 'transfer')
        : [],
      payment_config: dbClass.payment_config || {
        status: 'pending',
        currency: 'EUR'
      },
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
   * Verifica la disponibilidad de plazas para una sesión específica de clase
   * Delegando al servicio especializado
   */
  async checkSessionAvailability(
    classId: string,
    sessionDate: string,
    startTime: string,
    endTime: string,
    options: SessionAvailabilityOptions = {}
  ): Promise<SessionAvailabilityResponse> {
    return stockValidationService.checkSessionAvailability(
      classId,
      sessionDate,
      startTime,
      endTime,
      options
    );
  }

  /**
   * Verifica la disponibilidad de plazas para múltiples sesiones en una sola operación
   * Delegando al servicio especializado
   */
  async checkMultipleSessionsAvailability(
    classId: string,
    sessions: ClassSession[]
  ): Promise<Map<string, SessionAvailabilityResponse>> {
    return stockValidationService.checkMultipleSessionsAvailability(
      classId,
      sessions
    );
  }

  /**
   * Actualiza la información de plazas disponibles para una clase
   * Delegando al servicio especializado
   */
  async updateSessionsAvailability(
    classData: PublicClass, 
    options: SessionAvailabilityOptions = {}
  ): Promise<PublicClass> {
    return stockValidationService.updateSessionsAvailability(
      classData,
      options
    );
  }

  async testConnection(empresaId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('classes')
        .select('id')
        .eq('empresa_id', empresaId)
        .limit(1)

      if (error) {
        console.error('Error al probar la conexión a clases:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error inesperado al probar la conexión a clases:', error)
      return false
    }
  }

  async getPublicClasses(empresaId: string): Promise<PublicClass[]> {
    try {
      // Fecha actual para comparaciones
      const today = new Date().toISOString().split('T')[0];
      
      // Consulta base
      let query = this.supabase
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
        .eq('visibility', 'public')
        .eq('status', 'active')
        // Solo clases que ya han comenzado
        .lte('start_date', today)
        // Si tienen fecha de fin, solo mostrar las que aún no vencen
        .or(`end_date.is.null,end_date.gte.${today}`)
        // Para clases no recurrentes, solo mostrar las del día actual y futuras
        .not('is_recurring', 'eq', false, { foreignTable: null })
        .order('created_at', { ascending: false })

      // Añadir consulta adicional para las clases no recurrentes del día actual y futuras
      const { data: classesData, error } = await query;

      // Tratar el caso especial de clases no recurrentes para el día actual y futuras
      const { data: singleClasses, error: singleClassesError } = await this.supabase
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
        .eq('visibility', 'public')
        .eq('status', 'active')
        .eq('is_recurring', false)
        .gte('start_date', today) // Incluir clases únicas de hoy y futuras
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error al obtener las clases públicas:', error);
        return [];
      }

      if (singleClassesError) {
        console.error('Error al obtener las clases únicas de hoy y futuras:', singleClassesError);
      }

      // Combinar los resultados de ambas consultas
      const combinedClasses = [
        ...((classesData || []) as ClassFromDB[]),
        ...((singleClasses || []) as ClassFromDB[])
      ];

      // Eliminar duplicados por ID si los hubiera
      const uniqueClasses = Array.from(
        new Map(combinedClasses.map(item => [item.id, item])).values()
      );

      if (uniqueClasses.length === 0) {
        return [];
      }

      // Convertir a formato público y calcular disponibilidad
      const publicClasses = await Promise.all(
        uniqueClasses.map(async dbClass => {
          // Al listar clases, omitimos la generación de sesiones para optimizar
          // rendimiento, ya que no son necesarias en los pasos de selección de clase
          // o paquete, solo en el paso de selección de sesión
          const publicClass = await this.transformClassFromDB(dbClass as ClassFromDB, {
            skipSessionGeneration: true
          });
          
          // Actualizar disponibilidad de las sesiones (no genera sesiones, solo actualiza timeSlots)
          return this.updateSessionsAvailability(publicClass);
        })
      );

      console.log(`u2728 Encontradas ${publicClasses.length} clases disponibles y vigentes`);
      return publicClasses;
    } catch (error) {
      console.error('Error inesperado al obtener las clases públicas:', error);
      return [];
    }
  }

  async getClassById(classId: string, options: { 
    generateSessions?: boolean,
    checkAvailability?: boolean,
    sessionPagination?: GenerateSessionsOptions
  } = {}): Promise<PublicClass | null> {
    try {
      // Añadimos logging para monitorizar las solicitudes con sus opciones
      console.log(`📋 getClassById: Obteniendo clase ${classId} con opciones:`, {
        generateSessions: options.generateSessions,
        checkAvailability: options.checkAvailability,
        hasPagination: !!options.sessionPagination,
        sessionPaginationDetails: options.sessionPagination
      });

      // MEJORA DE SEGURIDAD: Si se pide generar sesiones pero no se especifica paginación,
      // aplicar una paginación por defecto para evitar generar todas las sesiones a la vez
      if (options.generateSessions === true && !options.sessionPagination) {
        console.warn('⚠️ Protección contra sobrecarga: Se solicitó generar sesiones sin especificar paginación. Aplicando paginación por defecto (pageSize: 10).');
        options.sessionPagination = {
          pageSize: 10, // Valor razonable por defecto
          pageNumber: 0  // Primera página
        };
      }

      const { data: classData, error } = await this.supabase
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
        .single()

      if (error) {
        console.error('Error al obtener la clase:', error)
        return null
      }

      if (!classData) {
        console.warn('Clase no encontrada:', classId)
        return null
      }
      
      // La opción generateSessions permite a los componentes solicitar explícitamente
      // si necesitan que se generen las sesiones o no. Por defecto, ahora no las generamos.
      const skipSessionGeneration = options.generateSessions === true ? false : true;
      
      // Convertir a formato público
      // Manejar correctamente el tipado para evitar errores de TypeScript
      // Realizamos una conversión explícita para satisfacer el sistema de tipos
      const classFromDB = classData as unknown as ClassFromDB;
      
      const publicClass = await this.transformClassFromDB(classFromDB, {
        skipSessionGeneration,
        paginationOptions: options.sessionPagination // Pasar opciones de paginación
      })
      
      // Actualizar disponibilidad solo si se solicita explícitamente
      // Por defecto ahora NO verificamos disponibilidad al cargar una clase
      if (options.checkAvailability === true) {
        console.log(' Verificando disponibilidad al cargar la clase (solicitado explícitamente)')
        return this.updateSessionsAvailability(publicClass)
      }
      
      // Si no se solicita verificar disponibilidad, devolver la clase sin verificar
      return publicClass
    } catch (error) {
      console.error('Error inesperado al obtener la clase:', error)
      return null
    }
  }

  // Método para buscar clases por nombre (buscar en un radio de clases cercanas)
  async searchClassesByName(empresaId: string, searchTerm: string): Promise<PublicClass[]> {
    try {
      // Si el término de búsqueda está vacío, devolver todas las clases públicas
      if (!searchTerm || searchTerm.trim() === '') {
        return this.getPublicClasses(empresaId)
      }

      // Búsqueda con ILIKE para que no distinga entre mayúsculas y minúsculas
      const { data: classesData, error } = await this.supabase
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
        .eq('visibility', 'public')
        .eq('status', 'active')
        .lte('start_date', new Date().toISOString().split('T')[0]) // Solo clases que ya han comenzado
        .ilike('name', `%${searchTerm}%`) // Buscar en el nombre
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error al buscar clases por nombre:', error)
        return []
      }

      if (!classesData || classesData.length === 0) {
        return []
      }

      // Convertir a formato público y calcular disponibilidad
      const publicClasses = await Promise.all(
        classesData.map(async dbClass => {
          const publicClass = await this.transformClassFromDB(dbClass as ClassFromDB)
          
          // Actualizar disponibilidad de las sesiones
          return this.updateSessionsAvailability(publicClass)
        })
      )

      return publicClasses
    } catch (error) {
      console.error('Error inesperado al buscar clases por nombre:', error)
      return []
    }
  }

  // Método para filtrar clases por días de la semana
  async filterClassesByDays(empresaId: string, days: number[]): Promise<PublicClass[]> {
    try {
      // Si no hay días especificados, devolver todas las clases públicas
      if (!days || days.length === 0) {
        return this.getPublicClasses(empresaId)
      }

      const { data: classesData, error } = await this.supabase
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
        .eq('visibility', 'public')
        .eq('status', 'active')
        .lte('start_date', new Date().toISOString().split('T')[0]) // Solo clases que ya han comenzado

      if (error) {
        console.error('Error al filtrar clases por días:', error)
        return []
      }

      if (!classesData || classesData.length === 0) {
        return []
      }

      // Filtrar solo clases que tienen al menos uno de los días especificados
      const filteredClasses = classesData.filter(dbClass => {
        const scheduleDays = dbClass.schedule_config?.days || []
        return scheduleDays.some(day => days.includes(day))
      })

      // Convertir a formato público y calcular disponibilidad
      const publicClasses = await Promise.all(
        filteredClasses.map(async dbClass => {
          const publicClass = await this.transformClassFromDB(dbClass as ClassFromDB)
          
          // Actualizar disponibilidad de las sesiones
          return this.updateSessionsAvailability(publicClass)
        })
      )

      return publicClasses
    } catch (error) {
      console.error('Error inesperado al filtrar clases por días:', error)
      return []
    }
  }

  // Método para filtrar clases por rango de precios
  async filterClassesByPriceRange(empresaId: string, minPrice: number, maxPrice: number): Promise<PublicClass[]> {
    try {
      // Si no hay precios especificados, devolver todas las clases públicas
      if (minPrice === 0 && maxPrice === 0) {
        return this.getPublicClasses(empresaId)
      }

      const publicClasses = await this.getPublicClasses(empresaId)

      // Filtrar clases por precio
      return publicClasses.filter(publicClass => {
        // Obtener todos los precios de las sesiones
        const prices = publicClass.sessions.map(session => session.price)
        
        // Calcular precio promedio de la clase
        const avgPrice = prices.length > 0
          ? prices.reduce((sum, price) => sum + price, 0) / prices.length
          : 0
        
        // Filtrar por rango de precios
        return avgPrice >= minPrice && (maxPrice === 0 || avgPrice <= maxPrice)
      })
    } catch (error) {
      console.error('Error inesperado al filtrar clases por rango de precios:', error)
      return []
    }
  }

  // Método para filtrar clases por disponibilidad
  async filterClassesByAvailability(empresaId: string, minAvailableSpots: number): Promise<PublicClass[]> {
    try {
      const publicClasses = await this.getPublicClasses(empresaId)

      // Filtrar clases que tienen al menos una sesión con la disponibilidad mínima requerida
      return publicClasses.filter(publicClass => {
        return publicClass.sessions.some(session => session.spotsLeft >= minAvailableSpots)
      })
    } catch (error) {
      console.error('Error inesperado al filtrar clases por disponibilidad:', error)
      return []
    }
  }

  // Método para verificar si una sesión está disponible para reserva
  async isSessionAvailableForBooking(classId: string, sessionId: string): Promise<boolean> {
    try {
      // Obtener la información de la clase
      const classData = await this.getClassById(classId)
      if (!classData) {
        console.error(`La clase ${classId} no existe`)
        return false
      }

      // Buscar la sesión específica
      const session = classData.sessions.find(s => s.id === sessionId)
      if (!session) {
        console.error(`La sesión ${sessionId} no existe en la clase ${classId}`)
        return false
      }

      // Verificar disponibilidad
      const availability = await this.checkSessionAvailability(
        classId,
        session.date,
        session.startTime,
        session.endTime,
        { forceUpdate: true } // Forzar actualización para obtener datos en tiempo real
      )

      return availability.available
    } catch (error) {
      console.error('Error al verificar disponibilidad para reserva:', error)
      return false
    }
  }
}

// Exportamos una instancia singleton del servicio para uso global
export const classService = new ClassService();