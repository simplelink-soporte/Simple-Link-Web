import { motion } from "framer-motion"
import { IconClock, IconUsers } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import type { BookingType } from "../types"
import { useEffect } from "react"

const bookingTypeOptions = [
  {
    id: 'shift',
    title: 'Reserva Simple',
    description: 'Reserva una cancha para jugar',
    icon: (
      <div className="relative w-9 h-9">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-50/40 to-amber-100/40 rounded-lg" />
        <div className="absolute inset-0 flex items-center justify-center">
          <IconClock className="h-4.5 w-4.5 text-amber-600/80" strokeWidth={1.5} />
        </div>
      </div>
    ),
    colors: {
      gradient: 'from-amber-50/40 to-amber-100/40',
      text: 'text-amber-600/80',
      hover: 'hover:border-amber-200/60'
    }
  },
  {
    id: 'class',
    title: 'Crear Clase',
    description: 'Crea una clase y compártela',
    icon: (
      <div className="relative w-9 h-9">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/40 to-blue-100/40 rounded-lg" />
        <div className="absolute inset-0 flex items-center justify-center">
          <IconUsers className="h-4.5 w-4.5 text-blue-600/80" strokeWidth={1.5} />
        </div>
      </div>
    ),
    colors: {
      gradient: 'from-blue-50/40 to-blue-100/40',
      text: 'text-blue-600/80',
      hover: 'hover:border-blue-200/60'
    }
  }
]

interface BookingTypeSelectorProps {
  selectedType?: BookingType
  onSelect: (type: BookingType) => void
  onValidationChange: (isValid: boolean) => void
}

export function BookingTypeSelector({ 
  selectedType, 
  onSelect,
  onValidationChange 
}: BookingTypeSelectorProps) {
  // Validar cuando cambie el tipo seleccionado
  useEffect(() => {
    onValidationChange(!!selectedType)
  }, [selectedType, onValidationChange])

  return (
    <div className="space-y-8 px-8 py-2">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid gap-3"
      >
        {bookingTypeOptions.map((option) => (
          <motion.button
            key={option.id}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.995 }}
            onClick={() => onSelect(option.id)}
            className={cn(
              "group relative w-full px-4 py-3.5 rounded-lg border transition-all duration-200",
              "hover:bg-gray-50/50",
              selectedType === option.id
                ? "bg-gray-50 ring-1 ring-black/5 border-transparent"
                : "bg-white border-gray-200 hover:border-gray-300"
            )}
          >
            <div className="flex items-center gap-4">
              {option.icon}
              <div className="flex-1 text-left">
                <h3 className={cn(
                  "font-medium transition-colors text-[15px]",
                  selectedType === option.id
                    ? "text-gray-900"
                    : "text-gray-700"
                )}>
                  {option.title}
                </h3>
                <p className={cn(
                  "text-sm transition-colors",
                  selectedType === option.id
                    ? "text-gray-600"
                    : "text-gray-500"
                )}>
                  {option.description}
                </p>
              </div>

              <div className={cn(
                "w-2 h-2 rounded-full transition-all",
                selectedType === option.id
                  ? "bg-black scale-110"
                  : "bg-gray-300"
              )} />
            </div>
          </motion.button>
        ))}
      </motion.div>

      {selectedType && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-1"
        >
          <p className="text-xs text-gray-500 text-center">
            {selectedType === 'shift' 
              ? 'Configura los detalles de tu reserva en el siguiente paso'
              : 'Personaliza tu clase en el siguiente paso'
            }
          </p>
        </motion.div>
      )}
    </div>
  )
} 