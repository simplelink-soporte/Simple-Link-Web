import { motion } from "framer-motion"
import type { BookingStep } from "./types"

interface ClassBookingProps {
  currentStep: BookingStep
  // ... props necesarias
}

export function ClassBooking({ currentStep, ...props }: ClassBookingProps) {
  // Renderiza los pasos específicos de crear clase
  return (
    <div className="space-y-8 px-8 py-2">
      {/* ... contenido según el paso actual */}
    </div>
  )
} 