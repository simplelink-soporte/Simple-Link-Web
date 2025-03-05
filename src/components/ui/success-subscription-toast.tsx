"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useState, useEffect } from "react"

interface SuccessSubscriptionToastProps {
  show: boolean
  planName: string
  onClose?: () => void
}

export function SuccessSubscriptionToast({ 
  show, 
  planName,
  onClose 
}: SuccessSubscriptionToastProps) {
  const router = useRouter()
  const [isVisible, setIsVisible] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    if (show) {
      const showTimer = setTimeout(() => {
        setShouldRender(true)
      }, 500)

      setIsVisible(true)

      return () => clearTimeout(showTimer)
    } else {
      setShouldRender(false)
      setIsVisible(false)
    }
  }, [show])

  const handleClose = () => {
    setIsVisible(false)
    onClose?.()
  }

  const handleGoToSettings = () => {
    // Cerrar primero el toast
    handleClose()
    
    // Navegar a la página de settings usando window.location para forzar un refresco completo
    window.location.href = '/admin/dashboard/settings?tab=company'
  }

  if (!shouldRender || !isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="fixed bottom-4 right-4 z-50 w-[480px] bg-white rounded-2xl shadow-xl border border-zinc-100/50"
      >
        <div className="p-8 space-y-6">
          <div className="flex-shrink-0 -ml-2">
            <Image
              src="/images/Miroodles - Sticker 2.png"
              alt="Celebration illustration"
              width={100}
              height={100}
              className="object-contain"
            />
          </div>
          
          <div className="space-y-4">
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="text-xl font-medium text-zinc-900 font-mono tracking-tight">
                ¡Bienvenido a {planName}!
              </h3>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-4"
            >
              <p className="text-sm text-zinc-600 font-mono leading-relaxed">
                Gracias por confiar en nosotros para ayudarte a hacer crecer tu negocio. 
                Tu suscripción se ha activado correctamente y ahora tienes acceso a todas 
                las funcionalidades premium.
              </p>
              
              <p className="text-sm text-zinc-500 font-mono">
                Del equipo de SimpleLink
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-4 pt-2"
            >
              <Button
                variant="link"
                className="h-auto p-0 text-zinc-900 hover:text-zinc-700 text-sm font-mono"
                onClick={handleGoToSettings}
              >
                Ver detalles de la suscripción →
              </Button>
              <Button
                variant="link"
                className="h-auto p-0 text-zinc-400 hover:text-zinc-500 text-sm font-mono"
                onClick={handleClose}
              >
                Cerrar
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
} 