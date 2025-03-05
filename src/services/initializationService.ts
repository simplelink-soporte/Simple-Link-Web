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

      if (empresaError) throw empresaError
      if (!empresa) throw new Error('No se encontró la empresa')

      console.log('✅ Empresa cargada:', empresa.id)

      // 2. Obtener sedes
      const { data: branches, error: branchesError } = await supabase
        .from('sedes')
        .select('*, timezone')
        .eq('empresa_id', empresa.id)
        .eq('is_active', true)
        .order('name')

      if (branchesError) throw branchesError
      if (!branches?.length) throw new Error('No hay sedes disponibles')

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
      console.error('❌ Error en inicialización:', error)
      return {
        empresa: null,
        branches: [],
        currentBranch: null,
        error: new Error(error.message || 'Error en la inicialización')
      }
    }
  }
} 