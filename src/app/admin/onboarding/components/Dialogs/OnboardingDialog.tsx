'use client'

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { ArrowRight } from "lucide-react"
import { useState, useEffect } from "react"

const stepContent = [
  {
    title: "Bienvenido a la sección de configuración",
    description: "Configura tu club de pádel en unos sencillos pasos y comienza a gestionar tus reservas y obtener tu link propio.",
    image: "/images/Miroodles - Mono Comp.png"
  },
  {
    title: "Configura tus Sedes",
    description: "Añade los detalles de tu sedes, horarios y pistas disponibles para empezar a recibir reservas.",
    image: "/images/Miroodles - Sticker.png"
  },
  {
    title: "Gestiona los Pagos",
    description: "Conecta tu cuenta bancaria y configura Stripe para procesar pagos de forma segura.",
    image: "/images/Miroodles - Sticker 5.png"
  },
  {
    title: "¡Listo para Empezar!",
    description: "Una vez completada la configuración, podrás comenzar a utilizar tu link propio para recibir reservas",
    image: "/images/Miroodles - No credits.png"
  },
]

export function OnboardingDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(1)
  const totalSteps = stepContent.length

  useEffect(() => {
    // Verificar si es la primera visita
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding')
    if (!hasSeenOnboarding) {
      setIsOpen(true)
      localStorage.setItem('hasSeenOnboarding', 'true')
    }
  }, [])

  const handleContinue = () => {
    if (step < totalSteps) {
      setStep(step + 1)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    localStorage.setItem('hasSeenOnboarding', 'true')
  }

  return (
    <Dialog 
      open={isOpen}
      onOpenChange={handleClose}
    >
      <DialogContent 
        className="gap-0 p-0 bg-white border-none shadow-2xl max-w-xl"
      >
        <div className="p-4">
          <div className="flex justify-start">
            <img 
              src={stepContent[step - 1].image}
              alt={stepContent[step - 1].title}
              className="w-32 h-32 rounded-lg object-cover"
            />
          </div>
        </div>
        <div className="space-y-6 px-6 pb-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">{stepContent[step - 1].title}</DialogTitle>
            <DialogDescription className="text-gray-600">{stepContent[step - 1].description}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex justify-center space-x-1.5 max-sm:order-1">
              {[...Array(totalSteps)].map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full transition-colors duration-200",
                    index + 1 === step ? "bg-black" : "bg-gray-200"
                  )}
                />
              ))}
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="ghost" 
                onClick={handleClose}
                className="text-gray-500 hover:text-gray-900"
              >
                Omitir
              </Button>
              {step < totalSteps ? (
                <Button 
                  className="bg-black text-white hover:bg-black/90" 
                  type="button" 
                  onClick={handleContinue}
                >
                  Siguiente
                </Button>
              ) : (
                <Button 
                  type="button" 
                  onClick={handleClose}
                  className="bg-black text-white hover:bg-black/90"
                >
                  Entendido
                </Button>
              )}
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}