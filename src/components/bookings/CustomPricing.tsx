"use client"

import { useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { TimeSelect } from "@/components/ui/time-select"
import { IconTrash } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface TimeRange {
  startTime: string
  endTime: string
  percentage: number
}

interface CustomPricingConfig {
  [key: string]: {
    isSelected: boolean
    timeRanges: TimeRange[]
  }
}

interface CustomPricingProps {
  pricing: CustomPricingConfig
  onChange: (pricing: CustomPricingConfig) => void
  basePricing: Record<string, number>
  availableDurations: number[]
}

const DAYS = [
  { key: '1', label: 'L' },
  { key: '2', label: 'M' },
  { key: '3', label: 'X' },
  { key: '4', label: 'J' },
  { key: '5', label: 'V' },
  { key: '6', label: 'S' },
  { key: '7', label: 'D' },
] as const

const DAYS_COMPLETE = [
  { key: '1', label: 'Lunes' },
  { key: '2', label: 'Martes' },
  { key: '3', label: 'Miércoles' },
  { key: '4', label: 'Jueves' },
  { key: '5', label: 'Viernes' },
  { key: '6', label: 'Sábado' },
  { key: '7', label: 'Domingo' },
] as const

export function CustomPricing({
  pricing,
  onChange,
  basePricing,
  availableDurations
}: CustomPricingProps) {
  const [selectedDays, setSelectedDays] = useState<Record<string, boolean>>({})
  const [hasCustomPricing, setHasCustomPricing] = useState(false)

  // Inicializar el estado de los días seleccionados cuando se carga el pricing
  useEffect(() => {
    const initialSelectedDays = DAYS.reduce((acc, day) => {
      acc[day.key] = pricing[day.key]?.isSelected || false
      return acc
    }, {} as Record<string, boolean>)
    setSelectedDays(initialSelectedDays)
    
    // Verificar si hay algún día con precios personalizados
    const hasAnyCustomPricing = Object.values(pricing).some(day => day.isSelected)
    setHasCustomPricing(hasAnyCustomPricing)
  }, [pricing])

  const handleDayToggle = (day: string) => {
    const newSelectedDays = { ...selectedDays, [day]: !selectedDays[day] }
    setSelectedDays(newSelectedDays)

    const newPricing = { ...pricing }
    if (newSelectedDays[day]) {
      newPricing[day] = {
        isSelected: true,
        timeRanges: [
          {
            startTime: "09:00",
            endTime: "22:00",
            percentage: 0
          }
        ]
      }
    } else {
      if (newPricing[day]) {
        newPricing[day].isSelected = false
      }
    }
    onChange(newPricing)
  }

  const handleAddTimeRange = (day: string) => {
    const newPricing = { ...pricing }
    if (!newPricing[day]) {
      newPricing[day] = {
        isSelected: true,
        timeRanges: []
      }
    }
    newPricing[day].timeRanges.push({
      startTime: "09:00",
      endTime: "22:00",
      percentage: 0
    })
    onChange(newPricing)
  }

  const handleRemoveTimeRange = (day: string, index: number) => {
    const newPricing = { ...pricing }
    newPricing[day].timeRanges.splice(index, 1)
    if (newPricing[day].timeRanges.length === 0) {
      newPricing[day].isSelected = false
      setSelectedDays(prev => ({ ...prev, [day]: false }))
    }
    onChange(newPricing)
  }

  const handleTimeRangeChange = (
    day: string,
    index: number,
    field: keyof TimeRange,
    value: string | number
  ) => {
    const newPricing = { ...pricing }
    if (!newPricing[day]) {
      newPricing[day] = {
        isSelected: true,
        timeRanges: []
      }
    }
    newPricing[day].timeRanges[index] = {
      ...newPricing[day].timeRanges[index],
      [field]: value
    }
    onChange(newPricing)
  }

  const calculateFinalPrice = (basePrice: number, percentage: number) => {
    return basePrice + (basePrice * (percentage / 100))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100">
        <div className="space-y-0.5">
          <h3 className="text-sm font-medium text-gray-900">Precios personalizados</h3>
          <p className="text-sm text-gray-500">Ajusta los precios según el día y horario</p>
        </div>
        <Switch
          checked={hasCustomPricing}
          onCheckedChange={(checked) => {
            setHasCustomPricing(checked)
            if (!checked) onChange({})
          }}
          className="data-[state=checked]:bg-black"
        />
      </div>

      {hasCustomPricing && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-6"
        >
          {/* Selector de días */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">
              Selecciona los días
            </label>
            <div className="flex justify-center gap-2">
              {DAYS.map((day) => (
                <button
                  key={day.key}
                  onClick={() => handleDayToggle(day.key)}
                  className={cn(
                    "w-9 h-9 rounded-lg text-sm font-medium",
                    "transition-all duration-200",
                    selectedDays[day.key]
                      ? "bg-black text-white shadow-sm"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  )}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          {/* Configuración por día */}
          <div className="space-y-4">
            {DAYS_COMPLETE.map((day, index) => {
              if (!selectedDays[day.key]) return null

              return (
                <motion.div
                  key={day.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="space-y-4 p-4 rounded-lg border border-gray-200 bg-white"
                >
                  <span className="text-sm font-medium text-gray-900">
                    {day.label}
                  </span>

                  <div className="space-y-6">
                    {pricing[day.key]?.timeRanges.map((range, rangeIndex) => (
                      <div key={rangeIndex} className="space-y-4">
                        <div className="relative group">
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs text-gray-500">Desde</label>
                              <TimeSelect
                                value={range.startTime}
                                onChange={(value) => handleTimeRangeChange(day.key, rangeIndex, 'startTime', value)}
                                className="border-gray-200 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-black"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs text-gray-500">Hasta</label>
                              <TimeSelect
                                value={range.endTime}
                                onChange={(value) => handleTimeRangeChange(day.key, rangeIndex, 'endTime', value)}
                                className="border-gray-200 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-black"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs text-gray-500">Variación</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  value={range.percentage}
                                  onChange={(e) => handleTimeRangeChange(day.key, rangeIndex, 'percentage', Number(e.target.value))}
                                  placeholder="0"
                                  className={cn(
                                    "w-full h-10 px-3 text-right pr-8 text-sm",
                                    "rounded-md border border-gray-200",
                                    "focus:outline-none focus:border-black",
                                    "placeholder:text-gray-400",
                                    "[appearance:textfield]",
                                    "[&::-webkit-outer-spin-button]:appearance-none",
                                    "[&::-webkit-inner-spin-button]:appearance-none"
                                  )}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">
                                  %
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Botón de eliminar más sutil */}
                          {pricing[day.key].timeRanges.length > 1 && (
                            <button
                              onClick={() => handleRemoveTimeRange(day.key, rangeIndex)}
                              className={cn(
                                "absolute -right-1 top-2",
                                "w-5 h-5",
                                "flex items-center justify-center",
                                "text-gray-300 hover:text-red-500",
                                "transition-all duration-200",
                                "opacity-0 group-hover:opacity-100"
                              )}
                            >
                              <span className="sr-only">Eliminar rango</span>
                              ×
                            </button>
                          )}
                        </div>

                        {/* Vista previa de precios */}
                        <div className="pl-4 border-l-2 border-gray-100">
                          <div className="space-y-3">
                            <span className="text-xs font-medium text-gray-400">
                              Precios resultantes
                            </span>
                            <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                              {availableDurations.map(duration => {
                                const basePrice = basePricing[duration] || 0
                                const finalPrice = calculateFinalPrice(basePrice, range.percentage)
                                return (
                                  <div key={duration} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-500">
                                      {duration} min
                                    </span>
                                    {basePrice > 0 ? (
                                      <div className="text-right">
                                        <span className="text-xs text-gray-400 line-through">
                                          {basePrice}€
                                        </span>
                                        <span className="ml-2 text-sm font-medium text-gray-900">
                                          {finalPrice.toFixed(2)}€
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-sm text-gray-400">
                                        No definido
                                      </span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={() => handleAddTimeRange(day.key)}
                      className={cn(
                        "text-sm text-gray-500",
                        "hover:text-gray-900",
                        "transition-colors duration-200"
                      )}
                    >
                      + Agregar rango horario
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      )}
    </div>
  )
} 