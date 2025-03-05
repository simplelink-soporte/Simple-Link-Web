"use client"

import * as React from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react"

interface CustomCalendarProps {
  selected?: Date
  onSelect?: (date: Date) => void
  className?: string
  disabled?: (date: Date) => boolean
}

function CustomCalendar({
  selected,
  onSelect,
  className,
  disabled
}: CustomCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(selected || new Date())

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

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.toDateString() === date2.toDateString()
  }

  return (
    <div className={cn("p-3 bg-white rounded-lg", className)}>
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <button 
            onClick={handlePrevMonth}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <IconChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-base font-medium capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </span>
          <button 
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <IconChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-7 text-center gap-1">
          {["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"].map((day) => (
            <div key={day} className="text-xs text-gray-500 font-medium py-2">
              {day}
            </div>
          ))}
          {getDaysInMonth(currentMonth).map(({ date: dayDate, isOutside }, index) => {
            const isDisabled = disabled?.(dayDate) ?? false
            return (
              <button
                key={index}
                onClick={() => !isDisabled && onSelect?.(dayDate)}
                disabled={isDisabled}
                className={cn(
                  "h-10 w-10 text-sm rounded-md flex items-center justify-center",
                  isOutside && "text-gray-400",
                  isDisabled && "text-gray-300 cursor-not-allowed",
                  selected && isSameDay(dayDate, selected) && "bg-black text-white",
                  !isDisabled && (!selected || !isSameDay(dayDate, selected)) && "hover:bg-gray-100"
                )}
              >
                {dayDate.getDate()}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export { CustomCalendar }