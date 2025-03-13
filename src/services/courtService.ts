import { createSupabaseClient } from '@/lib/supabase'
import type { Court, CreateCourtDTO } from '@/types/court'
import type { PostgrestError } from '@supabase/supabase-js'

const supabase = createSupabaseClient()

interface ServiceResponse<T> {
  data?: T
  error?: {
    message: string
    details?: string
    hint?: string
  }
}

export const courtService = {
  async getCourtsByBranch(branchId: string): Promise<ServiceResponse<Court[]>> {
    try {
      const { data, error } = await supabase
        .from('courts')
        .select('*')
        .eq('branch_id', branchId)
        .order('name')

      if (error) throw error

      // Procesar y validar los datos
      const processedCourts = data.map(court => {
        // Procesar available_durations
        let available_durations: number[] = []
        
        try {
          if (Array.isArray(court.available_durations)) {
            available_durations = court.available_durations
              .map((d: number | string) => Number(d))
              .filter((d: number) => !isNaN(d))
              .sort((a: number, b: number) => a - b)
          } else if (typeof court.available_durations === 'string') {
            const parsed = JSON.parse(court.available_durations)
            if (Array.isArray(parsed)) {
              available_durations = parsed
                .map((d: number | string) => Number(d))
                .filter((d: number) => !isNaN(d))
                .sort((a: number, b: number) => a - b)
            }
          }
        } catch (e) {
          console.error('Error procesando available_durations:', e)
        }

        // Procesar duration_pricing
        let duration_pricing: Record<string, number> = {}
        try {
          if (typeof court.duration_pricing === 'string') {
            duration_pricing = JSON.parse(court.duration_pricing)
          } else if (court.duration_pricing && typeof court.duration_pricing === 'object') {
            Object.entries(court.duration_pricing).forEach(([key, value]) => {
              const numValue = Number(value)
              if (!isNaN(numValue)) {
                duration_pricing[key] = numValue
              }
            })
          }
        } catch (e) {
          console.error('Error procesando duration_pricing:', e)
        }

        // Procesar custom_pricing
        let custom_pricing = {}
        try {
          if (typeof court.custom_pricing === 'string') {
            custom_pricing = JSON.parse(court.custom_pricing)
          } else if (court.custom_pricing && typeof court.custom_pricing === 'object') {
            custom_pricing = court.custom_pricing
          }
        } catch (e) {
          console.error('Error procesando custom_pricing:', e)
        }

        console.log('Datos procesados de la cancha:', {
          name: court.name,
          available_durations,
          duration_pricing,
          custom_pricing
        })

        return {
          ...court,
          available_durations,
          duration_pricing,
          custom_pricing,
          is_active: Boolean(court.is_active)
        } as Court
      })

      return { data: processedCourts }
    } catch (error) {
      console.error('Error al obtener las canchas:', error)
      const pgError = error as PostgrestError
      return {
        error: {
          message: pgError.message || 'Error al obtener las canchas',
          details: pgError.details,
          hint: pgError.hint
        }
      }
    }
  },

  async updateCourt(courtId: string, data: CreateCourtDTO): Promise<ServiceResponse<void>> {
    try {
      // Asegurarse de que los datos estén en el formato correcto
      const duration_pricing = Object.entries(data.duration_pricing || {}).reduce((acc, [key, value]) => {
        const numValue = Number(value)
        if (!isNaN(numValue)) {
          acc[key] = numValue
        }
        return acc
      }, {} as Record<string, number>)

      const available_durations = (data.available_durations || [])
        .map((d: number | string) => Number(d))
        .filter((d: number) => !isNaN(d))
        .sort((a: number, b: number) => a - b)

      const courtData = {
        name: data.name.trim(),
        branch_id: data.branch_id,
        sport: data.sport,
        court_type: data.court_type,
        surface: data.surface,
        is_active: data.is_active,
        duration_pricing,
        custom_pricing: data.custom_pricing || {},
        available_durations,
        updated_at: new Date().toISOString()
      }

      console.log('Datos a actualizar:', {
        id: courtId,
        ...courtData
      })

      const { error } = await supabase
        .from('courts')
        .update(courtData)
        .eq('id', courtId)

      if (error) {
        console.error('Error de Supabase:', error)
        throw error
      }

      // Verificar que la actualización fue exitosa
      const { data: updatedCourt, error: verifyError } = await supabase
        .from('courts')
        .select('*')
        .eq('id', courtId)
        .single()

      if (verifyError) {
        console.error('Error al verificar actualización:', verifyError)
        throw verifyError
      }

      // Verificar que los datos se actualizaron correctamente
      const expectedDurationPricing = JSON.stringify(duration_pricing)
      const actualDurationPricing = JSON.stringify(updatedCourt.duration_pricing)
      
      if (expectedDurationPricing !== actualDurationPricing) {
        console.error('Los precios no se actualizaron correctamente:', {
          expected: duration_pricing,
          actual: updatedCourt.duration_pricing
        })
        throw new Error('Los precios no se actualizaron correctamente')
      }

      return {}
    } catch (error) {
      console.error('Error al actualizar la cancha:', error)
      const pgError = error as PostgrestError
      return {
        error: {
          message: pgError.message || 'Error al actualizar la cancha',
          details: pgError.details,
          hint: pgError.hint
        }
      }
    }
  },

  async createCourt(data: CreateCourtDTO): Promise<ServiceResponse<void>> {
    try {
      // Convertir los datos al formato correcto para Supabase
      const duration_pricing = Object.entries(data.duration_pricing).reduce((acc, [key, value]) => {
        const numValue = Number(value)
        if (!isNaN(numValue)) {
          acc[key] = numValue
        }
        return acc
      }, {} as Record<string, number>)

      const available_durations = Array.isArray(data.available_durations)
        ? data.available_durations
            .map((d: number | string) => Number(d))
            .filter((d: number) => !isNaN(d))
            .sort((a: number, b: number) => a - b)
        : []

      const courtData = {
        name: data.name.trim(),
        branch_id: data.branch_id,
        sport: data.sport,
        court_type: data.court_type,
        surface: data.surface,
        is_active: data.is_active,
        duration_pricing,
        custom_pricing: data.custom_pricing,
        available_durations,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      console.log('Datos a crear:', courtData)

      const { error } = await supabase
        .from('courts')
        .insert([courtData])

      if (error) {
        console.error('Error de Supabase:', error)
        throw error
      }

      return {}
    } catch (error) {
      console.error('Error al crear la cancha:', error)
      const pgError = error as PostgrestError
      return {
        error: {
          message: pgError.message || 'Error al crear la cancha',
          details: pgError.details,
          hint: pgError.hint
        }
      }
    }
  },

  async updateCourtStatus(courtId: string, isActive: boolean): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('courts')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', courtId)

      if (error) throw error
      return {}
    } catch (error) {
      console.error('Error al actualizar el estado:', error)
      const pgError = error as PostgrestError
      return {
        error: {
          message: pgError.message || 'Error al actualizar el estado',
          details: pgError.details,
          hint: pgError.hint
        }
      }
    }
  },

  // Obtener una pista específica por ID
  async getCourtById(courtId: string): Promise<ServiceResponse<Court>> {
    try {
      const { data, error } = await supabase
        .from('courts')
        .select('*')
        .eq('id', courtId)
        .single();

      if (error) throw error;

      if (!data) {
        return {
          error: {
            message: 'No se encontró la pista con el ID proporcionado'
          }
        };
      }

      // Procesar available_durations de la misma manera que en getCourtsByBranch
      let available_durations: number[] = [];
      
      try {
        if (Array.isArray(data.available_durations)) {
          available_durations = data.available_durations
            .map((d: number | string) => Number(d))
            .filter((d: number) => !isNaN(d))
            .sort((a: number, b: number) => a - b);
        } else if (typeof data.available_durations === 'string') {
          const parsed = JSON.parse(data.available_durations);
          if (Array.isArray(parsed)) {
            available_durations = parsed
              .map((d: number | string) => Number(d))
              .filter((d: number) => !isNaN(d))
              .sort((a: number, b: number) => a - b);
          }
        }
      } catch (e) {
        console.error('Error procesando available_durations:', e);
      }

      return {
        data: {
          ...data,
          available_durations,
          duration_pricing: typeof data.duration_pricing === 'string' 
            ? JSON.parse(data.duration_pricing) 
            : data.duration_pricing,
          custom_pricing: typeof data.custom_pricing === 'string' 
            ? JSON.parse(data.custom_pricing) 
            : data.custom_pricing,
          features: typeof data.features === 'string' 
            ? JSON.parse(data.features) 
            : data.features
        }
      };
    } catch (error: any) {
      console.error('Error al obtener la pista por ID:', error);
      return {
        error: {
          message: 'Error al obtener la pista',
          details: error.message,
          hint: error.hint
        }
      };
    }
  }
}