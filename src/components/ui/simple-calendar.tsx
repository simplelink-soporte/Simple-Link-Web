"use client"

import { useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface SimpleCalendarProps {
  selected?: Date
  onSelect: (date: Date) => void
  minDate?: Date
  maxDate?: Date
}

export function SimpleCalendar({ selected, onSelect, minDate = new Date(), maxDate }: SimpleCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(selected || new Date())

  const handlePrevMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() - 1)
      return newDate
    })
  }

  const handleNextMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + 1)
      return newDate
    })
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()
    
    const days = []
    // Días del mes anterior
    for (let i = 0; i < startingDay; i++) {
      const prevMonthLastDay = new Date(year, month, 0)
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay.getDate() - startingDay + i + 1),
        isOutside: true
      })
    }
    // Días del mes actual
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isOutside: false
      })
    }
    // Días del mes siguiente
    const remainingDays = 42 - days.length // 6 semanas * 7 días
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isOutside: true
      })
    }
    return days
  }

  const isDateDisabled = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    date.setHours(0, 0, 0, 0)
    
    if (date < today) return true
    if (maxDate && date > maxDate) return true
    
    return false
  }

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.toDateString() === date2.toDateString()
  }

  return (
    <div className="p-3 bg-white">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button 
            onClick={handlePrevMonth}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <IconChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </span>
          <button 
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <IconChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"].map((day) => (
            <div key={day} className="h-8 text-xs font-medium text-gray-500 flex items-center justify-center">
              {day}
            </div>
          ))}
          {getDaysInMonth(currentMonth).map(({ date, isOutside }, index) => (
            <button
              key={index}
              onClick={() => !isDateDisabled(date) && onSelect(date)}
              disabled={isDateDisabled(date)}
              className={cn(
                "h-8 w-8 text-sm rounded-md flex items-center justify-center transition-colors",
                isOutside && "text-gray-400",
                isDateDisabled(date) && "text-gray-300 cursor-not-allowed",
                selected && isSameDay(date, selected) && "bg-black text-white",
                !isDateDisabled(date) && !selected?.toDateString() === date.toDateString() && "hover:bg-gray-100"
              )}
            >
              {date.getDate()}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
} 