import { cn } from "@/lib/utils"
import { type TransformedClass } from "@/types/classes"
import { useState } from "react"
import { ViewClassModal } from "../ViewClassModal/ViewClassModal"

interface ClassBlockProps {
  startTime: string
  endTime: string
  currentTime: string
  classData: TransformedClass
  onClick?: () => void
}

// Función helper para formatear el tiempo (reutilizada de BookingBlock)
const formatTime = (time: string) => {
  return time.split(':').slice(0, 2).join(':')
}

// Función helper para convertir minutos a tiempo (reutilizada de BookingBlock)
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return (hours * 60) + minutes
}

export function ClassBlock({
  startTime,
  endTime,
  currentTime,
  classData,
  onClick
}: ClassBlockProps) {
  const [showModal, setShowModal] = useState(false)

  // No mostrar el bloque si la clase está cancelada
  if (classData.status === 'cancelled') return null

  const isFirstSlot = timeToMinutes(currentTime) === timeToMinutes(startTime)
  const isWithinBooking = 
    timeToMinutes(currentTime) >= timeToMinutes(startTime) &&
    timeToMinutes(currentTime) < timeToMinutes(endTime)

  if (!isWithinBooking) return null

  const isFirst = timeToMinutes(currentTime) === timeToMinutes(startTime)
  const isLast = timeToMinutes(currentTime) === timeToMinutes(endTime) - 15

  // Calcular el porcentaje de ocupación
  const isFull = classData.currentParticipants >= classData.capacity

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowModal(true)
  }

  return (
    <>
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
        onClick={handleClick}
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
              "bg-blue-400", // Color específico para clases
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
              "bg-blue-100/40", // Color específico para clases
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
            className="absolute inset-0 flex flex-col pointer-events-none p-2" 
            style={{ zIndex: 1 }}
          >
            <div className="relative flex-1">
              {/* Etiqueta de capacidad */}
              <div 
                className={cn(
                  "absolute right-0 top-0",
                  "px-2 py-0.5 rounded-full", // Bordes más redondeados y padding horizontal ajustado
                  "bg-white/90", // Fondo más sólido
                  "ring-1 ring-gray-100/50", // Borde más sutil
                  "text-[10px] font-medium tabular-nums tracking-tight", // Mejor espaciado de texto
                  "shadow-[0_1px_2px_rgba(0,0,0,0.05)]", // Sombra más refinada
                  isFull ? "text-red-500" : "text-gray-500" // Colores más suaves
                )}
              >
                {classData.currentParticipants}/{classData.capacity}
              </div>

              {/* Título y horario */}
              <div className="pr-16"> {/* Espacio para la etiqueta de capacidad */}
                <div className="text-xs font-medium text-gray-900 truncate leading-none">
                  {classData.title}
                </div>
                <div className="mt-1 text-xs text-gray-700 leading-none"> {/* Tamaño y color ajustados */}
                  {formatTime(startTime)} - {formatTime(endTime)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <ViewClassModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        classData={classData}
      />
    </>
  )
} 