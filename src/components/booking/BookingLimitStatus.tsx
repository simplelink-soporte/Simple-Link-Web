import { useBookingCount } from '@/hooks/useBookingCount'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { InfoIcon } from 'lucide-react'

interface BookingLimitStatusProps {
  empresaId: string
  date: string
  className?: string
}

export function BookingLimitStatus({ empresaId, date, className }: BookingLimitStatusProps) {
  const {
    bookingStatus,
    isLoading,
    error,
    currentCount,
    limit,
    isPro,
    remainingBookings,
    resetTime
  } = useBookingCount({ 
    empresaId, 
    date 
  })

  // No renderizar nada para planes PRO
  if (isPro || bookingStatus?.isPro) {
    return null
  }

  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-0.5 w-full" />
      </div>
    )
  }

  if (error) {
    console.error('❌ BookingLimitStatus Error:', error)
    return null
  }

  if (!bookingStatus) {
    console.warn('⚠️ BookingLimitStatus: No booking status available')
    return null
  }

  const usagePercentage = ((limit - remainingBookings) / limit) * 100
  const resetDate = resetTime ? new Date(resetTime) : null
  const formattedResetDate = resetDate 
    ? format(resetDate, "d 'de' MMMM", { locale: es })
    : 'fecha no disponible'

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-600 font-normal">
              Créditos disponibles
            </span>
          </div>
          <span className="text-[11px] text-gray-600 font-medium">
            {remainingBookings}
          </span>
        </div>
        <Progress 
          value={usagePercentage} 
          className={cn(
            "h-1 bg-gray-200 rounded-full",
            usagePercentage >= 90 ? "bg-gray-900/50" : "bg-gray-300"
          )}
          indicatorClassName={cn(
            "transition-all duration-300 rounded-full",
            usagePercentage >= 90 
              ? "bg-gray-600" 
              : usagePercentage >= 75 
                ? "bg-gray-600" 
                : "bg-gray-600"
          )}
        />
        <p className="text-[11px] text-gray-400 font-normal mt-1">
          Se renuevan el {formattedResetDate}
        </p>
      </div>
    </div>
  )
} 