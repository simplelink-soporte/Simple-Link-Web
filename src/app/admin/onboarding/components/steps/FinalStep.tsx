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
import { AnimatedLinkButton } from "@/components/ui/animated-link-button"

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
      
      // Pequeño delay para asegurar que los datos se guardaron
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Cerrar sesión antes de navegar para que los datos se carguen correctamente
      await signOut()
      
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center max-w-md w-full"
          >
            <motion.div
              className="bg-green-50/80 text-green-600 rounded-full p-3 mb-6"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 150 }}
            >
              <CheckCircle2 className="h-8 w-8" />
            </motion.div>
            
            <div className="space-y-2 mb-8">
              <h2 className="text-2xl font-semibold tracking-tight">
                ¡Todo listo para comenzar!
              </h2>
              {!isStripeConnected && (
                <p className="text-sm text-gray-500 mt-1.5 font-normal">
                  Tu enlace de reservas está activo pero no permite pagos online. Para habilitar más opciones, conecta Stripe.
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
                <div className="mb-2 text-left">
                  <h3 className="text-sm font-medium">Enlace de reservas</h3>
                  <p className="text-xs text-gray-500">
                    Comparte este enlace para que tus clientes realicen reservas
                  </p>
                </div>
                
                {/* Contenedor de enlace con botones integrados */}
                <div className="flex items-center w-full rounded-lg border border-gray-200 bg-gray-50/60 overflow-hidden mb-2">
                  {/* Texto del enlace */}
                  <div className="flex-grow px-3 py-2 text-left truncate">
                    <span className="text-xs text-gray-600">
                      {window.location.origin}{generatedLink}
                    </span>
                  </div>
                  
                  {/* Botones de acción integrados */}
                  <div className="flex border-l border-gray-200">
                    <button
                      onClick={handleCopy}
                      className="flex items-center px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100/80 transition-colors"
                    >
                      {copied ? "Copiado" : "Copiar"}
                    </button>
                    
                    <Link
                      href={generatedLink}
                      target="_blank"
                      className="flex items-center px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100/80 transition-colors border-l border-gray-200"
                    >
                      Abrir
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full p-4 rounded-lg border border-gray-200 bg-gray-50/80 mb-6">
                <p className="text-sm text-gray-600 text-center">
                  No se pudo generar el enlace de reservas. Por favor, contacta con soporte.
                </p>
              </div>
            )}

            <div>
              <p className="text-sm text-gray-500 mb-2 md:hidden">
                Ingresa a Simple-Link desde computadora para acceder al Panel
              </p>
              
              <Button
                variant="default"
                className="w-full"
                onClick={() => completeOnboardingAndNavigate('/')}
                disabled={isCompletingOnboarding}
              >
                {isCompletingOnboarding ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-gray-400 animate-spin mr-2"></div>
                    Redirigiendo...
                  </>
                ) : "Ir al Panel"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
