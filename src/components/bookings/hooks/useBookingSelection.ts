import { useState, useRef, useCallback } from 'react'
import { Court } from '@/types/courts'

interface Selection {
  selections: {
    courtId: string
    startTime: string
    endTime: string
    slots: number
  }[]
  startCourtId: string
  endCourtId: string
  startTime: string
  endTime: string
  slots: number
}

interface UseBookingSelectionProps {
  visibleCourts: Court[]
  onSelectionComplete?: () => void
}

// Función helper para convertir tiempo a minutos
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return (hours * 60) + minutes
}

// Función helper para convertir minutos a tiempo
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

export function useBookingSelection({ visibleCourts, onSelectionComplete }: UseBookingSelectionProps) {
  const [selection, setSelection] = useState<Selection | null>(null)
  const [isMouseDown, setIsMouseDown] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const selectionStartRef = useRef<{ courtId: string; startTime: string } | null>(null)

  // Función para obtener el tiempo del slot
  const getSlotTime = (baseHour: string, slotIndex: number): string => {
    const baseMinutes = timeToMinutes(baseHour)
    const slotMinutes = baseMinutes + (slotIndex * 15)
    return minutesToTime(slotMinutes)
  }

  // Función para manejar el inicio de la selección
  const handleCellMouseDown = useCallback((courtId: string, hour: string, slotIndex: number, event: React.MouseEvent) => {
    event.preventDefault()
    
    setIsMouseDown(true)
    setIsDragging(true)

    const startMinutes = timeToMinutes(hour) + (slotIndex * 15)
    const endMinutes = startMinutes + 15

    const initialSelection: Selection = {
      selections: [{
        courtId,
        startTime: minutesToTime(startMinutes),
        endTime: minutesToTime(endMinutes),
        slots: 1
      }],
      startCourtId: courtId,
      endCourtId: courtId,
      startTime: minutesToTime(startMinutes),
      endTime: minutesToTime(endMinutes),
      slots: 1
    }
    
    setSelection(initialSelection)
    selectionStartRef.current = { courtId, startTime: minutesToTime(startMinutes) }
  }, [])

  // Función para manejar el movimiento durante la selección
  const handleCellMouseMove = useCallback((courtId: string, hour: string, slotIndex: number, event: React.MouseEvent) => {
    if (!isMouseDown || !isDragging || !selectionStartRef.current) return

    const startTime = selectionStartRef.current.startTime
    const currentTime = getSlotTime(hour, slotIndex)
    
    const startCourtIndex = visibleCourts.findIndex(c => c.id === selectionStartRef.current?.courtId)
    const currentCourtIndex = visibleCourts.findIndex(c => c.id === courtId)
    
    const [minCourtIndex, maxCourtIndex] = [
      Math.min(startCourtIndex, currentCourtIndex),
      Math.max(startCourtIndex, currentCourtIndex)
    ]

    const startMinutes = timeToMinutes(startTime)
    const currentMinutes = timeToMinutes(currentTime)
    
    const [minTime, maxTime] = [
      Math.min(startMinutes, currentMinutes),
      Math.max(startMinutes, currentMinutes) + 15
    ]

    const selectedCourts = visibleCourts.slice(minCourtIndex, maxCourtIndex + 1)
    
    const tempSelection: Selection = {
      selections: selectedCourts.map(court => ({
        courtId: court.id,
        startTime: minutesToTime(minTime),
        endTime: minutesToTime(maxTime),
        slots: Math.ceil((maxTime - minTime) / 15)
      })),
      startCourtId: selectionStartRef.current.courtId,
      endCourtId: courtId,
      startTime: minutesToTime(minTime),
      endTime: minutesToTime(maxTime),
      slots: Math.ceil((maxTime - minTime) / 15)
    }

    setSelection(tempSelection)
  }, [isMouseDown, isDragging, visibleCourts])

  // Función para manejar cuando se suelta el mouse
  const handleMouseUp = useCallback(() => {
    if (isMouseDown && selection) {
      onSelectionComplete?.()
    }
    setIsMouseDown(false)
    setIsDragging(false)
  }, [isMouseDown, selection, onSelectionComplete])

  // Función para verificar si un slot está seleccionado
  const isSlotSelected = useCallback((courtId: string, hour: string, slotIndex: number): boolean => {
    if (!selection) return false

    return selection.selections.some(sel => {
      if (sel.courtId !== courtId) return false

      const slotStartMinutes = timeToMinutes(hour) + (slotIndex * 15)
      const slotEndMinutes = slotStartMinutes + 15
      const selStartMinutes = timeToMinutes(sel.startTime)
      const selEndMinutes = timeToMinutes(sel.endTime)

      return slotStartMinutes >= selStartMinutes && slotStartMinutes < selEndMinutes
    })
  }, [selection])

  return {
    selection,
    isMouseDown,
    isDragging,
    handleCellMouseDown,
    handleCellMouseMove,
    handleMouseUp,
    isSlotSelected,
    setSelection,
    setIsMouseDown,
    setIsDragging
  }
} 