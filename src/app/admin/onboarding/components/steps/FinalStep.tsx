'use client'

import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { useOnboarding } from "../../context/OnboardingContext"
import { CheckCircle2, ExternalLink, Check, Copy } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { onboardingService } from "@/services/onboardingService"
import { toast } from "sonner"

const loadingMessages = [
  "Preparando tu formulario personalizado...",
  "Configurando las preferencias de tu cuenta...",
  "Aplicando los últimos ajustes..."
]

export function FinalStep() {
  const { generatedLink, isGeneratingLink, formData, isStripeConnected } = useOnboarding()
  const [copied, setCopied] = useState(false)
  const router = useRouter()
  const { signOut } = useAuth()
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [isCompletingOnboarding, setIsCompletingOnboarding] = useState(false)

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

  const handleCopy = async () => {
    if (!generatedLink) return
    
    try {
      // Construir la URL completa
      const baseUrl = window.location.origin
      const fullUrl = `${baseUrl}${generatedLink}`
      
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Error al copiar:", err)
    }
  }

  // Helper function to mark onboarding as complete before navigation
  const completeOnboardingAndNavigate = async (destination: string) => {
    try {
      setIsCompletingOnboarding(true)
      
      // Actualizar el estado del onboarding a "Completo"
      if (formData.empresaId) {
        console.log('📍 Actualizando estado del onboarding a Completo')
        const { error } = await onboardingService.updateOnboardingStep(formData.empresaId, 'Completo')
        
        if (error) {
          console.error('Error al actualizar estado del onboarding:', error)
          toast.error('Error al finalizar el proceso. Por favor, inténtalo de nuevo.')
          setIsCompletingOnboarding(false)
          return
        }
        
        console.log('✅ Estado del onboarding actualizado a Completo')
      } else {
        console.error('No se encontró el ID de la empresa')
        toast.error('Error al finalizar el proceso. No se encontró la empresa.')
        setIsCompletingOnboarding(false)
        return
      }
      
      // Navegar al destino
      router.push(destination)
    } catch (error) {
      console.error('Error al finalizar el onboarding:', error)
      toast.error('Error al finalizar el proceso. Por favor, inténtalo de nuevo.')
      setIsCompletingOnboarding(false)
    }
  }

  const handleCompleteOnboarding = async () => {
    try {
      setIsRedirecting(true)
      setIsCompletingOnboarding(true)
      
      // Actualizar el estado del onboarding a "Completo"
      if (formData.empresaId) {
        console.log('📍 Actualizando estado del onboarding a Completo')
        const { error } = await onboardingService.updateOnboardingStep(formData.empresaId, 'Completo')
        
        if (error) {
          console.error('Error al actualizar estado del onboarding:', error)
          toast.error('Error al finalizar el proceso. Por favor, inténtalo de nuevo.')
          setIsRedirecting(false)
          setIsCompletingOnboarding(false)
          return
        }
        
        console.log('✅ Estado del onboarding actualizado a Completo')
      } else {
        console.error('No se encontró el ID de la empresa')
        toast.error('Error al finalizar el proceso. No se encontró la empresa.')
        setIsRedirecting(false)
        setIsCompletingOnboarding(false)
        return
      }
      
      // Pequeño delay para asegurar que los datos se guardaron
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Cerrar sesión y redirigir
      await signOut()
      router.push('/admin/login')
    } catch (error) {
      console.error('Error al finalizar el onboarding:', error)
      toast.error('Error al finalizar el proceso. Por favor, inténtalo de nuevo.')
      setIsRedirecting(false)
      setIsCompletingOnboarding(false)
    }
  }

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
                animate={{ backgroundColor: "rgb(0 0 0)" }}
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
                
                {!isStripeConnected && (
                  <p className="text-sm text-amber-600 mt-2">
                    Recuerda terminar tu configuración para recibir pagos y obtener el link de reservas.
                  </p>
                )}
              </div>

              {isGeneratingLink ? (
                <div className="w-full p-4 rounded-lg border border-gray-200 bg-gray-50 mb-6">
                  <div className="flex justify-center">
                    <div className="h-5 w-5 rounded-full border-2 border-t-transparent border-gray-400 animate-spin"></div>
                    <span className="ml-2 text-sm text-gray-500">Generando enlace de reservas...</span>
                  </div>
                </div>
              ) : generatedLink ? (
                <div className="w-full mb-6">
                  <div className="mb-2">
                    <h3 className="text-sm font-medium">Enlace de reservas</h3>
                    <p className="text-xs text-gray-500">
                      Comparte este enlace para que tus clientes realicen reservas
                    </p>
                  </div>
                  
                  <button
                    onClick={handleCopy}
                    className={cn(
                      "w-full flex items-center justify-between",
                      "px-3 py-2",
                      "bg-gray-50/50 hover:bg-gray-50",
                      "rounded-lg border border-gray-200",
                      "text-sm transition-colors group mb-2"
                    )}
                  >
                    <span className="text-xs text-gray-600 truncate">
                      {window.location.origin}{generatedLink}
                    </span>
                    <div className={cn(
                      "flex items-center gap-1.5",
                      "text-gray-400 group-hover:text-gray-600"
                    )}>
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span className="text-[10px]">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span className="text-[10px]">Copiar</span>
                        </>
                      )}
                    </div>
                  </button>
                  
                  <Link
                    href={generatedLink}
                    target="_blank"
                    className={cn(
                      "w-full flex items-center justify-center gap-1.5",
                      "px-3 py-2",
                      "text-sm text-blue-600 hover:text-blue-700",
                      "rounded-lg border border-blue-100 bg-blue-50/50 hover:bg-blue-50",
                      "transition-colors"
                    )}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Abrir enlace de reservas</span>
                  </Link>
                </div>
              ) : (
                <div className="w-full p-4 rounded-lg border border-yellow-200 bg-yellow-50 mb-6">
                  <p className="text-sm text-yellow-700 text-center">
                    {!isStripeConnected 
                      ? "El enlace de reservas no está disponible porque no has conectado Stripe. Esto es necesario para procesar los pagos de tus clientes."
                      : "No se pudo generar el enlace de reservas. Por favor, contacta con soporte."}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500 mb-2 md:hidden">
                  Ingresa a Simple-Link desde computadora para acceder al Panel
                </p>
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => completeOnboardingAndNavigate('/admin/dashboard/bookings/reservations')}
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
