import { createSupabaseClient } from '@/lib/supabase'
import { DateTime } from 'luxon'
import type { 
  Class, 
  ClassQueryOptions, 
  ServiceResponse, 
  TransformedClass 
} from '@/types/classes'
import { classSchema } from '@/types/classes'

// Crear una instancia de Supabase memoizada
let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null

const getSupabaseInstance = () => {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient()
  }
  return supabaseInstance
}

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
      const dayOfWeek = targetDate.weekday // 1-7 (lunes-domingo)

      // Construir la consulta base con el filtro de empresa
      let query = supabase
        .from('classes')
        .select('*')
        .eq('empresa_id', options.empresaId)
        .eq('status', options?.status || 'active')

      // Log de la construcción de la query
      console.log('🔧 ClassQueryService - Construyendo query:', {
        empresaId: options.empresaId,
        status: options?.status || 'active'
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
            const scheduleConfig = validatedClass.schedule_config
            if (!scheduleConfig.days.includes(dayOfWeek)) {
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
    const dayOfWeek = targetDate.weekday

    // Verificar estado y visibilidad
    if (classData.status !== 'active') return false

    // Verificar si la fecha está dentro del rango
    if (targetDate < startDate) return false
    if (endDate && targetDate > endDate) return false

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
      // Verificar si la clase está activa para la fecha
      if (!this.isClassActive(classData, date)) {
        console.log('⏭️ ClassQueryService - Clase no activa para la fecha:', {
          classId: classData.id,
          date
        })
        continue
      }

      // Procesar cada time slot de la clase
      for (const timeSlot of classData.schedule_config.timeSlots) {
        // Crear una entrada por cada cancha asignada
        for (const courtId of timeSlot.courtIds) {
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
            visibility: classData.visibility
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
   * @param transformedClasses Clases ya transformadas
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
          endTime: classData.endTime
        });

        // Consultar cuántas reservas existen usando exactamente la misma estructura
        // que en classService.ts para mantener consistencia
        const bookingsResult = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: false })
          .eq('class_id', originalClassId)
          .eq('date', classData.date)
          .eq('start_time', classData.startTime)
          .eq('end_time', classData.endTime)
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
            currentParticipants: bookedSpots
          };
          
          console.log('✅ Disponibilidad de clase:', {
            classId: originalClassId,
            title: classData.title,
            bookedSpots,
            availableSpots,
            totalCapacity: classData.capacity,
            isAvailable: availableSpots > 0
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