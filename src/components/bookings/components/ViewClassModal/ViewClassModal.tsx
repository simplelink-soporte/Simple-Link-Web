import { motion, AnimatePresence } from "framer-motion"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useCourts } from "@/hooks/useCourts"
import { useBranchContext } from "@/contexts/BranchContext"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { IconUsers, IconCalendar, IconUserPlus, IconEye } from "@tabler/icons-react"
import type { TransformedClass } from "@/types/classes"
import { AddParticipantModal } from "./components/AddParticipant/AddParticipantModal"
import { ViewParticipantsModal } from "./components/ViewParticipant/ViewParticipantsModal"
import { toast } from "@/components/ui/use-toast"

interface ViewClassModalProps {
  isOpen: boolean
  onClose: () => void
  classData: TransformedClass | null
}

// Funciones helper
const formatTime = (time?: string) => {
  if (!time) return '--:--'
  return time.split(':').slice(0, 2).join(':')
}

export function ViewClassModal({ 
  isOpen, 
  onClose, 
  classData
}: ViewClassModalProps) {
  const { currentBranch } = useBranchContext()
  const { data: courts = [] } = useCourts({ branchId: currentBranch?.id })
  const [showAddParticipant, setShowAddParticipant] = useState(false)
  const [showParticipants, setShowParticipants] = useState(false)

  // Si no hay datos o el modal está cerrado, no renderizar
  if (!isOpen || !classData) return null

  const court = courts.find(c => c.id === classData.courtId)

  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="view-class-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/10 z-40"
          />

          {/* Modal */}
          <motion.div
            key="view-class-modal"
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ 
              x: "100%", 
              opacity: 0,
              transition: {
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1]
              }
            }}
            transition={{ 
              type: "spring",
              damping: 30,
              stiffness: 300,
              mass: 0.8
            }}
            className="fixed inset-y-2 right-2 w-[500px] bg-white rounded-2xl border z-50 overflow-hidden"
          >
            <div className="h-full flex flex-col">
              {/* Encabezado */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="p-6 border-b"
              >
                <h2 className="text-xl font-semibold">Detalles de la Clase</h2>
              </motion.div>

              {/* Contenido Principal */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="flex-1 overflow-y-auto"
              >
                <div className="p-6 space-y-8">
                  {/* Información básica */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-gray-900">
                        {classData.title}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {format(new Date(classData.date), "dd 'de' MMMM, yyyy", { locale: es })} • {formatTime(classData.startTime)} - {formatTime(classData.endTime)}
                      </p>
                    </div>

                    {/* Descripción de la clase */}
                    {classData.description && (
                      <p className="text-sm text-gray-600">
                        {classData.description}
                      </p>
                    )}
                  </div>

                  {/* Detalles de la clase */}
                  <div className="space-y-6">
                    {/* Instructor */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        Instructor
                      </h3>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-700">
                            {classData.instructor[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm text-gray-900">{classData.instructor}</p>
                        </div>
                      </div>
                    </div>

                    {/* Pista asignada */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-gray-900">
                        Pista asignada
                      </h3>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between py-1.5">
                          <span className="text-sm text-gray-600">Pista</span>
                          <span className="text-sm text-gray-900">
                            {court?.name || 'Pista no especificada'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Estado de ocupación */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-gray-900">
                        Participantes
                      </h3>
                      <p className="text-xs text-gray-500">
                        Estado actual de ocupación de la clase
                      </p>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Capacidad total</span>
                            <span className="text-xs font-light text-gray-600">
                              {classData.currentParticipants}/{classData.capacity}
                            </span>
                          </div>
                          <button
                            onClick={() => setShowParticipants(true)}
                            className={cn(
                              "inline-flex items-center gap-1.5",
                              "text-xs text-gray-500",
                              "px-2 py-1 rounded-md",
                              "hover:bg-gray-50",
                              "transition-colors duration-200"
                            )}
                          >
                            <IconEye size={14} />
                            Ver participantes
                          </button>
                        </div>
                        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-300",
                              {
                                'bg-green-400': (classData.currentParticipants / classData.capacity) < 0.8,
                                'bg-yellow-400': (classData.currentParticipants / classData.capacity) >= 0.8 && (classData.currentParticipants < classData.capacity),
                                'bg-red-400': classData.currentParticipants >= classData.capacity
                              }
                            )}
                            style={{ 
                              width: `${Math.min((classData.currentParticipants / classData.capacity) * 100, 100)}%` 
                            }}
                          />
                        </div>
                      </div>

                      {/* Botón para agregar participantes */}
                      <div className="mt-4 pt-3 border-t border-gray-100/50">
                        <button
                          onClick={() => setShowAddParticipant(true)}
                          className={cn(
                            "w-full px-3 py-2 rounded-lg",
                            "text-xs text-gray-600",
                            "border border-gray-200/75",
                            "hover:bg-gray-50 hover:border-gray-300/75",
                            "transition-all duration-200",
                            "flex items-center justify-center gap-2"
                          )}
                        >
                          <IconUserPlus size={14} className="text-gray-400" />
                          Agregar participante
                        </button>
                      </div>

                      {/* Modal para agregar participantes */}
                      <AddParticipantModal
                        isOpen={showAddParticipant}
                        onClose={() => setShowAddParticipant(false)}
                        onParticipantAdd={(participant) => {
                          console.log('Participante agregado:', participant)
                          // TODO: Implementar lógica para agregar participante a la clase
                          toast({
                            title: "Participante agregado",
                            description: `${participant.fullName} ha sido agregado a la clase.`,
                            variant: "default"
                          })
                        }}
                      />

                      {/* Modal para ver participantes */}
                      <ViewParticipantsModal
                        isOpen={showParticipants}
                        onClose={() => setShowParticipants(false)}
                        participants={[]} // TODO: Pasar la lista real de participantes
                      />
                    </div>

                    {/* Línea divisora sutil */}
                    <div className="flex justify-center">
                      <div className="w-24 h-px bg-gray-100/75" />
                    </div>

                    {/* Información adicional */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-gray-900">
                        Información adicional
                      </h3>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between py-1.5">
                          <span className="text-sm text-gray-600">Visibilidad</span>
                          <span className="text-sm text-gray-900">
                            {classData.visibility === 'public' ? 'Pública' : 'Privada'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1.5">
                          <span className="text-sm text-gray-600">Estado</span>
                          <span className="text-sm text-gray-900">
                            {classData.status === 'active' ? 'Activa' : 
                             classData.status === 'inactive' ? 'Inactiva' : 'Cancelada'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Pie del Modal */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.3 }}
                className="p-6 border-t bg-white"
              >
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="w-full bg-gray-50 hover:bg-gray-100"
                >
                  Cerrar
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
} 