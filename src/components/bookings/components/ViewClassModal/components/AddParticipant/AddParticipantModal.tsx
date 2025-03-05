import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AddParticipantSection } from "./AddParticipantSection"
import { ParticipantsSummary } from "./ParticipantsSummary"
import { SuccessMessage } from "./SuccessMessage"
import type { Participant } from "@/types/bookings"
import { IconX, IconArrowRight } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface AddParticipantModalProps {
  isOpen: boolean
  onClose: () => void
  onParticipantAdd: (participant: Participant) => void
}

type Step = "select" | "summary" | "success"

export function AddParticipantModal({
  isOpen,
  onClose,
  onParticipantAdd
}: AddParticipantModalProps) {
  const [step, setStep] = useState<Step>("select")
  const [selectedParticipants, setSelectedParticipants] = useState<Participant[]>([])

  const handleParticipantAdd = (participant: Participant) => {
    setSelectedParticipants(prev => {
      // Verificar si el participante ya existe
      if (prev.some(p => p.id === participant.id)) {
        return prev
      }
      return [...prev, participant]
    })
  }

  const handleConfirm = () => {
    // Agregar todos los participantes seleccionados
    selectedParticipants.forEach(participant => {
      onParticipantAdd(participant)
    })
    // Mostrar mensaje de éxito
    setStep("success")
    // Cerrar el modal después de un momento
    setTimeout(() => {
      handleClose()
    }, 1500)
  }

  const handleClose = () => {
    onClose()
    setStep("select")
    setSelectedParticipants([])
  }

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
                Participantes
              </h3>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-500 rounded-lg p-1 hover:bg-gray-50 transition-colors duration-200"
              >
                <IconX size={16} />
              </button>
            </div>
            
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
                    <ParticipantsSummary
                      participants={selectedParticipants}
                      onConfirm={handleConfirm}
                      onBack={() => setStep("select")}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <SuccessMessage message="¡Listo!" />
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