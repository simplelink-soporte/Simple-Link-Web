import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AddParticipantSection } from "./AddParticipantSection"
import { ParticipantSummaryWrapper } from "./ParticipantSummaryWrapper"
import { PaymentDetailsStep } from "./PaymentDetailsStep"
import { SuccessMessage } from "./SuccessMessage"
import type { Participant as UIParticipant, PaymentMethodEnum, PaymentStatusEnum, ParticipantRoleEnum } from "@/types/bookings"
import { IconX, IconArrowRight } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { ManualClassBookingService, Participant as ManualParticipant } from "@/services/manualClassBookingService"

// Tipo local usado en AddParticipantSection
interface SectionParticipant {
  id: string
  userId: string
  fullName: string
  email?: string
  role: ParticipantRoleEnum
}

interface AddParticipantModalProps {
  isOpen: boolean
  onClose: () => void
  onParticipantAdd: (participant: UIParticipant) => void
  classId?: string
  sessionId?: string
  sessionPrice?: number
  userId?: string
  empresaId?: string
  capacity?: number
  currentParticipants?: number
  date?: string
  startTime?: string
  endTime?: string
  courtId?: string
}

type Step = "select" | "summary" | "payment" | "success"

export function AddParticipantModal({
  isOpen,
  onClose,
  onParticipantAdd,
  classId,
  sessionId,
  sessionPrice = 0,
  userId,
  empresaId,
  capacity,
  currentParticipants,
  date,
  startTime,
  endTime,
  courtId
}: AddParticipantModalProps) {
  const [step, setStep] = useState<Step>("select")
  const [selectedParticipants, setSelectedParticipants] = useState<SectionParticipant[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bookingDetails, setBookingDetails] = useState<{
    paymentMethod: PaymentMethodEnum
    paymentStatus: PaymentStatusEnum
    depositAmount?: number
  } | null>(null)

  const manualBookingService = new ManualClassBookingService()

  const handleParticipantAdd = (participant: SectionParticipant) => {
    setSelectedParticipants(prev => {
      // Verificar si el participante ya existe
      if (prev.some(p => p.id === participant.id)) {
        return prev
      }
      return [...prev, participant]
    })
  }

  // Adaptador para convertir SectionParticipant a UIParticipant
  const convertToUIParticipant = (participant: SectionParticipant): UIParticipant => {
    return {
      id: participant.id,
      name: participant.fullName,
      email: participant.email,
      role: participant.role,
      // Agregar campos opcionales que puedan ser necesarios
      memberId: participant.userId
    }
  }

  const handlePaymentConfirm = async (paymentDetails: {
    paymentMethod: PaymentMethodEnum
    paymentStatus: PaymentStatusEnum
    depositAmount?: number
  }) => {
    setBookingDetails(paymentDetails)
    
    if (!classId || !sessionId || !userId || !empresaId || !courtId) {
      setError("Faltan datos para crear la reserva manual. Asegúrate de que la clase, sesión, usuario, empresa y pista estén disponibles.")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Creamos reservas para cada participante seleccionado
      const bookingPromises = selectedParticipants.map(participant => {
        // Convertir al formato de participante esperado por el servicio de reserva manual
        const manualParticipant: ManualParticipant = {
          id: participant.id,
          userId: participant.userId,
          fullName: participant.fullName,
          email: participant.email,
          role: participant.role
        }

        // Opciones para la reserva manual
        const options = {
          userId,
          empresaId,
          classId,
          sessionId,
          paymentMethod: paymentDetails.paymentMethod,
          paymentStatus: paymentDetails.paymentStatus,
          depositAmount: paymentDetails.depositAmount,
          // Incluir fecha y horario si están disponibles
          date: date,
          startTime: startTime,
          endTime: endTime,
          // Incluir el ID de la pista si está disponible
          courtId: courtId,
          // Añadir el precio de la sesión que viene como prop
          sessionPrice: sessionPrice
        }

        // Log para depuración
        console.log('Datos para crear reserva manual:', {
          participant: manualParticipant,
          options,
          sessionPrice
        });

        // Crear la reserva manual
        return manualBookingService.createManualBooking(manualParticipant, options)
      })

      // Esperamos a que se completen todas las reservas
      const bookingResults = await Promise.all(bookingPromises)
      
      // Verificamos si alguna falló
      const failedBookings = bookingResults.filter(result => result.error)
      
      if (failedBookings.length > 0) {
        // Mejoramos el mensaje de error para mostrar información más detallada
        let errorMessages = failedBookings.map(b => {
          // Si hay un código de error específico, proporcionar un mensaje más descriptivo
          const errorCode = b.error?.code || '';
          const errorDetail = b.error?.details || '';
          
          let userFriendlyMessage = b.error?.message || 'Error desconocido';
          
          // Log para depuración
          console.error('Error en reserva:', {
            message: b.error?.message,
            code: errorCode,
            details: errorDetail
          });
          
          return userFriendlyMessage;
        });
        
        // Eliminar mensajes duplicados
        errorMessages = Array.from(new Set(errorMessages));
        
        setError(`Error al crear reservas: ${errorMessages.join('. ')}`);
        return
      }

      // Si todo salió bien, continuamos al paso de éxito
      setStep("success")
      
      // Notificamos al componente padre sobre los participantes añadidos
      selectedParticipants.forEach(participant => {
        onParticipantAdd(convertToUIParticipant(participant))
      })
      
      // Cerramos el modal después de un tiempo
      setTimeout(() => {
        handleClose()
      }, 2000)
    } catch (err) {
      console.error('Error inesperado en el componente:', err);
      setError(err instanceof Error ? err.message : "Error al crear las reservas. Por favor, inténtalo de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSummaryConfirm = () => {
    // Avanzamos al paso de pago
    setStep("payment")
  }

  const handleClose = () => {
    onClose()
    setStep("select")
    setSelectedParticipants([])
    setError(null)
    setBookingDetails(null)
  }

  useEffect(() => {
    // Verificar la disponibilidad de la sesión al abrir el modal
    if (isOpen) {
      // Si se proporcionan capacity y currentParticipants, usamos estos valores directamente
      if (capacity !== undefined && currentParticipants !== undefined) {
        const availableSpots = Math.max(0, capacity - currentParticipants);
        if (availableSpots <= 0) {
          setError(`No hay espacios disponibles en esta sesión. Disponibles: ${availableSpots}/${capacity}`);
        } else {
          // Limpiar el error si hay espacios disponibles
          setError(null);
        }
      } 
      // Si no se proporcionan, consultamos la API (comportamiento anterior)
      else if (sessionId) {
        manualBookingService.checkSessionAvailability(sessionId)
          .then(availability => {
            if (!availability.available) {
              setError(`No hay espacios disponibles en esta sesión. Disponibles: ${availability.availableSpots}/${availability.totalCapacity}`);
            } else {
              // Limpiar el error si hay espacios disponibles
              setError(null);
            }
          })
          .catch(err => {
            console.error("Error al verificar disponibilidad:", err);
          });
      }
    }
  }, [isOpen, sessionId, capacity, currentParticipants]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.95, x: 20 }}
          transition={{ 
            type: "spring",
            stiffness: 300,
            damping: 30,
            mass: 0.8
          }}
          className="fixed right-[520px] top-[35%] w-full max-w-sm bg-white rounded-xl shadow-lg z-50 border border-gray-100/50"
          style={{ transform: 'translateX(-100%)' }}
        >
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-900">
                {step === "select" 
                  ? "Participantes" 
                  : step === "summary" 
                    ? "Resumen" 
                    : step === "payment" 
                      ? "Pago" 
                      : "Completado"}
              </h3>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-500 rounded-lg p-1 hover:bg-gray-50 transition-colors duration-200"
              >
                <IconX size={16} />
              </button>
            </div>
            
            {/* Mensaje de error si existe */}
            {error && (
              <div className="mb-4 p-2 bg-red-50 border border-red-100 rounded-md text-xs text-red-600">
                {error}
              </div>
            )}
            
            <div className="mt-2">
              <AnimatePresence mode="wait">
                {step === "select" ? (
                  <motion.div
                    key="select"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <AddParticipantSection 
                      onParticipantAdd={handleParticipantAdd}
                    />
                    {selectedParticipants.length > 0 && (
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => setStep("summary")}
                          className={cn(
                            "inline-flex items-center gap-1.5",
                            "text-xs font-medium text-gray-900",
                            "px-3 py-1.5 rounded-md",
                            "hover:bg-gray-50",
                            "transition-colors duration-200"
                          )}
                        >
                          Siguiente
                          <IconArrowRight size={14} />
                        </button>
                      </div>
                    )}
                  </motion.div>
                ) : step === "summary" ? (
                  <motion.div
                    key="summary"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <ParticipantSummaryWrapper
                      participants={selectedParticipants}
                      onConfirm={handleSummaryConfirm}
                      onBack={() => setStep("select")}
                      date={date}
                      startTime={startTime}
                      endTime={endTime}
                    />
                  </motion.div>
                ) : step === "payment" ? (
                  <motion.div
                    key="payment"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <PaymentDetailsStep
                      onConfirm={handlePaymentConfirm}
                      onBack={() => setStep("summary")}
                      sessionPrice={sessionPrice}
                      isLoading={isLoading}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <SuccessMessage message="¡Reserva creada con éxito!" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 