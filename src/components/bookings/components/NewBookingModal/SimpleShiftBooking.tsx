import { motion, AnimatePresence } from "framer-motion"
import { useState, useMemo, useEffect } from "react"
import type { BookingStep } from "./types"
import { ParticipantStep } from "./components/SimpleShift/ParticipantStep"
import { RentalStep } from "./components/SimpleShift/RentalStep"
import { PaymentStep } from "./components/SimpleShift/PaymentStep"
import { ConfirmationStep } from "./components/SimpleShift/ConfirmationStep"
import { CongratsStep } from "./components/SimpleShift/CongratsStep"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { TimeSelection, Participant } from "./types"
import type { RentalSelection } from "@/types/items"
import { useDateContext } from "@/contexts/DateContext"
import { useBranchContext } from "@/contexts/BranchContext"
import { useCourts } from "@/hooks/useCourts"
import { useItems } from "@/hooks/useItems"
import { timeToMinutes } from "@/lib/time-utils"
import { IconChevronDown } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import NoCredits from './components/SimpleShift/noCredits'

interface SimpleShiftBookingProps {
  currentStep: BookingStep
  selectedCourts: string[]
  timeSelection?: TimeSelection
  onCourtSelect: (courts: string[]) => void
  onTimeSelect: (time: TimeSelection) => void
  onValidationChange: (isValid: boolean) => void
  onPaymentChange: (details: PaymentDetails) => void
  onParticipantChange: (participants: Participant[]) => void
  participants: Participant[]
  selectedDate: Date
}

export function SimpleShiftBooking({ 
  currentStep,
  selectedCourts,
  timeSelection,
  onCourtSelect,
  onTimeSelect,
  onValidationChange,
  onPaymentChange,
  participants,
  onParticipantChange,
  selectedDate
}: SimpleShiftBookingProps) {
  const { selectedDate: contextDate } = useDateContext()
  const { currentBranch } = useBranchContext()
  const { data: courts = [] } = useCourts({ 
    branchId: currentBranch?.id,
    onlyActive: true
  })
  const { data: items = [] } = useItems(currentBranch?.id)
  const [rentals, setRentals] = useState<RentalSelection[]>([])
  const [isDetailsOpen, setIsDetailsOpen] = useState(true)
  const [manualCourtPrice, setManualCourtPrice] = useState<number | null>(null)

  // Calcular el total para todos los pasos
  const total = useMemo(() => {
    if (!timeSelection || !selectedCourts.length) return 0

    // Calcular duración en minutos
    const startMinutes = timeToMinutes(timeSelection.startTime)
    const endMinutes = timeToMinutes(timeSelection.endTime)
    const duration = endMinutes - startMinutes

    // Calcular precio de las canchas
    const courtPrice = selectedCourts.reduce((total, courtId) => {
      const court = courts.find(c => c.id === courtId)
      if (!court?.duration_pricing) return total

      // Si hay un precio manual, usarlo
      if (manualCourtPrice !== null) {
        return total + manualCourtPrice
      }

      const durationKey = duration.toString()
      const price = Number(court.duration_pricing[durationKey]) || 0
      return total + price
    }, 0)

    // Calcular precio de los rentals usando el precio base
    const rentalPrice = rentals.reduce((total, rental) => {
      const item = items.find(i => i.id === rental.itemId)
      if (!item?.duration_pricing) return total

      const defaultDuration = item.default_duration || 60
      const basePrice = Number(item.duration_pricing[defaultDuration.toString()]) || 0
      const itemTotal = basePrice * rental.quantity

      return total + itemTotal
    }, 0)

    const totalAmount = courtPrice + rentalPrice

    console.log('Total amount calculation:', {
      courtPrice,
      rentalPrice,
      totalAmount,
      manualCourtPrice
    })

    return totalAmount
  }, [timeSelection, selectedCourts, courts, rentals, items, manualCourtPrice])

  // Función para formatear la duración
  const formatDuration = (duration?: number) => {
    if (!duration) return ''
    const hours = Math.floor(duration / 60)
    const minutes = duration % 60
    
    if (hours === 0) return `${minutes} minutos`
    if (minutes === 0) return hours === 1 ? '1 hora' : `${hours} horas`
    return `${hours}h ${minutes}min`
  }

  const handleParticipantAdd = (participant: Participant) => {
    // Asegurarnos de que el participante tenga todos los campos necesarios
    const newParticipant = {
      ...participant,
      userId: participant.userId || participant.id, // Usar userId si existe, sino usar id
      role: participant.role || 'player'
    }

    console.log('Agregando participante a la reserva:', newParticipant)
    onParticipantChange([...participants, newParticipant])
  }

  const handleParticipantRemove = (participantId: string) => {
    onParticipantChange(participants.filter(p => p.id !== participantId))
  }

  const handleRentalChange = (newRentals: RentalSelection[]) => {
    setRentals(newRentals)
    onValidationChange(true)
  }

  const handlePaymentChange = (details: PaymentDetails) => {
    console.log('Payment details updated:', details);
    // Actualizar el precio manual si existe
    if (details.manualPrice !== undefined) {
      setManualCourtPrice(details.manualPrice);
    }

    // Determinar el tipo de pago basado en el estado
    const paymentType = details.paymentStatus === 'completed' ? 'booking' :
                       details.paymentStatus === 'partial' ? 'deposit' :
                       'booking';

    onPaymentChange({
      ...details,
      paymentType
    });
    onValidationChange(true);
  };

  // Validación inicial y cuando cambie el número de participantes
  useEffect(() => {
    if (currentStep === 'participants') {
      onValidationChange(participants.length > 0)
    }
  }, [currentStep, participants.length, onValidationChange])

  const renderStep = () => {
    switch (currentStep) {
      case 'noCredits':
        return <NoCredits />
      case 'participants':
        return (
          <div className="space-y-10">
            {/* Resumen de la reserva */}
            <div>
              <button
                onClick={() => setIsDetailsOpen(prev => !prev)}
                className="w-full text-left flex items-center justify-between transition-colors duration-200"
              >
                <div>
                  <h3 className="text-sm font-medium text-gray-800 tracking-[-0.01em]">
                    Detalles de la reserva
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5 tracking-[-0.01em]">
                    {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                  </p>
                </div>
                <IconChevronDown 
                  className={cn(
                    "w-4 h-4 text-gray-400 transition-transform duration-200",
                    isDetailsOpen && "transform rotate-180"
                  )}
                  stroke={1.5}
                />
              </button>
              
              <AnimatePresence>
                {isDetailsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ 
                      duration: 0.2,
                      ease: [0.4, 0, 0.2, 1]
                    }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 mt-4">
                      {/* Horario */}
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-500 tracking-[-0.01em]">
                          Horario
                        </span>
                        <div className="flex items-center">
                          <span className="text-xs font-medium text-gray-700 tracking-[-0.01em]">
                            {timeSelection?.startTime} - {timeSelection?.endTime}
                            <span className="text-gray-400 ml-1">
                              ({formatDuration(timeSelection?.duration)})
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Pistas */}
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-500 tracking-[-0.01em]">
                          {selectedCourts.length > 1 ? 'Pistas seleccionadas' : 'Pista seleccionada'}
                        </span>
                        <div className="flex gap-1.5">
                          {selectedCourts.map((courtId, index) => {
                            const court = courts.find(c => c.id === courtId)
                            return (
                              <span 
                                key={courtId}
                                className="text-xs font-medium text-gray-700 tracking-[-0.01em]"
                              >
                                {court?.name || `Pista ${index + 1}`}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Línea divisora sutil */}
            <div className="flex justify-center">
              <div className="w-16 h-px bg-gray-200/75" />
            </div>
            
            <ParticipantStep
              participants={participants}
              onParticipantAdd={handleParticipantAdd}
              onParticipantRemove={handleParticipantRemove}
            />
          </div>
        )
      case 'rentals':
        return (
          <RentalStep
            rentals={rentals}
            onRentalChange={handleRentalChange}
            startTime={timeSelection?.startTime || '00:00'}
            endTime={timeSelection?.endTime || '00:00'}
            durationInMinutes={timeSelection ? timeToMinutes(timeSelection.endTime) - timeToMinutes(timeSelection.startTime) : 0}
            selectedDate={selectedDate}
          />
        )
      case 'payment':
        return (
          <PaymentStep
            totalAmount={total}
            selectedRentals={rentals}
            selectedCourts={selectedCourts}
            startTime={timeSelection?.startTime || '00:00'}
            endTime={timeSelection?.endTime || '00:00'}
            onPaymentChange={handlePaymentChange}
            onNext={() => onValidationChange(true)}
            onBack={() => onValidationChange(true)}
          />
        )
      case 'confirmation':
        return (
          <ConfirmationStep
            selectedDate={selectedDate || new Date()}
            selectedCourts={selectedCourts}
            courts={courts}
            totalAmount={total}
            rentals={rentals}
            sampleRentalItems={[]}
          />
        )
      case 'congrats':
        return (
          <CongratsStep
            selectedDate={selectedDate || new Date()}
            selectedCourts={selectedCourts}
            courts={courts}
            totalAmount={total}
            rentals={rentals}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-8 px-8 py-2">
      {currentStep === 'payment' ? (
        <PaymentStep
          totalAmount={total}
          selectedRentals={rentals}
          selectedCourts={selectedCourts}
          startTime={timeSelection?.startTime || '00:00'}
          endTime={timeSelection?.endTime || '00:00'}
          onPaymentChange={handlePaymentChange}
          onNext={() => onValidationChange(true)}
          onBack={() => onValidationChange(true)}
        />
      ) : (
        renderStep()
      )}
    </div>
  )
} 