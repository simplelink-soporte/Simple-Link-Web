import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { bookingQueryService } from '@/services/bookingQueryService'
import type { SelectedBooking } from '@/types/bookings'

interface UseBookingStateProps {
  date?: Date
  branchId?: string
}

export function useBookingState({ date: inputDate, branchId }: UseBookingStateProps) {
  const [selectedBooking, setSelectedBooking] = useState<SelectedBooking | null>(null)
  const queryClient = useQueryClient()

  // Usar la fecha proporcionada o la fecha actual como valor por defecto
  const date = inputDate || new Date()

  // Formatear la fecha para la consulta
  const formattedDate = date.toISOString().split('T')[0]

  // Calcular la fecha del siguiente día para prefetch
  const nextDay = new Date(date)
  nextDay.setDate(nextDay.getDate() + 1)
  const formattedNextDate = nextDay.toISOString().split('T')[0]

  // Consulta principal
  const {
    data: bookings = [],
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ['bookings', formattedDate, branchId],
    queryFn: () => bookingQueryService.getBookingsByDate(formattedDate, branchId),
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 60, // 1 hora
  })

  // Prefetch del siguiente día
  const { data: nextDayBookings = [] } = useQuery({
    queryKey: ['bookings', formattedNextDate, branchId],
    queryFn: () => bookingQueryService.getBookingsByDate(formattedNextDate, branchId),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60,
  })

  // Prefetch optimizado
  useEffect(() => {
    if (!branchId) return

    const nextDay = new Date(date)
    nextDay.setDate(nextDay.getDate() + 1)
    const formattedNextDate = nextDay.toISOString().split('T')[0]

    queryClient.prefetchQuery({
      queryKey: ['bookings', formattedNextDate, branchId],
      queryFn: () => bookingQueryService.getBookingsByDate(formattedNextDate, branchId),
      staleTime: 1000 * 60 * 5
    })
  }, [date, branchId, queryClient])

  const handleBookingCreated = async (newBooking: SelectedBooking) => {
    if (!branchId) return

    await queryClient.invalidateQueries({
      queryKey: ['bookings', formattedDate, branchId]
    })
  }

  return {
    bookings,
    nextDayBookings,
    isLoading,
    isError,
    error,
    selectedBooking,
    setSelectedBooking,
    handleBookingCreated,
    currentDate: date
  }
} 