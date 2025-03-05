import { useState, useCallback, useEffect, useMemo } from 'react'
import { DEFAULT_CLASS_DETAILS, DEFAULT_AVAILABILITY } from '../constants'
import type { 
  ClassBookingState, 
  ClassDetails, 
  ClassAvailability,
  ClassSession,
  ValidationErrors,
  BookingStep 
} from '../types'

export function useClassBookingState(): ClassBookingState {
  const [classDetails, setClassDetails] = useState<ClassDetails>(DEFAULT_CLASS_DETAILS)
  const [availability, setAvailability] = useState<ClassAvailability>(DEFAULT_AVAILABILITY)
  const [sessions, setSessions] = useState<ClassSession[]>([])
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [currentStep, setCurrentStep] = useState<BookingStep>('class-details')

  // Memoizar las funciones de validación pura (sin efectos secundarios)
  const validators = useMemo(() => ({
    classDetails: (details: ClassDetails): ValidationErrors => {
      const errors: ValidationErrors = {}
      if (!details.name.trim()) {
        errors.name = 'El nombre es requerido'
      }
      if (!details.description.trim()) {
        errors.description = 'La descripción es requerida'
      }
      if (!details.duration || details.duration < 15) {
        errors.duration = 'La duración debe ser al menos 15 minutos'
      }
      return errors
    },
    availability: (avail: ClassAvailability): ValidationErrors => {
      const errors: ValidationErrors = {}
      if (!avail.selectedCourts.length) {
        errors.courts = 'Selecciona al menos una cancha'
      }
      if (!avail.maxParticipants || avail.maxParticipants < 1) {
        errors.maxParticipants = 'El número de participantes debe ser mayor a 0'
      }
      return errors
    },
    sessions: (sessionList: ClassSession[]): ValidationErrors => {
      const errors: ValidationErrors = {}
      if (sessionList.length === 0) {
        errors.sessions = 'Debe agregar al menos una sesión'
      } else if (sessionList.some(session => !session.date)) {
        errors.sessions = 'Todas las sesiones deben tener una fecha asignada'
      }
      return errors
    }
  }), [])

  // Efecto para manejar validaciones cuando cambian los datos
  useEffect(() => {
    let newErrors: ValidationErrors = {}
    
    switch (currentStep) {
      case 'class-details':
        newErrors = validators.classDetails(classDetails)
        break
      case 'class-availability':
        newErrors = validators.availability(availability)
        break
      case 'sessions':
        newErrors = validators.sessions(sessions)
        break
    }

    setValidationErrors(newErrors)
  }, [currentStep, classDetails, availability, sessions, validators])

  const validateStep = useCallback((step: BookingStep): boolean => {
    setCurrentStep(step) // Actualizar el paso actual para la validación
    
    let errors: ValidationErrors = {}
    switch (step) {
      case 'class-details':
        errors = validators.classDetails(classDetails)
        break
      case 'class-availability':
        errors = validators.availability(availability)
        break
      case 'sessions':
        errors = validators.sessions(sessions)
        break
    }
    
    return Object.keys(errors).length === 0
  }, [validators, classDetails, availability, sessions])

  const handleAddSession = useCallback(() => {
    setSessions(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: `Clase ${prev.length + 1}`,
        date: null,
      }
    ])
  }, [])

  const handleRemoveSession = useCallback((sessionId: string) => {
    setSessions(prev => prev.filter(session => session.id !== sessionId))
  }, [])

  const handleUpdateSession = useCallback((
    sessionId: string, 
    updates: Partial<ClassSession>
  ) => {
    setSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? { ...session, ...updates }
        : session
    ))
  }, [])

  const resetState = useCallback(() => {
    setClassDetails(DEFAULT_CLASS_DETAILS)
    setAvailability(DEFAULT_AVAILABILITY)
    setSessions([])
    setValidationErrors({})
    setCurrentStep('class-details')
  }, [])

  return {
    classDetails,
    availability,
    sessions,
    validationErrors,
    setClassDetails,
    setAvailability,
    addSession: handleAddSession,
    removeSession: handleRemoveSession,
    updateSession: handleUpdateSession,
    validateStep,
    resetState
  }
}