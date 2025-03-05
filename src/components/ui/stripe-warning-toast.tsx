"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { AlertCircle } from "lucide-react"
import { useState, useEffect } from "react"

interface StripeWarningToastProps {
  show: boolean
}

export function StripeWarningToast({ show }: StripeWarningToastProps) {
  const router = useRouter()
  const [isVisible, setIsVisible] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    // Si show es true, esperamos 2 segundos antes de mostrar el toast
    if (show) {
      const showTimer = setTimeout(() => {
        setShouldRender(true)
      }, 2000)

      // Si show cambia a true, reseteamos isVisible
      setIsVisible(true)

      return () => clearTimeout(showTimer)
    } else {
      setShouldRender(false)
      setIsVisible(false)
    }
  }, [show])

  if (!shouldRender || !isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="fixed bottom-4 right-4 z-50 max-w-sm bg-white rounded-lg shadow-lg border border-gray-100 p-4"
      >
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center"
            >
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </motion.div>
          </div>
          
          <div className="flex-1 space-y-1">
            <motion.h3 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="font-medium text-gray-900"
            >
              Conecta tu cuenta de Stripe
            </motion.h3>
            <motion.p 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-sm text-gray-500"
            >
              Para recibir pagos en línea, necesitas conectar tu cuenta de Stripe.
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-3 pt-1"
            >
              <Button
                variant="link"
                className="h-auto p-0 text-amber-600 hover:text-amber-700 text-sm"
                onClick={() => router.push('/admin/dashboard/settings?tab=integrations')}
              >
                Conectar ahora →
              </Button>
              <Button
                variant="link"
                className="h-auto p-0 text-gray-400 hover:text-gray-500 text-sm"
                onClick={() => setIsVisible(false)}
              >
                Descartar
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
} 