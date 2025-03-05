"use client"

import { useQuery } from '@tanstack/react-query'
import { userService } from '@/services/supabase'

export function useUsers(empresaId?: string) {
  const {
    data: users = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['users', empresaId],
    queryFn: () => userService.getUsersByEmpresa(empresaId!),
    enabled: !!empresaId
  })

  return {
    users,
    isLoading,
    error,
    refetch
  }
} 