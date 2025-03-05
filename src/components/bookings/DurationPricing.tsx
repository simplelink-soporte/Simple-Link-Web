"use client"

import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import type { DurationOption } from "@/types/court"

interface DurationPricingProps {
  durations: number[]
  pricing?: Record<string, number>
  onChange: (pricing: Record<string, number>) => void
}

export function DurationPricing({
  durations,
  pricing = {},
  onChange
}: DurationPricingProps) {
  const handlePriceChange = (duration: number, price: string) => {
    const numericPrice = price === '' ? 0 : parseFloat(price)
    onChange({
      ...pricing,
      [duration]: numericPrice
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Precios por duración
        </h3>
        <span className="text-xs text-gray-500">
          Precio base por reserva
        </span>
      </div>

      <div className="space-y-4">
        {durations.sort((a, b) => a - b).map((duration, index) => (
          <motion.div
            key={duration}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "group flex items-center gap-4",
              "p-4 rounded-lg",
              "border border-gray-200",
              "transition-all duration-200",
              "hover:border-gray-300"
            )}
          >
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {duration} minutos
                </span>
                <div className="relative">
                  <input
                    type="number"
                    value={pricing[duration] || ''}
                    onChange={(e) => handlePriceChange(duration, e.target.value)}
                    placeholder="0.00"
                    className={cn(
                      "w-24 text-right pr-5 text-sm",
                      "border-none outline-none",
                      "focus:ring-0 focus:outline-none",
                      "placeholder:text-gray-400",
                      "[appearance:textfield]",
                      "[&::-webkit-outer-spin-button]:appearance-none",
                      "[&::-webkit-inner-spin-button]:appearance-none"
                    )}
                  />
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">
                    $
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
} 