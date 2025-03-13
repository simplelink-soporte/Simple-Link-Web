import { motion, AnimatePresence } from "framer-motion"
import { EnrolledParticipantsSection } from "./EnrolledParticipantsSection"
import { ParticipantBookingDetail } from "./ParticipantBookingDetail"
import type { Participant } from "@/types/bookings"
import { IconX } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { ClassParticipant } from "@/services/classParticipantService"

interface ViewParticipantsModalProps {
  isOpen: boolean
  onClose: () => void
  participants: Participant[]
  classId?: string
  date?: string        // Fecha de la sesión
  startTime?: string   // Hora de inicio de la sesión
  endTime?: string     // Hora de fin de la sesión
  branchId?: string    // ID de la sede para la conversión de zona horaria
  classStatus?: string // Estado de la clase (active, completed, cancelled)
}

export function ViewParticipantsModal({
  isOpen,
  onClose,
  participants,
  classId,
  date,
  startTime,
  endTime,
  branchId,
  classStatus = 'active' // Valor por defecto
}: ViewParticipantsModalProps) {
  const [selectedParticipant, setSelectedParticipant] = useState<ClassParticipant | null>(null);
  
  // Vista actual: "list" para la lista de participantes, "detail" para los detalles de un participante
  const [currentView, setCurrentView] = useState<"list" | "detail">("list");

  const handleSelectParticipant = (participant: ClassParticipant) => {
    setSelectedParticipant(participant);
    setCurrentView("detail");
  };

  const handleBackToList = () => {
    setCurrentView("list");
    setSelectedParticipant(null);
  };

  useEffect(() => {
    // Al abrir el modal, asegurarnos de que comience en la vista de lista
    if (isOpen) {
      setCurrentView("list");
      setSelectedParticipant(null);
    }
  }, [isOpen]);

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
          className="fixed right-[520px] top-[10%] w-full max-w-sm bg-white rounded-xl shadow-lg z-50 border border-gray-100/50"
          style={{ transform: 'translateX(-100%)' }}
        >
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-900">
                {currentView === "list" ? "Participantes" : "Detalles de participante"}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 rounded-lg p-1 hover:bg-gray-50 transition-colors duration-200"
              >
                <IconX size={16} />
              </button>
            </div>
            
            <div className="mt-2">
              <AnimatePresence mode="wait">
                {currentView === "list" ? (
                  <motion.div
                    key="enrolled-participants"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <EnrolledParticipantsSection 
                      participants={participants}
                      classId={classId}
                      date={date}
                      startTime={startTime}
                      endTime={endTime}
                      branchId={branchId}
                      onSelectParticipant={handleSelectParticipant}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="participant-details"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <ParticipantBookingDetail 
                      participant={selectedParticipant}
                      onBack={handleBackToList}
                      classStatus={classStatus}
                    />
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