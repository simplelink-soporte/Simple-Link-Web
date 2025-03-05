"use client"

import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { CheckCircle2 } from "lucide-react"

interface OnboardingCompletedWarningProps {
  show: boolean
}

export function OnboardingCompletedWarning({ show }: OnboardingCompletedWarningProps) {
  const router = useRouter()

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className={cn(
              "relative w-full max-w-[400px]",
              "bg-white rounded-xl px-6 py-6",
              "shadow-2xl",
              "flex flex-col items-center",
              "mx-auto"
            )}
          >
            <div className="w-12 h-12 mb-4 bg-green-50 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              ¡Onboarding Completado!
            </h3>
            
            <p className="text-sm text-gray-600 text-center max-w-[300px] mb-6">
              Ya has completado la configuración inicial de tu cuenta. Puedes acceder a todas las funcionalidades desde el panel de control.
            </p>
            
            <Button
              onClick={() => router.push('/admin/dashboard/bookings/reservations')}
              variant="link"
              className="h-auto p-0 text-gray-900 hover:text-gray-700 transition-colors"
            >
              Ir al Panel de Reservas →
            </Button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
} 