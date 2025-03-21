import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import type { Participant } from "@/types/bookings"
import { IconUsers, IconArrowLeft, IconCalendar, IconClock } from "@tabler/icons-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

// Función para formatear la hora
const formatTime = (time?: string) => {
  if (!time) return '--:--'
  return time.split(':').slice(0, 2).join(':')
}

interface ParticipantsSummaryProps {
  participants: Participant[]
  onConfirm: () => void
  onBack: () => void
  date?: string
  startTime?: string
  endTime?: string
}

export function ParticipantsSummary({
  participants,
  onConfirm,
  onBack,
  date,
  startTime,
  endTime
}: ParticipantsSummaryProps) {
  const hasSessionInfo = date && startTime && endTime;

  return (
    <div className="space-y-4">
      {/* Header con contador */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h3 className="text-sm font-medium text-gray-900">
            Resumen
          </h3>
          <p className="text-xs text-gray-500">
            Confirma los participantes seleccionados
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 border border-gray-100">
          <IconUsers size={14} className="text-gray-500" />
          <span className="text-xs font-medium text-gray-700">
            {participants.length}
          </span>
        </span>
      </div>

      {/* Información de la sesión */}
      {hasSessionInfo && (
        <div className="space-y-2 p-3 bg-gray-50/70 rounded-lg border border-gray-100/75">
          <div className="flex items-center gap-2">
            <IconCalendar size={14} className="text-gray-500" />
            <span className="text-xs text-gray-700">
              {format(new Date(date + "T00:00:00"), "dd 'de' MMMM, yyyy", { locale: es })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <IconClock size={14} className="text-gray-500" />
            <span className="text-xs text-gray-700">
              {formatTime(startTime)} - {formatTime(endTime)}
            </span>
          </div>
        </div>
      )}

      {/* Lista de participantes */}
      <div className="space-y-2">
        {participants.map((participant) => (
          <motion.div
            key={participant.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "px-3 py-2 rounded-lg",
              "bg-gray-50/50 border border-gray-100/75"
            )}
          >
            <p className="text-sm font-medium text-gray-900">
              {participant.name}
            </p>
            {participant.email && (
              <p className="text-xs text-gray-500">
                {participant.email}
              </p>
            )}
          </motion.div>
        ))}
      </div>

      {/* Botones de acción */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className={cn(
            "inline-flex items-center gap-1.5",
            "text-xs font-medium text-gray-500",
            "px-3 py-1.5 rounded-md",
            "hover:bg-gray-50",
            "transition-colors duration-200"
          )}
        >
          <IconArrowLeft size={14} />
          Volver
        </button>
        <button
          onClick={onConfirm}
          className={cn(
            "text-xs font-medium text-gray-900",
            "px-3 py-1.5 rounded-md",
            "hover:bg-gray-50",
            "transition-colors duration-200"
          )}
        >
          Agregar a clase
        </button>
      </div>
    </div>
  )
}