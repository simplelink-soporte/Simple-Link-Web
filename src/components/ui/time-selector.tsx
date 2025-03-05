"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { IconClock } from "@tabler/icons-react"

interface TimeSelectorProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function TimeSelector({ value, onChange, className }: TimeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedHour, setSelectedHour] = useState(value.split(':')[0])
  const [selectedMinute, setSelectedMinute] = useState(value.split(':')[1])

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'))

  // Actualizar la hora seleccionada cuando cambia el valor
  useEffect(() => {
    const [hour, minute] = value.split(':')
    setSelectedHour(hour)
    setSelectedMinute(minute)
  }, [value])

  // Cerrar el selector cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen) setIsOpen(false)
    }
    
    if (isOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isOpen])

  const handleTimeSelect = (hour: string, minute: string) => {
    onChange(`${hour}:${minute}`)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <div 
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className={cn(
          "flex items-center justify-between w-full px-3 py-2 text-sm",
          "border rounded-md bg-white cursor-pointer",
          "hover:border-gray-300 transition-colors duration-200",
          className
        )}
      >
        <span>{value}</span>
        <IconClock className="h-4 w-4 text-gray-400" />
      </div>

      {isOpen && (
        <div 
          className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex divide-x">
            {/* Columna de horas */}
            <div className="flex-1 h-48 overflow-y-auto">
              <div className="py-1 px-2 text-xs font-medium text-gray-500 sticky top-0 bg-gray-50">
                Hora
              </div>
              {hours.map((hour) => (
                <button
                  key={hour}
                  onClick={() => handleTimeSelect(hour, selectedMinute)}
                  className={cn(
                    "w-full px-2 py-1 text-left text-sm",
                    hour === selectedHour
                      ? "bg-gray-100 text-gray-900 font-medium"
                      : "hover:bg-gray-50"
                  )}
                >
                  {hour}
                </button>
              ))}
            </div>

            {/* Columna de minutos */}
            <div className="flex-1 h-48 overflow-y-auto">
              <div className="py-1 px-2 text-xs font-medium text-gray-500 sticky top-0 bg-gray-50">
                Minuto
              </div>
              {minutes.map((minute) => (
                <button
                  key={minute}
                  onClick={() => handleTimeSelect(selectedHour, minute)}
                  className={cn(
                    "w-full px-2 py-1 text-left text-sm",
                    minute === selectedMinute
                      ? "bg-gray-100 text-gray-900 font-medium"
                      : "hover:bg-gray-50"
                  )}
                >
                  {minute}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 