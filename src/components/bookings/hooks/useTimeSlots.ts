import { useMemo } from 'react'
import { useBusinessHours } from '@/hooks/useBusinessHours'

interface TimeSlot {
  hour: string
  subSlots: {
    time: string
    minutes: number
    isAvailable: boolean
  }[]
}

interface UseTimeSlotsProps {
  selectedDate: Date
}

export function useTimeSlots({ selectedDate }: UseTimeSlotsProps) {
  const { businessHours, isOpen, isTimeInRange, isLoading } = useBusinessHours(selectedDate)

  const timeSlots = useMemo(() => {
    if (!businessHours?.start || !businessHours?.end) {
      return []
    }
    
    const slots: TimeSlot[] = []
    const [startHour] = businessHours.start.split(':').map(Number)
    const [endHour] = businessHours.end.split(':').map(Number)
    const TIME_INTERVAL = 15

    for (let hour = startHour; hour <= endHour; hour++) {
      const hourString = `${hour.toString().padStart(2, '0')}:00`
      const subSlots = []

      for (let minutes = 0; minutes < 60; minutes += TIME_INTERVAL) {
        const time = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
        subSlots.push({
          time,
          minutes: hour * 60 + minutes,
          isAvailable: isTimeInRange(time)
        })
      }

      if (subSlots.length > 0) {
        slots.push({
          hour: hourString,
          subSlots
        })
      }
    }

    return slots
  }, [businessHours, isTimeInRange])

  return {
    timeSlots,
    isOpen,
    isLoading
  }
} 