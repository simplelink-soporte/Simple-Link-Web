import { createRedisClient } from '@/lib/redis'
import { bookingCounters, getNextResetDate, getCurrentPeriodStart } from '@/lib/redis'
import { createSupabaseClient } from '@/lib/supabase'

const initRedis = createRedisClient()

export interface BookingCountResponse {
  currentCount: number
  limit: number
  remainingBookings: number
  resetTime: string
  isPro?: boolean
  nextResetDate?: string
}

interface CompanyPlanInfo {
  isPro: boolean
  limit: number
  planUpdatedAt: string
}

class BookingCountService {
  private async getCompanyPlanInfo(empresaId: string): Promise<CompanyPlanInfo> {
    const supabase = createSupabaseClient()
    
    try {
      const { data: empresa, error: empresaError } = await supabase
        .from('empresas')
        .select(`
          plan_type,
          plan_id,
          plan_updated_at,
          subscription_plans!inner (
            daily_booking_limit,
            code
          )
        `)
        .eq('id', empresaId)
        .single()

      if (empresaError) {
        console.error('❌ Error al obtener información de empresa:', empresaError)
        throw new Error(`Empresa no encontrada: ${empresaError.message}`)
      }

      if (!empresa || !empresa.plan_updated_at) {
        throw new Error('Datos de empresa incompletos')
      }

      const isPro = empresa.plan_type === 'PRO'

      // Acceder al primer elemento del array de subscription_plans
      const subscriptionPlan = Array.isArray(empresa.subscription_plans) 
        ? empresa.subscription_plans[0] 
        : null

      return {
        isPro,
        limit: isPro ? Number.MAX_SAFE_INTEGER : subscriptionPlan?.daily_booking_limit ?? 90,
        planUpdatedAt: empresa.plan_updated_at
      }
    } catch (error) {
      console.error('❌ Error al obtener información del plan:', error)
      throw error
    }
  }

  async getBookingCountStatus(empresaId: string, date: string): Promise<BookingCountResponse> {
    try {
      // 1. Obtener información del plan
      const planInfo = await this.getCompanyPlanInfo(empresaId)

      // Si es PRO, retornar respuesta simplificada
      if (planInfo.isPro) {
        return {
          currentCount: 0,
          limit: Number.MAX_SAFE_INTEGER,
          remainingBookings: Number.MAX_SAFE_INTEGER,
          resetTime: new Date().toISOString(),
          isPro: true,
          nextResetDate: new Date().toISOString()
        }
      }

      // 2. Para planes FREE, obtener el conteo actual
      const periodStart = getCurrentPeriodStart(planInfo.planUpdatedAt)
      const nextReset = getNextResetDate(planInfo.planUpdatedAt)

      // 3. Obtener conteo de la base de datos
      const supabase = createSupabaseClient()
      const { data: bookings, error: countError } = await supabase
        .from('bookings')
        .select('id')
        .eq('empresa_id', empresaId)
        .gte('date', periodStart.toISOString().split('T')[0])
        .lt('date', nextReset.toISOString().split('T')[0])

      if (countError) {
        throw new Error(`Error al contar reservas: ${countError.message}`)
      }

      const dbCount = bookings?.length || 0

      // 4. Obtener conteo de Redis
      let currentCount = await bookingCounters.get(empresaId, date, planInfo.planUpdatedAt)

      // 5. Verificar discrepancia y sincronizar si es necesario
      if (dbCount !== currentCount) {
        console.log('⚠️ Discrepancia detectada:', { 
          redis: currentCount, 
          db: dbCount,
          action: 'Sincronizando con base de datos'
        })
        
        currentCount = dbCount

        // Actualizar Redis con el valor correcto
        await bookingCounters.reset(empresaId, date, planInfo.planUpdatedAt)
        if (dbCount > 0) {
          for (let i = 0; i < dbCount; i++) {
            await bookingCounters.increment(empresaId, date, planInfo.planUpdatedAt)
          }
        }
        await bookingCounters.setExpiration(empresaId, date, planInfo.planUpdatedAt)
      }

      return {
        currentCount,
        limit: planInfo.limit,
        remainingBookings: Math.max(0, planInfo.limit - currentCount),
        resetTime: nextReset.toISOString(),
        isPro: false,
        nextResetDate: nextReset.toISOString()
      }
    } catch (error) {
      console.error('❌ Error al obtener estado de reservas:', error)
      throw error
    }
  }

  async incrementCount(empresaId: string, date: string): Promise<number> {
    try {
      const planInfo = await this.getCompanyPlanInfo(empresaId)
      
      if (planInfo.isPro) return 0

      const currentCount = await bookingCounters.get(empresaId, date, planInfo.planUpdatedAt)
      
      if (currentCount >= planInfo.limit) {
        throw new Error('Se ha alcanzado el límite de reservas del período')
      }

      return await bookingCounters.increment(empresaId, date, planInfo.planUpdatedAt)
    } catch (error) {
      console.error('❌ Error al incrementar contador:', error)
      throw error
    }
  }

  async decrementCount(empresaId: string, date: string): Promise<number> {
    try {
      const planInfo = await this.getCompanyPlanInfo(empresaId)
      
      if (planInfo.isPro) return 0

      const currentCount = await bookingCounters.get(empresaId, date, planInfo.planUpdatedAt)
      
      if (currentCount > 0) {
        await bookingCounters.reset(empresaId, date, planInfo.planUpdatedAt)
        const newCount = currentCount - 1
        if (newCount > 0) {
          for (let i = 0; i < newCount; i++) {
            await bookingCounters.increment(empresaId, date, planInfo.planUpdatedAt)
          }
        }
        return newCount
      }
      
      return 0
    } catch (error) {
      console.error('❌ Error al decrementar contador:', error)
      throw error
    }
  }

  async resetCount(empresaId: string, date: string): Promise<void> {
    try {
      const planInfo = await this.getCompanyPlanInfo(empresaId)
      
      if (!planInfo.isPro) {
        await bookingCounters.reset(empresaId, date, planInfo.planUpdatedAt)
      }
    } catch (error) {
      console.error('❌ Error al resetear contador:', error)
      throw error
    }
  }
}

export const bookingCountService = new BookingCountService() 