"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { IconClock } from "@tabler/icons-react"

interface TimeSelectProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function TimeSelect({ value, onChange, className }: TimeSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedHour, setSelectedHour] = useState(value.split(':')[0])
  const [selectedMinute, setSelectedMinute] = useState(value.split(':')[1])

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'))

  // Cerrar el selector cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = () => setIsOpen(false)
    if (isOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isOpen])

  // Actualizar la hora seleccionada cuando cambia el valor
  useEffect(() => {
    const [hour, minute] = value.split(':')
    setSelectedHour(hour)
    setSelectedMinute(minute)
  }, [value])

  const handleTimeSelect = (hour: string, minute: string) => {
    onChange(`${hour}:${minute}`)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          readOnly
          onClick={(e) => {
            e.stopPropagation()
            setIsOpen(!isOpen)
          }}
          className={cn(
            "w-full px-3 pr-8 py-2 rounded-lg border bg-white cursor-pointer",
            "focus:outline-none focus:border-gray-300",
            "transition-colors duration-200",
            className
          )}
        />
        <IconClock className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
      </div>

      {isOpen && (
        <div 
          className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex divide-x border-b">
            <div className="flex-1 py-1 text-center text-xs font-medium text-gray-500">
              Hora
            </div>
            <div className="flex-1 py-1 text-center text-xs font-medium text-gray-500">
              Minutos
            </div>
          </div>
          <div className="flex divide-x" style={{ height: '200px' }}>
            {/* Columna de horas */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
              {hours.map((hour) => (
                <button
                  key={hour}
                  onClick={() => handleTimeSelect(hour, selectedMinute)}
                  className={cn(
                    "w-full px-3 py-1.5 text-left text-sm",
                    "transition-colors duration-200",
                    hour === selectedHour
                      ? "bg-gray-100 text-gray-900 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  {hour}
                </button>
              ))}
            </div>

            {/* Columna de minutos */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
              {minutes.map((minute) => (
                <button
                  key={minute}
                  onClick={() => handleTimeSelect(selectedHour, minute)}
                  className={cn(
                    "w-full px-3 py-1.5 text-left text-sm",
                    "transition-colors duration-200",
                    minute === selectedMinute
                      ? "bg-gray-100 text-gray-900 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
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