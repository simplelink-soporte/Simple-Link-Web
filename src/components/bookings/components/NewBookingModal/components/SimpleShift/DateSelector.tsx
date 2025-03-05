import { motion } from "framer-motion"
import { CustomCalendar } from "@/components/ui/custom-calendar"
import { es } from "date-fns/locale"
import { format } from "date-fns"

interface DateSelectorProps {
  selectedDate?: Date
  onDateSelect: (date: Date | undefined) => void
}

export function DateSelector({ selectedDate, onDateSelect }: DateSelectorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">
          Selecciona una fecha
        </h3>
        {selectedDate && (
          <span className="text-sm text-gray-500">
            {format(selectedDate, "d 'de' MMMM, yyyy", { locale: es })}
          </span>
        )}
      </div>

      <CustomCalendar
        mode="single"
        selected={selectedDate}
        onSelect={onDateSelect}
        locale={es}
        className="rounded-lg border shadow-sm"
      />
    </motion.div>
  )
} 