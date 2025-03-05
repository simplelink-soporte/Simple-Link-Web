'use client'

import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { useOnboarding } from "../../context/OnboardingContext"
import { CheckCircle2, ExternalLink, Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

const loadingMessages = [
  "Preparando tu formulario personalizado...",
  "Configurando las preferencias de tu cuenta...",
  "Aplicando los últimos ajustes..."
]

export function FinalStep() {
  const { formData } = useOnboarding()
  const router = useRouter()
  const bookingLink = 'https://reservas.miclub.com/demo-club'
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    const duration = 2500 // Duración total por mensaje
    const interval = 10 // Intervalo de actualización
    const steps = duration / interval
    let currentStep = 0

    const progressInterval = setInterval(() => {
      currentStep++
      setProgress(currentStep / steps)

      if (currentStep >= steps) {
        if (currentMessageIndex < loadingMessages.length - 1) {
          setCurrentMessageIndex(prev => prev + 1)
          currentStep = 0
        } else {
          clearInterval(progressInterval)
          setTimeout(() => setIsComplete(true), 300)
        }
      }
    }, interval)

    return () => clearInterval(progressInterval)
  }, [currentMessageIndex])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
      <AnimatePresence mode="wait">
        {!isComplete ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-8 max-w-md"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentMessageIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-5"
              >
                <motion.div className="relative shrink-0">
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 50 50"
                  >
                    <motion.circle
                      className="text-gray-100"
                      strokeWidth="5"
                      stroke="currentColor"
                      fill="transparent"
                      r="20"
                      cx="25"
                      cy="25"
                    />
                    <motion.circle
                      className="text-gray-400/60"
                      strokeWidth="5"
                      strokeDasharray={126}
                      strokeDashoffset={126 * (1 - progress)}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                      r="20"
                      cx="25"
                      cy="25"
                    />
                  </svg>
                </motion.div>
                <p className="text-[15px] text-gray-400/80">
                  {loadingMessages[currentMessageIndex]}
                </p>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-6"
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
              className="space-y-6 text-center"
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">
                  ¡Todo listo para comenzar!
                </h2>
                <p className="text-sm text-gray-500">
                  {isRedirecting 
                    ? 'Redirigiendo al inicio de sesión...'
                    : 'Serás redirigido al inicio de sesión en unos momentos.'}
                </p>
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border bg-white shadow-sm">
                <span className="text-sm text-gray-600">{bookingLink}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-transparent"
                  onClick={() => window.open(bookingLink, '_blank')}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-2 md:hidden">
                  Ingresa a Simple-Link desde computadora para acceder al Panel
                </p>
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => router.push('/admin/dashboard/bookings/reservations')}
                >
                  Ir al Panel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
