"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useBranches } from "@/hooks/useBranches"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { NewBookingModal } from "../components/NewBookingModal/NewBookingModal"
import { CompanyLinkSection } from "./CompanyLinkSection"
import { useClasses } from "../hooks/useClasses"
import { createSupabaseClient } from '@/lib/supabase'
import type { Database } from "@/types/supabase"
import { IconTrash, IconInfoCircle, IconCopy } from "@tabler/icons-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { EditClassModal } from "../components/NewBookingModal/components/Class/editModal/editclassmodal"
import { PackagesTable } from "./PackagesTable"
import Image from "next/image"

const supabase = createSupabaseClient()

export function ClassesTable() {
  const { currentBranch } = useBranches()
  const effectiveBranchId = currentBranch?.id
  const [isNewClassModalOpen, setIsNewClassModalOpen] = useState(false)
  const [editingClass, setEditingClass] = useState<Database['public']['Tables']['classes']['Row'] | undefined>()
  const [popoverOpen, setPopoverOpen] = useState<Record<string, boolean>>({})
  
  const { data: classes = [], isLoading: isLoadingClasses, error: classesError, refetch: refetchClasses } = useClasses({ 
    branchId: effectiveBranchId 
  })

  const handleCopyLink = async (link: string | null) => {
    if (!link) {
      toast.error('No hay un link disponible para copiar')
      return
    }

    try {
      await navigator.clipboard.writeText(link)
      toast.success('Link de la clase copiado al portapapeles')
    } catch (err) {
      console.error('Error al copiar al portapapeles:', err)
      toast.error('Error al copiar el link')
    }
  }

  const handleStatusChange = async (classId: string, newStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('classes')
        .update({ 
          status: newStatus ? 'active' : 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', classId)

      if (error) throw error

      await refetchClasses()
      toast.success(`Clase ${newStatus ? 'activada' : 'suspendida'} exitosamente`)
      setPopoverOpen(prev => ({ ...prev, [classId]: false }))
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar el estado de la clase')
    }
  }

  const handleClassClick = (classItem: Database['public']['Tables']['classes']['Row']) => {
    setEditingClass(classItem)
  }

  const handleDeleteClass = async (classId: string) => {
    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId)

      if (error) throw error

      await refetchClasses()
      toast.success('Clase eliminada exitosamente')
      setPopoverOpen(prev => ({ ...prev, [classId]: false }))
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar la clase')
    }
  }

  // Renderizado condicional
  if (!effectiveBranchId) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">Selecciona una sede para ver sus clases</p>
      </div>
    )
  }

  if (isLoadingClasses) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">Cargando clases...</p>
      </div>
    )
  }

  if (classesError) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500">Error al cargar las clases: {classesError instanceof Error ? classesError.message : 'Error desconocido'}</p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-8">
      {/* Sección de Clases */}
      <div className="space-y-6 bg-transparent p-4 rounded-lg shadow-sm">
        {/* Header de Clases */}
        <div className="flex items-start gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-md font-medium text-gray-800">Lista de Clases</h3>
              </div>
              <Button 
                onClick={() => setIsNewClassModalOpen(true)}
                variant="outline"
                className="px-4 py-2 bg-white hover:bg-gray-50 rounded-md border border-gray-200"
              >
                Crear Clase
              </Button>
            </div>
            <p className="text-xs text-gray-600">Administra las clases disponibles para tus clientes y asegúrate de que tengan 
              toda la información necesaria para disfrutar de una experiencia óptima.</p>
          </div>
        </div>

        {/* Sección de Link de Clases - Mejorada */}
        <div className="mt-4">
          <CompanyLinkSection branchId={effectiveBranchId} />
        </div>

        {/* Lista de Clases */}
        <div className="space-y-3">
          {!classes || classes.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500">No hay clases registradas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {classes.map((classItem) => {
                const scheduleConfig = classItem.schedule_config as any
                const firstTimeSlot = scheduleConfig?.timeSlots?.[0] || {}

                return (
                  <div
                    key={classItem.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg",
                      "bg-white hover:bg-gray-50",
                      "border border-gray-200 hover:border-gray-300",
                      "transition-all duration-200",
                      classItem.isExpired && "opacity-75"
                    )}
                  >
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => handleClassClick(classItem)}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-md font-medium text-gray-800">
                            {classItem.name}
                          </h4>
                        </div>
                        <p className="text-xs text-gray-600">
                          {classItem.is_recurring ? 'Clase recurrente' : 'Clase única'} • 
                          Instructor: {firstTimeSlot.instructors?.[0] || 'Sin instructor'} • 
                          {firstTimeSlot.endTime && firstTimeSlot.startTime && (
                            ` ${firstTimeSlot.startTime} - ${firstTimeSlot.endTime}`
                          )} • 
                          {scheduleConfig?.timeSlots?.length > 0 && (
                            `${scheduleConfig.timeSlots.length} ${scheduleConfig.timeSlots.length === 1 ? 'horario' : 'horarios'} • `
                          )}
                          Máx. {firstTimeSlot.capacity || 0} participantes
                          {/* Mostrar fecha para clases únicas */}
                          {!classItem.is_recurring && classItem.start_date && (
                            ` • ${new Date(classItem.start_date).toLocaleDateString('es-ES', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}`
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleCopyLink(classItem.shareableLink)}
                        className={cn(
                          "p-1",
                          "bg-gray-50 hover:bg-gray-100",
                          "text-gray-600 hover:text-gray-900",
                          "transition-all duration-200",
                          "focus:outline-none focus:ring-2 focus:ring-gray-200",
                          !classItem.shareableLink && "opacity-50 cursor-not-allowed"
                        )}
                        disabled={!classItem.shareableLink}
                      >
                        <IconCopy className="w-4 h-4" />
                      </button>

                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            className="p-1.5 text-gray-500 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors"
                          >
                            <IconTrash className="w-4 h-4" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-3" align="end">
                          <div className="text-sm">
                            <p>¿Está seguro que desea eliminar esta clase?</p>
                            <p className="text-gray-500 text-xs mt-1">Esta acción no se puede deshacer</p>
                            <div className="flex justify-end gap-2 mt-2">
                              <button 
                                className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded-md hover:bg-red-200"
                                onClick={() => handleDeleteClass(classItem.id)}
                              >
                                Eliminar
                              </button>
                              <button 
                                className="px-2 py-1 text-xs bg-gray-100 rounded-md hover:bg-gray-200"
                                onClick={() => setPopoverOpen(prev => ({ ...prev, [classItem.id]: false }))}>
                                Cancelar
                              </button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modales */}
      <NewBookingModal
        isOpen={isNewClassModalOpen}
        onClose={() => {
          setIsNewClassModalOpen(false)
          setEditingClass(undefined)
        }}
        initialBookingType="class"
        disableTypeSelection={true}
      />

      {/* Modal para editar clases */}
      <EditClassModal
        isOpen={!!editingClass}
        onClose={() => setEditingClass(undefined)}
        classData={editingClass}
      />
    </div>
  )
} 