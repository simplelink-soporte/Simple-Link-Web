import { motion } from "framer-motion"
import { courts } from "@/lib/data"
import { cn } from "@/lib/utils"

interface CourtSelectorProps {
  selectedCourts: string[]
  onCourtSelect: (courtId: string) => void
}

export function CourtSelector({ selectedCourts, onCourtSelect }: CourtSelectorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">
          Selecciona la cancha
        </h3>
        {selectedCourts.length > 0 && (
          <span className="text-sm text-gray-500">
            {selectedCourts.length} {selectedCourts.length === 1 ? 'cancha' : 'canchas'} seleccionada{selectedCourts.length !== 1 && 's'}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {courts.map((court) => (
          <motion.button
            key={court.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onCourtSelect(court.id)}
            className={cn(
              "p-4 rounded-lg border transition-all duration-200",
              selectedCourts.includes(court.id)
                ? "bg-gray-50 ring-1 ring-black/5 border-transparent"
                : "bg-white border-gray-200 hover:border-gray-300"
            )}
          >
            <h4 className="font-medium text-gray-900">{court.name}</h4>
            <p className="text-sm text-gray-500">{court.description}</p>
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
} 