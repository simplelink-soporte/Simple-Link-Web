"use client"

import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useBranchContext } from '@/contexts/BranchContext'
import type { Branch } from '@/types/branch'

const BRANCH_STORAGE_KEY = 'currentBranchId'

export function useBranches() {
  const { user } = useAuth()
  const { 
    currentBranch,
    setCurrentBranch,
    branches,
    isLoading,
    error 
  } = useBranchContext()

  // Efecto para limpiar la sede seleccionada cuando el usuario cierra sesión
  useEffect(() => {
    if (!user) {
      setCurrentBranch(null)
      localStorage.removeItem(BRANCH_STORAGE_KEY)
    }
  }, [user, setCurrentBranch])

  return {
    branches,
    currentBranch,
    setCurrentBranch,
    isLoading,
    isError: !!error
  }
} 






