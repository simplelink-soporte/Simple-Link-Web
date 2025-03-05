import { useState, useCallback, useRef, useEffect } from "react"
import type { BookingStep, TimeSelection, ClassPaymentConfig } from "../types"

export type BookingType = 'class' | 'shift'

interface UseBookingStateConfig {
  initialBookingType?: BookingType
  disableTypeSelection?: boolean
  initialStep?: BookingStep
}

interface BookingState {
  currentStep: BookingStep
  selectedBookingType?: BookingType
  selectedDate?: Date
  selectedCourts: string[]
  timeSelection?: TimeSelection
  classPaymentConfig: ClassPaymentConfig
}

// Definir los pasos para cada tipo de reserva de manera estática
const STEPS_MAP = {
  class: {
    'booking-type': 'class-details',
    'class-details': 'class-schedule',
    'class-schedule': 'class-payment',
    'class-payment': 'confirmation'
  },
  shift: {
    'booking-type': 'participants',
    'participants': 'rentals',
    'rentals': 'payment',
    'payment': 'confirmation'
  }
} as const

export function useBookingState(config?: UseBookingStateConfig) {
  // Usar una ref para la configuración inicial
  const configRef = useRef(config)
  
  // Memoizar el estado inicial
  const initialState = useRef<BookingState>({
    currentStep: config?.initialStep || 'booking-type',
    selectedBookingType: config?.initialBookingType,
    selectedDate: undefined,
    selectedCourts: [],
    timeSelection: undefined,
    classPaymentConfig: {
      pricePerSession: 0,
      currency: 'EUR',
      paymentMethod: 'cash',
      paymentStatus: 'pending'
    }
  }).current

  // Estados principales
  const [state, setState] = useState<BookingState>(initialState)

  // Función segura para actualizar el estado
  const safeSetState = useCallback((
    updater: (prev: BookingState) => Partial<BookingState>
  ) => {
    setState(prev => ({
      ...prev,
      ...updater(prev)
    }))
  }, [])

  // Handlers optimizados
  const handlers = {
    setSelectedBookingType: useCallback((type: BookingType) => {
      safeSetState(prev => ({ selectedBookingType: type }))
    }, [safeSetState]),

    setSelectedDate: useCallback((date: Date) => {
      safeSetState(prev => ({ selectedDate: date }))
    }, [safeSetState]),

    setSelectedCourts: useCallback((courts: string[]) => {
      safeSetState(prev => ({ selectedCourts: courts }))
    }, [safeSetState]),

    setTimeSelection: useCallback((time: TimeSelection) => {
      safeSetState(prev => ({ timeSelection: time }))
    }, [safeSetState]),

    setClassPaymentConfig: useCallback((config: Partial<ClassPaymentConfig>) => {
      safeSetState(prev => ({
        classPaymentConfig: { ...prev.classPaymentConfig, ...config }
      }))
    }, [safeSetState]),

    handleContinue: useCallback(() => {
      safeSetState(prev => {
        const bookingType = prev.selectedBookingType || 'shift'
        const steps = STEPS_MAP[bookingType]
        const nextStep = steps[prev.currentStep as keyof typeof steps]
        return { currentStep: nextStep || prev.currentStep }
      })
    }, [safeSetState]),

    handleBack: useCallback(() => {
      safeSetState(prev => {
        // Si estamos en el paso inicial y la selección está deshabilitada, no retroceder
        if (prev.currentStep === configRef.current?.initialStep && configRef.current?.disableTypeSelection) {
          return prev
        }

        // Encontrar el paso anterior basado en el tipo actual
        const bookingType = prev.selectedBookingType || 'shift'
        const steps = STEPS_MAP[bookingType]
        const currentStepIndex = Object.keys(steps).indexOf(prev.currentStep)
        const prevStep = Object.keys(steps)[currentStepIndex - 1]

        return { currentStep: prevStep || prev.currentStep }
      })
    }, [safeSetState]),

    resetState: useCallback(() => {
      setState(initialState)
    }, [initialState]),

    setCurrentStep: useCallback((step: BookingStep) => {
      safeSetState(prev => ({ currentStep: step }))
    }, [safeSetState])
  }

  // Efecto para sincronizar el tipo de reserva con el paso actual
  useEffect(() => {
    if (config?.initialBookingType && !state.selectedBookingType) {
      handlers.setSelectedBookingType(config.initialBookingType)
    }
  }, [config?.initialBookingType, state.selectedBookingType, handlers.setSelectedBookingType])

  return {
    ...state,
    ...handlers
  }
} 
