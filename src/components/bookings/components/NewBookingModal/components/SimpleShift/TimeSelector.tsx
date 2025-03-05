import { motion } from "framer-motion"
import { TimeSlotSelector } from "@/components/ui/time-slot-selector"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { TimeSelection } from "../../types"

interface TimeSelectorProps {
  selectedDate?: Date
  timeSelection?: TimeSelection
  onTimeSelect: (time: TimeSelection) => void
}

export function TimeSelector({ 
  selectedDate, 
  timeSelection, 
  onTimeSelect 
}: TimeSelectorProps) {
  if (!selectedDate) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">
          Selecciona el horario para {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
        </h3>
        {timeSelection && (
          <span className="text-sm text-gray-500">
            {timeSelection.startTime} - {timeSelection.endTime}
            <span className="ml-1 text-gray-400">
              ({timeSelection.duration} min)
            </span>
          </span>
        )}
      </div>

      <TimeSlotSelector
        date={selectedDate}
        selection={timeSelection}
        onChange={onTimeSelect}
        className="rounded-lg border shadow-sm"
      />
    </motion.div>
  )
} 