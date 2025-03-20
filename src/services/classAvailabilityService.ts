import { createSupabaseClient } from '@/lib/supabase'
import { timeToMinutes } from '@/lib/time-utils'
import type { TimeSlot } from '@/components/bookings/components/NewBookingModal/types'
import { DateTime } from 'luxon'

export interface OverlappingBooking {
  id: string
  court_id: string
  date: string
  start_time: string
  end_time: string
  court_name: string
}

export interface ClassAvailabilityResult {
  available: boolean
  overlappingBookings: OverlappingBooking[]
}

/**
 * Convierte una hora local (formato HH:MM) a UTC considerando la fecha y zona horaria
 * @param localTime Hora local en formato HH:MM
 * @param date Fecha en formato YYYY-MM-DD
 * @param timezone Zona horaria de la sede (ej. 'Europe/Madrid')
 * @returns Hora en UTC en formato HH:MM
 */
function convertToUTC(localTime: string, date: string, timezone: string): string {
  // Combinar fecha y hora local
  const [hours, minutes] = localTime.split(':').map(Number)
  
  // Crear objeto DateTime con luxon usando la zona horaria local
  const localDateTime = DateTime.fromObject(
    {
      year: parseInt(date.split('-')[0]), 
      month: parseInt(date.split('-')[1]),
      day: parseInt(date.split('-')[2]),
      hour: hours,
      minute: minutes
    }, 
    { zone: timezone }
  )
  
  // Convertir a UTC
  const utcDateTime = localDateTime.toUTC()
  
  // Log para depuración
  console.log(`[DEBUG] Conversión de hora: ${localTime} ${timezone} -> ${utcDateTime.toFormat('HH:mm')} UTC`)
  
  // Devolver solo la hora en formato HH:MM
  return utcDateTime.toFormat('HH:mm')
}

/**
 * Verifica si hay reservas que se solapan con los horarios propuestos para una clase no recurrente
 */
export async function checkClassAvailability(
  date: string | Date,
  timeSlots: TimeSlot[],
  timezone: string = 'Europe/Madrid' // Valor por defecto, debería venir del contexto
): Promise<ClassAvailabilityResult> {
  console.log(`[DEBUG] Iniciando verificación de disponibilidad con timezone: ${timezone}`)
  
  // Validación de parámetros
  if (!date || !timeSlots || timeSlots.length === 0) {
    console.warn('[DEBUG] Parámetros inválidos para verificación de disponibilidad')
    throw new Error('Se requiere una fecha y al menos un horario para verificar disponibilidad')
  }

  const supabase = createSupabaseClient()
  const overlappingBookings: OverlappingBooking[] = []

  // Convertir la fecha a formato ISO YYYY-MM-DD
  let formattedDate = typeof date === 'string' ? date : ''
  
  if (date instanceof Date) {
    formattedDate = date.toISOString().split('T')[0]
  } else if (typeof date === 'string' && date.includes('T')) {
    formattedDate = date.split('T')[0]
  }

  console.log(`[DEBUG] Fecha formateada: ${formattedDate}`)
  console.log(`[DEBUG] Número de time slots a verificar: ${timeSlots.length}`)

  // Verificar cada time slot
  for (const slot of timeSlots) {
    console.log(`[DEBUG] Verificando slot: ${slot.startTime} - ${slot.endTime}, Pistas: ${slot.courtIds?.join(', ')}`)
    
    // Verificar que tengamos pistas asignadas
    if (!slot.courtIds || slot.courtIds.length === 0) {
      console.log('[DEBUG] Slot sin pistas asignadas, omitiendo')
      continue
    }

    // Convertir las horas locales a UTC para la comparación con las reservas
    const utcStartTime = convertToUTC(slot.startTime, formattedDate, timezone)
    const utcEndTime = convertToUTC(slot.endTime, formattedDate, timezone)
    console.log(`[DEBUG] Horario UTC convertido: ${utcStartTime} - ${utcEndTime}`)

    // Verificar si hay un cambio de día al convertir a UTC
    const localStartDateTime = DateTime.fromFormat(`${formattedDate} ${slot.startTime}`, 'yyyy-MM-dd HH:mm', { zone: timezone })
    const localEndDateTime = DateTime.fromFormat(`${formattedDate} ${slot.endTime}`, 'yyyy-MM-dd HH:mm', { zone: timezone })
    const utcStartDateTime = localStartDateTime.toUTC()
    const utcEndDateTime = localEndDateTime.toUTC()

    // Si la fecha en UTC es diferente de la fecha local, necesitamos verificar también esa fecha
    const utcStartDate = utcStartDateTime.toFormat('yyyy-MM-dd')
    const utcEndDate = utcEndDateTime.toFormat('yyyy-MM-dd')
    
    // Array de fechas que necesitamos verificar en la base de datos
    const datesToCheck = Array.from(new Set([formattedDate, utcStartDate, utcEndDate]))
    console.log(`[DEBUG] Fechas a verificar: ${datesToCheck.join(', ')}`)

    // Obtener las horas de inicio y fin del slot en minutos (UTC)
    const slotStartMinutes = timeToMinutes(utcStartTime)
    const slotEndMinutes = timeToMinutes(utcEndTime)

    // Verificar solapamientos con reservas existentes para cada pista
    for (const courtId of slot.courtIds) {
      console.log(`[DEBUG] Verificando pista ID: ${courtId}`)
      
      for (const dateToCheck of datesToCheck) {
        console.log(`[DEBUG] Verificando fecha: ${dateToCheck} para pista: ${courtId}`)
        
        // Buscar reservas existentes que puedan causar conflicto
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select(`
            id, 
            start_time, 
            end_time, 
            court_id, 
            date,
            courts:court_id (name)
          `)
          .eq('court_id', courtId)
          .eq('date', dateToCheck)
          .is('cancelled_at', null) // Solo reservas no canceladas

        if (bookingsError) {
          console.error('[DEBUG] Error al buscar reservas:', bookingsError)
          throw new Error(`Error al verificar disponibilidad: ${bookingsError.message}`)
        }

        console.log(`[DEBUG] Reservas encontradas: ${bookings?.length || 0} para fecha ${dateToCheck}`)

        // Si hay reservas, verificar solapamientos
        if (bookings && bookings.length > 0) {
          console.log('[DEBUG] Reservas encontradas:', JSON.stringify(bookings))
          
          for (const booking of bookings) {
            console.log(`[DEBUG] Evaluando reserva ID: ${booking.id}, Horario: ${booking.start_time} - ${booking.end_time}`)
            
            // Los campos start_time y end_time ahora son de tipo timestamp without time zone
            // Intentamos crear DateTime directamente desde estos campos
            const bookingStartDateTime = booking.start_time 
              ? DateTime.fromSQL(booking.start_time, { zone: 'UTC' })
              : null;
            
            const bookingEndDateTime = booking.end_time 
              ? DateTime.fromSQL(booking.end_time, { zone: 'UTC' })
              : null;
            
            console.log(`[DEBUG] BookingStartDateTime: ${bookingStartDateTime?.isValid ? bookingStartDateTime.toISO() : 'INVALID'}, BookingEndDateTime: ${bookingEndDateTime?.isValid ? bookingEndDateTime.toISO() : 'INVALID'}`)
            
            // Si alguno de los objetos DateTime no es válido, intentar con el enfoque anterior
            if (!bookingStartDateTime?.isValid || !bookingEndDateTime?.isValid) {
              console.log(`[DEBUG] Intentando con formato alternativo para los timestamps`)
              
              // Intentar crear DateTime combinando fecha y hora
              const altBookingStartDateTime = DateTime.fromFormat(
                `${booking.date} ${booking.start_time?.toString().substring(11, 16) || '00:00'}`, 
                'yyyy-MM-dd HH:mm', 
                { zone: 'UTC' }
              )
              
              const altBookingEndDateTime = DateTime.fromFormat(
                `${booking.date} ${booking.end_time?.toString().substring(11, 16) || '00:00'}`, 
                'yyyy-MM-dd HH:mm', 
                { zone: 'UTC' }
              )
              
              console.log(`[DEBUG] Alt BookingStartDateTime: ${altBookingStartDateTime.isValid ? altBookingStartDateTime.toISO() : 'INVALID'}, Alt BookingEndDateTime: ${altBookingEndDateTime.isValid ? altBookingEndDateTime.toISO() : 'INVALID'}`)
              
              // Usar los objetos alternativos si son válidos
              if (altBookingStartDateTime.isValid && altBookingEndDateTime.isValid) {
                const slotStartDateTime = utcStartDateTime
                const slotEndDateTime = utcEndDateTime

                // Verificar solapamiento usando los objetos DateTime alternativos
                const overlap = (
                  (slotStartDateTime < altBookingEndDateTime && slotStartDateTime >= altBookingStartDateTime) ||
                  (slotEndDateTime > altBookingStartDateTime && slotEndDateTime <= altBookingEndDateTime) ||
                  (slotStartDateTime <= altBookingStartDateTime && slotEndDateTime >= altBookingEndDateTime)
                )

                console.log(`[DEBUG] Comparando DateTime con formato alternativo - Clase: ${slotStartDateTime.toISO()} - ${slotEndDateTime.toISO()}, Reserva: ${altBookingStartDateTime.toISO()} - ${altBookingEndDateTime.toISO()}, Overlap: ${overlap}`)

                if (overlap) {
                  console.log(`[DEBUG] ¡SOLAPAMIENTO DETECTADO CON FORMATO ALTERNATIVO! Clase ${slotStartDateTime.toFormat('HH:mm')} - ${slotEndDateTime.toFormat('HH:mm')} con reserva ${altBookingStartDateTime.toFormat('HH:mm')} - ${altBookingEndDateTime.toFormat('HH:mm')}`)
                  
                  // Convertir tiempos de UTC a la zona horaria local para mostrarlos
                  const localStartTime = altBookingStartDateTime.setZone(timezone).toFormat('HH:mm')
                  const localEndTime = altBookingEndDateTime.setZone(timezone).toFormat('HH:mm')
                  
                  // Acceder a courts de manera segura y correcta según la tipificación
                  let courtName = 'Pista desconocida'
                  if (booking.courts) {
                    const courts = booking.courts as any
                    courtName = courts.name || 'Pista desconocida'
                  }
                  
                  overlappingBookings.push({
                    id: booking.id,
                    court_id: booking.court_id,
                    date: booking.date,
                    start_time: localStartTime, // Mostrar en horario local para mayor claridad
                    end_time: localEndTime,     // Mostrar en horario local para mayor claridad
                    court_name: courtName
                  })
                }
                
                // Continuar con el siguiente booking
                continue
              }
            }

            // Necesitamos comparar los objetos DateTime completos para verificar el solapamiento
            const slotStartDateTime = utcStartDateTime
            const slotEndDateTime = utcEndDateTime

            // Verificar solapamiento usando los objetos DateTime originales si son válidos
            if (bookingStartDateTime.isValid && bookingEndDateTime.isValid) {
              const overlap = (
                (slotStartDateTime < bookingEndDateTime && slotStartDateTime >= bookingStartDateTime) ||
                (slotEndDateTime > bookingStartDateTime && slotEndDateTime <= bookingEndDateTime) ||
                (slotStartDateTime <= bookingStartDateTime && slotEndDateTime >= bookingEndDateTime)
              )

              console.log(`[DEBUG] Comparando DateTime - Clase: ${slotStartDateTime.toISO()} - ${slotEndDateTime.toISO()}, Reserva: ${bookingStartDateTime.toISO()} - ${bookingEndDateTime.toISO()}, Overlap: ${overlap}`)

              if (overlap) {
                console.log(`[DEBUG] ¡SOLAPAMIENTO DETECTADO! Clase ${slotStartDateTime.toFormat('HH:mm')} - ${slotEndDateTime.toFormat('HH:mm')} con reserva ${bookingStartDateTime.toFormat('HH:mm')} - ${bookingEndDateTime.toFormat('HH:mm')}`)
                
                // Convertir tiempos de UTC a la zona horaria local para mostrarlos
                const localStartTime = bookingStartDateTime.setZone(timezone).toFormat('HH:mm')
                const localEndTime = bookingEndDateTime.setZone(timezone).toFormat('HH:mm')
                
                // Acceder a courts de manera segura y correcta según la tipificación
                let courtName = 'Pista desconocida'
                if (booking.courts) {
                  const courts = booking.courts as any
                  courtName = courts.name || 'Pista desconocida'
                }
                
                overlappingBookings.push({
                  id: booking.id,
                  court_id: booking.court_id,
                  date: booking.date,
                  start_time: localStartTime, // Mostrar en horario local para mayor claridad
                  end_time: localEndTime,     // Mostrar en horario local para mayor claridad
                  court_name: courtName
                })
              }
            } else {
              // Si no podemos crear objetos DateTime válidos, comparar de forma básica usando tiempos en minutos
              console.log(`[DEBUG] No se pudieron crear objetos DateTime válidos para la reserva. Utilizando comparación básica por minutos.`)
              
              const bookingStartMinutes = timeToMinutes(booking.start_time.substring(0, 5))
              const bookingEndMinutes = timeToMinutes(booking.end_time.substring(0, 5))
              const slotStartMinutes = timeToMinutes(utcStartTime)
              const slotEndMinutes = timeToMinutes(utcEndTime)
              
              const overlapByMinutes = (
                (slotStartMinutes >= bookingStartMinutes && slotStartMinutes < bookingEndMinutes) ||
                (slotEndMinutes > bookingStartMinutes && slotEndMinutes <= bookingEndMinutes) ||
                (slotStartMinutes <= bookingStartMinutes && slotEndMinutes >= bookingEndMinutes)
              )
              
              console.log(`[DEBUG] Comparando por minutos - Clase: ${slotStartMinutes}-${slotEndMinutes}, Reserva: ${bookingStartMinutes}-${bookingEndMinutes}, Overlap: ${overlapByMinutes}`)
              
              if (overlapByMinutes) {
                console.log(`[DEBUG] ¡SOLAPAMIENTO DETECTADO POR MINUTOS! Clase ${utcStartTime} - ${utcEndTime} con reserva ${booking.start_time} - ${booking.end_time}`)
                
                // Convertir tiempos de UTC a la zona horaria local para mostrarlos (usando el formato más básico)
                const localStartTime = booking.start_time.substring(0, 5)
                const localEndTime = booking.end_time.substring(0, 5)
                
                // Acceder a courts de manera segura y correcta según la tipificación
                let courtName = 'Pista desconocida'
                if (booking.courts) {
                  const courts = booking.courts as any
                  courtName = courts.name || 'Pista desconocida'
                }
                
                overlappingBookings.push({
                  id: booking.id,
                  court_id: booking.court_id,
                  date: booking.date,
                  start_time: localStartTime,
                  end_time: localEndTime,
                  court_name: courtName
                })
              }
            }
          }
        }
      }
    }
  }

  console.log(`[DEBUG] Resultado final: ${overlappingBookings.length === 0 ? 'Disponible' : 'No disponible'}, Solapamientos: ${overlappingBookings.length}`)
  
  if (overlappingBookings.length > 0) {
    console.log(`[DEBUG] Detalles de solapamientos:`, JSON.stringify(overlappingBookings))
  }

  return {
    available: overlappingBookings.length === 0,
    overlappingBookings
  }
}

/**
 * Verifica si hay reservas que se solapan con los horarios propuestos para una clase recurrente
 * @param startDate Fecha de inicio de la clase recurrente
 * @param endDate Fecha de fin de la clase recurrente (opcional)
 * @param weekDays Días de la semana en que se imparte la clase (0=Domingo, 1=Lunes, etc.)
 * @param timeSlots Slots de tiempo para cada sesión
 * @param timezone Zona horaria de la sede
 * @returns Resultado de disponibilidad con información de solapamientos
 */
export async function checkRecurringClassAvailability(
  startDate: string | Date,
  weekDays: number[],
  timeSlots: TimeSlot[],
  endDate?: string | Date,
  timezone: string = 'Europe/Madrid'
): Promise<ClassAvailabilityResult> {
  console.log(`[DEBUG] Iniciando verificación de disponibilidad para clase recurrente con timezone: ${timezone}`)
  
  // Validación de parámetros
  if (!startDate || !weekDays || weekDays.length === 0 || !timeSlots || timeSlots.length === 0) {
    console.warn('[DEBUG] Parámetros inválidos para verificación de disponibilidad de clase recurrente')
    throw new Error('Se requiere una fecha de inicio, días de la semana y al menos un horario para verificar disponibilidad')
  }

  const supabase = createSupabaseClient()
  const overlappingBookings: OverlappingBooking[] = []

  // Convertir fechas a objetos DateTime para facilitar cálculos
  const startDateTime = typeof startDate === 'string' 
    ? DateTime.fromISO(startDate.includes('T') ? startDate : `${startDate}T00:00:00`, { zone: timezone })
    : DateTime.fromJSDate(startDate as Date, { zone: timezone });

  // Determinar la fecha de fin para la verificación:
  // Si hay endDate, usamos esa. Si no, verificamos hasta un mes después del startDate
  let endDateTime: DateTime;
  if (endDate) {
    endDateTime = typeof endDate === 'string'
      ? DateTime.fromISO(endDate.includes('T') ? endDate : `${endDate}T23:59:59`, { zone: timezone })
      : DateTime.fromJSDate(endDate as Date, { zone: timezone }).set({ hour: 23, minute: 59, second: 59 });
  } else {
    // Si no hay fecha de fin, verificamos hasta un mes después
    endDateTime = startDateTime.plus({ months: 1 });
  }

  console.log(`[DEBUG] Periodo a verificar: ${startDateTime.toFormat('yyyy-MM-dd')} hasta ${endDateTime.toFormat('yyyy-MM-dd')}`)
  console.log(`[DEBUG] Días de la semana: ${weekDays.join(', ')}`)
  console.log(`[DEBUG] Número de time slots a verificar: ${timeSlots.length}`)

  // Verificar cada time slot para cada día de la semana en el rango de fechas
  let currentDate = startDateTime.startOf('day');
  
  // Iteramos hasta la fecha de fin
  while (currentDate <= endDateTime) {
    // Verificamos si el día de la semana actual está incluido en weekDays
    const currentWeekDay = currentDate.weekday % 7; // Convertimos de formato Luxon (1-7, lunes a domingo) a formato 0-6 (domingo a sábado)
    
    if (weekDays.includes(currentWeekDay)) {
      console.log(`[DEBUG] Verificando fecha ${currentDate.toFormat('yyyy-MM-dd')} (día de la semana: ${currentWeekDay})`)
      
      // Convertir a formato ISO para pasar a checkClassAvailability
      const dateToCheck = currentDate.toFormat('yyyy-MM-dd');
      
      // Reutilizamos la función existente para verificar cada fecha individual
      const availabilityResult = await checkClassAvailability(
        dateToCheck,
        timeSlots,
        timezone
      );
      
      // Si encontramos solapamientos, los agregamos a nuestra lista
      if (!availabilityResult.available) {
        console.log(`[DEBUG] Se encontraron solapamientos para la fecha ${dateToCheck}:`, availabilityResult.overlappingBookings.length)
        overlappingBookings.push(...availabilityResult.overlappingBookings);
      }
    }
    
    // Avanzamos un día
    currentDate = currentDate.plus({ days: 1 });
  }

  console.log(`[DEBUG] Resultado final para clase recurrente: ${overlappingBookings.length === 0 ? 'Disponible' : 'No disponible'}, Total solapamientos: ${overlappingBookings.length}`)
  
  if (overlappingBookings.length > 0) {
    console.log(`[DEBUG] Detalles de solapamientos:`, JSON.stringify(overlappingBookings))
  }

  return {
    available: overlappingBookings.length === 0,
    overlappingBookings
  }
}
