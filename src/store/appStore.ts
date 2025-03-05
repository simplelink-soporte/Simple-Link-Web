import { create } from 'zustand'
import type { Branch } from '@/types/branch'
import { initializationService } from '@/services/initializationService'
import { clearEmpresaStorage } from '@/lib/storage-utils'

interface AppState {
  // Estado
  empresa: any | null
  branches: Branch[]
  currentBranch: Branch | null
  error: Error | null
  isInitialized: boolean

  // Acciones
  initialize: (userId: string) => Promise<void>
  setCurrentBranch: (branch: Branch) => void
  reset: () => void
}

export const useAppStore = create<AppState>((set) => ({
  // Estado inicial
  empresa: null,
  branches: [],
  currentBranch: null,
  error: null,
  isInitialized: false,

  // Acciones
  initialize: async (userId: string) => {
    try {
      const result = await initializationService.initialize(userId)

      if (result.error) {
        throw result.error
      }

      const storedBranchId = localStorage.getItem('currentBranchId')
      const currentBranch = storedBranchId
        ? result.branches.find(b => b.id === storedBranchId)
        : result.branches[0]

      set({
        empresa: result.empresa,
        branches: result.branches,
        currentBranch: currentBranch || result.branches[0],
        error: null,
        isInitialized: true
      })
    } catch (error: any) {
      set({ 
        error: new Error(error.message),
        isInitialized: false
      })
    }
  },

  setCurrentBranch: (branch: Branch) => {
    set({ currentBranch: branch })
    localStorage.setItem('currentBranchId', branch.id)
  },

  reset: () => {
    // Limpiar estado
    set({
      empresa: null,
      branches: [],
      currentBranch: null,
      error: null,
      isInitialized: false
    })

    // Limpiar localStorage relacionado con la empresa
    clearEmpresaStorage()
  }
})) 