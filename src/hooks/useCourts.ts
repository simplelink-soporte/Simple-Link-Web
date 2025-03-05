import { useQuery } from '@tanstack/react-query'
import { courtService } from '@/services/courtService'
import { queryKeys } from '@/config/query-keys'
import { keepPreviousData } from '@tanstack/react-query'
import type { Court } from '@/types/court'

interface UseCourtProps {
  branchId?: string
  onlyActive?: boolean
}

export function useCourts({ branchId, onlyActive = true }: UseCourtProps = {}) {
  const query = useQuery({
    queryKey: queryKeys.courts.list({ branchId, onlyActive }),
    queryFn: async () => {
      console.log('🔍 Fetching courts:', { branchId, onlyActive })
      
      const response = await courtService.getCourtsByBranch(branchId || '')
      
      if (!response.data) {
        console.log('ℹ️ No courts found for branch:', branchId)
        return []
      }

      const courts = onlyActive 
        ? response.data.filter(court => court.is_active)
        : response.data

      console.log('✅ Courts loaded:', {
        branchId,
        onlyActive,
        total: response.data.length,
        filtered: courts.length
      })

      return courts
    },
    enabled: !!branchId,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 30, // 30 minutos
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('404')) {
        return false
      }
      return failureCount < 2
    }
  })

  return {
    ...query,
    data: query.data || [],
  }
} 