import { createSupabaseClient } from '@/lib/supabase'
import { DateTime } from 'luxon'
import type { 
  Class, 
  ClassQueryOptions, 
  ServiceResponse, 
  TransformedClass 
} from '@/types/classes'
import { classSchema } from '@/types/classes'

/**
 * Servicio para consulta de clases en el panel administrativo
 * 
 * IMPORTANTE: Implementación de transformación de zona horaria
 * -------------------------------------------------------------
 * Este servicio ahora implementa la transformación de zona horaria al verificar
 * la disponibilidad de clases, siguiendo los mismos principios que classService.ts
 * y bookingService.ts:
 * 
 * 1. Obtiene la zona horaria de la sede (branch) asociada a la clase
 * 2. Convierte los horarios locales a UTC antes de consultar las reservas existentes
 * 3. Compara los horarios en la misma referencia temporal (UTC) para obtener resultados precisos
 * 
 * Esto garantiza que todas las consultas de disponibilidad sean consistentes con el proceso
 * de creación de reservas, independientemente de si se realizan desde el frontend público
 * o desde el panel administrativo.
 */

// Crear una instancia de Supabase memoizada
let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null

const getSupabaseInstance = () => {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient()
  }
  return supabaseInstance
}

/**
 * Obtiene la zona horaria de una sede
 * 
 * @param branchId - ID de la sede
 * @returns La zona horaria de la sede o 'UTC' por defecto
 */
const getBranchTimezone = async (branchId: string): Promise<string> => {
  try {
    if (!branchId) {
      console.warn('⚠️ ClassQueryService - No se proporcionó ID de sede, usando UTC por defecto');
      return 'UTC';
    }

    const supabase = getSupabaseInstance();
    const { data: branch, error } = await supabase
      .from('sedes')
      .select('timezone')
      .eq('id', branchId)
      .single();

    if (error || !branch) {
      console.error('❌ ClassQueryService - Error al obtener la zona horaria de la sede:', error);
      return 'UTC';
    }

    const timezone = branch.timezone || 'UTC';
    console.log('✅ ClassQueryService - Zona horaria de la sede:', timezone);
    return timezone;
  } catch (error) {
    console.error('❌ ClassQueryService - Error al obtener la zona horaria:', error);
    return 'UTC';
  }
};

/**
 * Convierte los horarios locales a UTC según la zona horaria de la sede
 * 
 * @param branchId - ID de la sede
 * @param date - Fecha en formato local (YYYY-MM-DD)
 * @param startTime - Hora de inicio en formato local (HH:MM)
 * @param endTime - Hora de fin en formato local (HH:MM)
 * @returns Objeto con las fechas y horas convertidas a UTC, o los valores originales si hay error
 */
const convertLocalToUTC = async (
  branchId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<{
  dateUTC: string;
  startTimeUTC: string;
  endTimeUTC: string;
  timezone: string;
}> => {
  try {
    // Obtener la zona horaria de la sede
    const timezone = await getBranchTimezone(branchId);
    
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
    const utcStartDateTime = localStartDateTime.toUTC();
    const utcEndDateTime = localEndDateTime.toUTC();
    
    // Formato timestamp completo para la consulta (YYYY-MM-DD HH:MM:SS)
    const startTimeUTC = utcStartDateTime.toSQL({ includeOffset: false });
    const endTimeUTC = utcEndDateTime.toSQL({ includeOffset: false });
    const dateUTC = utcStartDateTime.toFormat('yyyy-MM-dd');
    
    console.log('🕒 ClassQueryService - Conversión de horarios:', {
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
        fullStartUTC: utcStartDateTime.toISO(),
        fullEndUTC: utcEndDateTime.toISO()
      }
    });
    
    return {
      dateUTC,
      startTimeUTC,
      endTimeUTC,
      timezone
    };
  } catch (error) {
    console.error('❌ ClassQueryService - Error en la conversión de horarios:', error);
    // En caso de error, devolvemos los valores originales
    return {
      dateUTC: date,
      startTimeUTC: startTime,
      endTimeUTC: endTime,
      timezone: 'UTC'
    };
  }
};

export const classQueryService = {
  /**
   * Obtiene las clases para una fecha específica
   * @param date Fecha en formato YYYY-MM-DD
   * @param options Opciones adicionales de consulta
   */
  async getClassesByDate(
    date: string,
    options?: ClassQueryOptions
  ): Promise<ServiceResponse<Class[]>> {
    try {
      // Log inicial con todos los parámetros
      console.log('🔍 ClassQueryService - Iniciando consulta:', {
        date,
        options,
        timestamp: new Date().toISOString()
      })

      const supabase = getSupabaseInstance()
      
      // Validar que tengamos empresa_id
      if (!options?.empresaId) {
        console.warn('⚠️ ClassQueryService - No se proporcionó empresa_id')
        return {
          error: {
            message: 'Se requiere empresa_id para consultar las clases',
            code: 'MISSING_EMPRESA_ID',
            details: 'El parámetro empresa_id es obligatorio'
          }
        }
      }
      
      // Convertir la fecha a un objeto DateTime para manipulación
      const targetDate = DateTime.fromISO(date)
      // Obtenemos el día de la semana (1-7, donde 7 es domingo)
      let dayOfWeek = targetDate.weekday 
      
      // Ajustamos para que domingo sea 0 en lugar de 7, para coincidir con el formato de la BD
      if (dayOfWeek === 7) {
        dayOfWeek = 0
      }

      // Construir la consulta base con el filtro de empresa
      let query = supabase
        .from('classes')
        .select('*')
        .eq('empresa_id', options.empresaId)

      // Determinar qué estados de clase incluir
      if (options?.includeCompleted) {
        // Si se solicita incluir completadas, consultamos tanto activas como completadas
        query = query.in('status', ['active', 'completed'])
        console.log('🔍 ClassQueryService - Incluyendo clases completadas')
      } else {
        // Por defecto, solo consultamos con el estado especificado (o 'active' por defecto)
        query = query.eq('status', options?.status || 'active')
      }

      // Log de la construcción de la query
      console.log('🔧 ClassQueryService - Construyendo query:', {
        empresaId: options.empresaId,
        status: options?.includeCompleted ? ['active', 'completed'] : options?.status || 'active'
      })

      // Filtrar por sede si se especifica
      if (options?.branchId) {
        query = query.eq('branch_id', options.branchId)
        console.log('🏢 ClassQueryService - Aplicando filtro de sede:', options.branchId)
      }

      // Filtrar por visibilidad si se especifica
      if (options?.visibility) {
        query = query.eq('visibility', options.visibility)
        console.log('👁️ ClassQueryService - Aplicando filtro de visibilidad:', options.visibility)
      }

      // Aplicar filtros de fecha
      const dateFilter = `and(is_recurring.eq.true,start_date.lte.${date}${
        options?.status !== 'inactive' ? ',or(end_date.is.null,end_date.gte.' + date + ')' : ''
      }),and(is_recurring.eq.false,start_date.eq.${date})`

      query = query.or(dateFilter)

      console.log('📅 ClassQueryService - Aplicando filtro de fechas:', {
        filter: dateFilter,
        date
      })

      const { data: classes, error } = await query

      if (error) {
        console.error('❌ ClassQueryService - Error en la consulta:', error)
        throw error
      }

      // Log de resultados iniciales
      console.log('📊 ClassQueryService - Resultados obtenidos:', {
        total: classes?.length || 0
      })

      // Validar y filtrar las clases
      const validClasses = (classes || [])
        .map(classData => {
          try {
            const validatedClass = classSchema.parse(classData)
            
            // Verificar si la clase ocurre en el día de la semana especificado
            // o si tiene una sesión específica para esta fecha
            const scheduleConfig = validatedClass.schedule_config
            
            // Buscar si hay sesiones específicas para esta fecha
            const specificSessions = scheduleConfig.specificSessions || []
            const hasSpecificSessionForDate = specificSessions.some(
              (session: any) => session.date === date
            )
            
            // Incluir la clase si el día está en days O si hay una sesión específica para esta fecha
            if (!scheduleConfig.days.includes(dayOfWeek) && !hasSpecificSessionForDate) {
              return null
            }

            return validatedClass
          } catch (error) {
            console.error('❌ ClassQueryService - Error validando clase:', {
              classId: classData.id,
              error
            })
            return null
          }
        })
        .filter((c): c is Class => c !== null)

      // Log final con resultados
      console.log('✅ ClassQueryService - Proceso completado:', {
        totalClases: classes?.length || 0,
        clasesValidas: validClasses.length,
        timestamp: new Date().toISOString()
      })

      return { data: validClasses }
    } catch (error) {
      console.error('❌ ClassQueryService - Error en getClassesByDate:', {
        error,
        stack: (error as Error).stack
      })
      return {
        error: {
          message: 'Error al consultar las clases',
          code: 'QUERY_ERROR',
          details: (error as Error).message
        }
      }
    }
  },

  /**
   * Verifica si una clase está activa para una fecha específica
   * @param classData Datos de la clase
   * @param date Fecha a verificar
   */
  isClassActive(classData: Class, date: string): boolean {
    const targetDate = DateTime.fromISO(date)
    const startDate = DateTime.fromISO(classData.start_date)
    const endDate = classData.end_date ? DateTime.fromISO(classData.end_date) : null
    
    // Obtenemos el día de la semana (1-7, donde 7 es domingo)
    let dayOfWeek = targetDate.weekday
    
    // Ajustamos para que domingo sea 0 en lugar de 7, para coincidir con el formato de la BD
    if (dayOfWeek === 7) {
      dayOfWeek = 0
    }

    // Verificar estado y visibilidad - Ahora permitimos 'active' y 'completed'
    if (classData.status !== 'active' && classData.status !== 'completed') return false

    // Verificar si la fecha está dentro del rango
    if (targetDate < startDate) return false
    if (endDate && targetDate > endDate) return false

    // NUEVO: Verificar si hay sesiones específicas para esta fecha
    const specificSessions = (classData.schedule_config as any).specificSessions || [];
    const hasSpecificSessionForDate = specificSessions.some(
      (s: any) => s.date === date
    );
    
    // Si hay una sesión específica para esta fecha, la clase está activa
    if (hasSpecificSessionForDate) {
      console.log('✅ ClassQueryService - Clase activa por sesión específica:', {
        classId: classData.id,
        date,
        totalSpecificSessions: specificSessions.length
      });
      return true;
    }

    // Para clases recurrentes, verificar el día de la semana
    if (classData.is_recurring) {
      return classData.schedule_config.days.includes(dayOfWeek)
    }

    // Para clases no recurrentes, la fecha debe coincidir exactamente
    return targetDate.toISODate() === startDate.toISODate()
  },

  /**
   * Transforma las clases al formato de reservas para visualización
   * @param classes Array de clases a transformar
   * @param date Fecha específica para la transformación
   */
  transformClassesToBookingFormat(
    classes: Class[],
    date: string
  ): TransformedClass[] {
    console.log('🔄 ClassQueryService - Iniciando transformación:', {
      totalClases: classes.length,
      date
    })

    const transformedClasses: TransformedClass[] = []

    for (const classData of classes) {
      // Registrar cada clase procesada con su estado
      console.log(`📊 ClassQueryService - Procesando clase: ${classData.id}, Estado: ${classData.status}`);

      // Verificar si la clase está activa para la fecha
      if (!this.isClassActive(classData, date)) {
        console.log('⏭️ ClassQueryService - Clase no activa para la fecha:', {
          classId: classData.id,
          status: classData.status,
          date
        })
        continue
      }

      // Si la clase tiene estado 'completed', registrarlo específicamente
      if (classData.status === 'completed') {
        console.log('🏁 ClassQueryService - Incluyendo clase completada:', {
          classId: classData.id,
          name: classData.name,
          date
        });
      }

      // Verificar si la clase tiene sesiones suspendidas
      const suspendedSessions = (classData.schedule_config as any).suspendedSessions || [];
      
      // Verificar si la clase tiene sesiones específicas para la fecha dada
      const specificSessions = (classData.schedule_config as any).specificSessions || [];
      const specificSessionsForDate = specificSessions.filter(
        (s: any) => s.date === date
      );
      
      console.log('🔍 ClassQueryService - Sesiones específicas para esta fecha:', {
        classId: classData.id,
        date,
        totalSpecificSessions: specificSessionsForDate.length
      });
      
      // Procesar sesiones específicas (tienen prioridad sobre timeslots normales)
      for (const specificSession of specificSessionsForDate) {
        // El courtIds en las sesiones específicas es un string, no un array
        const courtId = specificSession.courtIds;
        
        // Verificar si esta sesión específica está suspendida
        const isSuspended = suspendedSessions.some(
          (s: any) => s.date === date && 
               s.startTime === specificSession.startTime && 
               s.endTime === specificSession.endTime &&
               s.courtId === courtId
        );
        
        if (isSuspended) {
          console.log('⏭️ ClassQueryService - Sesión específica suspendida:', {
            classId: classData.id,
            date,
            startTime: specificSession.startTime,
            endTime: specificSession.endTime,
            courtId
          });
          
          // Agregar la sesión suspendida para que la UI pueda mostrarla si es necesario
          transformedClasses.push({
            id: `${classData.id}-${courtId}-${specificSession.startTime}`,
            courtId,
            date,
            startTime: specificSession.startTime,
            endTime: specificSession.endTime,
            title: classData.name,
            description: classData.description,
            type: 'class',
            instructor: specificSession.instructors[0] || 'Sin instructor',
            capacity: specificSession.capacity,
            currentParticipants: 0,
            status: classData.status,
            visibility: classData.visibility,
            price: specificSession.price || 0,
            classId: classData.id,
            sessionId: `${classData.id}-${courtId}-${specificSession.startTime}-${specificSession.endTime}`,
            isSuspended: true,
            isSpecificSession: true // Añadir un flag para identificar sesiones específicas
          });
          continue;
        }
        
        console.log('➕ ClassQueryService - Agregando sesión específica:', {
          classId: classData.id,
          date,
          startTime: specificSession.startTime,
          endTime: specificSession.endTime,
          courtId,
          capacity: specificSession.capacity
        });
        
        // Agregar la sesión específica (usando mismo formato de ID que timeslots normales)
        transformedClasses.push({
          id: `${classData.id}-${courtId}-${specificSession.startTime}`,
          courtId,
          date,
          startTime: specificSession.startTime,
          endTime: specificSession.endTime,
          title: classData.name,
          description: classData.description,
          type: 'class',
          instructor: specificSession.instructors[0] || 'Sin instructor',
          capacity: specificSession.capacity,
          currentParticipants: 0,
          status: classData.status,
          visibility: classData.visibility,
          price: specificSession.price || 0,
          classId: classData.id,
          sessionId: `${classData.id}-${courtId}-${specificSession.startTime}-${specificSession.endTime}`,
          isSuspended: false,
          isSpecificSession: true // Añadir un flag para identificar sesiones específicas
        });
      }
      
      // Procesar cada time slot de la clase (solo si no hay sesión específica que lo reemplace)
      for (const timeSlot of classData.schedule_config.timeSlots) {
        // NUEVO: Verificar si este es un día programado para las sesiones normales
        // Obtenemos el día de la semana (1-7, donde 7 es domingo)
        const targetDate = DateTime.fromISO(date);
        let dayOfWeek = targetDate.weekday;
        
        // Ajustamos para que domingo sea 0 en lugar de 7
        if (dayOfWeek === 7) {
          dayOfWeek = 0;
        }
        
        // Si no es un día programado para sesiones normales, omitimos este time slot
        // (Las sesiones específicas ya fueron procesadas anteriormente)
        if (!classData.schedule_config.days.includes(dayOfWeek)) {
          console.log('⏭️ ClassQueryService - Día no programado para sesiones normales, saltando timeslot:', {
            classId: classData.id,
            date,
            dayOfWeek,
            scheduledDays: classData.schedule_config.days
          });
          continue;
        }

        // Verificar si el time slot está deshabilitado
        if ('isDisabled' in timeSlot && timeSlot.isDisabled === true) {
          console.log('⏭️ ClassQueryService - Time slot deshabilitado, saltando:', {
            classId: classData.id,
            startTime: timeSlot.startTime,
            endTime: timeSlot.endTime
          });
          continue;
        }

        // Crear una entrada por cada cancha asignada
        for (const courtId of timeSlot.courtIds) {
          // Verificar si existe una sesión específica para esta combinación de fecha/hora/cancha
          const isReplacedBySpecificSession = specificSessionsForDate.some(
            (s: any) => s.startTime === timeSlot.startTime && 
                 s.endTime === timeSlot.endTime &&
                 s.courtIds === courtId
          );
          
          // Si ya hay una sesión específica para este slot, omitimos el timeslot genérico
          if (isReplacedBySpecificSession) {
            console.log('⏭️ ClassQueryService - Time slot reemplazado por sesión específica:', {
              classId: classData.id,
              date,
              startTime: timeSlot.startTime,
              endTime: timeSlot.endTime,
              courtId
            });
            continue;
          }
          
          // Verificar si esta combinación específica está suspendida para esta fecha
          const isSuspended = suspendedSessions.some(
            (s: any) => s.date === date && 
                 s.startTime === timeSlot.startTime && 
                 s.endTime === timeSlot.endTime &&
                 s.courtId === courtId
          );
          
          if (isSuspended) {
            console.log('⏭️ ClassQueryService - Sesión suspendida para esta fecha, saltando:', {
              classId: classData.id,
              date,
              startTime: timeSlot.startTime,
              endTime: timeSlot.endTime,
              courtId
            });
            // En lugar de hacer un continue, vamos a marcar la sesión como suspendida
            // para que la UI pueda decidir qué hacer con ella
            transformedClasses.push({
              id: `${classData.id}-${courtId}-${timeSlot.startTime}`,
              courtId,
              date,
              startTime: timeSlot.startTime,
              endTime: timeSlot.endTime,
              title: classData.name,
              description: classData.description,
              type: 'class',
              instructor: timeSlot.instructors[0] || 'Sin instructor',
              capacity: timeSlot.capacity,
              currentParticipants: 0, // Mantener como 0 hasta que se actualice posteriormente
              status: classData.status,
              visibility: classData.visibility,
              price: timeSlot.price || 0, // Incluir el precio del time slot
              classId: classData.id, // ID original de la clase
              sessionId: `${classData.id}-${courtId}-${timeSlot.startTime}-${timeSlot.endTime}`, // ID único para la sesión
              isSuspended: true // Marcar como suspendida
            });
            continue;
          }
          
          transformedClasses.push({
            id: `${classData.id}-${courtId}-${timeSlot.startTime}`,
            courtId,
            date,
            startTime: timeSlot.startTime,
            endTime: timeSlot.endTime,
            title: classData.name,
            description: classData.description,
            type: 'class',
            instructor: timeSlot.instructors[0] || 'Sin instructor',
            capacity: timeSlot.capacity,
            currentParticipants: 0, // Mantener como 0 hasta que se actualice posteriormente
            status: classData.status,
            visibility: classData.visibility,
            price: timeSlot.price || 0, // Incluir el precio del time slot
            classId: classData.id, // ID original de la clase
            sessionId: `${classData.id}-${courtId}-${timeSlot.startTime}-${timeSlot.endTime}`, // ID único para la sesión
            isSuspended: false // Marcar explícitamente como no suspendida
          })
        }
      }
    }

    console.log('✅ ClassQueryService - Transformación completada:', {
      clasesTransformadas: transformedClasses.length
    })

    return transformedClasses
  },

  /**
   * Actualiza la información de participantes para las clases transformadas
   * 
   * Esta función:
   * 1. Para cada clase transformada, obtiene el ID original de la clase
   * 2. Obtiene la zona horaria de la sede asociada a la clase
   * 3. Convierte los horarios locales a UTC antes de consultar las reservas
   * 4. Cuenta las reservas existentes para calcular la disponibilidad
   */
  async updateClassesParticipants(transformedClasses: TransformedClass[]): Promise<TransformedClass[]> {
    if (!transformedClasses.length) return transformedClasses;
    
    const supabase = getSupabaseInstance();
    const updatedClasses = [...transformedClasses];
    
    console.log('🔍 ClassQueryService - Actualizando participantes para clases:', {
      totalClases: transformedClasses.length
    });
    
    for (let i = 0; i < updatedClasses.length; i++) {
      const classData = updatedClasses[i];
      
      try {
        // Extraer el ID original de la clase
        // El formato en transformClassesToBookingFormat es: `${classId}-${courtId}-${startTime}`
        // Como los UUIDs tienen guiones, no podemos simplemente dividir por '-'
        
        // Analizamos el ID completo para depuración
        console.log('🔍 Analizando ID completo:', classData.id);
        
        // Tratamos de extraer el classId correctamente mediante un enfoque más robusto
        // Un UUID tiene 36 caracteres (incluyendo guiones), así que podemos usar una expresión regular
        // para extraer el UUID al comienzo de la cadena
        const uuidRegex = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
        const match = classData.id.match(uuidRegex);
        
        let originalClassId;
        if (match && match[1]) {
          originalClassId = match[1];
        } else {
          // Si no podemos extraer con regex, intentamos con el formato específico
          // Asumiendo que después del UUID hay un guion y el courtId (otro UUID)
          // Intentamos obtener los primeros 36 caracteres que deberían formar el UUID completo
          originalClassId = classData.id.substring(0, 36);
          console.warn('⚠️ No se pudo extraer UUID con regex, usando substring:', originalClassId);
        }
        
        console.log('🔍 Verificando disponibilidad para clase:', {
          idCompleto: classData.id,
          classId: originalClassId,
          date: classData.date,
          startTime: classData.startTime,
          endTime: classData.endTime,
          isSuspended: classData.isSuspended // Incluir estado de suspensión
        });
        
        // Si la clase está suspendida, no es necesario verificar la disponibilidad
        if (classData.isSuspended) {
          console.log('⏭️ Clase suspendida, omitiendo consulta de disponibilidad:', {
            classId: originalClassId,
            date: classData.date
          });
          continue;
        }
        
        // Obtener información de la clase para conocer la sede
        const { data: classInfo, error: classError } = await supabase
          .from('classes')
          .select('branch_id')
          .eq('id', originalClassId)
          .single();
          
        if (classError) {
          console.error('❌ Error al obtener información de la clase:', classError);
          continue;
        }
        
        if (!classInfo || !classInfo.branch_id) {
          console.warn('⚠️ No se encontró sede para la clase:', originalClassId);
          continue;
        }
        
        // Convertir los horarios locales a UTC según la zona horaria de la sede
        const { dateUTC, startTimeUTC, endTimeUTC } = await convertLocalToUTC(
          classInfo.branch_id,
          classData.date,
          classData.startTime,
          classData.endTime
        );

        // Consultar cuántas reservas existen usando los horarios UTC
        const bookingsResult = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: false })
          .eq('class_id', originalClassId)
          .eq('date', dateUTC)                 // Fecha en UTC
          .eq('start_time', startTimeUTC)      // Hora de inicio en UTC
          .eq('end_time', endTimeUTC)          // Hora de fin en UTC
          .eq('reservation_type', 'class')
          .is('cancelled_at', null);
          
        const bookedSpots = bookingsResult.count || 0;
        const availableSpots = Math.max(0, classData.capacity - bookedSpots);
        
        if (bookingsResult.error) {
          console.error('❌ Error al consultar participantes:', bookingsResult.error.message, {
            classId: originalClassId,
            date: classData.date,
            startTime: classData.startTime
          });
        } else {
          // Actualizar la información de participantes en la clase
          updatedClasses[i] = {
            ...classData,
            currentParticipants: bookedSpots,
            // Asegurarnos de preservar la propiedad isSpecificSession
            isSpecificSession: classData.isSpecificSession
          };
          
          console.log('✅ Disponibilidad de clase:', {
            classId: originalClassId,
            title: classData.title,
            bookedSpots,
            availableSpots,
            totalCapacity: classData.capacity,
            isAvailable: availableSpots > 0,
            isSuspended: classData.isSuspended, // Mantener la información de suspensión
            // Incluir información de horarios para debugging
            horarios: {
              local: {
                date: classData.date,
                startTime: classData.startTime,
                endTime: classData.endTime
              },
              utc: {
                date: dateUTC,
                startTime: startTimeUTC,
                endTime: endTimeUTC
              }
            }
          });
        }
      } catch (error) {
        console.error('❌ Error inesperado al consultar participantes:', error);
        if (error instanceof Error) {
          console.error('Detalles del error:', error.message, error.stack);
        }
      }
    }
    
    console.log('✅ ClassQueryService - Actualización de participantes completada.');
    return updatedClasses;
  }
} 