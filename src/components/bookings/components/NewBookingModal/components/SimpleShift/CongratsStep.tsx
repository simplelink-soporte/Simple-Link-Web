import { motion } from "framer-motion"
import { IconCheck } from "@tabler/icons-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { Court } from "@/lib/data"

interface CongratsStepProps {
  selectedDate: Date
  selectedCourts: string[]
  courts: Court[]
  totalAmount: number
  rentals: any[]
}

export function CongratsStep({
  selectedDate,
  selectedCourts,
  courts,
  totalAmount,
  rentals
}: CongratsStepProps) {
  return (
    <div className="space-y-8 px-8 py-2 flex items-center justify-center min-h-[60vh]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center w-full"
      >
        {/* Círculo animado con check */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20,
            delay: 0.1
          }}
          className="relative w-20 h-20 mb-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
              delay: 0.2
            }}
            className="absolute inset-0 bg-black rounded-full"
          />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
              delay: 0.3
            }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <IconCheck className="w-10 h-10 text-white" stroke={2} />
          </motion.div>
        </motion.div>

        {/* Texto de confirmación */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <h3 className="text-xl font-medium text-gray-900">
            ¡Reserva Creada Exitosamente!
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Tu reserva ha sido confirmada y registrada en el sistema
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
} 