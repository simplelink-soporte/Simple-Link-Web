import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { IconMail, IconPhone } from '@tabler/icons-react'
import type { Participant } from '@/types/bookings'

interface EnrolledParticipantsSectionProps {
  participants: Participant[]
}

export function EnrolledParticipantsSection({ participants }: EnrolledParticipantsSectionProps) {
  return (
    <div className="space-y-4">
      {/* Header con información */}
      <div className="space-y-0.5">
        <h3 className="text-sm font-medium text-gray-900/75">
          Participantes inscriptos
        </h3>
        <p className="text-xs text-gray-500/75">
          Lista de participantes actualmente inscriptos en la clase
        </p>
      </div>

      {/* Lista de participantes */}
      <div className="space-y-2">
        {participants.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-8">
            No hay participantes inscriptos en esta clase
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium text-gray-900">
                Lista de participantes
              </h4>
              <span className="text-xs text-gray-500">
                {participants.length} {participants.length === 1 ? 'participante' : 'participantes'}
              </span>
            </div>
            <div className="space-y-2">
              {participants.map((participant) => (
                <motion.div
                  key={participant.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "px-3 py-2 rounded-lg",
                    "bg-gray-50/50 border border-gray-100/75",
                    "transition-colors duration-200"
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {participant.fullName}
                      </p>
                      <span className="text-xs text-gray-500">
                        #{participant.id.slice(0, 8)}
                      </span>
                    </div>
                    {(participant.email || participant.phone) && (
                      <div className="flex items-center gap-3">
                        {participant.email && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <IconMail size={12} />
                            <span>{participant.email}</span>
                          </div>
                        )}
                        {participant.phone && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <IconPhone size={12} />
                            <span>{participant.phone}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
} 