import { useState, useCallback } from 'react'
import type { SimpleShiftState, TimeSelection } from '../types'

export function useSimpleShiftState(): SimpleShiftState {
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedCourts, setSelectedCourts] = useState<string[]>([])
  const [timeSelection, setTimeSelection] = useState<TimeSelection>()

  const handleCourtSelect = useCallback((courtId: string) => {
    setSelectedCourts(prev => {
      if (prev.includes(courtId)) {
        return prev.filter(id => id !== courtId)
      }
      return [...prev, courtId]
    })
  }, [])

  const handleTimeSelect = useCallback((time: TimeSelection) => {
    setTimeSelection(time)
  }, [])

  const resetState = useCallback(() => {
    setSelectedDate(undefined)
    setSelectedCourts([])
    setTimeSelection(undefined)
  }, [])

  return {
    // Estado
    selectedDate,
    selectedCourts,
    timeSelection,

    // Acciones
    setSelectedDate,
    setSelectedCourts: handleCourtSelect,
    setTimeSelection: handleTimeSelect,
    resetState
  }
} 