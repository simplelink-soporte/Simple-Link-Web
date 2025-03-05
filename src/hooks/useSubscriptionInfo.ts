import { useQuery } from '@tanstack/react-query'
import { createSupabaseClient } from '@/lib/supabase'
import { queryKeys } from '@/config/query-keys'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface SubscriptionInfo {
  subscription_id: string
  plan_status: string
  subscription_expires_at: string
  last_payment_date: string
  next_payment_date: string
  payment_status: string
  payment_amount: number
  currency: string
}

export function useSubscriptionInfo(empresaId: string) {
  const { data: subscriptionInfo, isLoading, error } = useQuery({
    queryKey: queryKeys.subscription.info(empresaId),
    queryFn: async () => {
      if (!empresaId) return null
      
      try {
        const supabase = createSupabaseClient()
        const { data, error } = await supabase
          .from('subscriptions')
          .select(`
            subscription_id,
            plan_status,
            subscription_expires_at,
            last_payment_date,
            next_payment_date,
            payment_status,
            payment_amount,
            currency
          `)
          .eq('empresa_id', empresaId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (error) {
          console.error('Error fetching subscription:', error)
          return null
        }
        
        return data as SubscriptionInfo
      } catch (error) {
        console.error('Error in subscription query:', error)
        return null
      }
    },
    enabled: !!empresaId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: false, // No reintentar en caso de error
  })

  const formatDate = (date: string | null) => {
    if (!date) return 'No disponible'
    return format(new Date(date), "d 'de' MMMM, yyyy", { locale: es })
  }

  const formatCurrency = (amount: number | null, currency: string = 'EUR') => {
    if (!amount) return 'No disponible'
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  return {
    subscriptionInfo,
    isLoading,
    error,
    formatDate,
    formatCurrency
  }
} 