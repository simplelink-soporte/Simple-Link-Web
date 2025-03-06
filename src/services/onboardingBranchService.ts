import { createSupabaseClient } from '@/lib/supabase'
import { onboardingCompanyService } from './onboardingCompanyService'
import { useAuth } from '@/contexts/AuthContext'
import { Branch } from '@/types/branch'

const supabase = createSupabaseClient()

// Cache para almacenar los datos de las sedes por empresa ID
const branchesCache = new Map<string, {
  data: Branch[],
  timestamp: number
}>()

// Tiempo de expiración de la caché (10 segundos)
const CACHE_EXPIRATION = 10000

// Evitar consultas simultáneas
let pendingRequests = new Map<string, Promise<any>>()

class OnboardingBranchService {
  // Método para obtener el ID de empresa por ID de usuario con caché
  async getEmpresaIdByUserId(userId: string): Promise<string> {
    const cacheKey = `empresa_${userId}`
    
    // Si ya hay una consulta en curso, esperar a que termine
    if (pendingRequests.has(cacheKey)) {
      console.log('⏳ Usando consulta pendiente para empresa ID')
      return await pendingRequests.get(cacheKey) as string
    }
    
    // Iniciar nueva consulta
    const request = (async () => {
      try {
    console.log('📍 Buscando empresa para usuario:', userId)
        
        // Verificar caché en localStorage
        try {
          const cached = localStorage.getItem(cacheKey)
          if (cached) {
            const { id, timestamp } = JSON.parse(cached)
            // Si la caché es reciente (menos de 5 minutos), usarla
            if (Date.now() - timestamp < 5 * 60 * 1000) {
              console.log('✅ Empresa encontrada en caché:', id)
              return id
            }
          }
        } catch (e) {
          console.warn('Error al verificar caché de empresa:', e)
        }
    
    const { data, error } = await supabase
      .from('empresas')
      .select('id')
      .eq('auth_user_id', userId)
          .maybeSingle()
        
        if (error) throw error
        if (!data) throw new Error('No se encontró la empresa')

    console.log('✅ Empresa encontrada:', data.id)
        
        // Guardar en localStorage para futuras consultas
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            id: data.id, 
            timestamp: Date.now()
          }))
        } catch (e) {
          console.warn('Error al guardar caché de empresa:', e)
        }
        
        return data.id
      } catch (error) {
        console.error('Error al buscar empresa:', error)
        throw error
      } finally {
        // Eliminar de consultas pendientes
        pendingRequests.delete(cacheKey)
      }
    })()
    
    // Guardar la promesa para poder reutilizarla
    pendingRequests.set(cacheKey, request)
    return await request
  }

  // Método para obtener sedes por userId
  async getBranchesByUserId(): Promise<{
    data: Branch[] | null,
    error: Error | null
  }> {
    try {
      // Obtener el ID del usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No hay usuario autenticado')
      
      // Obtener el ID de la empresa
      const empresaId = await this.getEmpresaIdByUserId(user.id)
      
      // Delegar a getBranchesByEmpresaId
      return this.getBranchesByEmpresaId(empresaId)
    } catch (error: any) {
      console.error('Error al obtener sedes por userId:', error)
      return { data: null, error }
    }
  }

  // Método para obtener sedes por empresa ID con caché
  async getBranchesByEmpresaId(empresaId: string): Promise<{
    data: Branch[] | null,
    error: Error | null
  }> {
    try {
      // Verificar si ya hay una consulta en curso para esta empresa
      const cacheKey = `branches_${empresaId}`
      if (pendingRequests.has(cacheKey)) {
        console.log('⏳ Usando consulta pendiente para sedes')
        return await pendingRequests.get(cacheKey) as { data: Branch[] | null, error: Error | null }
      }
      
      // Iniciar nueva consulta
      const request = (async () => {
        try {
          // Verificar caché
          const cached = branchesCache.get(empresaId)
          if (cached && (Date.now() - cached.timestamp < CACHE_EXPIRATION)) {
            console.log('🔄 Usando caché para sedes de empresa:', empresaId)
            return { data: cached.data, error: null }
          }
          
          console.log('📍 Obteniendo sedes para empresa:', empresaId)
          
          const { data, error } = await supabase
            .from('sedes')
            .select('*')
            .eq('empresa_id', empresaId)
            .order('created_at', { ascending: false })
          
          if (error) throw error
          
          // Transformar datos al formato Branch
          const branches: Branch[] = data.map(sede => ({
            id: sede.id,
            name: sede.name,
            courts: sede.courts_count || 0,
            schedule: sede.business_hours ? {
              open: sede.business_hours.open || '08:00',
              close: sede.business_hours.close || '22:00'
            } : undefined,
            // Asegurarnos de que el objeto data esté correctamente formateado
            data: {
              id: sede.id,
              name: sede.name || '',
              address: sede.address || '',
              phone: sede.phone || '',
              manager: sede.manager_id || '',
              isActive: sede.is_active ?? true,
              opening_hours: sede.opening_hours || {},
              courts: sede.courts || []
            }
          }))
          
          // Guardar en caché
          branchesCache.set(empresaId, {
            data: branches,
            timestamp: Date.now()
          })
          
          return { data: branches, error: null }
        } catch (error: any) {
          console.error('Error al obtener sedes:', error)
          return { data: null, error }
        } finally {
          // Eliminar de consultas pendientes
          setTimeout(() => pendingRequests.delete(cacheKey), 100)
        }
      })()
      
      // Guardar la promesa para poder reutilizarla
      pendingRequests.set(cacheKey, request)
      return await request
    } catch (error: any) {
      console.error('Error inesperado al obtener sedes:', error)
      return { data: null, error }
    }
  }

  // Método para crear una sede
  async createBranch(
    name: string,
    userId: string
  ): Promise<{
    data: Branch | null,
    error: Error | null
  }> {
    try {
      // Obtener el ID de la empresa
      const empresaId = await this.getEmpresaIdByUserId(userId)

      const { data, error } = await supabase
        .from('sedes')
        .insert({
          name,
          empresa_id: empresaId,
          is_active: true
        })
        .select()
        .single()

      if (error) throw error

      // Invalidar caché
      branchesCache.delete(empresaId)
      
      // Crear objeto Branch
      const branch: Branch = {
          id: data.id,
          name: data.name,
        courts: 0,
        schedule: {
          open: '08:00',
          close: '22:00'
        }
      }
      
      return { data: branch, error: null }
    } catch (error: any) {
      console.error('Error al crear sede:', error)
      return { data: null, error }
    }
  }

  // Método para eliminar una sede
  async deleteBranch(
    branchId: string,
    userId: string
  ): Promise<{
    success: boolean,
    error: Error | null
  }> {
    try {
      // Obtener el ID de la empresa
      const empresaId = await this.getEmpresaIdByUserId(userId)
      
      const { error } = await supabase
        .from('sedes')
        .delete()
        .eq('id', branchId)
        .eq('empresa_id', empresaId)

      if (error) throw error

      // Invalidar caché
      branchesCache.delete(empresaId)

      return { success: true, error: null }
    } catch (error: any) {
      console.error('Error al eliminar sede:', error)
      return { success: false, error }
    }
  }

  // Método para actualizar los datos de una sede
  async updateBranchData(
    branchId: string,
    data: any,
    userId: string
  ): Promise<{
    success: boolean,
    error: Error | null
  }> {
    try {
      // Obtener el ID de la empresa
      const empresaId = await this.getEmpresaIdByUserId(userId)
      
      const { error } = await supabase
        .from('sedes')
        .update({
          data,
          updated_at: new Date().toISOString()
        })
        .eq('id', branchId)
        .eq('empresa_id', empresaId)
      
      if (error) throw error
      
      // Invalidar caché
      branchesCache.delete(empresaId)
      
      return { success: true, error: null }
    } catch (error: any) {
      console.error('Error al actualizar sede:', error)
      return { success: false, error }
    }
  }

  // Método para obtener una sede por ID
  async getBranchById(branchId: string): Promise<{
    data: any,
    error: Error | null
  }> {
    try {
      console.log('📍 Obteniendo sede por ID:', branchId)
      
      // Verificar caché
      const cacheKey = `branch_${branchId}`
      
      // Si ya hay una consulta en curso, esperar a que termine
      if (pendingRequests.has(cacheKey)) {
        console.log('⏳ Ya hay una consulta en progreso, esperando...')
        try {
          return await pendingRequests.get(cacheKey) as { data: any, error: Error | null }
        } catch (error) {
          console.error('Error en consulta pendiente:', error)
          // Si falla, continuamos con una nueva consulta
        }
      }
      
      // Iniciar nueva consulta
      const getPromise = (async () => {
        try {
          const { data, error } = await supabase
            .from('sedes')
            .select('*')
            .eq('id', branchId)
            .single()
          
          if (error) throw error
          if (!data) throw new Error('No se encontró la sede')
          
          // Formatear los datos para asegurar que todos los campos necesarios estén presentes
          const formattedData = {
            ...data,
            // Asegurarnos de que todos los campos necesarios estén presentes
            name: data.name || '',
            address: data.address || '',
            phone: data.phone || '',
            manager_id: data.manager_id || '',
            is_active: data.is_active ?? true,
            opening_hours: data.opening_hours || {},
            courts: data.courts || []
          }
          
          return { data: formattedData, error: null }
        } catch (error: any) {
          console.error('Error al obtener sede por ID:', error)
          return { data: null, error }
        } finally {
          // Eliminar de pendientes después de un pequeño retraso
          setTimeout(() => {
            pendingRequests.delete(cacheKey)
          }, 100)
        }
      })()
      
      // Guardar la promesa para poder reutilizarla
      pendingRequests.set(cacheKey, getPromise)
      
      return await getPromise
    } catch (error: any) {
      console.error('Error inesperado al obtener sede por ID:', error)
      return { data: null, error: error }
    }
  }

  // Limpiar caché
  clearCache() {
    branchesCache.clear()
    pendingRequests.clear()
  }
}

export const onboardingBranchService = new OnboardingBranchService() 