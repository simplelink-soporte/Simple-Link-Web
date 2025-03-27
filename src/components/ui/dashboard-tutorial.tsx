"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { IconSwimming, IconBallTennis } from "@tabler/icons-react"

interface TutorialStep {
  title: string
  description: string
  imageUrl: string
}

interface DashboardTutorialProps {
  show: boolean
  onClose?: () => void
}

export function DashboardTutorial({ show, onClose }: DashboardTutorialProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  // Tutorial steps data
  const tutorialSteps: TutorialStep[] = [
    {
      title: "Bienvenido al Panel de Administración",
      description: "Este panel te permite gestionar todos los aspectos de tu organización. Vamos a mostrarte cómo funciona.",
      imageUrl: "/images/Miroodles - Sticker 3.png"
    },
    {
      title: "Personaliza tus Instalaciones",
      description: "Puedes cambiar el tipo de pistas entre 'Raqueta' y 'Natación' usando el botón en la parte superior de la tabla de reservas. Al seleccionar un tipo, los estilos y opciones se adaptarán automáticamente.",
      imageUrl: "/images/Miroodles - Sticker 3.png"
    },
    {
      title: "Administra tus Clases",
      description: "Crea, edita y organiza las clases que ofreces. Controla asistencia y gestiona profesores.",
      imageUrl: "/images/Miroodles - Sticker 3.png"
    },
    {
      title: "Tu Opinión es Importante",
      description: "Estamos en constante mejora y tu feedback es vital para nosotros. Puedes encontrar el botón de feedback en la barra lateral izquierda para compartir tus sugerencias o reportar cualquier problema.",
      imageUrl: "/images/Miroodles - Sticker 3.png"
    }
  ]

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
    }, 300)
  }

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleClose()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    handleClose()
  }

  if (!shouldRender || !isVisible) return null

  const currentTutorialStep = tutorialSteps[currentStep]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      >
        <div className="w-[550px] bg-white rounded-2xl shadow-xl border border-zinc-100/50 max-h-[90vh] overflow-hidden">
          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-shrink-0">
                <Image
                  src={currentTutorialStep.imageUrl}
                  alt="Tutorial illustration"
                  width={80}
                  height={80}
                  className="object-contain"
                />
              </div>
              
              <div className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                Paso {currentStep + 1} de {tutorialSteps.length}
              </div>
            </div>
            
            <div className="space-y-3">
              <motion.div 
                key={`title-${currentStep}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
              >
                <h3 className="text-lg font-medium text-zinc-900 font-mono tracking-tight">
                  {currentTutorialStep.title}
                </h3>
              </motion.div>

              <motion.div 
                key={`description-${currentStep}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="space-y-3"
              >
                <p className="text-sm text-zinc-600 leading-relaxed">
                  {currentTutorialStep.description}
                </p>
                
                {currentStep === 1 && (
                  <div className="flex items-center gap-2 mt-3">
                    <div className="inline-flex items-center px-3 py-1.5 text-sm font-medium border border-orange-300 bg-orange-50 text-orange-700 rounded-md">
                      <IconBallTennis className="mr-1.5 h-4 w-4" stroke={1.5} />
                      <span>Raqueta</span>
                    </div>
                    
                    <div className="inline-flex items-center px-3 py-1.5 text-sm font-medium border border-blue-300 bg-blue-50 text-blue-700 rounded-md">
                      <IconSwimming className="mr-1.5 h-4 w-4" stroke={1.5} />
                      <span>Natación</span>
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-zinc-500 mt-1">
                  Del equipo de SimpleLink
                </p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex justify-between pt-3"
              >
                <div>
                  {currentStep > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevious}
                      className="text-xs text-gray-600 mr-2"
                    >
                      Anterior
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSkip}
                    className="text-xs text-gray-600"
                  >
                    Omitir
                  </Button>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleNext}
                  className="text-xs"
                >
                  {currentStep < tutorialSteps.length - 1 ? "Siguiente" : "Finalizar"}
                </Button>
              </motion.div>
            </div>
          </div>
          
          {/* Progress indicators */}
          <div className="flex justify-center space-x-1 pb-4">
            {tutorialSteps.map((_, index) => (
              <div 
                key={index}
                className={`h-1 rounded-full transition-all duration-300 ${
                  index === currentStep 
                    ? "w-6 bg-blue-500" 
                    : "w-3 bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
