"use client"

import { useState, useRef, useEffect } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CustomCalendar } from "@/components/ui/custom-calendar"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface DateSelectorProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
  className?: string
  direction?: 'up' | 'down'
}

export function DateSelector({ 
  selectedDate, 
  onDateChange, 
  className,
  direction = 'up'
}: DateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleDateSelect = (date: Date) => {
    onDateChange(date)
    setIsOpen(false)
  }

  // Función para capitalizar la primera letra
  const capitalizeFirstLetter = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex flex-col items-center justify-center gap-0.5 px-3 py-1.5",
          "bg-white hover:bg-gray-50 h-full w-full",
          "border border-gray-200 rounded-md transition-colors duration-200",
          "text-black"
        )}
      >
        <div className="h-3 relative flex items-center overflow-hidden">
          <AnimatePresence initial={false} mode="wait" custom={direction}>
            <motion.span
              key={`month-${selectedDate.toISOString()}`}
              custom={direction}
              initial={{ y: direction === 'up' ? 10 : -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: direction === 'up' ? -10 : 10, opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
              className="text-[0.65rem] font-medium text-gray-500 uppercase tracking-wide"
            >
              {capitalizeFirstLetter(format(selectedDate, "MMM", { locale: es }))}
            </motion.span>
          </AnimatePresence>
        </div>

        <div className="h-5 relative flex items-center overflow-hidden">
          <AnimatePresence initial={false} mode="wait" custom={direction}>
            <motion.span
              key={`day-${selectedDate.toISOString()}`}
              custom={direction}
              initial={{ y: direction === 'up' ? 15 : -15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: direction === 'up' ? -15 : 15, opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
              className="text-lg font-semibold leading-none"
            >
              {format(selectedDate, "d")}
            </motion.span>
          </AnimatePresence>
        </div>
      </button>

      {isOpen && (
        <div 
          className="absolute top-full left-0 mt-2"
          style={{ zIndex: 10000 }}
        >
          <div 
            className="bg-white rounded-lg border border-gray-200 shadow-lg" 
            style={{ width: '320px' }}
          >
            <CustomCalendar
              selected={selectedDate}
              onSelect={handleDateSelect}
            />
          </div>
        </div>
      )}
    </div>
  )
} 