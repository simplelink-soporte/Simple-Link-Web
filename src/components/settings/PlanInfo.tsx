"use client"

import { useBookingCount } from '@/hooks/useBookingCount'
import { useSubscriptionInfo } from '@/hooks/useSubscriptionInfo'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Crown, Zap } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useRouter } from 'next/navigation'

export function PlanInfo() {
  const router = useRouter()
  const { user } = useAuth()
  const today = new Date().toISOString().split('T')[0]
  
  const { 
    bookingStatus,
    isLoading: isLoadingBooking,
    error: bookingError,
    isPro,
    limit,
    resetTime,
    currentCount,
    remainingBookings
  } = useBookingCount({ 
    empresaId: user?.metadata?.empresa_id || '', 
    date: today 
  })

  const {
    subscriptionInfo,
    isLoading: isLoadingSubscription,
    error: subscriptionError,
    formatDate,
    formatCurrency
  } = useSubscriptionInfo(user?.metadata?.empresa_id || '')

  const isLoading = isLoadingBooking || isLoadingSubscription
  const error = bookingError || subscriptionError

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-16 bg-gray-50 rounded-lg"></div>
      </div>
    )
  }

  if (error || !user?.metadata?.empresa_id) return null

  const resetDate = resetTime ? new Date(resetTime) : null
  const formattedResetDate = resetDate 
    ? format(resetDate, "d 'de' MMMM", { locale: es })
    : 'No disponible'

  const handleUpgradeClick = () => {
    router.push('/admin/dashboard/upgrade')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-medium">Plan de Suscripción</h3>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[800px]"
      >
        <div className={cn(
          "p-4 rounded-lg border",
          isPro 
            ? "bg-gray-900/[0.02] border-gray-200" 
            : "bg-white border-gray-200"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-md",
                isPro ? "bg-gray-900/[0.03]" : "bg-gray-50"
              )}>
                {isPro ? (
                  <Crown className="h-4 w-4 text-gray-700" />
                ) : (
                  <Zap className="h-4 w-4 text-gray-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    Plan {isPro ? 'PRO' : 'FREE'}
                  </h4>
                  {isPro && (
                    <span className="px-2 py-0.5 rounded-full bg-gray-900/[0.05] text-[11px] font-medium text-gray-600">
                      Activo
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1 mt-1">
                  <p className="text-sm text-gray-500">
                    {isPro ? 'Reservas ilimitadas' : `${remainingBookings} de ${limit} reservas disponibles`}
                  </p>
                  {!isPro && (
                    <p className="text-sm text-gray-500">
                      Próxima renovación de cantidad de reservas: {formattedResetDate}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {!isPro && (
              <button
                onClick={handleUpgradeClick}
                className={cn(
                  "text-sm font-medium text-gray-900",
                  "hover:text-gray-700 transition-colors"
                )}
              >
                Actualizar plan
              </button>
            )}
          </div>
        </div>

        {/* Información detallada de suscripción PRO */}
        {isPro && (
          <div className="mt-4 space-y-4 px-1">
            {subscriptionInfo && (
              <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                <div>
                  <p className="text-xs text-gray-500">Último pago</p>
                  <p className="text-sm text-gray-700">
                    {formatCurrency(subscriptionInfo.payment_amount, subscriptionInfo.currency)}
                    <span className="text-gray-500 ml-1">•</span>
                    <span className="text-gray-500 ml-1">{formatDate(subscriptionInfo.last_payment_date)}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Próximo pago</p>
                  <p className="text-sm text-gray-700">{formatDate(subscriptionInfo.next_payment_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Estado del pago</p>
                  <p className="text-sm text-gray-700 capitalize">{subscriptionInfo.payment_status}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Vencimiento de suscripción</p>
                  <p className="text-sm text-gray-700">{formatDate(subscriptionInfo.subscription_expires_at)}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  )
} 