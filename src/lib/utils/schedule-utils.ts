import { BranchSchedule, TimeRange } from '@/types/branch'

interface SimpleSchedule {
  [key: string]: {
    open: string
    close: string
  }
}

interface FormattedSchedule {
  [key: string]: {
    isOpen: boolean
    timeRanges: TimeRange[]
  }
}

export function formatScheduleForDB(schedule: BranchSchedule): Record<string, any> {
  // Convertir directamente al formato requerido por la base de datos
  const formattedSchedule: Record<string, any> = {}
  
  Object.entries(schedule).forEach(([day, value]) => {
    formattedSchedule[day] = {
      isOpen: value.isOpen,
      timeRanges: value.timeRanges.map(range => ({
        openTime: range.openTime,
        closeTime: range.closeTime
      }))
    }
  })
  
  return formattedSchedule
}

export function formatScheduleFromDB(schedule: Record<string, any> | null): BranchSchedule {
  const defaultSchedule: BranchSchedule = {
    monday: { isOpen: true, timeRanges: [{ openTime: "08:00", closeTime: "22:00" }] },
    tuesday: { isOpen: true, timeRanges: [{ openTime: "08:00", closeTime: "22:00" }] },
    wednesday: { isOpen: true, timeRanges: [{ openTime: "08:00", closeTime: "22:00" }] },
    thursday: { isOpen: true, timeRanges: [{ openTime: "08:00", closeTime: "22:00" }] },
    friday: { isOpen: true, timeRanges: [{ openTime: "08:00", closeTime: "22:00" }] },
    saturday: { isOpen: true, timeRanges: [{ openTime: "08:00", closeTime: "22:00" }] },
    sunday: { isOpen: true, timeRanges: [{ openTime: "08:00", closeTime: "22:00" }] }
  }

  if (!schedule || Object.keys(schedule).length === 0) return defaultSchedule

  const formattedSchedule: BranchSchedule = {}
  
  Object.entries(schedule).forEach(([day, value]: [string, any]) => {
    if (value && typeof value === 'object') {
      formattedSchedule[day] = {
        isOpen: value.isOpen ?? true,
        timeRanges: Array.isArray(value.timeRanges) 
          ? value.timeRanges.map((range: any) => ({
              openTime: range.openTime || "08:00",
              closeTime: range.closeTime || "22:00"
            }))
          : [{ openTime: "08:00", closeTime: "22:00" }]
      }
    }
  })
  
  return { ...defaultSchedule, ...formattedSchedule }
}

export function validateSchedule(schedule: BranchSchedule): boolean {
  return Object.values(schedule).every(daySchedule => {
    if (!daySchedule.timeRanges || !Array.isArray(daySchedule.timeRanges)) return false
    return daySchedule.timeRanges.every(range => {
      return range.openTime && range.closeTime &&
             /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(range.openTime) &&
             /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(range.closeTime)
    })
  })
} 