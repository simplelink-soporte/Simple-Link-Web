import { useBranchContext } from '@/contexts/BranchContext'
import { timeToMinutes } from '@/lib/utils'

interface TimeRange {
  start: string
  end: string
}

export function useBusinessHours() {
  const { currentBranch } = useBranchContext()
  
  // Obtener el rango horario más amplio de todos los días
  const getWidestTimeRange = (): TimeRange => {
    if (!currentBranch?.opening_hours) {
      return { start: "07:00", end: "23:00" } // Horario por defecto
    }

    let earliestStart = "23:59"
    let latestEnd = "00:00"

    // Iterar sobre todos los días
    Object.values(currentBranch.opening_hours).forEach(day => {
      day.ranges.forEach(range => {
        if (timeToMinutes(range.start) < timeToMinutes(earliestStart)) {
          earliestStart = range.start
        }
        if (timeToMinutes(range.end) > timeToMinutes(latestEnd)) {
          latestEnd = range.end
        }
      })
    })

    return {
      start: earliestStart === "23:59" ? "07:00" : earliestStart,
      end: latestEnd === "00:00" ? "23:00" : latestEnd
    }
  }

  return {
    businessHours: getWidestTimeRange()
  }
} 