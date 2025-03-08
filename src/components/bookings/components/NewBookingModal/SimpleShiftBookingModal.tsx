import { useState, useEffect, useCallback, useMemo } from "react"
import { motion } from "framer-motion"
import { SimpleShiftBooking } from "./SimpleShiftBooking"
import { ModalHeader } from "./components/ModalHeader"
import { ModalFooter } from "./components/ModalFooter"
import { Modal } from "@/components/ui/modal"
import { useBookingState } from "./hooks/useBookingState"
import { bookingService } from "@/services/bookingService"
import { useDateContext } from "@/contexts/DateContext"
import { useBranchContext } from "@/contexts/BranchContext"
import { useOrganization } from "@/contexts/OrganizationContext"
import { useCourts } from "@/hooks/useCourts"
import { useItems } from "@/hooks/useItems"
import { timeToMinutes } from "@/lib/time-utils"
import { toast } from "sonner"
import type { 
  Selection, 
  BookingStep, 
  BookingCreationData, 
  Court, 
  RentalItem, 
  Participant,
  PaymentMethodEnum,
  PaymentStatusEnum,
  BookingType,
  ParticipantRoleEnum
} from "@/types/bookings"
import type { RentalSelection } from "@/types/items"
import { useQueryClient } from '@tanstack/react-query'
import { useRentalContext } from "@/contexts/RentalContext"
import { useBookingCount } from '@/hooks/useBookingCount'
import NoCredits from "./components/SimpleShift/noCredits"
import { CongratsStep } from './components/SimpleShift/CongratsStep'
import { ConfirmationStep } from './components/SimpleShift/ConfirmationStep'

interface TimeSelection {
  startTime: string
  endTime: string
}

interface BookingParticipant extends Participant {
  firstName?: string
  lastName?: string
}

interface SimpleShiftBookingProps {
  currentStep: BookingStep
  selectedCourts: string[]
  timeSelection?: TimeSelection
  onCourtSelect: (courts: string[]) => void
  onTimeSelect: (time: TimeSelection) => void
  onValidationChange: (isValid: boolean) => void
  onPaymentChange: (details: PaymentDetails) => void
  onParticipantChange: (participants: BookingParticipant[]) => void
  onRentalChange: (rentals: RentalSelection[]) => void
  participants: BookingParticipant[]
  startTime?: string
  endTime?: string
  selectedDate: Date
  isVisible: boolean
}

interface PaymentDetails {
  totalAmount: number
  deposit: number
  courtPrice: number
  rentalItemsPrice: number
  paymentStatus: PaymentStatusEnum
  paymentMethod: PaymentMethodEnum
  isPaid: boolean
  manualPrice?: number
}

const initialPaymentDetails: PaymentDetails = {
  totalAmount: 0,
  deposit: 0,
  courtPrice: 0,
  rentalItemsPrice: 0,
  paymentStatus: 'pending' as PaymentStatusEnum,
  paymentMethod: 'cash' as PaymentMethodEnum,
  isPaid: false
}

interface SimpleShiftBookingModalProps {
  isOpen: boolean
  onClose: () => void
  selection: Selection
  onBookingCreated?: () => void
  selectedDate: Date
}

export function SimpleShiftBookingModal({ 
  isOpen, 
  onClose,
  selection,
  onBookingCreated,
  selectedDate
}: SimpleShiftBookingModalProps) {
  const queryClient = useQueryClient()
  const [mounted, setMounted] = useState(false)
  const [isStepValid, setIsStepValid] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [participants, setParticipants] = useState<BookingParticipant[]>([])
  const { currentBranch } = useBranchContext()
  const { rentals, totalPrice: rentalItemsPrice, updateRentals } = useRentalContext()
  const { data: courts = [] } = useCourts({ branchId: currentBranch?.id })
  const { data: items = [] } = useItems(currentBranch?.id, {
    enabled: isOpen && !!currentBranch?.id
  })
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>(() => {
    const durationInMinutes = selection 
      ? timeToMinutes(selection.endTime) - timeToMinutes(selection.startTime)
      : 0
    const numberOfCourts = selection?.selections.length || 0
    const courtPrice = durationInMinutes * numberOfCourts * 100

    return {
      totalAmount: courtPrice,
      deposit: courtPrice,
      courtPrice: courtPrice,
      rentalItemsPrice: 0,
      paymentStatus: 'completed' as PaymentStatusEnum,
      paymentMethod: 'cash' as PaymentMethodEnum,
      isPaid: false
    }
  })

  const { organization } = useOrganization()

  const { canMakeBooking } = useBookingCount({ 
    empresaId: organization?.id || '', 
    date: selectedDate.toISOString().split('T')[0],
    enabled: !!organization?.id && !!selectedDate && isOpen
  })

  const {
    currentStep,
    selectedCourts,
    timeSelection,
    handleContinue,
    handleBack,
    resetState,
    setSelectedCourts,
    setTimeSelection,
    setCurrentStep,
  } = useBookingState({
    initialBookingType: 'shift',
    disableTypeSelection: true,
    initialStep: 'participants'
  })

  const [isBookingCreated, setIsBookingCreated] = useState(false);

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (isOpen && selection) {
      const durationInMinutes = timeToMinutes(selection.endTime) - timeToMinutes(selection.startTime)
      console.log('Calculando duración para timeSelection:', {
        startTime: selection.startTime,
        endTime: selection.endTime,
        slots: selection.slots,
        durationInMinutes,
        calculatedFromSlots: selection.slots * 15
      })

      setSelectedCourts(selection.selections.map(sel => sel.courtId))
      setTimeSelection({
        startTime: selection.startTime,
        endTime: selection.endTime,
        duration: durationInMinutes
      })

      if (!canMakeBooking) {
        setCurrentStep('noCredits')
      }
    }
  }, [isOpen, selection, setSelectedCourts, setTimeSelection, canMakeBooking])

  useEffect(() => {
    switch (currentStep) {
      case 'participants':
        setIsStepValid(participants.length > 0)
        break
      case 'rentals':
        setIsStepValid(true) // Los rentals son opcionales
        break
      case 'payment':
        setIsStepValid(true) // La validación del pago se maneja en el componente PaymentStep
        break
      case 'confirmation':
        setIsStepValid(true)
        break
      default:
        setIsStepValid(false)
    }
  }, [currentStep, participants.length])

  // Memoizar cálculos de precios
  const calculatedPrices = useMemo(() => {
    if (!selection || !courts.length) return { courtPrice: 0, rentalPrice: rentalItemsPrice, total: 0 };

    const durationInMinutes = timeToMinutes(selection.endTime) - timeToMinutes(selection.startTime);
    const courtPrice = selection.selections.reduce((total, sel) => {
      const court = courts.find((c: Court) => c.id === sel.courtId);
      if (!court?.duration_pricing) return total;
      return total + (Number(court.duration_pricing[durationInMinutes.toString()]) || 0);
    }, 0);

    const total = courtPrice + rentalItemsPrice;

    return {
      courtPrice,
      rentalPrice: rentalItemsPrice,
      total
    };
  }, [selection, courts, rentalItemsPrice]);

  const handleConfirmBooking = useCallback(async () => {
    if (!selection || !selectedDate || !timeSelection) {
      toast.error('Faltan datos requeridos para la reserva');
      return;
    }

    if (!organization?.id) {
      toast.error('No se encontró la empresa asociada');
      return;
    }

    try {
      const bookingData: BookingCreationData = {
        courtId: selectedCourts[0],
        date: selectedDate.toISOString().split('T')[0],
        startTime: timeSelection.startTime,
        endTime: timeSelection.endTime,
        courtPrice: paymentDetails.manualPrice !== undefined ? paymentDetails.manualPrice : calculatedPrices.courtPrice,
        rentalItemsPrice: calculatedPrices.rentalPrice,
        paymentStatus: paymentDetails.paymentStatus,
        paymentMethod: paymentDetails.paymentMethod,
        paymentType: paymentDetails.paymentStatus === 'completed' ? 'booking' : 'deposit',
        depositAmount: Math.min(paymentDetails.deposit, calculatedPrices.total),
        participants: participants.map(p => ({
          id: p.id,
          userId: p.id,
          role: 'player' as ParticipantRoleEnum
        })),
        rentalItems: rentals,
        empresa_id: organization.id
      };

      console.log('Creando reserva manual con datos:', {
        ...bookingData,
        empresa_id: organization.id
      });

      const bookingResult = await bookingService.createBooking(bookingData);
      if (bookingResult.error) throw new Error(bookingResult.error.message);

      await queryClient.invalidateQueries({
        queryKey: ['bookings', selectedDate.toISOString().split('T')[0], currentBranch?.id]
      });
      
      toast.success('Reserva creada exitosamente');
      onBookingCreated?.();

      // Limpiar rentals después de crear la reserva
      updateRentals([])
    } catch (error: any) {
      console.error('Error al crear la reserva:', error);
      toast.error(error.message || 'Error al crear la reserva');
      handleBack();
    }
  }, [selection, selectedDate, timeSelection, calculatedPrices, paymentDetails, participants, rentals, selectedCourts, currentBranch?.id, organization?.id, onBookingCreated]);

  // Efecto para reset cuando se cierra el modal
  useEffect(() => {
    let isMounted = true;

    if (!isOpen && isMounted) {
      const timeoutId = setTimeout(() => {
        if (isMounted) {
          resetState();
          setParticipants([]);
          setIsStepValid(false);
          setIsBookingCreated(false); // Reset el estado de creación
        }
      }, 300);

      return () => {
        clearTimeout(timeoutId);
        isMounted = false;
      };
    }
  }, [isOpen, resetState]);

  // Efecto optimizado para actualizar payment details
  useEffect(() => {
    if (!selection) return;

    const { total: newTotal } = calculatedPrices;
    if (Math.abs(newTotal - paymentDetails.totalAmount) <= 0.01) return;

    let newDeposit = paymentDetails.deposit;
    // Si hay un precio manual y una seña configurada, mantener la seña
    if (paymentDetails.manualPrice !== undefined && paymentDetails.deposit > 0) {
      newDeposit = paymentDetails.deposit;
    } else if (paymentDetails.paymentStatus === 'completed') {
      newDeposit = newTotal;
    } else if (paymentDetails.deposit === 0 || paymentDetails.deposit > newTotal) {
      newDeposit = Math.ceil(newTotal * 0.3);
    }

    const newPaymentDetails: PaymentDetails = {
      ...paymentDetails,
      totalAmount: newTotal,
      deposit: newDeposit,
      courtPrice: paymentDetails.manualPrice !== undefined ? paymentDetails.manualPrice : calculatedPrices.courtPrice,
      rentalItemsPrice: calculatedPrices.rentalPrice
    };

    setPaymentDetails(newPaymentDetails);
  }, [selection, calculatedPrices, paymentDetails]);

  // Función para calcular el precio total de los rentals
  const calculateRentalTotalPrice = useCallback((rentals: RentalSelection[]) => {
    const total = rentals.reduce((total, rental) => {
      if (!rental.quantity || !rental.pricePerUnit) return total
      return total + (rental.quantity * rental.pricePerUnit)
    }, 0)
    console.log('Calculando precio total de rentals:', { rentals, total })
    return total
  }, [])

  const handleBackAction = () => {
    if (currentStep === 'participants') {
      onClose()
    } else {
      handleBack()
    }
  }

  const handleContinueAction = async () => {
    if (currentStep === 'confirmation') {
      if (!isProcessing && !isBookingCreated) {
        setIsProcessing(true);
        try {
          await handleConfirmBooking();
          setIsBookingCreated(true);
          setCurrentStep('congrats'); // Cambiamos al paso de felicitación
        } catch (error) {
          console.error('Error al confirmar la reserva:', error);
          toast.error((error as Error).message || 'Error al crear la reserva');
        } finally {
          setIsProcessing(false);
        }
      }
    } else if (currentStep === 'congrats') {
      onClose(); // Cerrar el modal en el paso de felicitación
    } else {
      handleContinue();
    }
  }

  const handleRentalChange = (newRentals: RentalSelection[]) => {
    // Esta función ya no es necesaria ya que usamos el contexto
    console.log('Rentals actualizados via contexto:', newRentals)
  }

  // Limpiar rentals cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      updateRentals([])
    }
  }, [isOpen, updateRentals])

  if (!selection || !mounted) return null

  if (currentStep === 'noCredits') {
    return (
      <Modal isOpen={isOpen} onClose={onClose}>
        <div className="h-full flex flex-col">
          <NoCredits />
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="h-full flex flex-col">
        <ModalHeader 
          currentStep={currentStep}
          selectedBookingType="simple_shift"
          show={currentStep !== 'congrats'}
        />

        <div className="flex-1 overflow-y-auto">
          {currentStep === 'congrats' ? (
            <CongratsStep
              selectedDate={selectedDate || new Date()}
              selectedCourts={selectedCourts}
              courts={courts}
              totalAmount={calculatedPrices.total}
              rentals={rentals}
            />
          ) : currentStep === 'confirmation' ? (
            <ConfirmationStep
              selectedDate={selectedDate || new Date()}
              selectedCourts={selectedCourts}
              courts={courts}
              timeSelection={timeSelection || { startTime: '', endTime: '' }}
              participants={participants}
              rentals={rentals}
              paymentDetails={{
                totalAmount: calculatedPrices.total,
                deposit: paymentDetails.deposit,
                courtPrice: calculatedPrices.courtPrice,
                rentalItemsPrice: calculatedPrices.rentalPrice,
                paymentStatus: paymentDetails.paymentStatus,
                paymentMethod: paymentDetails.paymentMethod,
                isPaid: paymentDetails.isPaid,
                manualPrice: paymentDetails.manualPrice
              }}
              items={items}
            />
          ) : (
            <SimpleShiftBooking
              currentStep={currentStep}
              selectedCourts={selectedCourts}
              timeSelection={timeSelection}
              onCourtSelect={setSelectedCourts}
              onTimeSelect={setTimeSelection}
              onValidationChange={setIsStepValid}
              onPaymentChange={setPaymentDetails}
              onParticipantChange={setParticipants}
              participants={participants}
              selectedDate={selectedDate}
              isVisible={isOpen}
            />
          )}
        </div>

        <ModalFooter
          currentStep={currentStep}
          onBack={handleBackAction}
          onContinue={handleContinueAction}
          isValid={isStepValid}
          continueText={
            currentStep === 'confirmation' ? 'Crear Reserva' : 
            currentStep === 'congrats' ? 'Cerrar' : 
            'Continuar'
          }
          isSubmitting={isProcessing}
          show={currentStep !== 'congrats'}
        />
      </div>
    </Modal>
  )
} 