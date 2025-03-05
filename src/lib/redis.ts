import { createClient } from 'redis'
import type { RedisClientType } from 'redis'
import { createSupabaseClient } from './supabase'

let redisClient: RedisClientType | null = null

export async function createRedisClient(): Promise<RedisClientType> {
  if (!redisClient) {
    const url = process.env.REDIS_URL
    if (!url) {
      throw new Error('REDIS_URL no está definida')
    }

    redisClient = createClient({ url })
    
    redisClient.on('error', (error) => {
      console.error('❌ Error en conexión Redis:', error)
      redisClient = null
    })

    await redisClient.connect()
  }
  return redisClient
}

// Función de utilidad para calcular la próxima fecha de reset
export function getNextResetDate(planUpdatedAt: string): Date {
  const updateDate = new Date(planUpdatedAt)
  const today = new Date()
  
  // Calcular el próximo reset basado en el día del plan_updated_at
  const nextReset = new Date(
    today.getFullYear(),
    today.getMonth(),
    updateDate.getDate(),
    23,
    59,
    59,
    999
  )
  
  // Si hoy es después o igual al día de reset, mover al próximo mes
  if (today.getDate() >= updateDate.getDate()) {
    nextReset.setMonth(nextReset.getMonth() + 1)
  }
  
  console.log('📅 Próxima fecha de reset calculada:', {
    planUpdatedAt,
    today: today.toISOString(),
    nextReset: nextReset.toISOString()
  })
  
  return nextReset
}

// Función de utilidad para calcular el inicio del período actual
export function getCurrentPeriodStart(planUpdatedAt: string): Date {
  const updateDate = new Date(planUpdatedAt)
  const today = new Date()
  
  // Calcular el inicio del período actual basado en el día del plan_updated_at
  const periodStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    updateDate.getDate(),
    0,
    0,
    0,
    0
  )
  
  // Si hoy es antes del día de reset, retroceder al mes anterior
  if (today.getDate() < updateDate.getDate()) {
    periodStart.setMonth(periodStart.getMonth() - 1)
  }
  
  console.log('📅 Inicio del período actual:', {
    planUpdatedAt,
    today: today.toISOString(),
    periodStart: periodStart.toISOString()
  })
  
  return periodStart
}

// Utility functions for booking counts
export const bookingCounters = {
  getKey(empresaId: string, date: string, planUpdatedAt: string): string {
    const periodStart = getCurrentPeriodStart(planUpdatedAt)
    return `booking_count:${empresaId}:${periodStart.toISOString().split('T')[0]}`
  },

  async increment(empresaId: string, date: string, planUpdatedAt: string): Promise<number> {
    try {
      const redis = await createRedisClient()
      const key = this.getKey(empresaId, date, planUpdatedAt)
      const nextReset = getNextResetDate(planUpdatedAt)
      
      // Incrementar contador
      const count = await redis.incr(key)
      
      // Establecer expiración si es necesario
      const ttl = await redis.ttl(key)
      if (ttl < 0) {
        const secondsUntilReset = Math.floor((nextReset.getTime() - Date.now()) / 1000)
        await redis.expire(key, secondsUntilReset)
      }
      
      return count
    } catch (error) {
      console.error('❌ Error incrementando contador:', error)
      throw new Error('Error al incrementar contador de reservas')
    }
  },

  async get(empresaId: string, date: string, planUpdatedAt: string): Promise<number> {
    try {
      const redis = await createRedisClient()
      const key = this.getKey(empresaId, date, planUpdatedAt)
      
      const count = await redis.get(key)
      return count ? parseInt(count, 10) : 0
    } catch (error) {
      console.error('❌ Error obteniendo contador:', error)
      throw new Error('Error al obtener contador de reservas')
    }
  },

  async reset(empresaId: string, date: string, planUpdatedAt: string): Promise<void> {
    try {
      const redis = await createRedisClient()
      const key = this.getKey(empresaId, date, planUpdatedAt)
      await redis.del(key)
    } catch (error) {
      console.error('❌ Error reseteando contador:', error)
      throw new Error('Error al resetear contador de reservas')
    }
  },

  async setExpiration(empresaId: string, date: string, planUpdatedAt: string): Promise<void> {
    try {
      const redis = await createRedisClient()
      const key = this.getKey(empresaId, date, planUpdatedAt)
      const nextReset = getNextResetDate(planUpdatedAt)
      
      const secondsUntilReset = Math.floor((nextReset.getTime() - Date.now()) / 1000)
      await redis.expire(key, secondsUntilReset)
    } catch (error) {
      console.error('❌ Error estableciendo expiración:', error)
      throw new Error('Error al establecer expiración del contador')
    }
  },

  async getDBCount(empresaId: string, date: string, planUpdatedAt: string): Promise<number> {
    const supabase = createSupabaseClient()
    const planDate = new Date(planUpdatedAt)
    const currentDate = new Date(date)
    
    const periodStart = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      planDate.getDate()
    )
    
    const nextResetDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      planDate.getDate(),
      23,
      59,
      59
    )
    
    if (currentDate.getDate() >= planDate.getDate()) {
      nextResetDate.setMonth(nextResetDate.getMonth() + 1)
    }
    
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id')
      .eq('empresa_id', empresaId)
      .gte('date', periodStart.toISOString().split('T')[0])
      .lt('date', nextResetDate.toISOString().split('T')[0])

    if (error) throw error
    return bookings?.length || 0
  },

  async syncWithDB(empresaId: string, date: string, planUpdatedAt: string): Promise<void> {
    const redis = await createRedisClient()
    const key = this.getKey(empresaId, date, planUpdatedAt)
    
    const dbCount = await this.getDBCount(empresaId, date, planUpdatedAt)
    const nextReset = getNextResetDate(planUpdatedAt)
    const secondsUntilReset = Math.floor((nextReset.getTime() - Date.now()) / 1000)
    
    await redis.set(key, dbCount.toString())
    await redis.expire(key, secondsUntilReset)
    
    // Marcar como validado
    await redis.set(`${key}:validated`, 'true', {
      EX: 300 // 5 minutos
    })
    
    console.log('✅ Redis sincronizado con DB:', {
      key,
      count: dbCount,
      expiresIn: secondsUntilReset
    })
  },

  async getMultiple(empresaId: string, dates: string[], planUpdatedAt: string): Promise<Record<string, number>> {
    console.log('📍 Getting multiple booking counts:', { empresaId, dates, planUpdatedAt })
    try {
      const redis = await createRedisClient()
      const multi = redis.multi()
      
      const keys = dates.map(date => this.getKey(empresaId, date, planUpdatedAt))
      keys.forEach(key => multi.get(key))
      
      const results = await multi.exec()
      
      const counts: Record<string, number> = {}
      dates.forEach((date, index) => {
        counts[date] = results?.[index] ? Number(results[index]) : 0
      })
      
      console.log('✅ Got multiple booking counts:', counts)
      return counts
    } catch (error: any) {
      console.error('❌ Error getting multiple booking counts:', error)
      throw error
    }
  }
} 