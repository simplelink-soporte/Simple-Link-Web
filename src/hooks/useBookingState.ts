import { useState, useCallback, useRef, useEffect } from 'react'
import type { 
  BookingStep,
  TimeSelection,
  ClassPaymentConfig,
  BookingType,
  ClassDetails,
  BookingState
} from '@/components/bookings/components/NewBookingModal/types'

interface BookingStateConfig {
  initialBookingType: BookingType
  disableTypeSelection?: boolean
  initialStep: BookingStep
}

// Definir los pasos para cada tipo de reserva
const STEPS_BY_TYPE = {
  class: [
    'class-details',
    'class-schedule',
    'payment',
    'confirmation'
  ],
  shift: [
    'participants',
    'rentals',
    'payment',
    'confirmation'
  ]
} as const

// Función pura de validación
function validateBookingStep(state: BookingState, step: BookingStep): boolean {
  switch (step) {
    case 'class-details':
      return !!state.classDetails?.name?.trim()
    case 'class-schedule':
      return state.scheduleConfig.timeSlots.length > 0
    case 'payment':
      return !!state.classPaymentConfig.paymentMethods?.length
    case 'confirmation':
      return true
    default:
      return false
  }
}

const initialState: BookingState = {
  currentStep: 'class-details',
  selectedBookingType: 'class',
  selectedDate: undefined,
  selectedCourts: [],
  timeSelection: undefined,
  classDetails: {
    name: '',
    description: '',
    visibility: 'public'
  },
  classPaymentConfig: {
    pricePerSession: 0,
    currency: 'EUR',
    paymentMethods: [], // Inicializar con array vacío para que solo se incluyan los métodos seleccionados
    paymentStatus: 'pending',
    availableMethods: [
      {
        id: 'cash',
        name: 'Efectivo',
        icon: 'cash'
      },
      {
        id: 'card',
        name: 'Tarjeta',
        icon: 'card'
      },
      {
        id: 'transfer',
        name: 'Transferencia',
        icon: 'transfer'
      }
    ]
  },
  scheduleConfig: {
    isRecurring: false,
    startDate: undefined,
    endDate: undefined,
    weekDays: [],
    timeSlots: []
  },
  isStepValid: false
}

export function useBookingState(config?: BookingStateConfig) {
  // Mantener una referencia a la configuración inicial
  const configRef = useRef(config)
  
  // Estado inicial memoizado
  const [state, setState] = useState(() => {
    const initialConfig = configRef.current
    if (!initialConfig) return initialState
    
    const newState = {
      ...initialState,
      currentStep: initialConfig.initialStep || 'class-details',
      selectedBookingType: initialConfig.initialBookingType || 'class',
    }

    return {
      ...newState,
      isStepValid: validateBookingStep(newState, newState.currentStep)
    }
  })

  // Ref para el estado actual
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  // Prevenir actualizaciones innecesarias
  const lastUpdateRef = useRef<Partial<BookingState>>({})

  // Función de actualización optimizada
  const updateState = useCallback((updates: Partial<BookingState>) => {
    // Verificar si la actualización es necesaria
    const hasChanged = Object.entries(updates).some(
      ([key, value]) => lastUpdateRef.current[key as keyof BookingState] !== value
    )

    if (!hasChanged) return

    // Actualizar la referencia de la última actualización
    lastUpdateRef.current = updates

    setState(prev => {
      const next = { ...prev, ...updates }
      
      // Validación selectiva basada en cambios específicos
      if (updates.isStepValid === undefined) {
        const needsValidation = 
          updates.currentStep !== undefined ||
          (updates.classDetails !== undefined && next.currentStep === 'class-details') ||
          (updates.scheduleConfig !== undefined && next.currentStep === 'class-schedule') ||
          (updates.classPaymentConfig !== undefined && next.currentStep === 'payment')

        if (needsValidation) {
          next.isStepValid = validateBookingStep(next, next.currentStep)
        }
      }
      
      return next
    })
  }, [])

  // Obtener pasos según tipo con memoización
  const getCurrentSteps = useCallback(() => {
    const currentState = stateRef.current
    const config = configRef.current
    
    // Si el tipo de reserva está bloqueado, usar solo los pasos de ese tipo
    if (config?.disableTypeSelection) {
      return STEPS_BY_TYPE[config.initialBookingType]
    }
    
    return currentState.selectedBookingType ? 
      STEPS_BY_TYPE[currentState.selectedBookingType] : 
      STEPS_BY_TYPE.class
  }, [])

  // Navegación optimizada con prevención de actualizaciones innecesarias
  const handleContinue = useCallback(() => {
    const currentState = stateRef.current
    const currentSteps = getCurrentSteps()
    const currentIndex = currentSteps.indexOf(currentState.currentStep as any)
    const nextStep = currentSteps[currentIndex + 1]
    
    if (nextStep && nextStep !== currentState.currentStep) {
      updateState({ 
        currentStep: nextStep as BookingStep,
        isStepValid: validateBookingStep(currentState, nextStep as BookingStep)
      })
    }
  }, [getCurrentSteps, updateState])

  const handleBack = useCallback(() => {
    const currentState = stateRef.current
    const config = configRef.current
    const currentSteps = getCurrentSteps()
    const currentIndex = currentSteps.indexOf(currentState.currentStep as any)
    const prevStep = currentSteps[currentIndex - 1]
    
    // Si el tipo está bloqueado y estamos en el primer paso, no permitir retroceder
    if (config?.disableTypeSelection && currentIndex === 0) {
      return
    }
    
    if (prevStep && prevStep !== currentState.currentStep) {
      updateState({ 
        currentStep: prevStep as BookingStep,
        isStepValid: validateBookingStep(currentState, prevStep as BookingStep)
      })
    }
  }, [getCurrentSteps, updateState])

  // Reset optimizado
  const resetState = useCallback(() => {
    lastUpdateRef.current = {}
    setState(initialState)
  }, [])

  return {
    ...state,
    updateState,
    resetState,
    handleContinue,
    handleBack,
    validateStep: useCallback(
      (step: BookingStep) => validateBookingStep(stateRef.current, step),
      []
    )
  }
} 