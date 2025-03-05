"use client"

import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import type { Branch } from '@/types/branch'
import { createSupabaseClient } from '@/lib/supabase'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { setEmpresaId } from '@/contexts/OrganizationContext'
import { toast } from 'sonner'

interface BranchContextType {
  currentBranch: Branch | null
  setCurrentBranch: (branch: Branch | null) => void
  branches: Branch[]
  isLoading: boolean
  error: Error | null
}

const BranchContext = createContext<BranchContextType | undefined>(undefined)

const BRANCH_STORAGE_KEY = 'currentBranchId'
const BRANCH_CHECK_INTERVAL = 1000 * 60 * 5 // 5 minutos
const BRANCH_CHECK_KEY = 'last_branch_check'

function shouldCheckBranch(): boolean {
  const lastCheck = localStorage.getItem(BRANCH_CHECK_KEY)
  if (!lastCheck) return true
  
  const timeSinceLastCheck = Date.now() - parseInt(lastCheck)
  return timeSinceLastCheck > BRANCH_CHECK_INTERVAL
}

function updateLastBranchCheck() {
  localStorage.setItem(BRANCH_CHECK_KEY, Date.now().toString())
}

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isLoadingAuth } = useAuth()
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(() => {
    if (typeof window !== 'undefined') {
      const savedBranchId = localStorage.getItem(BRANCH_STORAGE_KEY)
      return savedBranchId ? { id: savedBranchId } as Branch : null
    }
    return null
  })
  const supabase = createSupabaseClient()

  // Query para obtener la empresa del usuario actual
  const { 
    data: empresa,
    isLoading: isLoadingEmpresa,
    error: empresaError
  } = useQuery({
    queryKey: ['empresa', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No hay usuario autenticado')

      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      if (error) throw error
      if (!data) throw new Error('No se encontró la empresa')

      // Guardar el empresa_id en caché
      setEmpresaId(data.id)
      return data
    },
    enabled: !!user?.id && !isLoadingAuth,
    retry: 1,
    staleTime: BRANCH_CHECK_INTERVAL
  })

  // Query para obtener las sedes
  const { 
    data: branchesData = [], 
    isLoading: isLoadingBranches,
    error: branchesError
  } = useQuery<Branch[], Error>({
    queryKey: ['branches', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) throw new Error('No hay empresa seleccionada')

      // Verificar si necesitamos recargar las sedes
      if (!shouldCheckBranch() && branchesData.length > 0) {
        return branchesData
      }

      const { data, error } = await supabase
        .from('sedes')
        .select('*')
        .eq('empresa_id', empresa.id)
        .eq('is_active', true)
        .order('name')

      if (error) {
        toast.error('Error al cargar las sedes')
        throw error
      }
      
      if (!data?.length) {
        return []
      }

      updateLastBranchCheck()
      return data as Branch[]
    },
    enabled: !!empresa?.id && !isLoadingAuth && !isLoadingEmpresa,
    retry: 1,
    staleTime: 1000 * 60 * 10, // 10 minutos
    gcTime: 1000 * 60 * 30, // 30 minutos
    placeholderData: keepPreviousData
  })

  // Efecto para manejar la sede actual
  useEffect(() => {
    const initializeBranch = () => {
      if (isLoadingAuth || isLoadingEmpresa || isLoadingBranches) return

      if (!user || !empresa) {
        setCurrentBranch(null)
        localStorage.removeItem(BRANCH_STORAGE_KEY)
        return
      }

      if (!branchesData.length) {
        setCurrentBranch(null)
        localStorage.removeItem(BRANCH_STORAGE_KEY)
        return
      }

      const savedBranchId = localStorage.getItem(BRANCH_STORAGE_KEY)
      if (savedBranchId) {
        const savedBranch = branchesData.find(branch => branch.id === savedBranchId)
        if (savedBranch) {
          setCurrentBranch(savedBranch)
          return
        }
      }

      setCurrentBranch(branchesData[0])
      localStorage.setItem(BRANCH_STORAGE_KEY, branchesData[0].id)
    }

    initializeBranch()
  }, [user, empresa, branchesData, isLoadingAuth, isLoadingEmpresa, isLoadingBranches])

  // Manejar cambios en la sede actual
  const handleSetCurrentBranch = (branch: Branch | null) => {
    setCurrentBranch(branch)
    
    if (branch) {
      localStorage.setItem(BRANCH_STORAGE_KEY, branch.id)
    } else {
      localStorage.removeItem(BRANCH_STORAGE_KEY)
    }
  }

  const value = useMemo(() => ({
    currentBranch,
    setCurrentBranch: handleSetCurrentBranch,
    branches: branchesData,
    isLoading: isLoadingAuth || isLoadingEmpresa || isLoadingBranches,
    error: empresaError || branchesError
  }), [
    currentBranch,
    branchesData,
    isLoadingAuth,
    isLoadingEmpresa,
    isLoadingBranches,
    empresaError,
    branchesError
  ])

  return (
    <BranchContext.Provider value={value}>
      {children}
    </BranchContext.Provider>
  )
}

export function useBranchContext() {
  const context = useContext(BranchContext)
  if (context === undefined) {
    throw new Error('useBranchContext debe ser usado dentro de un BranchProvider')
  }
  return context
} 