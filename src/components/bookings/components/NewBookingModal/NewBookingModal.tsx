"use client"

import { useState, useEffect, useCallback } from "react"
import { Modal } from "@/components/ui/modal"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { toast } from 'react-hot-toast'
import { ClassBooking } from "./components/Class/ClassBooking"
import { ModalHeader } from "./components/ModalHeader"
import { ModalFooter } from "./components/ModalFooter"
import { useBookingState } from "@/hooks/useBookingState"
import type { BookingStep } from "./types"
import type { Database } from "@/types/supabase"
import useOrganization from '@/hooks/useOrganization'
import { useBranchContext } from '@/contexts/BranchContext'
import { useCurrentEmpresa } from '@/hooks/useCurrentEmpresa'
import { useClasses } from '../../hooks/useClasses'
import { checkClassAvailability, checkRecurringClassAvailability } from '@/services/classAvailabilityService'

interface NewBookingModalProps {
  isOpen: boolean
  onClose: () => void
  initialBookingType?: 'class'
  disableTypeSelection?: boolean
}

export function NewBookingModal({ 
  isOpen, 
  onClose,
  initialBookingType = 'class',
  disableTypeSelection = true
}: NewBookingModalProps) {
  const [mounted, setMounted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdClassId, setCreatedClassId] = useState<string>()
  const [createError, setCreateError] = useState<string>()
  const supabase = createClientComponentClient<Database>()
  const { currentBranch } = useBranchContext()
  const { empresa } = useCurrentEmpresa()
  const { organizationId } = useOrganization()
  const { updateClassesCache, invalidateClasses } = useClasses({ branchId: currentBranch?.id })
  
  // Inicializar el estado de reserva con configuración memoizada
  const bookingState = useBookingState({
    initialBookingType: 'class',
    initialStep: 'class-details',
    disableTypeSelection: true
  })

  const {
    currentStep,
    selectedBookingType,
    selectedDate,
    selectedCourts,
    timeSelection,
    classDetails,
    classPaymentConfig,
    isStepValid,
    updateState,
    resetState,
    handleContinue,
    handleBack
  } = bookingState

  // Manejar montaje/desmontaje
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Manejar reset al cerrar
  useEffect(() => {
    if (!isOpen) {
      resetState()
      setCreatedClassId(undefined)
      setCreateError(undefined)
    }
  }, [isOpen, resetState])

  // Manejar cambios en classDetails de forma optimizada
  const handleClassDetailsChange = useCallback((details: typeof classDetails) => {
    updateState({ classDetails: details })
  }, [updateState])

  // Manejar cambios en la configuración de pago de forma optimizada
  const handlePaymentConfigChange = useCallback((config: Partial<typeof classPaymentConfig>) => {
    updateState({
      classPaymentConfig: { ...classPaymentConfig, ...config }
    })
  }, [updateState, classPaymentConfig])

  // Manejar cambios en la configuración del horario de forma optimizada
  const handleScheduleConfigChange = useCallback((config: typeof bookingState.scheduleConfig) => {
    updateState({ scheduleConfig: config })
  }, [updateState])

  // Función para crear la clase en Supabase
  const createClass = async () => {
    try {
      setIsSubmitting(true)

      // Validar que tengamos una sede seleccionada
      if (!currentBranch?.id) {
        throw new Error('Debes seleccionar una sede para crear la clase')
      }

      // Validar que tengamos una empresa
      if (!empresa?.id) {
        throw new Error('No se encontró la empresa asociada')
      }

      // Validar datos requeridos
      if (!classDetails.visibility) {
        throw new Error('La visibilidad de la clase es requerida')
      }

      if (!bookingState.scheduleConfig.startDate) {
        throw new Error('La fecha de inicio es requerida')
      }

      // Validar que haya al menos un time slot con precio
      if (!bookingState.scheduleConfig.timeSlots.length) {
        throw new Error('Debes agregar al menos un horario')
      }

      const firstTimeSlot = bookingState.scheduleConfig.timeSlots[0]
      if (!firstTimeSlot.price || firstTimeSlot.price <= 0) {
        throw new Error('El precio por sesión debe ser mayor a 0')
      }

      // Verificar disponibilidad para evitar solapamientos, dependiendo de si es recurrente o no
      if (bookingState.scheduleConfig.isRecurring) {
        // Para clases recurrentes
        console.log('[DEBUG] Iniciando verificación para clase recurrente')
        console.log('[DEBUG] Timezone de sede:', currentBranch?.timezone)
        console.log('[DEBUG] Fecha de inicio:', bookingState.scheduleConfig.startDate)
        console.log('[DEBUG] Fecha de fin:', bookingState.scheduleConfig.endDate)
        console.log('[DEBUG] Días de la semana:', bookingState.scheduleConfig.weekDays)
        console.log('[DEBUG] Time slots:', JSON.stringify(bookingState.scheduleConfig.timeSlots))
        
        try {
          // Verificar disponibilidad para las fechas y horarios seleccionados
          const availabilityResult = await checkRecurringClassAvailability(
            bookingState.scheduleConfig.startDate,
            bookingState.scheduleConfig.weekDays,
            bookingState.scheduleConfig.timeSlots,
            bookingState.scheduleConfig.endDate,
            currentBranch?.timezone || 'America/New_York' // Usar la zona horaria de la sede o un valor por defecto
          )

          // Si hay reservas solapadas, mostrar un error
          if (!availabilityResult.available) {
            const overlappingCourts = availabilityResult.overlappingBookings.map(b => b.court_name);
            const uniqueOverlappingCourts = Array.from(new Set(overlappingCourts)); // Eliminar duplicados
            
            throw new Error(
              `No se puede crear la clase porque hay reservas existentes que se solaparían con el horario seleccionado. ` + 
              `Pistas afectadas: ${uniqueOverlappingCourts.join(', ')}.`
            )
          }
        } catch (availabilityError: any) {
          throw new Error(`Error al verificar disponibilidad: ${availabilityError.message}`)
        }
      } else {
        // Para clases no recurrentes (únicas)
        console.log('[DEBUG] Iniciando verificación para clase no recurrente (única)')
        console.log('[DEBUG] Timezone de sede:', currentBranch?.timezone)
        console.log('[DEBUG] Fecha seleccionada:', bookingState.scheduleConfig.startDate)
        console.log('[DEBUG] Time slots:', JSON.stringify(bookingState.scheduleConfig.timeSlots))
        
        try {
          // Verificar disponibilidad para la fecha y horarios seleccionados
          const availabilityResult = await checkClassAvailability(
            bookingState.scheduleConfig.startDate,
            bookingState.scheduleConfig.timeSlots,
            currentBranch?.timezone || 'America/New_York' // Usar la zona horaria de la sede o un valor por defecto
          )

          // Si hay reservas solapadas, mostrar un error
          if (!availabilityResult.available) {
            const overlappingCourts = availabilityResult.overlappingBookings.map(b => b.court_name);
            const uniqueOverlappingCourts = Array.from(new Set(overlappingCourts)); // Eliminar duplicados
            
            throw new Error(
              `No se puede crear la clase porque hay reservas existentes que se solaparían con el horario seleccionado. ` + 
              `Pistas afectadas: ${uniqueOverlappingCourts.join(', ')}.`
            )
          }
        } catch (availabilityError: any) {
          throw new Error(`Error al verificar disponibilidad: ${availabilityError.message}`)
        }
      }

      // Preparar la configuración del horario
      const scheduleConfig = {
        days: bookingState.scheduleConfig.weekDays,
        timeSlots: bookingState.scheduleConfig.timeSlots.map(slot => ({
          startTime: slot.startTime,
          endTime: slot.endTime,
          price: slot.price,
          capacity: slot.capacity,
          instructors: slot.instructors || [],
          courtIds: slot.courtIds || []
        }))
      }

      const classData: Database['public']['Tables']['classes']['Insert'] = {
        name: classDetails.name,
        description: classDetails.description || null,
        visibility: classDetails.visibility as 'public' | 'private',
        empresa_id: empresa.id,
        branch_id: currentBranch.id,
        start_date: bookingState.scheduleConfig.startDate.toISOString(),
        end_date: bookingState.scheduleConfig.endDate?.toISOString() || null,
        is_recurring: bookingState.scheduleConfig.isRecurring,
        schedule_config: scheduleConfig,
        available_payment_methods: classPaymentConfig.paymentMethods,
        payment_config: {
          currency: classPaymentConfig.currency,
          status: classPaymentConfig.paymentStatus,
          guaranteePercentage: classPaymentConfig.guaranteePercentage || 30,
          partialPaymentPercentage: classPaymentConfig.partialPaymentPercentage || 20
        },
        created_by: empresa.auth_user_id,
        min_students: 1,
        status: 'active',
        sport: classDetails.sport
      }

      const { data, error } = await supabase
        .from('classes')
        .insert(classData)
        .select('*, empresa:empresa_id (id, name, company_links (slug))')
        .single()

      if (error) {
        console.error('Error completo:', error)
        throw new Error(`Error al insertar la clase: ${error.message}`)
      }

      // Procesar la clase para agregarla al caché
      const now = new Date()
      const newClass = {
        ...data,
        isExpired: !data.is_recurring && data.start_date && new Date(data.start_date) < now,
        shareableLink: data.empresa?.company_links?.[0]?.slug 
          ? `${window.location.origin}/clases/${data.empresa.company_links[0].slug}/${data.id}`
          : null
      }

      // Actualizar el caché con la nueva clase
      updateClassesCache(newClass)
      
      // Invalidar queries para asegurar datos frescos
      await invalidateClasses()

      toast.success('Clase creada exitosamente')
      return data.id

    } catch (error) {
      console.error('Error detallado al crear la clase:', error)
      toast.error(error instanceof Error ? error.message : 'Error al crear la clase')
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  // Modificar handleContinue para saltar el paso de disponibilidad
  const handleContinueWithSave = useCallback(async () => {
    if (currentStep === 'confirmation' && !createdClassId) {
      try {
        // Limpiar cualquier error previo
        setCreateError(undefined)
        
        const classId = await createClass()
        setCreatedClassId(classId)
        const classLink = `${window.location.origin}/inscripcion/${classId}`
        navigator.clipboard.writeText(classLink)
      } catch (error) {
        // Capturar el mensaje de error para mostrarlo en el paso de confirmación
        setCreateError(error instanceof Error ? error.message : 'Error desconocido al crear la clase')
        console.error('Error al crear clase:', error)
      }
    } else if (currentStep === 'confirmation' && createdClassId) {
      onClose()
    } else {
      // Si estamos en class-details, saltamos directamente a class-schedule
      if (currentStep === 'class-details') {
        updateState({ currentStep: 'class-schedule' })
      } else {
        handleContinue()
      }
    }
  }, [currentStep, createClass, handleContinue, updateState, onClose, createdClassId])

  if (!mounted) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="h-full flex flex-col">
        <ModalHeader 
          currentStep={currentStep}
          selectedBookingType={selectedBookingType}
          isClassCreated={!!createdClassId}
        />

        <div className="flex-1 overflow-y-auto">
          <ClassBooking
            currentStep={currentStep}
            selectedDate={selectedDate}
            selectedCourts={selectedCourts}
            timeSelection={timeSelection}
            classDetails={classDetails}
            scheduleConfig={bookingState.scheduleConfig}
            paymentConfig={classPaymentConfig}
            onDateSelect={(date) => updateState({ selectedDate: date })}
            onCourtSelect={(courts) => updateState({ selectedCourts: courts })}
            onTimeSelect={(time) => updateState({ timeSelection: time })}
            onClassDetailsChange={handleClassDetailsChange}
            onScheduleConfigChange={handleScheduleConfigChange}
            onPaymentConfigChange={handlePaymentConfigChange}
            onValidationChange={(isValid) => {
              updateState({ isStepValid: isValid })
            }}
            createdClassId={createdClassId}
            createError={createError}
          />
        </div>

        <ModalFooter
          currentStep={currentStep}
          onBack={handleBack}
          onContinue={handleContinueWithSave}
          isValid={isStepValid}
          isSubmitting={isSubmitting}
          show={!(currentStep === 'confirmation' && createdClassId)}
        />
      </div>
    </Modal>
  )
} 