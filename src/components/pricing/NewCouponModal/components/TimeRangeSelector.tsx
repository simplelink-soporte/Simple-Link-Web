import { motion } from "framer-motion"
import { IconClock, IconSun } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface TimeRangeSelectorProps {
  value: 'all' | 'custom'
  onChange: (value: 'all' | 'custom') => void
}

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  const options = [
    { id: 'all', label: 'Todo el día', icon: IconSun },
    { id: 'custom', label: 'Horario específico', icon: IconClock }
  ] as const

  return (
    <div className="flex gap-1">
      {options.map((option) => (
        <motion.button
          key={option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            "p-1.5 rounded-md transition-all duration-200",
            "hover:bg-gray-50",
            "focus:outline-none focus:ring-0",
            "flex items-center gap-1.5",
            value === option.id
              ? "text-black bg-gray-100"
              : "text-gray-500"
          )}
          whileTap={{ scale: 0.97 }}
        >
          <option.icon 
            className="w-3.5 h-3.5" 
            strokeWidth={1.5}
          />
          <span className="text-xs">
            {option.label}
          </span>
        </motion.button>
      ))}
    </div>
  )
} 