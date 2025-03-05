'use client'

import { motion } from "framer-motion"
import { Check } from "lucide-react"
import { useEffect, useState } from "react"

interface SuccessPaymentProps {
  onComplete: () => void
}

export function SuccessPayment({ onComplete }: SuccessPaymentProps) {
  const [progress, setProgress] = useState(0)
  const DURATION = 5000 // 5 segundos de duración

  useEffect(() => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsedTime = Date.now() - startTime
      const newProgress = Math.min((elapsedTime / DURATION) * 100, 100)
      setProgress(newProgress)

      if (elapsedTime >= DURATION) {
        clearInterval(interval)
        onComplete()
      }
    }, 50)

    return () => clearInterval(interval)
  }, [onComplete])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-6 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ 
            type: "spring",
            stiffness: 200,
            damping: 15
          }}
        >
          <motion.div 
            initial={{ backgroundColor: "rgb(243 244 246)" }}
            animate={{ backgroundColor: "rgb(34 197 94)" }}
            transition={{ duration: 0.3 }}
            className="rounded-full p-2"
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Check className="h-6 w-6 text-white" />
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <h2 className="text-2xl font-semibold tracking-tight">
            ¡Gracias por elegir el Plan Pro de SimpleLink!
          </h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Estamos preparando todo para que puedas comenzar a disfrutar de todas las funcionalidades premium.
            Muchas gracias por tu confianza.
          </p>
        </motion.div>

        {/* Barra de progreso */}
        <motion.div className="w-full max-w-[200px] h-1 bg-gray-100 rounded-full overflow-hidden mt-4">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1, ease: "linear" }}
          />
        </motion.div>
      </motion.div>
    </div>
  )
} 