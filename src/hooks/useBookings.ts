import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bookingQueryService } from '@/services/bookingQueryService'
import { toast } from '@/components/ui/use-toast'
import type { SelectedBooking, PaymentMethodEnum } from '@/types/bookings'
import { queryKeys } from '@/config/query-keys'

interface RegisterPaymentParams {
  bookingId: string
  depositAmount: number
  paymentMethod: PaymentMethodEnum
  notes?: string
}

interface CancelBookingParams {
  bookingId: string
  reason?: string
  shouldCharge?: boolean
}

interface UseBookingsProps {
  selectedDate?: string
  branchId?: string
}

interface MutationContext {
  previousBookings: SelectedBooking[]
}

function formatDateForQuery(date: Date): string {
  return date.toISOString().split('T')[0]
}

// Función helper para crear la query key
const createBookingsQueryKey = (date?: string, branchId?: string) => 
  ['bookings', { date, branchId }] as const

export function useBookings(params?: UseBookingsProps) {
  const { selectedDate, branchId } = params || {}
  const queryClient = useQueryClient()

  // Query principal para obtener las reservas
  const { 
    data: bookings = [], 
    isLoading, 
    isError,
    refetch
  } = useQuery({
    queryKey: queryKeys.bookings.list(selectedDate, branchId),
    queryFn: () => bookingQueryService.getBookingsByDate(
      selectedDate || new Date().toISOString().split('T')[0], 
      branchId
    ),
    enabled: !!selectedDate,
    gcTime: 1000 * 60 * 30, // Mantener en caché por 30 minutos
    staleTime: 1000 * 60 * 5, // 5 minutos antes de considerar los datos obsoletos
    refetchOnWindowFocus: true,
    refetchOnMount: true
  })

  // Mutación para registrar pagos
  const registerPaymentMutation = useMutation({
    mutationFn: async (params: RegisterPaymentParams) => {
      const result = await bookingQueryService.registerPayment(params)
      if (result.error) throw result.error
      return result
    },
    onMutate: async (params) => {
      // Cancelar queries en curso
      await queryClient.cancelQueries({
        queryKey: queryKeys.bookings.list(selectedDate, branchId)
      })

      // Snapshot del estado anterior
      const previousBookings = queryClient.getQueryData<SelectedBooking[]>(
        queryKeys.bookings.list(selectedDate, branchId)
      ) || []

      // Optimistic update
      queryClient.setQueryData<SelectedBooking[]>(
        queryKeys.bookings.list(selectedDate, branchId),
        old => old?.map(booking => 
          booking.id === params.bookingId
            ? { ...booking, paymentStatus: 'completed' }
            : booking
        ) || []
      )

      return { previousBookings }
    },
    onError: (error: Error, variables, context) => {
      // Revertir en caso de error
      if (context?.previousBookings) {
        queryClient.setQueryData(
          queryKeys.bookings.list(selectedDate, branchId),
          context.previousBookings
        )
      }
      toast({
        title: 'Error al registrar pago',
        description: error.message,
        variant: 'destructive'
      })
    },
    onSuccess: () => {
      toast({
        title: 'Pago registrado',
        description: 'El pago se ha registrado exitosamente'
      })
      // Invalidar y refrescar los datos
      queryClient.invalidateQueries({
        queryKey: queryKeys.bookings.list(selectedDate, branchId)
      })
    }
  })

  // Mutación para cancelar reservas
  const cancelBookingMutation = useMutation({
    mutationFn: async (params: CancelBookingParams) => {
      const result = await bookingQueryService.cancelBooking(params.bookingId, params.reason)
      if (result.error) throw result.error
      return result
    },
    onMutate: async (params) => {
      // Cancelar queries en curso
      await queryClient.cancelQueries({
        queryKey: queryKeys.bookings.list(selectedDate, branchId)
      })

      // Snapshot del estado anterior
      const previousBookings = queryClient.getQueryData<SelectedBooking[]>(
        queryKeys.bookings.list(selectedDate, branchId)
      ) || []

      // Optimistic update
      queryClient.setQueryData<SelectedBooking[]>(
        queryKeys.bookings.list(selectedDate, branchId),
        old => old?.map(booking => 
          booking.id === params.bookingId
            ? { ...booking, paymentStatus: 'cancelled' }
            : booking
        ) || []
      )

      return { previousBookings }
    },
    onError: (error: Error, variables, context) => {
      // Revertir en caso de error
      if (context?.previousBookings) {
        queryClient.setQueryData(
          queryKeys.bookings.list(selectedDate, branchId),
          context.previousBookings
        )
      }
      toast({
        title: 'Error al cancelar reserva',
        description: error.message,
        variant: 'destructive'
      })
    },
    onSuccess: () => {
      toast({
        title: 'Reserva cancelada',
        description: 'La reserva se ha cancelado exitosamente'
      })
      // Invalidar y refrescar los datos
      queryClient.invalidateQueries({
        queryKey: queryKeys.bookings.list(selectedDate, branchId)
      })
    }
  })

  const registerPayment = async (params: RegisterPaymentParams) => {
    try {
      await registerPaymentMutation.mutateAsync(params)
    } catch (error) {
      console.error('Error al registrar pago:', error)
      throw error
    }
  }

  const cancelBooking = async (params: CancelBookingParams) => {
    try {
      await cancelBookingMutation.mutateAsync(params)
    } catch (error) {
      console.error('Error al cancelar reserva:', error)
      throw error
    }
  }

  return {
    bookings,
    isLoading,
    isError,
    refetch,
    registerPayment,
    cancelBooking,
    isRegistering: registerPaymentMutation.isPending,
    isCancelling: cancelBookingMutation.isPending
  }
} 