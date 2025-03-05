import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { IconCalendar } from "@tabler/icons-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface CancelMembershipModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string, cancelDate: Date) => void
}

export function CancelMembershipModal({ isOpen, onClose, onConfirm }: CancelMembershipModalProps) {
  const [reason, setReason] = useState("")
  const [date, setDate] = useState<Date>()
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const handleSubmit = () => {
    if (!date) return
    onConfirm(reason, date)
    onClose()
    setReason("")
    setDate(undefined)
  }

  const today = new Date()
  const maxDate = new Date()
  maxDate.setMonth(maxDate.getMonth() + 3)

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
    return date < today || date > maxDate
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-lg shadow-lg z-50"
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                Cancelar Membresía
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Razón de cancelación
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full p-2 border rounded-md focus:border-black outline-none transition-colors bg-transparent resize-none h-32"
                    placeholder="Ingrese el motivo de la cancelación..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Fecha de cancelación
                  </label>
                  <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                    <PopoverTrigger asChild>
                      <button
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 text-left",
                          "border rounded-md hover:border-black transition-colors",
                          !date && "text-gray-500"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <IconCalendar className="h-4 w-4" />
                          {date ? format(date, "PPP", { locale: es }) : "Seleccione una fecha"}
                        </span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <div className="p-3 bg-white rounded-lg shadow-lg">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <button 
                              onClick={handlePrevMonth}
                              className="p-2 hover:bg-gray-100 rounded-md"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                              </svg>
                            </button>
                            <span className="text-sm font-medium">
                              {format(currentMonth, "MMMM yyyy", { locale: es })}
                            </span>
                            <button 
                              onClick={handleNextMonth}
                              className="p-2 hover:bg-gray-100 rounded-md"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </div>
                          <div className="grid grid-cols-7 text-center">
                            {["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"].map((day) => (
                              <div key={day} className="text-xs text-gray-500 font-medium py-1">
                                {day}
                              </div>
                            ))}
                            {getDaysInMonth(currentMonth).map(({ date: dayDate, isOutside }, index) => (
                              <button
                                key={index}
                                onClick={() => {
                                  if (!isDateDisabled(dayDate)) {
                                    setDate(dayDate)
                                    setIsPopoverOpen(false)
                                  }
                                }}
                                disabled={isDateDisabled(dayDate)}
                                className={cn(
                                  "h-8 w-8 text-sm rounded-md flex items-center justify-center",
                                  isOutside && "text-gray-400",
                                  isDateDisabled(dayDate) && "text-gray-300 cursor-not-allowed",
                                  date?.toDateString() === dayDate.toDateString() && "bg-black text-white",
                                  !isDateDisabled(dayDate) && !date?.toDateString() === dayDate.toDateString() && "hover:bg-gray-100",
                                )}
                              >
                                {dayDate.getDate()}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-gray-500 mt-1">
                    Puede seleccionar una fecha hasta 3 meses en el futuro
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
                >
                  Volver
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!date}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Cancelar Membresía
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
