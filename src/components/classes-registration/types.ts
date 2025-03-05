export interface ClassSession {
  id: string // Identificador único para la sesión
  date: string
  startTime: string
  endTime: string
  totalSpots: number
  spotsLeft: number
  selected: boolean
} 