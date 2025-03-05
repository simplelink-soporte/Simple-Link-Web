"use client"

import { useState } from 'react'
import { useParticipantSearch } from '@/components/bookings/hooks/useParticipantSearch'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { ParticipantRoleEnum } from '@/types/bookings'

interface Participant {
  id: string
  userId: string
  fullName: string
  email?: string
  role: ParticipantRoleEnum
}

interface ParticipantStepProps {
  participants: Participant[]
  onParticipantAdd: (participant: Participant) => void
  onParticipantRemove: (participantId: string) => void
}

export function ParticipantStep({
  participants,
  onParticipantAdd,
  onParticipantRemove
}: ParticipantStepProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const { data: searchResults, isLoading } = useParticipantSearch(searchTerm)

  const handleParticipantSelect = (participant: any) => {
    // Validar que el participante tenga un ID válido
    if (!participant.id) {
      toast.error('Error al seleccionar participante: ID no válido')
      return
    }

    // Formatear el participante como lo espera el servicio de reservas
    const formattedParticipant: Participant = {
      id: participant.id,
      userId: participant.id, // Usar el mismo ID como user_id
      fullName: `${participant.first_name} ${participant.last_name}`.trim(),
      email: participant.email,
      role: 'player'
    }

    console.log('Agregando participante:', formattedParticipant)
    onParticipantAdd(formattedParticipant)
    setSearchTerm('')
  }

  return (
    <div className="space-y-5">
      {/* Buscador */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-gray-900">
            Agregar participante
          </h3>
          <p className="text-xs text-gray-500">
            Busca y selecciona los participantes que asistirán a la reserva
          </p>
        </div>
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar participante..."
            className={cn(
              "w-full px-3 py-1.5",
              "text-sm text-gray-900 placeholder:text-gray-400",
              "bg-transparent",
              "rounded-lg",
              "border border-gray-200/75",
              "focus:outline-none focus:border-gray-300",
              "transition-all duration-200"
            )}
          />
        </div>

        {/* Resultados de búsqueda */}
        {searchTerm.length >= 2 && (
          <div className="space-y-1">
            {isLoading ? (
              <p className="text-xs text-gray-500">Buscando...</p>
            ) : searchResults?.length === 0 ? (
              <p className="text-xs text-gray-500">No se encontraron resultados</p>
            ) : (
              <div className="space-y-1">
                {searchResults?.map(result => (
                  <button
                    key={result.id}
                    onClick={() => handleParticipantSelect(result)}
                    className={cn(
                      "w-full text-left",
                      "px-3 py-2 rounded-lg",
                      "text-sm text-gray-600",
                      "hover:bg-gray-50",
                      "transition-colors duration-200"
                    )}
                  >
                    <p className="font-medium">
                      {`${result.first_name} ${result.last_name}`.trim()}
                    </p>
                    {result.email && (
                      <p className="text-xs text-gray-500">{result.email}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lista de participantes seleccionados */}
      <div className="space-y-3">
        <div className="space-y-0.5">
          <h3 className="text-xs font-medium text-gray-600">
            Participantes seleccionados
          </h3>
          <p className="text-xs text-gray-400">
            {participants.length === 0 
              ? 'No hay participantes seleccionados'
              : participants.length === 1
                ? '1 participante seleccionado'
                : `${participants.length} participantes seleccionados`
            }
          </p>
        </div>
        <div className="space-y-1.5">
          {participants.map(participant => (
            <motion.div
              key={participant.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                "flex items-center justify-between py-1.5",
                "group transition-colors duration-200"
              )}
            >
              <div>
                <p className="text-sm text-gray-600">{participant.fullName}</p>
                {participant.email && (
                  <p className="text-xs text-gray-400">{participant.email}</p>
                )}
              </div>
              <button
                onClick={() => onParticipantRemove(participant.id)}
                className={cn(
                  "text-xs text-gray-400 opacity-0 group-hover:opacity-100",
                  "hover:text-red-500 transition-all duration-200"
                )}
              >
                Eliminar
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
} 