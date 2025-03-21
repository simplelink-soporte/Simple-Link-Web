import { createSupabaseClient } from '@/lib/supabase'
import { DateTime } from 'luxon'

// Definimos la estructura del time slot
interface TimeSlot {
  price: number
  endTime: string
  capacity: number
  courtIds: string[]
  startTime: string
  instructors: string[]
  isDisabled?: boolean
}

// Definimos la estructura del schedule_config
interface ScheduleConfig {
  days: number[]
  timeSlots: TimeSlot[]
  suspendedSessions?: SuspendedSession[] // Nueva propiedad para almacenar sesiones suspendidas
  specificSessions?: SpecificSession[] // Nueva propiedad para almacenar sesiones específicas
}

// Nueva interfaz para representar una sesión suspendida
interface SuspendedSession {
  date: string         // Fecha específica en formato YYYY-MM-DD
  startTime: string    // Hora de inicio
  endTime: string      // Hora de fin
  courtId: string      // ID de la pista
  suspendedAt: string  // Timestamp de cuándo se suspendió
  reason?: string      // Razón opcional de la suspensión
}

// Nueva interfaz para representar una sesión específica
interface SpecificSession {
  date: string         // Fecha específica en formato YYYY-MM-DD
  startTime: string    // Hora de inicio
  endTime: string      // Hora de fin
  courtIds: string     // ID de la pista asignada
  capacity: number     // Capacidad de la sesión
  price: number        // Precio de la sesión
  instructors: string[] // Instructores asignados
  createdAt: string    // Timestamp de cuándo se creó
}

interface SuspendSessionParams {
  classId: string
  sessionId: string
  timeSlotIndex?: number
  startTime?: string
  endTime?: string
  courtId?: string
  cancellationReason?: string
  date?: string        // Nueva propiedad para la fecha específica
}

interface AddSpecificSessionParams {
  classId: string
  date: string
  startTime: string
  endTime: string
  courtIds: string     // Cambiado de string[] a string
  capacity: number
  price: number
  instructors: string[]
}

interface MoveSessionBookingsParams {
  classId: string;
  sourceSessionId: string;
  targetSessionId: string;
  sourceDate: string;
  sourceStartTime: string;
  sourceEndTime: string;
  sourceCourtId?: string;
  targetDate: string;
  targetStartTime: string;
  targetEndTime: string;
  targetCourtId?: string;
}

interface ServiceResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    message: string
    code?: string
    details?: string
  }
  affectedBookingsCount?: number
}

interface BookingSummary {
  count: number
  hasFutureBookings: boolean
  reservationDates?: string[]
  uniqueDates?: number
  earliestDate?: string
  latestDate?: string
}

export const sessionManagementService = {
  /**
   * Verifica las reservas asociadas a una sesión específica
   * @param params Parámetros para verificar reservas de sesión
   */
  async checkSessionBookings(params: SuspendSessionParams): Promise<ServiceResponse<BookingSummary>> {
    const { classId, sessionId, startTime, endTime, courtId, date } = params
    
    if (!classId || !startTime || !endTime) {
      return {
        success: false,
        error: {
          message: "Parámetros incompletos para verificar reservas",
          code: "MISSING_PARAMETERS"
        }
      }
    }

    // Verificar si se proporcionó una fecha específica
    if (!date) {
      console.warn('⚠️ No se proporcionó fecha para verificar las reservas, usando la fecha actual');
    }

    const supabase = createSupabaseClient()
    console.log('🔍 Verificando reservas para sesión:', {
      classId,
      sessionId,
      startTime,
      endTime,
      courtId,
      date: date || 'No especificada'
    })
    
    try {
      // 1. Primero obtenemos la información de la clase para conocer la sede
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id, branch_id, empresa_id, name')
        .eq('id', classId)
        .single()
      
      if (classError || !classData) {
        console.error('❌ Error al obtener la clase:', classError)
        return {
          success: false,
          error: {
            message: "No se pudo obtener la información de la clase",
            code: "CLASS_NOT_FOUND",
            details: classError?.message
          }
        }
      }
      
      // 2. Obtenemos la zona horaria de la sede
      const { data: branchData, error: branchError } = await supabase
        .from('sedes')
        .select('timezone')
        .eq('id', classData.branch_id)
        .single()
        
      if (branchError) {
        console.error('❌ Error al obtener la sede:', branchError)
        return {
          success: false,
          error: {
            message: "No se pudo obtener la información de la sede",
            code: "BRANCH_NOT_FOUND",
            details: branchError.message
          }
        }
      }
      
      const timezone = branchData?.timezone || 'UTC'
      console.log('🌐 Zona horaria de la sede:', timezone)
      
      // 3. Convertimos los horarios locales a UTC
      const targetDate = date || DateTime.now().setZone(timezone).toFormat('yyyy-MM-dd');
      
      // Conversión de horarios locales a UTC
      const startTimeLocal = DateTime.fromFormat(`${targetDate} ${startTime}`, 'yyyy-MM-dd HH:mm', { zone: timezone })
      const endTimeLocal = DateTime.fromFormat(`${targetDate} ${endTime}`, 'yyyy-MM-dd HH:mm', { zone: timezone })
      
      // Creamos timestamps completos en vez de solo horarios
      const startTimestamp = startTimeLocal.toUTC().toFormat('yyyy-MM-dd HH:mm:ss')
      const endTimestamp = endTimeLocal.toUTC().toFormat('yyyy-MM-dd HH:mm:ss')
      const dateUTC = startTimeLocal.toUTC().toFormat('yyyy-MM-dd')
      
      console.log('🕒 Conversión de horarios para consulta:', {
        local: {
          targetDate,
          startTime,
          endTime,
          timezone
        },
        utc: {
          dateUTC,
          startTimestamp,
          endTimestamp
        }
      })
      
      // 4. Construimos la consulta para una fecha específica si se proporcionó
      let queryFilters = [];
      
      // Si tenemos una fecha específica, consultamos solo esa fecha
      if (date) {
        queryFilters.push(`date.eq.${dateUTC}`);
      } else {
        // Si no tenemos fecha específica, consultamos desde hoy hacia el futuro
        const currentDate = DateTime.now().toUTC().toFormat('yyyy-MM-dd')
        const sixMonthsLater = DateTime.now().plus({ months: 6 }).toUTC().toFormat('yyyy-MM-dd')
        queryFilters.push(`date.gte.${currentDate}`, `date.lte.${sixMonthsLater}`);
      }
      
      // Creamos un array para OR múltiples courtIds si es necesario
      let courtFilter = ''
      if (courtId) {
        courtFilter = `court_id.eq.${courtId}`
      } else if (classData) {
        courtFilter = `empresa_id.eq.${classData.empresa_id}`
      }
      
      // 5. Consulta para obtener el recuento y detalles de las reservas
      let query = supabase
        .from('bookings')
        .select('id, date', { count: 'exact' })
        .eq('class_id', classId)
        .eq('start_time', startTimestamp)
        .eq('end_time', endTimestamp)
        .or(courtFilter)
        .is('cancelled_at', null);
      
      // Aplicar los filtros de fecha según corresponda
      if (date) {
        query = query.eq('date', dateUTC);
      } else {
        const currentDate = DateTime.now().toUTC().toFormat('yyyy-MM-dd');
        const sixMonthsLater = DateTime.now().plus({ months: 6 }).toUTC().toFormat('yyyy-MM-dd');
        query = query.gte('date', currentDate).lte('date', sixMonthsLater);
      }
      
      // Ejecutar la consulta con el orden
      const { data: bookings, count, error: bookingsError } = await query.order('date');
      
      if (bookingsError) {
        console.error('❌ Error al consultar reservas:', bookingsError)
        return {
          success: false,
          error: {
            message: "Error al consultar las reservas asociadas",
            code: "QUERY_ERROR",
            details: bookingsError.message
          }
        }
      }
      
      // 6. Procesamos los resultados para crear el resumen de reservas
      const bookingCount = count || 0
      const hasFutureBookings = bookingCount > 0
      
      // Creamos el resumen de las reservas
      const summary: BookingSummary = {
        count: bookingCount,
        hasFutureBookings
      }
      
      if (hasFutureBookings && bookings) {
        // Obtenemos fechas únicas
        const uniqueDatesSet = new Set<string>(bookings.map(b => b.date))
        const uniqueDates = Array.from(uniqueDatesSet)
        
        // Guardamos las primeras 5 fechas para mostrar en la UI
        summary.reservationDates = uniqueDates.slice(0, 5)
        summary.uniqueDates = uniqueDates.length
        
        // Fechas más temprana y más tardía
        summary.earliestDate = uniqueDates[0]
        summary.latestDate = uniqueDates[uniqueDates.length - 1]
      }
      
      console.log('✅ Verificación de reservas completada:', {
        bookingCount,
        hasFutureBookings,
        fecha: date || 'No especificada',
        summary
      })
      
      return {
        success: true,
        data: summary,
        affectedBookingsCount: bookingCount
      }
    } catch (error) {
      console.error('❌ Error inesperado al verificar reservas:', error)
      return {
        success: false,
        error: {
          message: "Error al verificar las reservas asociadas",
          code: "UNKNOWN_ERROR",
          details: error instanceof Error ? error.message : String(error)
        }
      }
    }
  },

  /**
   * Suspende una sesión específica de una clase y cancela las reservas asociadas
   * @param params Parámetros para suspender la sesión
   */
  async suspendSession(params: SuspendSessionParams): Promise<ServiceResponse> {
    const { classId, sessionId, timeSlotIndex, startTime, endTime, courtId, cancellationReason, date } = params
    
    if (!classId || !sessionId) {
      return {
        success: false,
        error: {
          message: "ID de clase o sesión no proporcionados",
          code: "MISSING_PARAMETERS"
        }
      }
    }

    // Verificamos si tenemos fecha específica, necesaria para el nuevo enfoque
    if (!date) {
      return {
        success: false,
        error: {
          message: "Se requiere una fecha específica para suspender la sesión",
          code: "MISSING_DATE"
        }
      }
    }

    const supabase = createSupabaseClient()
    const currentTime = new Date().toISOString()
    
    console.log('🔄 Iniciando suspensión de sesión:', {
      classId,
      sessionId,
      timeSlotIndex,
      startTime,
      endTime,
      courtId,
      date
    })
    
    try {
      // 1. Primero obtenemos la información actual de la clase
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id, branch_id, empresa_id, name, schedule_config')
        .eq('id', classId)
        .single()
      
      if (classError || !classData) {
        console.error('❌ Error al obtener la clase:', classError)
        return {
          success: false,
          error: {
            message: "No se pudo obtener la información de la clase",
            code: "CLASS_NOT_FOUND",
            details: classError?.message
          }
        }
      }
      
      // 2. Extraemos y validamos el schedule_config
      let scheduleConfig: ScheduleConfig
      try {
        scheduleConfig = classData.schedule_config as ScheduleConfig
        
        if (!scheduleConfig || !Array.isArray(scheduleConfig.timeSlots)) {
          throw new Error('Estructura de schedule_config inválida')
        }
      } catch (error) {
        console.error('❌ Error en la estructura del schedule_config:', error)
        return {
          success: false,
          error: {
            message: "Formato de configuración de horarios inválido",
            code: "INVALID_SCHEDULE_CONFIG"
          }
        }
      }
      
      // NUEVO: Verificar si es una sesión específica
      if (scheduleConfig.specificSessions && scheduleConfig.specificSessions.length > 0) {
        // Intentamos encontrar la sesión específica que coincida con los parámetros dados
        const specificSessionIndex = scheduleConfig.specificSessions.findIndex(
          (s: SpecificSession) => 
            s.date === date && 
            s.startTime === startTime && 
            s.endTime === endTime && 
            s.courtIds === courtId
        );
        
        // Si encontramos una sesión específica que coincide, la eliminamos en lugar de suspenderla
        if (specificSessionIndex !== -1) {
          console.log('✅ Se encontró una sesión específica, eliminándola en lugar de suspenderla:', {
            date,
            startTime,
            endTime,
            courtId,
            indexEncontrado: specificSessionIndex
          });
          
          // Eliminamos la sesión específica del array
          scheduleConfig.specificSessions.splice(specificSessionIndex, 1);
          
          // Actualizamos la clase con el nuevo schedule_config
          const { error: updateError } = await supabase
            .from('classes')
            .update({
              schedule_config: scheduleConfig,
              updated_at: currentTime
            })
            .eq('id', classId);
          
          if (updateError) {
            console.error('❌ Error al actualizar la clase:', updateError);
            return {
              success: false,
              error: {
                message: "Error al actualizar la configuración de la clase",
                code: "UPDATE_ERROR",
                details: updateError.message
              }
            };
          }
          
          return {
            success: true,
            data: {
              message: "Sesión específica eliminada correctamente"
            }
          };
        }
      }
      
      // 3. Encontrar el time slot correspondiente para referencia
      let targetSlotIndex = -1
      
      // Primero intentamos con el índice directo si está disponible
      if (typeof timeSlotIndex === 'number' && timeSlotIndex >= 0 && timeSlotIndex < scheduleConfig.timeSlots.length) {
        targetSlotIndex = timeSlotIndex
      } 
      // Si no tenemos el índice, buscamos por horario y pista
      else if (startTime && endTime && courtId) {
        targetSlotIndex = scheduleConfig.timeSlots.findIndex(slot => 
          slot.startTime === startTime && 
          slot.endTime === endTime && 
          slot.courtIds.includes(courtId)
        )
      }
      
      if (targetSlotIndex === -1) {
        console.error('❌ No se encontró el time slot especificado')
        return {
          success: false,
          error: {
            message: "No se encontró el horario especificado en la configuración de la clase",
            code: "TIMESLOT_NOT_FOUND"
          }
        }
      }
      
      // 4. Crear o actualizar el array de suspendedSessions
      if (!scheduleConfig.suspendedSessions) {
        scheduleConfig.suspendedSessions = []
      }
      
      // Verificar si ya existe una suspensión para esta combinación específica
      const existingSuspensionIndex = scheduleConfig.suspendedSessions.findIndex(
        s => s.date === date && 
             s.startTime === startTime && 
             s.endTime === endTime && 
             s.courtId === courtId
      )
      
      // Si ya existe, no hacemos nada (podríamos actualizar la razón si es necesario)
      if (existingSuspensionIndex >= 0) {
        console.log('⚠️ Esta sesión ya está suspendida, no se requiere acción adicional')
      } else {
        // Agregar la nueva suspensión
        scheduleConfig.suspendedSessions.push({
          date,
          startTime: startTime || '',
          endTime: endTime || '',
          courtId: courtId || '',
          suspendedAt: currentTime,
          reason: cancellationReason || 'Suspendida por administrador'
        })
        
        console.log('✅ Sesión agregada a la lista de suspensiones:', {
          date,
          startTime,
          endTime,
          courtId
        })
      }
      
      // 5. Actualizamos la clase con el nuevo schedule_config
      const { error: updateError } = await supabase
        .from('classes')
        .update({
          schedule_config: scheduleConfig,
          updated_at: currentTime
        })
        .eq('id', classId)
      
      if (updateError) {
        console.error('❌ Error al actualizar la clase:', updateError)
        return {
          success: false,
          error: {
            message: "Error al actualizar la configuración de la clase",
            code: "UPDATE_ERROR",
            details: updateError.message
          }
        }
      }
      
      // 6. Obtenemos la zona horaria de la sede para realizar conversiones
      const { data: branchData, error: branchError } = await supabase
        .from('sedes')
        .select('timezone')
        .eq('id', classData.branch_id)
        .single()
        
      if (branchError) {
        console.error('❌ Error al obtener la sede:', branchError)
      }
      
      const timezone = branchData?.timezone || 'UTC'
      
      // 7. Convertimos los horarios locales a UTC para la fecha específica
      // Conversión de horarios locales a UTC
      const targetSlot = scheduleConfig.timeSlots[targetSlotIndex]
      const startTimeLocal = DateTime.fromFormat(`${date} ${targetSlot.startTime}`, 'yyyy-MM-dd HH:mm', { zone: timezone })
      const endTimeLocal = DateTime.fromFormat(`${date} ${targetSlot.endTime}`, 'yyyy-MM-dd HH:mm', { zone: timezone })
      
      // Creamos timestamps completos en vez de solo horarios
      const startTimestamp = startTimeLocal.toUTC().toFormat('yyyy-MM-dd HH:mm:ss')
      const endTimestamp = endTimeLocal.toUTC().toFormat('yyyy-MM-dd HH:mm:ss')
      const dateUTC = startTimeLocal.toUTC().toFormat('yyyy-MM-dd')
      
      console.log('🕒 Conversión de horarios para cancelación:', {
        local: {
          date,
          startTime: targetSlot.startTime,
          endTime: targetSlot.endTime,
          timezone
        },
        utc: {
          date: dateUTC,
          startTimestamp,
          endTimestamp
        }
      })
      
      // 8. Cancelamos las reservas asociadas a esta sesión específica para esta fecha
      // Creamos un array para OR múltiples courtIds si es necesario
      const courtFilter = courtId 
        ? `court_id.eq.${courtId}`
        : targetSlot.courtIds.length > 1 
          ? `court_id.in.(${targetSlot.courtIds.map(id => `"${id}"`).join(',')})`
          : `court_id.eq.${targetSlot.courtIds[0]}`
        
      // Motivo de cancelación por defecto
      const reason = cancellationReason || `Sesión suspendida por el administrador (${classData.name})`
      
      // Obtenemos la cantidad de reservas que se van a cancelar (para reportar)
      const { count: bookingsCount, error: countError } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', classId)
        .eq('date', dateUTC)           // Ahora filtramos por fecha específica
        .eq('start_time', startTimestamp)
        .eq('end_time', endTimestamp)
        .or(courtFilter)
        .is('cancelled_at', null)
      
      if (countError) {
        console.error('❌ Error al contar reservas:', countError)
      } else {
        console.log(`📊 Se cancelarán ${bookingsCount || 0} reservas para la fecha: ${date}`)
      }
      
      // Actualizamos las reservas para marcarlas como canceladas
      const { error: bookingsError } = await supabase
        .from('bookings')
        .update({
          cancelled_at: currentTime,
          cancellation_reason: reason,
          updated_at: currentTime,
          payment_status: 'cancelled' // Importante: Actualizar el estado de pago a cancelado
        })
        .eq('class_id', classId)
        .eq('date', dateUTC)           // Filtramos por fecha específica convertida a UTC
        .eq('start_time', startTimestamp)
        .eq('end_time', endTimestamp)
        .or(courtFilter)
        .is('cancelled_at', null)
      
      if (bookingsError) {
        console.error('❌ Error al cancelar reservas:', bookingsError)
        // No fallamos completamente si la actualización de la clase fue exitosa
        return {
          success: true,
          error: {
            message: "La sesión fue suspendida pero hubo un error al cancelar las reservas",
            code: "BOOKINGS_UPDATE_ERROR",
            details: bookingsError.message
          },
          affectedBookingsCount: bookingsCount || 0
        }
      }
      
      console.log('✅ Sesión suspendida exitosamente para la fecha:', date)
      
      return {
        success: true,
        affectedBookingsCount: bookingsCount || 0,
        data: {
          updatedClass: classData.id,
          slotIndex: targetSlotIndex,
          cancelledBookings: bookingsCount || 0,
          suspendedDate: date
        }
      }
    } catch (error) {
      console.error('❌ Error inesperado al suspender la sesión:', error)
      return {
        success: false,
        error: {
          message: "Error al suspender la sesión",
          code: "UNKNOWN_ERROR",
          details: error instanceof Error ? error.message : String(error)
        }
      }
    }
  },
  
  /**
   * Agrega una sesión específica a la clase
   * @param params Parámetros para agregar la sesión específica
   */
  async addSpecificSession(params: AddSpecificSessionParams): Promise<ServiceResponse> {
    const { classId, date, startTime, endTime, courtIds, capacity, price, instructors } = params
    
    if (!classId || !date || !startTime || !endTime || !courtIds || !capacity || !price || !instructors) {
      return {
        success: false,
        error: {
          message: "Parámetros incompletos para agregar sesión específica",
          code: "MISSING_PARAMETERS"
        }
      }
    }

    const supabase = createSupabaseClient()
    const currentTime = new Date().toISOString()
    
    console.log('🔄 Agregando sesión específica:', {
      classId,
      date,
      startTime,
      endTime,
      courtIds,
      capacity,
      price,
      instructors,
      currentTime
    })
    
    try {
      // 1. Primero obtenemos la información actual de la clase
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id, branch_id, empresa_id, name, schedule_config')
        .eq('id', classId)
        .single()
      
      if (classError || !classData) {
        console.error('❌ Error al obtener la clase:', classError)
        return {
          success: false,
          error: {
            message: "No se pudo obtener la información de la clase",
            code: "CLASS_NOT_FOUND",
            details: classError?.message
          }
        }
      }
      
      // 2. Obtenemos la zona horaria de la sede
      const { data: branchData, error: branchError } = await supabase
        .from('sedes')
        .select('timezone')
        .eq('id', classData.branch_id)
        .single()
        
      if (branchError) {
        console.error('❌ Error al obtener la sede:', branchError)
        return {
          success: false,
          error: {
            message: "No se pudo obtener la información de la sede",
            code: "BRANCH_NOT_FOUND",
            details: branchError.message
          }
        }
      }
      
      const timezone = branchData?.timezone || 'UTC'
      console.log('🌐 Zona horaria de la sede:', timezone)
      
      // 3. Verificar disponibilidad usando el servicio de disponibilidad
      const timeSlot = {
        startTime,
        endTime,
        courtIds: [courtIds],
        capacity,
        price,
        instructors
      }
      
      // Importar el servicio de disponibilidad dinámicamente
      const { checkClassAvailability } = await import('./classAvailabilityService')
      const availabilityResult = await checkClassAvailability(date, [timeSlot], timezone)
      
      // Si hay reservas que se solapan, no permitir agregar la sesión específica
      if (!availabilityResult.available) {
        const overlappingDetails = availabilityResult.overlappingBookings.map(booking => 
          `${booking.court_name} (${booking.start_time}-${booking.end_time})`
        ).join(', ')
        
        return {
          success: false,
          error: {
            message: "No se puede agregar la sesión específica porque se solapa con reservas existentes",
            code: "OVERLAPPING_BOOKINGS",
            details: `Se solapa con: ${overlappingDetails}`
          }
        }
      }
      
      // 4. Extraemos y validamos el schedule_config
      let scheduleConfig: ScheduleConfig
      try {
        scheduleConfig = classData.schedule_config as ScheduleConfig
        
        if (!scheduleConfig || !Array.isArray(scheduleConfig.timeSlots)) {
          throw new Error('Estructura de schedule_config inválida')
        }
      } catch (error) {
        console.error('❌ Error en la estructura del schedule_config:', error)
        return {
          success: false,
          error: {
            message: "Formato de configuración de horarios inválido",
            code: "INVALID_SCHEDULE_CONFIG"
          }
        }
      }
      
      // 5. Agregar la sesión específica al schedule_config
      if (!scheduleConfig.specificSessions) {
        scheduleConfig.specificSessions = []
      }
      
      // Asegurar que courtIds sea un string y tenga valor
      const validCourtId = courtIds || 'default-court-id';
      
      scheduleConfig.specificSessions.push({
        date,
        startTime,
        endTime,
        courtIds: validCourtId,
        capacity,
        price,
        instructors,
        createdAt: currentTime
      })
      
      // 6. Actualizamos la clase con el nuevo schedule_config
      const { error: updateError } = await supabase
        .from('classes')
        .update({
          schedule_config: scheduleConfig,
          updated_at: currentTime
        })
        .eq('id', classId)
      
      if (updateError) {
        console.error('❌ Error al actualizar la clase:', updateError)
        return {
          success: false,
          error: {
            message: "Error al actualizar la configuración de la clase",
            code: "UPDATE_ERROR",
            details: updateError.message
          }
        }
      }
      
      console.log('✅ Sesión específica agregada exitosamente')
      
      return {
        success: true,
        data: {
          updatedClass: classData.id,
          addedSession: {
            date,
            startTime,
            endTime,
            courtIds,
            capacity,
            price,
            instructors
          }
        }
      }
    } catch (error) {
      console.error('❌ Error inesperado al agregar sesión específica:', error)
      return {
        success: false,
        error: {
          message: "Error al agregar la sesión específica",
          code: "UNKNOWN_ERROR",
          details: error instanceof Error ? error.message : String(error)
        }
      }
    }
  },
  
  /**
   * Mueve las reservas de una sesión a otra
   * @param params Parámetros para mover las reservas
   */
  async moveSessionBookings(params: MoveSessionBookingsParams): Promise<ServiceResponse> {
    const {
      classId,
      sourceSessionId,
      targetSessionId,
      sourceDate,
      sourceStartTime,
      sourceEndTime,
      sourceCourtId,
      targetDate,
      targetStartTime,
      targetEndTime,
      targetCourtId
    } = params;
    
    if (!classId || !sourceSessionId || !targetSessionId) {
      return {
        success: false,
        error: {
          message: "Parámetros incompletos para mover reservas",
          code: "MISSING_PARAMETERS"
        }
      }
    }

    const supabase = createSupabaseClient();
    console.log('🔄 Moviendo reservas de sesión:', {
      origen: {
        sessionId: sourceSessionId,
        date: sourceDate,
        startTime: sourceStartTime,
        endTime: sourceEndTime,
        courtId: sourceCourtId || 'No especificada'
      },
      destino: {
        sessionId: targetSessionId,
        date: targetDate,
        startTime: targetStartTime,
        endTime: targetEndTime,
        courtId: targetCourtId || 'No especificada'
      }
    });
    
    try {
      // 1. Obtenemos la información de la clase para conocer la sede
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id, branch_id, empresa_id, name')
        .eq('id', classId)
        .single();
      
      if (classError || !classData) {
        console.error('❌ Error al obtener la clase:', classError);
        return {
          success: false,
          error: {
            message: "No se pudo obtener la información de la clase",
            code: "CLASS_NOT_FOUND",
            details: classError?.message
          }
        }
      }
      
      // 2. Obtenemos la zona horaria de la sede
      const { data: branchData, error: branchError } = await supabase
        .from('sedes')
        .select('timezone')
        .eq('id', classData.branch_id)
        .single();
        
      if (branchError) {
        console.error('❌ Error al obtener la sede:', branchError);
        return {
          success: false,
          error: {
            message: "No se pudo obtener la información de la sede",
            code: "BRANCH_NOT_FOUND",
            details: branchError.message
          }
        }
      }
      
      const timezone = branchData?.timezone || 'UTC';
      console.log('🌐 Zona horaria de la sede:', timezone);
      
      // 3. Convertimos los horarios locales de origen y destino a UTC
      // Origen
      const sourceStartTimeLocal = DateTime.fromFormat(`${sourceDate} ${sourceStartTime}`, 'yyyy-MM-dd HH:mm', { zone: timezone });
      const sourceEndTimeLocal = DateTime.fromFormat(`${sourceDate} ${sourceEndTime}`, 'yyyy-MM-dd HH:mm', { zone: timezone });
      
      // Creamos timestamps completos en vez de solo horarios
      const sourceStartTimestamp = sourceStartTimeLocal.toUTC().toFormat('yyyy-MM-dd HH:mm:ss')
      const sourceEndTimestamp = sourceEndTimeLocal.toUTC().toFormat('yyyy-MM-dd HH:mm:ss')
      const sourceDateUTC = sourceStartTimeLocal.toUTC().toFormat('yyyy-MM-dd');
      
      // Destino
      const targetStartTimeLocal = DateTime.fromFormat(`${targetDate} ${targetStartTime}`, 'yyyy-MM-dd HH:mm', { zone: timezone });
      const targetEndTimeLocal = DateTime.fromFormat(`${targetDate} ${targetEndTime}`, 'yyyy-MM-dd HH:mm', { zone: timezone });
      
      const targetStartTimestamp = targetStartTimeLocal.toUTC().toFormat('yyyy-MM-dd HH:mm:ss')
      const targetEndTimestamp = targetEndTimeLocal.toUTC().toFormat('yyyy-MM-dd HH:mm:ss')
      const targetDateUTC = targetStartTimeLocal.toUTC().toFormat('yyyy-MM-dd');
      
      console.log('🕒 Conversión de horarios para actualización:', {
        origen: {
          local: {
            date: sourceDate,
            startTime: sourceStartTime,
            endTime: sourceEndTime
          },
          utc: {
            date: sourceDateUTC,
            startTimestamp: sourceStartTimestamp,
            endTimestamp: sourceEndTimestamp
          }
        },
        destino: {
          local: {
            date: targetDate,
            startTime: targetStartTime,
            endTime: targetEndTime
          },
          utc: {
            date: targetDateUTC,
            startTimestamp: targetStartTimestamp,
            endTimestamp: targetEndTimestamp
          }
        }
      });
      
      // 4. Consultar las reservas de la sesión origen
      let query = supabase
        .from('bookings')
        .select('id, court_id')
        .eq('class_id', classId)
        .eq('date', sourceDateUTC)
        .eq('start_time', sourceStartTimestamp)
        .eq('end_time', sourceEndTimestamp)
        .is('cancelled_at', null);
      
      // Aplicar filtro de pista si se especificó
      if (sourceCourtId) {
        query = query.eq('court_id', sourceCourtId);
      }
      
      const { data: bookings, count, error: bookingsError } = await query;
      
      if (bookingsError) {
        console.error('❌ Error al consultar reservas:', bookingsError);
        return {
          success: false,
          error: {
            message: "Error al consultar las reservas asociadas",
            code: "QUERY_ERROR",
            details: bookingsError.message
          }
        }
      }
      
      if (!bookings || bookings.length === 0) {
        console.log('✓ No hay reservas para mover en esta sesión');
        return {
          success: true,
          data: {
            message: "No hay reservas para mover en esta sesión",
            movedCount: 0
          }
        }
      }
      
      console.log(`🔄 Moviendo ${bookings.length} reservas a la nueva sesión`);
      
      // 5. Actualizar cada reserva con los nuevos datos
      const updatePromises = bookings.map(booking => {
        const updateData: any = {
          date: targetDateUTC,
          start_time: targetStartTimestamp,
          end_time: targetEndTimestamp,
          updated_at: new Date().toISOString()
        };
        
        // Si hay una nueva pista especificada, actualizar también la pista
        if (targetCourtId) {
          updateData.court_id = targetCourtId;
        }
        
        return supabase
          .from('bookings')
          .update(updateData)
          .eq('id', booking.id);
      });
      
      const updateResults = await Promise.all(updatePromises);
      
      // Verificar si alguna actualización falló
      const errors = updateResults
        .filter(result => result.error)
        .map(result => result.error);
      
      if (errors.length > 0) {
        console.error('❌ Error al actualizar algunas reservas:', errors);
        return {
          success: false,
          error: {
            message: `Error al actualizar ${errors.length} de ${bookings.length} reservas`,
            code: "UPDATE_ERROR",
            details: errors.map(e => e?.message || 'Error desconocido').join(', ')
          }
        }
      }
      
      console.log(`✅ ${bookings.length} reservas movidas correctamente`);
      
      return {
        success: true,
        data: {
          message: `${bookings.length} reservas movidas correctamente`,
          movedCount: bookings.length
        }
      }
    } catch (error: any) {
      console.error('❌ Error al mover reservas:', error);
      return {
        success: false,
        error: {
          message: "Error inesperado al mover reservas",
          code: "UNEXPECTED_ERROR",
          details: error.message
        }
      }
    }
  }
}