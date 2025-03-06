import { createSupabaseClient } from '@/lib/supabase'
import type { Branch } from '@/types/branch'

const supabase = createSupabaseClient()

interface InitializationResult {
  empresa: any
  branches: Branch[]
  currentBranch: Branch | null
  error?: Error
}

export const initializationService = {
  async initialize(userId: string): Promise<InitializationResult> {
    try {
      console.log('🚀 Iniciando carga de datos...')

      // 1. Obtener empresa
      const { data: empresa, error: empresaError } = await supabase
        .from('empresas')
        .select('*')
        .eq('auth_user_id', userId)
        .single()

      // Si no hay empresa o hay error, verificamos si estamos en proceso de onboarding
      if (empresaError || !empresa) {
        console.log('⚠️ No se encontró empresa para el usuario, posiblemente en proceso de onboarding')
        
        // Devolvemos un resultado válido sin empresa ni sedes
        return {
          empresa: null,
          branches: [],
          currentBranch: null
        }
      }

      console.log('✅ Empresa cargada:', empresa.id)

      // 2. Obtener sedes
      const { data: branches, error: branchesError } = await supabase
        .from('sedes')
        .select('*, timezone')
        .eq('empresa_id', empresa.id)
        .eq('is_active', true)
        .order('name')

      if (branchesError) {
        console.warn('⚠️ Error al cargar sedes:', branchesError.message)
        // Continuamos pero con un arreglo vacío de sedes
        return {
          empresa,
          branches: [],
          currentBranch: null
        }
      }

      if (!branches?.length) {
        console.log('⚠️ No hay sedes disponibles para la empresa')
        return {
          empresa,
          branches: [],
          currentBranch: null
        }
      }

      console.log('✅ Sedes cargadas:', branches.length)

      // 3. Determinar sede actual
      let currentBranch: Branch | null = null
      const savedBranchId = localStorage.getItem('currentBranchId')

      if (savedBranchId) {
        currentBranch = branches.find(branch => branch.id === savedBranchId) || null
      }

      if (!currentBranch) {
        currentBranch = branches[0]
        localStorage.setItem('currentBranchId', currentBranch.id)
      }

      console.log('✅ Sede actual:', currentBranch.name)

      return {
        empresa,
        branches,
        currentBranch
      }
    } catch (error: any) {
      // Extraer información útil del error para el logging
      let errorMessage = 'Error desconocido'
      
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      } else if (error && typeof error === 'object') {
        // Si es un objeto, intentar extraer información útil
        errorMessage = error.message || error.code || 'Error en la inicialización'
      }
      
      console.error('❌ Error en inicialización:', errorMessage)
      
      // Mensaje de error más descriptivo según el tipo de error para el usuario
      let userErrorMessage = 'Error en la inicialización';
      
      if (error.code === 'PGRST116') {
        userErrorMessage = 'No se encontró información de tu cuenta. Por favor, completa el proceso de registro.';
      } else if (error.message) {
        userErrorMessage = error.message;
      }
      
      return {
        empresa: null,
        branches: [],
        currentBranch: null,
        error: new Error(userErrorMessage)
      }
    }
  }
} 