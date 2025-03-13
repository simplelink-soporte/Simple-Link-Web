import { createSupabaseClient } from '@/lib/supabase'
import { format } from 'date-fns'

/**
 * Interfaz para representar información resumida de reservas
 */
export interface BookingSummary {
  count: number
  hasFutureBookings: boolean
  earliestDate?: string
  latestDate?: string
  uniqueDates?: number
  reservationDates?: string[]
}

/**
 * Servicio para verificar información relacionada con clases
 */
export const classCheckService = {
  /**
   * Verifica si una clase tiene reservas futuras
   * @param classId ID de la clase a verificar
   * @returns Objeto con información resumida sobre las reservas futuras
   */
  async checkFutureBookings(classId: string): Promise<BookingSummary> {
    try {
      if (!classId) {
        console.warn('⚠️ ClassCheckService - No se proporcionó classId')
        return { count: 0, hasFutureBookings: false }
      }

      const supabase = createSupabaseClient()
      const today = format(new Date(), 'yyyy-MM-dd')

      console.log('🔍 ClassCheckService - Verificando reservas futuras:', {
        classId,
        today
      })

      // Consultar reservas futuras para esta clase
      const { data, error, count } = await supabase
        .from('bookings')
        .select('date, start_time, end_time', { count: 'exact' })
        .eq('class_id', classId)
        .eq('reservation_type', 'class')
        .gte('date', today) // Solo fechas futuras (incluyendo hoy)
        .is('cancelled_at', null) // Solo reservas no canceladas
        .order('date', { ascending: true })

      if (error) {
        console.error('❌ ClassCheckService - Error al verificar reservas futuras:', error)
        throw error
      }

      const bookingCount = count || 0
      const hasFutureBookings = bookingCount > 0

      // Si no hay reservas, devolver la información básica
      if (!hasFutureBookings || !data || data.length === 0) {
        return { count: 0, hasFutureBookings: false }
      }

      // Extraer información adicional para mostrar en la advertencia
      const dates = data.map(booking => booking.date)
      const uniqueDates = new Set(dates).size
      const earliestDate = dates[0]
      const latestDate = dates[dates.length - 1]

      // Obtener lista de fechas únicas ordenadas
      const reservationDates = Array.from(new Set(dates))
        .sort()
        .slice(0, 5) // Limitamos a 5 fechas para no sobrecargar la interfaz

      console.log('✅ ClassCheckService - Resultado de verificación:', {
        classId,
        bookingCount,
        hasFutureBookings,
        uniqueDates,
        earliestDate,
        latestDate
      })

      return {
        count: bookingCount,
        hasFutureBookings,
        earliestDate,
        latestDate,
        uniqueDates,
        reservationDates
      }
    } catch (error) {
      console.error('❌ ClassCheckService - Error inesperado:', error)
      return { count: 0, hasFutureBookings: false }
    }
  }
} 