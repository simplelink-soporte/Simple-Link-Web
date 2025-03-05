import { TIME_INTERVAL } from './types'

// Función para convertir tiempo a minutos
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return (hours * 60) + minutes
}

// Función para redondear minutos al intervalo más cercano
export function roundToNearestInterval(minutes: number): number {
  return Math.floor(minutes / TIME_INTERVAL) * TIME_INTERVAL
}

// Función para convertir minutos a tiempo
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

// Función para formatear la duración entre dos tiempos
export function formatDuration(startTime: string, endTime: string): string {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  const durationInMinutes = end - start

  const hours = Math.floor(durationInMinutes / 60)
  const minutes = durationInMinutes % 60

  if (hours === 0) {
    return `${minutes} minutos`
  } else if (minutes === 0) {
    return hours === 1 ? '1 hora' : `${hours} horas`
  } else {
    return `${hours}h ${minutes}min`
  }
}

// Función para formatear el tiempo en formato HH:mm
export const formatTime = (time: string) => {
  return time.split(':').slice(0, 2).join(':')
}

// Función para calcular el índice del subslot dentro de una celda
export function getSubslotIndex(cellRect: DOMRect, mouseY: number): number {
  const relativeY = mouseY - cellRect.top
  const percentageY = relativeY / cellRect.height
  return Math.floor(percentageY * 4)
}

// Función para calcular el tiempo exacto de un slot
export function getSlotTime(baseHour: string, slotIndex: number): string {
  const baseMinutes = timeToMinutes(baseHour)
  const slotMinutes = baseMinutes + (slotIndex * 15)
  return minutesToTime(slotMinutes)
}

// Estilos para celdas deshabilitadas
export const DISABLED_CELL_STYLES = {
  background: "repeating-linear-gradient(45deg, #f3f4f6, #f3f4f6 4px, #f9fafb 4px, #f9fafb 8px)",
  opacity: "0.6",
  borderColor: "transparent"
} 