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

// Tipo que coincide exactamente con la estructura de la tabla
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

export class ClassService {
  private supabase = createSupabaseClient()

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