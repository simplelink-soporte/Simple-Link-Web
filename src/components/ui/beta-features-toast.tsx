"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useState, useEffect } from "react"

interface BetaFeaturesProps {
  show: boolean
  featureName: string
  onClose?: () => void
}

export function BetaFeaturesNotification({ 
  show, 
  featureName,
  onClose 
}: BetaFeaturesProps) {
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
    setTimeout(() => {
      onClose?.()
    }, 300);
  }

  const handleGoToFeedback = () => {
    // Cerrar primero el toast
    handleClose()
    
    // Navegar a la página de feedback
    window.location.href = '/admin/dashboard/feedback'
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
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-shrink-0">
              <Image
                src="/images/Miroodles - Sticker 3.png"
                alt="Beta features illustration"
                width={80}
                height={80}
                className="object-contain"
              />
            </div>
            
            <div className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
              BETA
            </div>
          </div>
          
          <div className="space-y-3">
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="text-lg font-medium text-zinc-900 font-mono tracking-tight">
                ¡{featureName} ahora en versión Beta!
              </h3>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-3"
            >
              <p className="text-sm text-zinc-600 leading-relaxed">
                Estamos emocionados de lanzar esta nueva funcionalidad en fase beta. 
                Seguimos trabajando para mejorarla y añadir nuevas características.
              </p>
              
              <p className="text-sm text-zinc-600 leading-relaxed">
                Tu opinión es muy importante para nosotros. Si encuentras algún problema 
                o tienes sugerencias para mejorar, háznoslo saber a través del formulario 
                de feedback.
              </p>
              
              <p className="text-xs text-zinc-500 mt-1">
                Del equipo de SimpleLink
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap gap-2 pt-1"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={handleClose}
                className="text-xs text-gray-600"
              >
                Entendido
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
