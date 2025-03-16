"use client"

import { useEffect, useState } from 'react'
import { useClassRegistration } from './context'
import { useClasses } from './hooks'
import { StepRenderer } from './steps/StepRenderer'
import { LoadingSpinner } from './shared/LoadingSpinner'
import { ErrorMessage } from './shared/ErrorMessage'
import { StepContainer } from './shared/StepContainer'
import { LoadingState } from './shared/LoadingState'
import type { Step } from './context/ClassRegistrationContext'
import { useRouter } from 'next/navigation'
import { LinkService } from './services/linkService'
import { cn } from '@/lib/utils'
import { NoCreditsClass } from './steps/noCreditsClass'
import { StepNavigation } from './shared/StepNavigation'
import { createClassRegistrationError } from './types/error'

const linkService = new LinkService()

interface ClassRegistrationFormProps {
  selectedClassId?: string
}

export function ClassRegistrationForm({ selectedClassId }: ClassRegistrationFormProps) {
  const { state, isLoading, organization, goToStep, dispatch, selectClass } = useClassRegistration()
  const { classes = [], isLoading: isLoadingClasses } = useClasses(organization?.id || '')
  const router = useRouter()
  // Estado para detectar si es un dispositivo móvil
  const [isMobile, setIsMobile] = useState(false)
  // Estado para rastrear la vista actual del SummaryStep en móvil
  const [summaryMobileView, setSummaryMobileView] = useState<'details' | 'payment'>('details')

  // Efecto para detectar si es un dispositivo móvil
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    // Verificar de inmediato
    checkIsMobile()
    
    // Configurar listener para cambios de tamaño
    window.addEventListener('resize', checkIsMobile)
    
    return () => {
      window.removeEventListener('resize', checkIsMobile)
    }
  }, [])
  
  // Efecto para rastrear cambios en el localStorage para summaryStepMobileView
  useEffect(() => {
    const checkMobileView = () => {
      try {
        const storedView = localStorage.getItem('summaryStepMobileView')
        if (storedView === 'details' || storedView === 'payment') {
          setSummaryMobileView(storedView)
        }
      } catch (error) {
        console.warn('Error al leer summaryStepMobileView de localStorage:', error)
      }
    }
    
    // Verificar de inmediato
    checkMobileView()
    
    // Configurar un intervalo para verificar periódicamente
    const interval = setInterval(checkMobileView, 300)
    
    return () => {
      clearInterval(interval)
    }
  }, [])

  // Efecto para manejar el acceso directo a una clase
  useEffect(() => {
    const initializeWithClass = async () => {
      if (selectedClassId && classes.length > 0) {
        // Indicamos que estamos cargando usando el estado local del componente
        // en lugar de un estado global que no existe en el reducer
        const selectedClass = classes.find(c => c.id === selectedClassId);
        
        if (selectedClass) {
          try {
            // Solo activamos skipPackage si accedemos directamente a una clase
            dispatch({ type: 'SET_SKIP_PACKAGE', payload: true });
            
            // Creamos una versión básica de la clase sin sesiones para que
            // luego SessionStep pueda cargarlas paginadas
            const classWithoutSessions = {
              ...selectedClass,
              sessions: [] // Inicializamos con array vacío para forzar la carga paginada
            };
            
            // Seleccionar la clase (esto cargará la información básica sin generar sesiones)
            await selectClass(classWithoutSessions);
            
            // Modificar para ir al paso de sesiones directamente
            dispatch({ type: 'SET_STEP', payload: 'session' as Step });
          } catch (error) {
            console.error('Error al inicializar con la clase seleccionada:', error);
            // Mostrar un error si algo sale mal
            dispatch({ 
              type: 'SET_ERROR', 
              payload: createClassRegistrationError(
                'LOAD_ERROR',
                'No pudimos cargar la clase seleccionada. Por favor, intenta de nuevo.'
              )
            });
          }
        }
      }
    };

    initializeWithClass();
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
            // Si venimos de un enlace directo, vamos al paso de clases
            if (organization?.id) {
              // Navegación normal al paso de clases
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
        config.nextLabel = isMobile && summaryMobileView === 'details' ? 'Continuar' : 'Confirmar reserva'
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
      <div className="h-full overflow-hidden relative">
        <NoCreditsClass />
      </div>
    )
  }

  return (
    <div className="h-full overflow-hidden relative">
      <StepRenderer />
      {['auth', 'package', 'session', 'summary', 'payment', 'confirmation', 'noCredits'].includes(state.step) && (
        <div className="mt-8">
          <StepNavigation
            onNext={stepConfig.onNext}
            onBack={stepConfig.onBack}
            nextLabel={stepConfig.nextLabel}
            showBack={stepConfig.showBack}
            showNext={stepConfig.showNext}
            isNextDisabled={stepConfig.isNextDisabled}
          />
        </div>
      )}
    </div>
  )
}
