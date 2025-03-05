import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { PaymentIcon } from "./PaymentIcon"
import type { PaymentMethod, PaymentOption } from "../types"

interface PaymentOptionsProps {
  options: PaymentOption[]
  selected: PaymentMethod | null
  onSelect: (method: PaymentMethod) => void
}

export function PaymentOptions({ options, selected, onSelect }: PaymentOptionsProps) {
  return (
    <div className="grid gap-3">
      {options.map((option) => {
        const isSelected = selected === option.method
        
        return (
          <motion.button
            key={option.method}
            onClick={() => onSelect(option.method)}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "relative w-full p-4 rounded-lg border text-left",
              "transition-all duration-200",
              isSelected
                ? "bg-gray-50 border-gray-900/10 shadow-sm"
                : "bg-white border-gray-200 hover:border-gray-300"
            )}
          >
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <PaymentIcon method={option.method} className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900">
                  {option.title}
                </h3>
                <p className="text-sm text-gray-500">
                  {option.description}
                </p>
              </div>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
} 