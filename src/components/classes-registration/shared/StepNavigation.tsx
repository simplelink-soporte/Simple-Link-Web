import { motion } from 'framer-motion'
import { IconChevronRight } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { useClassRegistration } from '../context/ClassRegistrationContext'
import type { Step } from '../types/registration'

interface StepNavigationProps {
  onNext?: () => Promise<void> | void
  onBack?: () => void
  nextLabel?: string
  showBack?: boolean
  showNext?: boolean
  isNextDisabled?: boolean
  isProcessing?: boolean
}

const STEP_CONFIG: Record<Step, { backStep?: Step; nextStep?: Step }> = {
  'auth': { nextStep: 'package' },
  'package': { nextStep: 'class' },
  'class': { backStep: 'package', nextStep: 'session' },
  'session': { backStep: 'class', nextStep: 'summary' },
  'summary': { backStep: 'session', nextStep: 'confirmation' },
  'confirmation': { backStep: 'summary' },
  'noCredits': { backStep: 'class' } // Permitir volver al paso de selección de clase
}

export function StepNavigation({
  onNext,
  onBack,
  nextLabel = 'Continuar',
  showBack = true,
  showNext = true,
  isNextDisabled = false,
  isProcessing = false
}: StepNavigationProps) {
  const { state, goToStep } = useClassRegistration()
  const currentStep = state.step
  // Asegurarnos de que config exista, si no, crear un objeto vacío por defecto
  const config = STEP_CONFIG[currentStep] || { backStep: undefined, nextStep: undefined }

  // Determinar el estilo y texto del botón según el paso actual
  const isPackageStep = currentStep === 'package'
  const buttonLabel = isPackageStep ? 'No, gracias' : nextLabel

  const handleNext = async () => {
    if (isProcessing || isNextDisabled) return
    
    try {
      console.log('Ejecutando navegación al siguiente paso')
      
      // Si estamos en el paso summary, emitimos el evento para crear la reserva
      if (currentStep === 'summary') {
        console.log('📌 Emitiendo evento para crear reserva desde StepNavigation')
        const event = new CustomEvent('create-class-reservation')
        window.dispatchEvent(event)
        
        // Si hay un manejador personalizado, lo ejecutamos también
        if (onNext) {
          await onNext()
        }
        // No navegamos automáticamente - la navegación ocurrirá en SummaryStep
        // después de procesar exitosamente la reserva
        return
      }
      
      // Para otros pasos, comportamiento normal
      if (onNext) {
        await onNext()
      } else if (config.nextStep) {
        goToStep(config.nextStep)
      }
    } catch (error) {
      console.error('Error al navegar al siguiente paso:', error)
    }
  }

  const handleBack = () => {
    if (isProcessing) return
    
    try {
      console.log('Ejecutando navegación al paso anterior')
      if (onBack) {
        onBack()
      } else if (config.backStep) {
        goToStep(config.backStep)
      }
    } catch (error) {
      console.error('Error al navegar al paso anterior:', error)
    }
  }

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0",
      "bg-gradient-to-t from-white via-white/95 to-transparent",
      "backdrop-blur-md",
      "py-6 px-4 sm:px-6 lg:px-8",
      "z-10"
    )}>
      <div className="w-full max-w-[var(--container-default)] mx-auto">
        <div className="flex flex-col items-center gap-3 max-w-sm mx-auto">
          {showNext && (
            <motion.button
              onClick={handleNext}
              disabled={isNextDisabled || isProcessing}
              whileHover={{ scale: isPackageStep ? 1 : 1.02 }}
              whileTap={{ scale: isPackageStep ? 0.98 : 0.98 }}
              className={cn(
                "w-full",
                "px-6 py-3 rounded-xl",
                !isPackageStep && [
                  "bg-gray-900 text-white",
                  "hover:bg-gray-800",
                ],
                isPackageStep && [
                  "bg-transparent",
                  "text-gray-500 hover:text-gray-700",
                ],
                "transition-all duration-200",
                "flex items-center justify-center gap-2",
                "text-sm font-medium",
                (isNextDisabled || isProcessing) && "opacity-50 cursor-not-allowed"
              )}
            >
              <span>{buttonLabel}</span>
              {!isNextDisabled && !isProcessing && !isPackageStep && (
                <IconChevronRight size={16} className="text-white/70" />
              )}
            </motion.button>
          )}

          {showBack && config?.backStep && (
            <motion.button
              onClick={handleBack}
              disabled={isProcessing}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "text-sm text-gray-500 hover:text-gray-900",
                "transition-colors duration-200",
                "py-1 px-4",
                "rounded-lg",
                "hover:bg-gray-50",
                isProcessing && "opacity-50 cursor-not-allowed"
              )}
            >
              <span>Volver</span>
            </motion.button>
          )}
        </div>
      </div>
    </div>
  )
}
