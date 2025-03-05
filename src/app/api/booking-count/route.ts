import { NextRequest, NextResponse } from 'next/server'
import { bookingCounters, getNextResetDate, getCurrentPeriodStart } from '@/lib/redis'
import { createSupabaseClient } from '@/lib/supabase'
import { z } from 'zod'

const requestSchema = z.object({
  empresaId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
})

async function getCompanyPlanInfo(empresaId: string): Promise<{ 
  isPro: boolean
  limit: number
  planUpdatedAt: string 
}> {
  const supabase = createSupabaseClient()
  
  try {
    // Obtener la empresa con su plan de suscripción
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select(`
        plan_type,
        plan_id,
        plan_updated_at,
        subscription_plans (
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

    if (!empresa) {
      throw new Error('Empresa no encontrada')
    }

    // Usar plan_type de la empresa como fuente de verdad
    const isPro = empresa.plan_type === 'PRO'

    // Si es PRO, no necesitamos el plan
    if (isPro) {
      return {
        isPro: true,
        limit: Number.MAX_SAFE_INTEGER,
        planUpdatedAt: empresa.plan_updated_at || new Date().toISOString()
      }
    }

    // Para planes FREE, obtener el plan de suscripción
    if (!empresa.plan_id) {
      throw new Error('Empresa sin plan asignado')
    }

    // Obtener el plan directamente usando el plan_id
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('daily_booking_limit, code')
      .eq('id', empresa.plan_id)
      .single()

    if (planError || !plan) {
      console.error('❌ Error al obtener plan de suscripción:', {
        error: planError,
        empresaId,
        planId: empresa.plan_id
      })
      throw new Error('Plan de suscripción no encontrado')
    }

    // Asegurarnos de que tenemos una fecha de actualización del plan
    const planUpdatedAt = empresa.plan_updated_at || new Date().toISOString()

    console.log('📍 Plan Info:', {
      empresaId,
      planType: empresa.plan_type,
      planId: empresa.plan_id,
      planUpdatedAt,
      limit: plan.daily_booking_limit
    })

    return {
      isPro: false,
      limit: plan.daily_booking_limit,
      planUpdatedAt
    }
  } catch (error: any) {
    console.error('❌ Error al obtener información del plan:', error)
    throw error
  }
}

export async function GET(request: Request) {
  console.log('📍 GET /api/booking-count')
  try {
    const { searchParams } = new URL(request.url)
    const params = {
      empresaId: searchParams.get('empresaId'),
      date: searchParams.get('date')
    }

    const validationResult = requestSchema.safeParse(params)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Parámetros de solicitud inválidos',
          details: validationResult.error.format()
        },
        { status: 400 }
      )
    }

    const { empresaId, date } = validationResult.data

    // 1. Obtener información del plan
    const planInfo = await getCompanyPlanInfo(empresaId)

    // Si es PRO, retornar respuesta simplificada
    if (planInfo.isPro) {
      return NextResponse.json({
        currentCount: 0,
        limit: Number.MAX_SAFE_INTEGER,
        remainingBookings: Number.MAX_SAFE_INTEGER,
        resetTime: new Date().toISOString(),
        isPro: true,
        nextResetDate: new Date().toISOString()
      })
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

    return NextResponse.json({
      currentCount,
      limit: planInfo.limit,
      remainingBookings: Math.max(0, planInfo.limit - currentCount),
      resetTime: nextReset.toISOString(),
      isPro: false,
      nextResetDate: nextReset.toISOString()
    })
  } catch (error: any) {
    console.error('❌ Error al obtener el estado de las reservas:', error)
    return NextResponse.json(
      { 
        error: 'Error al obtener el estado de las reservas',
        details: error.message
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { empresaId, date, action } = body

    if (!empresaId || !date || !action) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      )
    }

    // 1. Verificar plan de la empresa
    const planInfo = await getCompanyPlanInfo(empresaId)
    
    // Si es PRO, no realizar conteo
    if (planInfo.isPro) {
      return NextResponse.json({ 
        count: 0,
        action,
        timestamp: new Date().toISOString(),
        isPro: true,
        nextResetDate: getNextResetDate(planInfo.planUpdatedAt).toISOString()
      })
    }

    console.log('📍 Procesando acción de reserva:', { empresaId, date, action })
    let result: number = 0

    switch (action) {
      case 'increment': {
        // Verificar límite antes de incrementar
        const currentCount = await bookingCounters.get(empresaId, date, planInfo.planUpdatedAt)

        if (currentCount >= planInfo.limit) {
          return NextResponse.json(
            { error: 'Se ha alcanzado el límite de reservas del período' },
            { status: 400 }
          )
        }

        result = await bookingCounters.increment(empresaId, date, planInfo.planUpdatedAt)
        break
      }
      case 'decrement': {
        const currentCount = await bookingCounters.get(empresaId, date, planInfo.planUpdatedAt)
        if (currentCount > 0) {
          await bookingCounters.reset(empresaId, date, planInfo.planUpdatedAt)
          const newCount = currentCount - 1
          if (newCount > 0) {
            for (let i = 0; i < newCount; i++) {
              result = await bookingCounters.increment(empresaId, date, planInfo.planUpdatedAt)
            }
          }
        }
        break
      }
      case 'reset':
        await bookingCounters.reset(empresaId, date, planInfo.planUpdatedAt)
        break
      default:
        return NextResponse.json(
          { error: 'Acción no válida' },
          { status: 400 }
        )
    }

    const nextReset = getNextResetDate(planInfo.planUpdatedAt)

    return NextResponse.json({ 
      count: result,
      action,
      timestamp: new Date().toISOString(),
      isPro: false,
      nextResetDate: nextReset.toISOString()
    })
  } catch (error: any) {
    console.error('❌ Error en booking-count API:', error)
    return NextResponse.json(
      { error: 'Error al procesar la acción de reserva' },
      { status: 500 }
    )
  }
} 