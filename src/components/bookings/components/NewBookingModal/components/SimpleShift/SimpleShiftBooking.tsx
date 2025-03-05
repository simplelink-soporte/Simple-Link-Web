import { useCallback, useEffect, useMemo } from 'react'
import { timeToMinutes } from '@/lib/time-utils'
import { useBranchContext } from '@/contexts/BranchContext'
import { RentalStep } from './RentalStep'
import { PaymentStep } from './PaymentStep'
import { CourtSelector } from './CourtSelector'
import { TimeSlotSelector } from './TimeSlotSelector'
import type { TimeSelection } from '@/types/bookings'
import type { RentalSelection } from '@/types/items'
import type { PaymentDetails } from '@/types/payments'

interface SimpleShiftBookingProps {
  currentStep: 'time' | 'rentals' | 'payment'
  selectedCourts: string[]
  timeSelection: TimeSelection | null
  onCourtSelect: (courts: string[]) => void
  onTimeSelect: (time: TimeSelection | null) => void
  onValidationChange: (isValid: boolean) => void
  onPaymentChange: (payment: PaymentDetails) => void
  onRentalChange: (rentals: RentalSelection[]) => void
  rentals?: RentalSelection[]
}

export function SimpleShiftBooking({
  currentStep,
  selectedCourts,
  timeSelection,
  onCourtSelect,
  onTimeSelect,
  onValidationChange,
  onPaymentChange,
  onRentalChange,
  rentals = []
}: SimpleShiftBookingProps) {
  const { currentBranch } = useBranchContext()

  // Calcular la duración en minutos basada en la selección de tiempo
  const durationInMinutes = useMemo(() => {
    if (!timeSelection?.startTime || !timeSelection?.endTime) {
      console.log('Estado de timeSelection:', {
        timeSelection,
        hasStartTime: !!timeSelection?.startTime,
        hasEndTime: !!timeSelection?.endTime,
        currentStep
      })
      return 0
    }

    const startMinutes = timeToMinutes(timeSelection.startTime)
    const endMinutes = timeToMinutes(timeSelection.endTime)
    const calculatedDuration = endMinutes - startMinutes

    console.log('Calculando duración para timeSelection:', {
      startTime: timeSelection.startTime,
      endTime: timeSelection.endTime,
      startMinutes,
      endMinutes,
      calculatedDuration,
      currentStep
    })

    // Asegurarnos que el valor es un número válido y positivo
    return calculatedDuration > 0 ? calculatedDuration : 0
  }, [timeSelection, currentStep])

  // Efecto para mantener la consistencia del estado
  useEffect(() => {
    if (currentStep === 'rentals' && (!timeSelection || durationInMinutes === 0)) {
      console.log('Advertencia: Paso de rentals sin selección de tiempo válida', {
        timeSelection,
        durationInMinutes,
        currentStep
      })
    }
  }, [timeSelection, durationInMinutes, currentStep])

  // Efecto para actualizar la validación cuando cambian los datos relevantes
  useEffect(() => {
    const isValid = selectedCourts.length > 0 && !!timeSelection && durationInMinutes > 0

    console.log('Validando paso:', {
      step: currentStep,
      isValid,
      durationInMinutes,
      hasTimeSelection: !!timeSelection,
      selectedCourts: selectedCourts.length
    })

    onValidationChange(isValid)
  }, [currentStep, selectedCourts, timeSelection, durationInMinutes, onValidationChange])

  // Renderizar el paso actual
  const renderStep = () => {
    console.log('Renderizando paso:', {
      currentStep,
      durationInMinutes,
      hasTimeSelection: !!timeSelection,
      startTime: timeSelection?.startTime,
      endTime: timeSelection?.endTime
    })

    switch (currentStep) {
      case 'time':
        return (
          <div className="space-y-6">
            <CourtSelector
              selectedCourts={selectedCourts}
              onCourtToggle={(courtId: string) => {
                const newSelection = selectedCourts.includes(courtId)
                  ? selectedCourts.filter(id => id !== courtId)
                  : [...selectedCourts, courtId]
                onCourtSelect(newSelection)
              }}
            />
            <TimeSlotSelector
              selectedCourts={selectedCourts}
              timeSelection={timeSelection}
              onTimeSelect={onTimeSelect}
            />
          </div>
        )

      case 'rentals':
        if (!timeSelection || durationInMinutes <= 0) {
          console.log('No se puede renderizar RentalStep:', {
            hasTimeSelection: !!timeSelection,
            durationInMinutes
          })
          return null
        }

        console.log('Renderizando RentalStep:', {
          durationInMinutes,
          startTime: timeSelection.startTime,
          endTime: timeSelection.endTime
        })

        return (
          <RentalStep
            rentals={rentals}
            onRentalChange={onRentalChange}
            startTime={timeSelection.startTime}
            endTime={timeSelection.endTime}
            durationInMinutes={durationInMinutes}
          />
        )

      case 'payment':
        if (!timeSelection || durationInMinutes <= 0) {
          console.log('No se puede renderizar PaymentStep:', {
            hasTimeSelection: !!timeSelection,
            durationInMinutes
          })
          return null
        }

        console.log('Renderizando PaymentStep:', {
          durationInMinutes,
          startTime: timeSelection.startTime,
          endTime: timeSelection.endTime
        })

        return (
          <PaymentStep
            court={selectedCourts[0]}
            rentals={rentals}
            startTime={timeSelection.startTime}
            endTime={timeSelection.endTime}
            durationInMinutes={durationInMinutes}
            onPaymentChange={onPaymentChange}
          />
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {renderStep()}
    </div>
  )
} 