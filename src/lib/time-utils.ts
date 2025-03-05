// Función para convertir tiempo (HH:mm) a minutos
export function timeToMinutes(time: string): number {
  if (!time || typeof time !== 'string') return 0
  
  try {
    const [hours, minutes] = time.split(':').map(Number)
    
    if (isNaN(hours) || isNaN(minutes)) {
      console.warn('Formato de tiempo inválido:', time)
      return 0
    }
    
    return (hours * 60) + minutes
  } catch (error) {
    console.error('Error al convertir tiempo a minutos:', error)
    return 0
  }
}

// Función para convertir minutos a tiempo (HH:mm)
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
} 