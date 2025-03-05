import { useState, useCallback } from 'react'
import type { 
  BookingStep, 
  BookingType,
  ClassDetails,
  TimeSelection,
} from './types'

interface BookingState {
  currentStep: BookingStep
  selectedBookingType: BookingType | undefined
  selectedDate: Date | undefined
  selectedCourts: string[]
  classDetails: ClassDetails
  timeSelection: TimeSelection | undefined
  isStepValid: boolean
}

interface UseBookingStateReturn extends BookingState {
  updateState: (updates: Partial<BookingState>) => void
  resetState: () => void
  handleContinue: () => void
  handleBack: () => void
  validateStep: (step: BookingStep) => boolean
}

const initialState: BookingState = {
  currentStep: 'booking-type',
  selectedBookingType: undefined,
  selectedDate: undefined,
  selectedCourts: [],
  classDetails: {
    name: '',
    description: ''
  },
  timeSelection: undefined,
  isStepValid: false
}

export function useBookingState(): UseBookingStateReturn {
  const [state, setState] = useState<BookingState>(initialState)

  const updateState = useCallback((updates: Partial<BookingState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  const validateStep = useCallback((step: BookingStep): boolean => {
    switch (step) {
      case 'booking-type':
        return !!state.selectedBookingType
      case 'class-details':
        return !!state.classDetails.name.trim()
      case 'date':
        return !!state.selectedDate
      case 'time':
        return state.selectedCourts.length > 0 && !!state.timeSelection
      default:
        return false
    }
  }, [state])

  const handleContinue = useCallback(() => {
    switch (state.currentStep) {
      case 'booking-type':
        if (state.selectedBookingType) {
          const nextStep = state.selectedBookingType === 'shift' ? 'date' : 'class-details'
          updateState({ 
            currentStep: nextStep,
            isStepValid: validateStep(nextStep)
          })
        }
        break
      case 'class-details':
        if (state.classDetails.name.trim()) {
          const nextStep = 'class-availability'
          updateState({ 
            currentStep: nextStep,
            isStepValid: validateStep(nextStep)
          })
        }
        break
      default:
        break
    }
  }, [state.currentStep, state.selectedBookingType, state.classDetails.name, updateState, validateStep])

  const handleBack = useCallback(() => {
    switch (state.currentStep) {
      case 'class-details':
        const prevStep1 = 'booking-type'
        updateState({ 
          currentStep: prevStep1,
          isStepValid: validateStep(prevStep1)
        })
        break
      case 'class-availability':
        const prevStep2 = 'class-details'
        updateState({ 
          currentStep: prevStep2,
          isStepValid: validateStep(prevStep2)
        })
        break
      default:
        break
    }
  }, [state.currentStep, updateState, validateStep])

  const resetState = useCallback(() => {
    setState(initialState)
  }, [])

  return {
    ...state,
    updateState,
    resetState,
    handleContinue,
    handleBack,
    validateStep
  }
}