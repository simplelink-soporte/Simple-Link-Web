"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { useBranchContext } from "@/contexts/BranchContext"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/services/supabase"
import { useBusinessHours } from "@/hooks/useBusinessHours"
import { useDateContext } from "@/contexts/DateContext"

interface TimeSlot {
  hour: string
  subSlots: {
    time: string
    minutes: number
    isAvailable: boolean
  }[]
}

interface TimeSelection {
  startTime: string
  endTime: string
  duration: number
}

interface TimeSlotSelectorProps {
  selectedCourts: string[]
  selectedDate?: Date
  onTimeSelect: (selection: {
    startTime: string
    endTime: string
    duration: number
  }) => void
}

const generateTimeSlots = (
  scheduleData: any[], 
  businessHours: any,
  isTimeInRange?: (time: string) => boolean
): TimeSlot[] => {
  if (!businessHours?.start || !businessHours?.end) {
    console.log('⚠️ No hay horarios definidos')
    return []
  }

  console.log('📍 Generando slots para horario:', businessHours)
  console.log('📍 Reservas existentes:', scheduleData)
  
  const slots: TimeSlot[] = []
  const [startHour] = businessHours.start.split(':').map(Number)
  const [endHour] = businessHours.end.split(':').map(Number)

  // Crear un mapa de slots ocupados por cancha
  const bookedSlotsByCourtId = new Map<string, Set<number>>()
  
  // Filtrar las reservas canceladas
  const activeBookings = scheduleData.filter(booking => booking.payment_status !== 'cancelled')
  
  activeBookings.forEach(booking => {
    if (!bookedSlotsByCourtId.has(booking.court_id)) {
      bookedSlotsByCourtId.set(booking.court_id, new Set())
    }
    
    const bookingStart = timeToMinutes(booking.start_time)
    const bookingEnd = timeToMinutes(booking.end_time)
    const duration = bookingEnd - bookingStart
    
    // Agregar todos los slots de 15 minutos que ocupa la reserva
    for (let i = 0; i < duration; i += 15) {
      bookedSlotsByCourtId.get(booking.court_id)?.add(bookingStart + i)
    }
  })

  for (let hour = startHour; hour <= endHour; hour++) {
    const hourString = `${hour.toString().padStart(2, '0')}:00`
    const subSlots = []

    for (let minutes = 0; minutes < 60; minutes += 15) {
      const time = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
      const totalMinutes = hour * 60 + minutes
      
      // Solo agregar el slot si está dentro del rango y disponible
      if (typeof isTimeInRange === 'function' && isTimeInRange(time)) {
        // Un slot está disponible si no está ocupado en ninguna de las canchas seleccionadas
        const isAvailable = !Array.from(bookedSlotsByCourtId.entries()).some(([courtId, bookedSlots]) => 
          bookedSlots.has(totalMinutes)
        )

        subSlots.push({
          time: minutesToTime(totalMinutes),
          minutes: totalMinutes,
          isAvailable
        })
      }
    }

    if (subSlots.length > 0) {
      slots.push({
        hour: hourString,
        subSlots
      })
    }
  }

  return slots
}

const timeToMinutes = (time: string): number => {
  if (!time) return 0
  const [hours, minutes] = time.split(':').map(Number)
  return (hours * 60) + minutes
}

const minutesToTime = (minutes: number): string => {
  if (isNaN(minutes)) return '00:00'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

export function TimeSlotSelector({ selectedCourts, selectedDate: propSelectedDate, onTimeSelect }: TimeSlotSelectorProps) {
  const { currentBranch } = useBranchContext()
  const { selectedDate: contextSelectedDate } = useDateContext()
  const effectiveDate = propSelectedDate || contextSelectedDate
  const { businessHours, isTimeInRange, isOpen } = useBusinessHours(effectiveDate)
  const [isMouseDown, setIsMouseDown] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [selection, setSelection] = useState<TimeSelection | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number, y: number } | null>(null)
  const selectionStartRef = useRef<{ time: string } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Consulta para obtener las reservas del día
  const { data: scheduleData = [], isLoading } = useQuery({
    queryKey: ['schedule', currentBranch?.id, selectedCourts, effectiveDate?.toISOString().split('T')[0]],
    queryFn: async () => {
      if (!currentBranch?.id || selectedCourts.length === 0) return []

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('branch_id', currentBranch.id)
        .in('court_id', selectedCourts)
        .eq('date', effectiveDate?.toISOString().split('T')[0])

      if (error) throw error
      return data || []
    },
    enabled: !!currentBranch?.id && selectedCourts.length > 0 && !!effectiveDate
  })

  // Si no hay fecha seleccionada o no hay horarios, mostrar mensaje
  if (!effectiveDate || !businessHours || !isOpen) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-white rounded-lg border">
        <p className="text-sm text-gray-500">
          {!effectiveDate ? "Selecciona una fecha" : !businessHours ? "Cargando horarios..." : "El negocio está cerrado en este horario"}
        </p>
      </div>
    )
  }

  const timeSlots = generateTimeSlots(scheduleData, businessHours, isTimeInRange)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-white rounded-lg border">
        <p className="text-sm text-gray-500">Cargando horarios disponibles...</p>
      </div>
    )
  }

  if (timeSlots.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-white rounded-lg border">
        <p className="text-sm text-gray-500">No hay horarios disponibles para este día</p>
      </div>
    )
  }

  const getNextTimeSlot = (time: string): string => {
    const minutes = timeToMinutes(time)
    return minutesToTime(minutes + 15)
  }

  const isSlotSelected = (time: string): boolean => {
    if (!selection) return false
    const timeMinutes = timeToMinutes(time)
    const startMinutes = timeToMinutes(selection.startTime)
    const endMinutes = timeToMinutes(selection.endTime)
    return timeMinutes >= Math.min(startMinutes, endMinutes) && 
           timeMinutes < Math.max(startMinutes, endMinutes)
  }

  const formatDuration = (startTime: string, endTime: string): string => {
    const start = timeToMinutes(startTime)
    const end = timeToMinutes(endTime)
    const duration = end - start
    const hours = Math.floor(duration / 60)
    const minutes = duration % 60
    
    let durationText = ''
    if (hours === 0) durationText = `${minutes}min`
    else if (minutes === 0) durationText = `${hours}h`
    else durationText = `${hours}h ${minutes}min`
    
    const formattedStart = startTime.replace(':00 ', '')
    const formattedEnd = endTime.replace(':00 ', '')
    
    return `${formattedStart} - ${formattedEnd} (${durationText})`
  }

  const handleMouseDown = (time: string, isAvailable: boolean, event: React.MouseEvent) => {
    if (!isAvailable) return
    
    event.preventDefault()
    setIsMouseDown(true)
    setIsDragging(true)
    selectionStartRef.current = { time }
    
    const nextSlot = getNextTimeSlot(time)
    setSelection({
      startTime: time,
      endTime: nextSlot,
      duration: 15
    })

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setTooltipPosition({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top - 10
      })
    }
  }

  const handleMouseEnter = (time: string, isAvailable: boolean, event: React.MouseEvent) => {
    if (!isMouseDown || !isDragging || !selectionStartRef.current || !isAvailable || !businessHours) return

    try {
      const startMinutes = timeToMinutes(selectionStartRef.current.time)
      const currentMinutes = timeToMinutes(time)
      
      const minTime = Math.min(startMinutes, currentMinutes)
      const maxTime = Math.max(startMinutes, currentMinutes)
      
      // Verificar límites del horario de la sede
      const startLimit = timeToMinutes(businessHours.start)
      const endLimit = timeToMinutes(businessHours.end)
      
      if (minTime < startLimit || maxTime > endLimit) return
      
      // Verificar que todos los slots en el rango estén disponibles
      const allSlotsAvailable = timeSlots.every(hourSlot =>
        hourSlot.subSlots.every(subSlot => {
          const slotMinutes = timeToMinutes(subSlot.time)
          return slotMinutes < minTime || slotMinutes >= maxTime || subSlot.isAvailable
        })
      )

      if (!allSlotsAvailable) return

      const slots = Math.ceil((maxTime - minTime) / 15)
      const endTime = minTime + (slots * 15)
      
      // Asegurarse de que la selección no exceda el horario de la sede
      const finalEndTime = Math.min(endTime, endLimit)

      setSelection({
        startTime: minutesToTime(minTime),
        endTime: minutesToTime(finalEndTime),
        duration: Math.ceil((finalEndTime - minTime) / 15) * 15
      })

    } catch (error) {
      console.error('Error handling mouse enter:', error)
    }
  }

  const handleMouseUp = () => {
    if (isMouseDown && selection) {
      onTimeSelect(selection)
    }
    setIsMouseDown(false)
    setIsDragging(false)
  }

  const handleMouseLeave = () => {
    if (isMouseDown) {
      setIsMouseDown(false)
      setIsDragging(false)
    }
  }

  return (
    <div className="space-y-4">
      <div 
        ref={containerRef}
        className="select-none bg-white rounded-lg border relative overflow-hidden"
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <div className="grid grid-cols-[auto,1fr] divide-x">
          <div className="pr-2">
            {timeSlots.map((slot) => (
              <div 
                key={slot.hour}
                className="h-[40px] flex items-center justify-end px-2"
              >
                <span className="text-[11px] text-gray-400 font-medium">
                  {slot.hour}
                </span>
              </div>
            ))}
          </div>

          <div className="relative">
            <div className="absolute inset-0 pointer-events-none">
              {timeSlots.map((_, index) => (
                <div 
                  key={index}
                  className="h-[40px] border-b"
                  style={{
                    borderColor: index === timeSlots.length - 1 ? 'transparent' : undefined
                  }}
                />
              ))}
            </div>

            <div className="relative">
              {timeSlots.map((hourSlot) => (
                <div 
                  key={hourSlot.hour} 
                  className="h-[40px] relative"
                >
                  {hourSlot.subSlots.map((subSlot, subIndex) => (
                    <div
                      key={subSlot.time}
                      className={cn(
                        "absolute transition-colors",
                        subSlot.isAvailable ? "cursor-pointer" : "cursor-not-allowed bg-gray-100/50",
                        isSlotSelected(subSlot.time) && "bg-gray-100"
                      )}
                      style={{
                        top: `${(subIndex * 25)}%`,
                        height: '25%',
                        left: 0,
                        right: 0
                      }}
                      onMouseDown={(e) => handleMouseDown(subSlot.time, subSlot.isAvailable, e)}
                      onMouseEnter={(e) => handleMouseEnter(subSlot.time, subSlot.isAvailable, e)}
                    />
                  ))}
                </div>
              ))}
            </div>

            <div 
              className="absolute left-0 right-0 h-[10px] bottom-0"
              onMouseEnter={(e) => {
                if (isMouseDown && isDragging) {
                  const lastSlot = timeSlots[timeSlots.length - 1].subSlots[3]
                  handleMouseEnter(lastSlot.time, lastSlot.isAvailable, e)
                }
              }}
              onMouseMove={(e) => {
                if (isMouseDown && isDragging) {
                  const lastSlot = timeSlots[timeSlots.length - 1].subSlots[3]
                  handleMouseEnter(lastSlot.time, lastSlot.isAvailable, e)
                }
              }}
            />
          </div>
        </div>

        <AnimatePresence>
          {selection && tooltipPosition && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute text-xs px-2 py-1 pointer-events-none whitespace-nowrap z-50 text-gray-900"
              style={{
                left: `${tooltipPosition.x}px`,
                top: `${tooltipPosition.y}px`,
                transform: 'translate(-50%, -100%)'
              }}
            >
              {formatDuration(selection.startTime, selection.endTime)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        {selection && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="bg-white rounded-lg border border-gray-100"
          >
            <div className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-[2px] self-stretch bg-black/10" />
                <div className="flex-1 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs text-gray-400">
                      Horario seleccionado
                    </p>
                    <p className="text-sm text-gray-900">
                      {selection.startTime.replace(':00 ', '')} - {selection.endTime.replace(':00 ', '')}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500">
                    {(() => {
                      const start = timeToMinutes(selection.startTime)
                      const end = timeToMinutes(selection.endTime)
                      const duration = end - start
                      const hours = Math.floor(duration / 60)
                      const minutes = duration % 60
                      
                      if (hours === 0) return `${minutes}min`
                      if (minutes === 0) return `${hours}h`
                      return `${hours}h ${minutes}min`
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
