import { cn } from "@/lib/utils"
import { type BookingParticipant } from "@/types/bookings"
import { Z_LAYERS } from "@/constants/zIndex"

interface BookingBlockProps {
  startTime: string
  endTime: string
  currentTime: string
  paymentStatus: 'pending' | 'completed' | 'partial' | 'cancelled'
  participants?: BookingParticipant[]
  onClick: () => void
}

// Función helper para formatear el tiempo
const formatTime = (time: string) => {
  return time.split(':').slice(0, 2).join(':')
}

// Función helper para convertir minutos a tiempo
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

export function BookingBlock({
  startTime,
  endTime,
  currentTime,
  paymentStatus,
  participants,
  onClick
}: BookingBlockProps) {
  // No mostrar el bloque si está cancelado
  if (paymentStatus === 'cancelled') return null

  // Obtener el nombre del primer participante
  const participantName = participants?.[0] 
    ? `${participants[0].firstName} ${participants[0].lastName}`.trim()
    : 'Sin participante'

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number)
    return (hours * 60) + minutes
  }

  const isFirstSlot = timeToMinutes(currentTime) === timeToMinutes(startTime)
  const isWithinBooking = 
    timeToMinutes(currentTime) >= timeToMinutes(startTime) &&
    timeToMinutes(currentTime) < timeToMinutes(endTime)

  if (!isWithinBooking) return null

  const isFirst = timeToMinutes(currentTime) === timeToMinutes(startTime)
  const isLast = timeToMinutes(currentTime) === timeToMinutes(endTime) - 15

  return (
    <div 
      className={cn(
        "absolute cursor-pointer left-0 right-0 bottom-0 overflow-visible",
        {
          'top-[2px]': isFirstSlot,
          'top-0': !isFirstSlot,
          'bottom-[2px]': isLast,
          'bottom-0': !isLast
        }
      )}
      onClick={onClick}
    >
      {/* Capa de fondo */}
      <div 
        className={cn(
          "absolute inset-0",
          {
            'rounded-t-sm': isFirst,
            'rounded-b-sm': isLast
          }
        )}
      >
        {/* Borde izquierdo */}
        <div 
          className={cn(
            "absolute left-0 inset-y-0 w-[3px]",
            paymentStatus === 'completed'   
              ? "bg-green-300" 
              : "bg-yellow-300",
            {
              'rounded-tl-sm': isFirst,
              'rounded-bl-sm': isLast
            }
          )}
        />

        {/* Fondo */}
        <div 
          className={cn(
            "absolute inset-0 ml-[3px]",
            paymentStatus === 'completed'   
              ? "bg-green-100/40" 
              : "bg-yellow-100/40",
            "transition-colors duration-200",
            {
              'rounded-tr-sm': isFirst,
              'rounded-br-sm': isLast
            }
          )}
        />
      </div>

      {/* Capa de contenido */}
      {isFirstSlot && (
        <div 
          className="absolute inset-0 flex flex-col justify-between pointer-events-none" 
          style={{ zIndex: 1 }}
        >
          {/* Nombre del participante */}
          <div className="px-4 py-1.5">
            <div className="text-xs font-medium text-gray-900 truncate leading-none">
              {participantName}
            </div>
          </div>
          
          {/* Hora */}
          <div className="px-4 pb-2">
            <div className="text-xs text-gray-700 leading-none">
              {formatTime(startTime)} - {formatTime(endTime)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 