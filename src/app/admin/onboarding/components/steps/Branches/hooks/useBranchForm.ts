import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useOnboarding } from '@/hooks/useOnboarding'
import { useToast } from '@/components/ui/use-toast'
import { BranchFormData, ScheduleData, CourtData } from '../types'

/**
 * Hook personalizado para manejar el formulario de sedes
 */
export function useBranchForm() {
  const { user } = useAuth()
  const { currentBranchId, branches, setCurrentBranchId, setBranches } = useOnboarding()
  const { toast } = useToast()
  
  const [isSuccess, setIsSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isBranchSaved, setIsBranchSaved] = useState(false)
  const [currentStep, setCurrentStep] = useState<number>(1)

  // Datos iniciales del horario
  const initialSchedule = {
    monday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] },
    tuesday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] },
    wednesday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] },
    thursday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] },
    friday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] },
    saturday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] },
    sunday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] }
  }
  
  // Estado del formulario
  const [formData, setFormData] = useState<BranchFormData>(() => {
    if (currentBranchId) {
      const branch = branches.find(b => b.id === currentBranchId)
      if (branch?.data) {
        return branch.data
      }
    }
    return {
      name: '',
      address: '',
      phone: '',
      manager: '',
      isActive: true,
      timezone: 'Europe/Madrid',
      schedule: initialSchedule,
      courts: []
    }
  })

  // Función para manejar cambios en campos de texto
  const handleInputChange = (field: keyof BranchFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Función para manejar cambios en el horario
  const handleScheduleChange = (schedule: ScheduleData) => {
    setFormData(prev => ({
      ...prev,
      schedule
    }))
  }

  // Función para manejar cambios en las pistas
  const handleCourtsChange = (courts: CourtData[]) => {
    setFormData(prev => ({
      ...prev,
      courts
    }))
  }

  // Validación de formulario básico
  const isBasicFormValid = () => {
    return formData.name?.trim() !== '' &&
      formData.address?.trim() !== '' &&
      formData.phone?.trim() !== ''
  }

  // Validación de horarios
  const isScheduleFormValid = () => {
    return true // Los horarios ya tienen valores por defecto válidos
  }

  // Validación de pistas
  const isCourtsFormValid = () => {
    return formData.courts.length > 0
  }

  // Navegación entre pasos
  const goToNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  // Obtener información del paso actual
  const getStepInfo = () => {
    switch (currentStep) {
      case 1:
        return {
          title: "Información de la sede",
          description: "Completa los datos básicos de tu sede"
        }
      case 2:
        return {
          title: "Horarios de apertura",
          description: "Configura los horarios de funcionamiento"
        }
      case 3:
        return {
          title: "Configuración de pistas",
          description: "Agrega y configura las pistas de tu sede"
        }
      default:
        return {
          title: "Información de la sede",
          description: "Completa los datos básicos de tu sede"
        }
    }
  }

  return {
    formData,
    isSubmitting,
    isBranchSaved,
    currentStep,
    isSuccess,
    handleInputChange,
    handleScheduleChange,
    handleCourtsChange,
    isBasicFormValid,
    isScheduleFormValid,
    isCourtsFormValid,
    goToNextStep,
    goToPreviousStep,
    setCurrentStep,
    setIsSubmitting,
    setIsBranchSaved,
    setIsSuccess,
    getStepInfo,
    initialSchedule
  }
} 