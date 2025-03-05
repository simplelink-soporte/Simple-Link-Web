import { motion, AnimatePresence } from "framer-motion"
import { EnrolledParticipantsSection } from "./EnrolledParticipantsSection"
import type { Participant } from "@/types/bookings"
import { IconX } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface ViewParticipantsModalProps {
  isOpen: boolean
  onClose: () => void
  participants: Participant[]
}

export function ViewParticipantsModal({
  isOpen,
  onClose,
  participants
}: ViewParticipantsModalProps) {
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
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 rounded-lg p-1 hover:bg-gray-50 transition-colors duration-200"
              >
                <IconX size={16} />
              </button>
            </div>
            
            <div className="mt-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key="enrolled-participants"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <EnrolledParticipantsSection 
                    participants={participants}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 