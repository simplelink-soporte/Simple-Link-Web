import { useQuery } from '@tanstack/react-query'
import { BookingCountResponse } from '@/services/bookingCountService'
import { queryKeys } from '@/config/query-keys'

interface UseBookingCountProps {
  empresaId: string
  date: string
  initialData?: BookingCountResponse
  enabled?: boolean
}

async function fetchBookingCount(empresaId: string, date: string): Promise<BookingCountResponse> {
  if (!empresaId || !date) {
    return {
      currentCount: 0,
      limit: 0,
      remainingBookings: 0,
      resetTime: new Date().toISOString(),
      isPro: false,
      nextResetDate: new Date().toISOString()
    }
  }

  console.log('📍 Fetching booking count:', { empresaId, date })
  const response = await fetch(`/api/booking-count?empresaId=${empresaId}&date=${date}`)
  
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`)
  }
  
  const data = await response.json()
  console.log('✅ Booking count response:', data)
  
  if (data.error) {
    throw new Error(data.error)
  }
  
  return data
}

export function useBookingCount({ empresaId, date, initialData, enabled = true }: UseBookingCountProps) {
  const { data: bookingStatus, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.bookingCount.status(empresaId, date),
    queryFn: () => fetchBookingCount(empresaId, date),
    initialData: initialData as BookingCountResponse,
    gcTime: 1000 * 60 * 5, // Cache por 5 minutos
    staleTime: 5000, // 5 segundos antes de considerar los datos obsoletos
    enabled: enabled && Boolean(empresaId && date),
    retry: 2
  })

  const canMakeBooking = bookingStatus?.isPro || (bookingStatus?.remainingBookings ?? 0) > 0

  return {
    bookingStatus,
    isLoading,
    error,
    canMakeBooking,
    remainingBookings: bookingStatus?.remainingBookings ?? 0,
    currentCount: bookingStatus?.currentCount ?? 0,
    limit: bookingStatus?.limit ?? 0,
    resetTime: bookingStatus?.resetTime ?? null,
    isPro: bookingStatus?.isPro ?? false,
    refetch
  }
} 