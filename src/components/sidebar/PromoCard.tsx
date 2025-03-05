"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { BookingLimitStatus } from "@/components/booking/BookingLimitStatus"
import { useBookingCount } from '@/hooks/useBookingCount'
import { Zap } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { useDeferredValue, useEffect, useState } from "react"

interface PromoCardProps {
  className?: string
}

export function PromoCard({ className }: PromoCardProps) {
  const router = useRouter()
  const { user } = useAuth()
  const today = new Date().toISOString().split('T')[0]
  const [shouldRender, setShouldRender] = useState(false)
  
  const { 
    isPro, 
    isLoading, 
    error 
  } = useBookingCount({ 
    empresaId: user?.metadata?.empresa_id || '', 
    date: today 
  })

  // Usar useDeferredValue para suavizar la transición
  const deferredIsPro = useDeferredValue(isPro)

  // Efecto para controlar cuándo mostrar el componente
  useEffect(() => {
    if (!isLoading && !error) {
      // Solo actualizar shouldRender si no es PRO
      setShouldRender(!deferredIsPro)
    }
  }, [isLoading, error, deferredIsPro])

  // No mostrar nada durante la carga inicial o si hay error
  if (isLoading || error || !user?.metadata?.empresa_id) return null

  // No renderizar si no debemos mostrar el componente
  if (!shouldRender) return null

  const handleUpgradeClick = () => {
    router.push('/admin/dashboard/upgrade')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      className={cn("px-3 mb-4", className)}
    >
      <motion.div 
        onClick={handleUpgradeClick}
        className={cn(
          "p-3.5 rounded-xl",
          "bg-zinc-50/80",
          "border border-zinc-200/50",
          "cursor-pointer hover:bg-zinc-100/80",
          "transition-all duration-200",
          "group"
        )}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-start">
            <div className="p-1.5 rounded-lg bg-zinc-100 group-hover:bg-zinc-200/80 transition-colors">
              <Zap className="h-3.5 w-3.5 text-zinc-600" />
            </div>
            <div className="flex-1 ml-2.5">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-zinc-900 font-mono tracking-tight">
                  Upgrade
                </h4>
              </div>
              <p className="text-xs text-zinc-600 font-mono mt-0.5 leading-relaxed">
                Obtenga acceso Pro | Simple Link
              </p>
            </div>
          </div>
          <BookingLimitStatus 
            empresaId={user.metadata.empresa_id} 
            date={today}
            className="pt-2 border-t border-zinc-200/50"
          />
        </div>
      </motion.div>
    </motion.div>
  )
} 