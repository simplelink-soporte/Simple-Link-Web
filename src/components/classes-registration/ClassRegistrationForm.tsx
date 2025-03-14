"use client"

import { useEffect } from 'react'
import { useClasses } from './hooks'
import { StepRenderer } from './steps/StepRenderer'
import { useClassRegistration } from './context'
import { LoadingSpinner } from './shared/LoadingSpinner'
import { ErrorMessage } from './shared/ErrorMessage'
import { StepContainer } from './shared/StepContainer'
import { StepNavigation } from './shared/StepNavigation'
import type { Step } from './types/registration'
import { useRouter } from 'next/navigation'
import { LinkService } from './services/linkService'
import { cn } from '@/lib/utils'
import { NoCreditsClass } from './steps/noCreditsClass'
import { LoadingState } from './shared/LoadingState'

const linkService = new LinkService()

interface ClassRegistrationFormProps {
  selectedClassId?: string
}

export function ClassRegistrationForm({ selectedClassId }: ClassRegistrationFormProps) {
  const { state, isLoading, organization, goToStep, dispatch, selectClass } = useClassRegistration()
  const { classes = [], isLoading: isLoadingClasses } = useClasses(organization?.id || '')
  const router = useRouter()

  // Efecto para manejar el acceso directo a una clase
  useEffect(() => {
    const initializeWithClass = async () => {
      if (selectedClassId && classes.length > 0) {
        const selectedClass = classes.find(c => c.id === selectedClassId)
        if (selectedClass) {
          // Solo activamos skipPackage si accedemos directamente a una clase
          dispatch({ type: 'SET_SKIP_PACKAGE', payload: true })
          await selectClass(selectedClass)
          dispatch({ type: 'SET_STEP', payload: 'session' })
        }
      }
    }

    initializeWithClass()
  }, [selectedClassId, classes, selectClass, dispatch])

  // Modificamos este efecto para ser más específico
  useEffect(() => {
    if (!selectedClassId && state.step === 'class' && state.selectedClass) {
      // Solo mantenemos skipPackage en true si venimos de una sesión
      dispatch({ type: 'SET_SKIP_PACKAGE', payload: true })
    }
  }, [selectedClassId, state.step, state.selectedClass, dispatch])

  // Estado de carga
  if (isLoading || isLoadingClasses) {
    return (
      <StepContainer stepId="loading" centered>
        <LoadingState 
          message="Cargando información..." 
          fullScreen={false}
          className="py-8" 
        />
      </StepContainer>
    )
  }

  // Estado de error
  if (!organization) {
    return (
      <StepContainer stepId="error" centered>
        <ErrorMessage 
          error={{ 
            type: 'LOAD_ERROR', 
            message: 'No se pudo cargar la información de la organización. Por favor, intenta nuevamente.' 
          }} 
        />
      </StepContainer>
    )
  }

  // Configuración de navegación para cada paso
  const getStepConfig = (currentStep: Step) => {
    const config = {
      showBack: true,
      showNext: true,
      isNextDisabled: false,
      nextLabel: 'Continuar',
      onNext: undefined as (() => void) | undefined,
      onBack: undefined as (() => void) | undefined
    }

    switch (currentStep) {
      case 'auth':
        config.showBack = false
        config.nextLabel = 'Comenzar'
        config.onNext = () => goToStep('package')
        break
      case 'package':
        config.showBack = false
        config.nextLabel = state.selectedPackage ? 'Continuar' : 'Continuar sin paquete'
        config.onNext = () => {
          if (!state.selectedPackage) {
            dispatch({ type: 'SET_SKIP_PACKAGE', payload: true })
          }
          goToStep('class')
        }
        break
      case 'class':
        config.isNextDisabled = !state.selectedClass
        config.onNext = async () => {
          if (!state.selectedClass || !organization.id) {
            console.warn('Falta información necesaria para continuar')
            return
          }

          try {
            // Obtener el slug de la organización
            const companyLink = await linkService.getCompanyLink(organization.id)
            if (!companyLink?.slug) {
              console.error('No se encontró el slug de la organización')
              return
            }

            // Solo navegamos, el cambio de paso se manejará por la URL
            const newUrl = `/clases/${companyLink.slug}/${state.selectedClass.id}`
            await router.push(newUrl)
          } catch (error) {
            console.error('Error al navegar:', error)
          }
        }
        config.onBack = () => goToStep('package')
        break
      case 'session':
        config.isNextDisabled = state.selectedSessions.length === 0
        config.onNext = () => goToStep('summary')
        config.onBack = async () => {
          try {
            // Primero obtenemos el slug de la empresa
            if (selectedClassId && organization?.id) {
              const companyLink = await linkService.getCompanyLink(organization.id)
              if (!companyLink?.slug) {
                console.error('No se encontró el slug de la organización')
                return
              }

              // Aseguramos que el estado se mantenga en el paso de clases
              dispatch({ type: 'SET_SKIP_PACKAGE', payload: true })
              dispatch({ type: 'SET_STEP', payload: 'class' })

              // Navegamos usando el slug después de actualizar el estado
              const baseUrl = `/clases/${companyLink.slug}`
              await router.push(baseUrl)
            }
          } catch (error) {
            console.error('Error al navegar hacia atrás:', error)
          }
        }
        break
      case 'summary':
        config.onBack = () => goToStep('session')
        // El onNext se maneja en el SummaryStep a través del evento create-class-reservation
        config.nextLabel = 'Confirmar reserva'
        break
      case 'confirmation':
        config.showNext = false
        config.onBack = () => goToStep('summary')
        break
      case 'noCredits':
        config.showNext = false
        config.onBack = () => goToStep('class')
        break
    }

    return config
  }

  const stepConfig = getStepConfig(state.step)

  // Si el usuario no tiene créditos
  if (state.step === 'noCredits') {
    return (
      <div className={cn(
        "relative min-h-screen",
        "w-full",
        "flex flex-col",
        "overflow-hidden"
      )}>
        <div className={cn(
          "flex-1",
          // Evitamos el overflow-y-auto aquí para evitar duplicación de scroll
          "overflow-hidden"
        )}>
          <NoCreditsClass />
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "relative min-h-screen",
      "w-full",
      "flex flex-col",
      "overflow-hidden"
    )}>
      <div className={cn(
        "flex-1",
        // Evitamos el overflow-y-auto aquí para evitar duplicación de scroll
        "overflow-hidden"
      )}>
        <StepRenderer />
      </div>

      {/* Navegación entre pasos */}
      <StepNavigation
        onNext={stepConfig.onNext}
        onBack={stepConfig.onBack}
        nextLabel={stepConfig.nextLabel}
        showBack={stepConfig.showBack}
        showNext={stepConfig.showNext}
        isNextDisabled={stepConfig.isNextDisabled}
      />
    </div>
  )
}
