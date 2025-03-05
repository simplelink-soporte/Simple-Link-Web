import { useState } from 'react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { useParticipantSearch } from '@/components/bookings/hooks/useParticipantSearch'
import type { ParticipantRoleEnum } from '@/types/bookings'
import { IconUserCheck, IconX } from '@tabler/icons-react'

interface Participant {
  id: string
  userId: string
  fullName: string
  email?: string
  role: ParticipantRoleEnum
}

interface AddParticipantSectionProps {
  onParticipantAdd?: (participant: Participant) => void
}

export function AddParticipantSection({ onParticipantAdd }: AddParticipantSectionProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedParticipants, setSelectedParticipants] = useState<Participant[]>([])
  const { data: searchResults, isLoading } = useParticipantSearch(searchTerm)

  const handleParticipantSelect = (participant: any) => {
    // Validar que el participante tenga un ID válido
    if (!participant.id) {
      console.error('Error al seleccionar participante: ID no válido')
      return
    }

    // Verificar si el participante ya está seleccionado
    const isAlreadySelected = selectedParticipants.some(p => p.id === participant.id)
    if (isAlreadySelected) return

    // Formatear el participante como lo espera el servicio
    const formattedParticipant: Participant = {
      id: participant.id,
      userId: participant.id,
      fullName: `${participant.first_name} ${participant.last_name}`.trim(),
      email: participant.email,
      role: 'player'
    }

    // Agregar el participante a la lista y notificar
    setSelectedParticipants(prev => [...prev, formattedParticipant])
    onParticipantAdd?.(formattedParticipant)
    setSearchTerm('')
  }

  const removeParticipant = (participantId: string) => {
    setSelectedParticipants(prev => prev.filter(p => p.id !== participantId))
  }

  return (
    <div className="space-y-4">
      {/* Buscador con estilo más sutil */}
      <div className="space-y-3">
        <div className="space-y-0.5">
          <h3 className="text-sm font-medium text-gray-900/75">
            Agregar nuevo participante
          </h3>
          <p className="text-xs text-gray-500/75">
            Busca y selecciona los participantes para la clase
          </p>
        </div>
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar participante..."
            className={cn(
              "w-full px-2.5 py-1",
              "text-xs text-gray-900 placeholder:text-gray-400/75",
              "bg-transparent",
              "rounded-md",
              "border border-gray-200/50",
              "focus:outline-none focus:border-gray-300/75",
              "transition-all duration-200"
            )}
          />
        </div>

        {/* Resultados de búsqueda */}
        {searchTerm.length >= 2 && (
          <div className="space-y-1">
            {isLoading ? (
              <p className="text-xs text-gray-500/75">Buscando...</p>
            ) : searchResults?.length === 0 ? (
              <p className="text-xs text-gray-500/75">No se encontraron resultados</p>
            ) : (
              <div className="space-y-0.5">
                {searchResults?.map(result => (
                  <button
                    key={result.id}
                    onClick={() => handleParticipantSelect(result)}
                    className={cn(
                      "w-full text-left",
                      "px-2.5 py-1.5 rounded-md",
                      "text-xs text-gray-600",
                      "hover:bg-gray-50",
                      "transition-colors duration-200",
                      selectedParticipants.some(p => p.id === result.id) && "opacity-50 cursor-not-allowed"
                    )}
                    disabled={selectedParticipants.some(p => p.id === result.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {`${result.first_name} ${result.last_name}`.trim()}
                        </p>
                        {result.email && (
                          <p className="text-xs text-gray-400">{result.email}</p>
                        )}
                      </div>
                      {selectedParticipants.some(p => p.id === result.id) && (
                        <IconUserCheck size={14} className="text-green-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lista de participantes seleccionados */}
      {selectedParticipants.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-gray-900">
              Participantes seleccionados
            </h4>
            <span className="text-xs text-gray-500">
              {selectedParticipants.length} {selectedParticipants.length === 1 ? 'participante' : 'participantes'}
            </span>
          </div>
          <div className="space-y-1">
            {selectedParticipants.map((participant) => (
              <motion.div
                key={participant.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  "flex items-center justify-between",
                  "px-2.5 py-1.5 rounded-md",
                  "bg-gray-50",
                  "border border-gray-100"
                )}
              >
                <div>
                  <p className="text-xs font-medium text-gray-900">
                    {participant.fullName}
                  </p>
                  {participant.email && (
                    <p className="text-xs text-gray-500">{participant.email}</p>
                  )}
                </div>
                <button
                  onClick={() => removeParticipant(participant.id)}
                  className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-500 transition-colors duration-200"
                >
                  <IconX size={14} />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 