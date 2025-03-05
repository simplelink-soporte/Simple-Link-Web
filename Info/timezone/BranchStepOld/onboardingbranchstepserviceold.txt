import { supabase } from '@/lib/supabase'
import type { Branch } from '@/types/branch'

interface ScheduleRange {
  openTime: string
  closeTime: string
}

interface ScheduleDay {
  isOpen: boolean
  timeRanges: ScheduleRange[]
}

interface ScheduleData {
  [key: string]: ScheduleDay
}

interface OnboardingBranch {
  id: string
  name: string
  organization_id?: string
  address?: string
  phone?: string
  manager_id?: string
  is_active?: boolean
  opening_hours?: ScheduleData
  settings?: Record<string, any>
  data?: {
    id?: string
    name: string
    address: string
    phone: string
    manager: string
    isActive: boolean
    opening_hours: ScheduleData
    courts: Array<{
      id: string
      name: string
      sports: string[]
      type: string
      characteristics: string[]
      durations: string[]
      prices: Array<{
        duration: string
        price: string
        timeRanges: Array<{
          day: string
          start: string
          end: string
          percentage: string
        }>
      }>
    }>
  }
}

interface Court {
  id: string
  name: string
  branch_id: string
  sport: string
  court_type: string
  surface: string
  features: string[]
  available_durations: number[]
  duration_pricing: Record<string, number>
  custom_pricing?: Record<string, any>
}

type Sport = 'padel' | 'tennis' | 'badminton' | 'pickleball' | 'squash'
type CourtType = 'indoor' | 'outdoor' | 'covered'
type Surface = 'crystal' | 'panoramic' | 'concrete' | 'synthetic' | 'clay' | 'rubber' | 'premium'

interface CreateCourtData {
  name: string
  sport: Sport
  court_type: CourtType
  surface: Surface
  features: string[]
  available_durations: number[]
  duration_pricing: Record<string, number>
  custom_pricing?: Record<string, any>
  is_active: boolean
}

export const onboardingBranchService = {
  async getEmpresaIdByUserId(userId: string): Promise<string> {
    if (!userId) {
      throw new Error('ID de usuario requerido')
    }

    console.log('📍 Buscando empresa para usuario:', userId)
    
    const { data, error } = await supabase
      .from('empresas')
      .select('id')
      .eq('auth_user_id', userId)
      .single()

    if (error) {
      console.error('Error al obtener empresa:', error)
      throw new Error('No se encontró la empresa asociada al usuario')
    }

    if (!data) {
      throw new Error('No se encontró la empresa asociada al usuario')
    }

    console.log('✅ Empresa encontrada:', data.id)
    return data.id
  },

  async getBranchesByEmpresaId(empresaId: string): Promise<{ data: OnboardingBranch[], error: any }> {
    try {
      console.log('📍 Obteniendo sedes para empresa:', empresaId)
      
      // 1. Obtener todas las sedes de la empresa
      const { data: branchesData, error: branchesError } = await supabase
        .from('sedes')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      if (branchesError) throw branchesError

      if (!branchesData || branchesData.length === 0) {
        console.log('ℹ️ No se encontraron sedes activas')
        return { data: [], error: null }
      }

      // 2. Obtener todas las canchas de estas sedes
      const branchIds = branchesData.map(branch => branch.id)
      const { data: courtsData, error: courtsError } = await supabase
        .from('courts')
        .select('*')
        .in('branch_id', branchIds)

      if (courtsError) throw courtsError

      // 3. Organizar las canchas por sede
      const courtsByBranch = (courtsData || []).reduce((acc, court) => {
        if (!acc[court.branch_id]) {
          acc[court.branch_id] = []
        }
        acc[court.branch_id].push(court)
        return acc
      }, {} as Record<string, Court[]>)

      // 4. Formatear los datos
      const formattedBranches: OnboardingBranch[] = branchesData.map(branch => ({
        id: branch.id,
        name: branch.name,
        organization_id: branch.organization_id || empresaId,
        address: branch.address || undefined,
        phone: branch.phone || undefined,
        manager_id: branch.manager_id || undefined,
        is_active: branch.is_active ?? undefined,
        opening_hours: branch.opening_hours || undefined,
        settings: branch.settings || undefined,
        data: {
          id: branch.id,
          name: branch.name,
          address: branch.address || '',
          phone: branch.phone || '',
          manager: branch.manager_id || '',
          isActive: branch.is_active ?? true,
          opening_hours: branch.opening_hours || {},
          courts: (courtsByBranch[branch.id] || []).map(court => ({
            id: court.id,
            name: court.name,
            sports: [court.sport],
            type: this.mapCourtType(court.court_type),
            characteristics: this.mapCharacteristics(court),
            durations: court.available_durations.map(d => d.toString()),
            prices: this.mapPrices(court)
          }))
        }
      }))

      console.log('✅ Sedes formateadas:', formattedBranches.length)
      return { data: formattedBranches, error: null }
    } catch (error: any) {
      console.error('❌ Error al obtener sedes:', error)
      return {
        data: [],
        error: {
          message: error.message || 'Error al obtener las sedes',
          details: error.details
        }
      }
    }
  },

  async getBranchById(branchId: string): Promise<{ data: OnboardingBranch | null, error: any }> {
    try {
      console.log('📍 Obteniendo sede por ID:', branchId)
      
      // 1. Obtener datos de la sede
      const { data: branchData, error: branchError } = await supabase
        .from('sedes')
        .select('*')
        .eq('id', branchId)
        .single()

      if (branchError) throw branchError

      // 2. Obtener las canchas asociadas
      const { data: courtsData, error: courtsError } = await supabase
        .from('courts')
        .select('*')
        .eq('branch_id', branchId)
        .eq('is_active', true)

      if (courtsError) throw courtsError

      if (branchData) {
        // 3. Procesar los horarios
        let processedOpeningHours: ScheduleData = {}
        
        try {
          if (typeof branchData.opening_hours === 'string') {
            processedOpeningHours = JSON.parse(branchData.opening_hours)
          } else if (branchData.opening_hours && typeof branchData.opening_hours === 'object') {
            processedOpeningHours = branchData.opening_hours
          }

          // Validar la estructura de los horarios
          const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
          days.forEach(day => {
            if (!processedOpeningHours[day]) {
              processedOpeningHours[day] = {
                isOpen: true,
                timeRanges: [{ openTime: '08:00', closeTime: '22:00' }]
              }
            } else {
              // Asegurar que timeRanges sea un array
              if (!Array.isArray(processedOpeningHours[day].timeRanges)) {
                processedOpeningHours[day].timeRanges = [{ openTime: '08:00', closeTime: '22:00' }]
              }
              // Asegurar que cada rango tenga el formato correcto
              processedOpeningHours[day].timeRanges = processedOpeningHours[day].timeRanges.map(range => ({
                openTime: range.openTime || '08:00',
                closeTime: range.closeTime || '22:00'
              }))
            }
          })
        } catch (e) {
          console.error('Error al procesar horarios:', e)
          // Usar horarios por defecto
          processedOpeningHours = {
            monday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] },
            tuesday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] },
            wednesday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] },
            thursday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] },
            friday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] },
            saturday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] },
            sunday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] }
          }
        }

        // 4. Transformar los datos al formato esperado
        const formattedBranch: OnboardingBranch = {
          id: branchData.id,
          name: branchData.name,
          organization_id: branchData.organization_id || undefined,
          address: branchData.address || undefined,
          phone: branchData.phone || undefined,
          manager_id: branchData.manager_id || undefined,
          is_active: branchData.is_active ?? undefined,
          opening_hours: processedOpeningHours,
          settings: branchData.settings || undefined,
          data: {
            id: branchData.id,
            name: branchData.name,
            address: branchData.address || '',
            phone: branchData.phone || '',
            manager: branchData.manager_id || '',
            isActive: branchData.is_active ?? true,
            opening_hours: processedOpeningHours,
            courts: (courtsData || []).map(court => ({
              id: court.id,
              name: court.name,
              sports: [court.sport],
              type: this.mapCourtType(court.court_type),
              characteristics: this.mapCharacteristics(court),
              durations: (court.available_durations || [60]).map(d => d.toString()),
              prices: this.mapPrices(court)
            }))
          }
        }

        console.log('✅ Sede formateada para onboarding:', formattedBranch)
        return { data: formattedBranch, error: null }
      }

      return { data: null, error: null }
    } catch (error: any) {
      console.error('❌ Error al obtener sede:', error)
      return {
        data: null,
        error: {
          message: error.message || 'Error al obtener la sede',
          details: error.details
        }
      }
    }
  },

  async createBranch(empresaId: string, branchData: Partial<OnboardingBranch>): Promise<{ data: OnboardingBranch | null, error: any }> {
    try {
      console.log('📍 Creando nueva sede:', { empresaId, branchData })

      if (!branchData.name) {
        throw new Error('El nombre de la sede es requerido')
      }

      const newBranch = {
        empresa_id: empresaId,
        organization_id: empresaId,
        name: branchData.name,
        address: branchData.address || null,
        phone: branchData.phone || null,
        manager_id: branchData.manager_id || null,
        is_active: branchData.is_active === undefined ? true : branchData.is_active,
        opening_hours: branchData.opening_hours || {},
        settings: branchData.settings || {}
      }

      const { data, error } = await supabase
        .from('sedes')
        .insert(newBranch)
        .select()
        .single()

      if (error) throw error

      console.log('✅ Sede creada exitosamente:', data)
      return {
        data: {
          id: data.id,
          name: data.name,
          organization_id: data.organization_id || empresaId,
          address: data.address || undefined,
          phone: data.phone || undefined,
          manager_id: data.manager_id || undefined,
          is_active: data.is_active ?? true,
          opening_hours: data.opening_hours || {},
          settings: data.settings || {}
        },
        error: null
      }
    } catch (error: any) {
      console.error('❌ Error al crear sede:', error)
      return {
        data: null,
        error: {
          message: error.message || 'Error al crear la sede',
          details: error.details
        }
      }
    }
  },

  async createCourt(branchId: string, courtData: CreateCourtData): Promise<{ data: any, error: any }> {
    try {
      console.log('📍 Creando nueva cancha para la sede:', branchId)

      if (!branchId) {
        throw new Error('El ID de la sede es requerido')
      }

      // Validar que la sede existe
      const { data: branch, error: branchError } = await supabase
        .from('sedes')
        .select('id')
        .eq('id', branchId)
        .single()

      if (branchError || !branch) {
        throw new Error('No se encontró la sede especificada')
      }

      // Crear la cancha
      const newCourt = {
        branch_id: branchId,
        name: courtData.name,
        sport: courtData.sport,
        court_type: courtData.court_type,
        surface: courtData.surface,
        features: courtData.features,
        available_durations: courtData.available_durations,
        duration_pricing: courtData.duration_pricing,
        custom_pricing: courtData.custom_pricing || {},
        is_active: courtData.is_active
      }

      const { data, error } = await supabase
        .from('courts')
        .insert(newCourt)
        .select()
        .single()

      if (error) throw error

      console.log('✅ Cancha creada exitosamente:', data)
      return { data, error: null }

    } catch (error: any) {
      console.error('❌ Error al crear cancha:', error)
      return {
        data: null,
        error: {
          message: error.message || 'Error al crear la cancha',
          details: error.details
        }
      }
    }
  },

  mapCourtType(type: string): string {
    const typeMap: Record<string, string> = {
      'indoor': 'interior',
      'outdoor': 'exterior',
      'covered': 'cubierta'
    }
    return typeMap[type] || 'interior'
  },

  mapCharacteristics(court: Court): string[] {
    const characteristics: string[] = []
    const surfaceMap: Record<string, string> = {
      'crystal': 'cristal-estandar',
      'panoramic': 'cristal-panoramico',
      'concrete': 'muro-hormigon',
      'synthetic': 'cesped-sintetico',
      'clay': 'tierra-batida',
      'rubber': 'goma-profesional'
    }

    if (surfaceMap[court.surface]) {
      characteristics.push(surfaceMap[court.surface])
    }

    if (Array.isArray(court.features)) {
      const featureMap: Record<string, string> = {
        'wall-glass': 'cristal-estandar',
        'wall-panoramic': 'cristal-panoramico',
        'wall-concrete': 'muro-hormigon',
        'floor-synthetic': 'cesped-sintetico',
        'floor-clay': 'tierra-batida',
        'floor-concrete': 'hormigon-pulido',
        'floor-rubber': 'goma-profesional'
      }
      court.features.forEach(feature => {
        if (featureMap[feature] && !characteristics.includes(featureMap[feature])) {
          characteristics.push(featureMap[feature])
        }
      })
    }

    return characteristics
  },

  mapPrices(court: Court): Array<{
    duration: string
    price: string
    timeRanges: Array<{
      day: string
      start: string
      end: string
      percentage: string
    }>
  }> {
    const timeRanges: Array<{
      day: string
      start: string
      end: string
      percentage: string
    }> = []

    return court.available_durations.map(duration => {
      const price = {
        duration: duration.toString(),
        price: (court.duration_pricing?.[duration] || 0).toString(),
        timeRanges: timeRanges
      }

      if (court.custom_pricing) {
        Object.entries(court.custom_pricing).forEach(([day, data]: [string, any]) => {
          if (data.isSelected && Array.isArray(data.timeRanges)) {
            data.timeRanges.forEach((range: { startTime: string, endTime: string, percentage: number }) => {
              timeRanges.push({
                day,
                start: range.startTime,
                end: range.endTime,
                percentage: range.percentage.toString()
              })
            })
          }
        })
      }

      return price
    })
  }
} 