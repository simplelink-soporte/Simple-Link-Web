import { motion, AnimatePresence } from "framer-motion"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useCourts } from "@/hooks/useCourts"
import { useBranchContext } from "@/contexts/BranchContext"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { IconUsers, IconCalendar } from "@tabler/icons-react"
import type { TransformedClass } from "@/types/classes"

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
                        <IconUsers size={16} className="text-gray-400" />
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
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <p className="text-sm text-gray-600">{court?.name || 'Pista no especificada'}</p>
                      </div>
                    </div>

                    {/* Estado de ocupación */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        <IconUsers size={16} className="text-gray-400" />
                        Participantes
                      </h3>
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Capacidad total</span>
                          <span className="text-sm font-medium text-gray-900">
                            {classData.currentParticipants}/{classData.capacity}
                          </span>
                        </div>
                        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
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
                    </div>

                    {/* Información adicional */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        <IconCalendar size={16} className="text-gray-400" />
                        Información adicional
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                          <span className="text-sm text-gray-600">Visibilidad</span>
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            classData.visibility === 'public' 
                              ? "bg-green-100 text-green-700" 
                              : "bg-gray-100 text-gray-700"
                          )}>
                            {classData.visibility === 'public' ? 'Pública' : 'Privada'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                          <span className="text-sm text-gray-600">Estado</span>
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            {
                              'bg-green-100 text-green-700': classData.status === 'active',
                              'bg-yellow-100 text-yellow-700': classData.status === 'inactive',
                              'bg-red-100 text-red-700': classData.status === 'cancelled'
                            }
                          )}>
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