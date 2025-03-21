"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useBranches } from "@/hooks/useBranches"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { NewBookingModal } from "../components/NewBookingModal/NewBookingModal"
import { useClasses } from "../hooks/useClasses"
import { createSupabaseClient } from '@/lib/supabase'
import type { Database } from "@/types/supabase"
import { IconTrash, IconInfoCircle, IconCopy, IconCalendarPlus, IconExternalLink } from "@tabler/icons-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { EditClassModal } from "../components/NewBookingModal/components/Class/editModal/editclassmodal"
import { PackagesTable } from "./PackagesTable"
import Image from "next/image"
import { useCompanyLink } from "../hooks/useCompanyLink"
import { classCheckService, type BookingSummary } from '@/services/classCheckService'
import { DeleteClassWarningModal } from './DeleteClassWarningModal'

const supabase = createSupabaseClient()

export function ClassesTable() {
  const { currentBranch } = useBranches()
  const effectiveBranchId = currentBranch?.id
  const [isNewClassModalOpen, setIsNewClassModalOpen] = useState(false)
  const [editingClass, setEditingClass] = useState<Database['public']['Tables']['classes']['Row'] | undefined>()
  const [popoverOpen, setPopoverOpen] = useState<Record<string, boolean>>({})
  
  // Nuevos estados para manejar el proceso de eliminación con verificación
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null)
  const [deletingClassIsExpired, setDeletingClassIsExpired] = useState(false)
  const [bookingsSummary, setBookingsSummary] = useState<BookingSummary>({
    count: 0,
    hasFutureBookings: false
  })
  const [showWarningModal, setShowWarningModal] = useState(false)
  
  // Obtener el link de la empresa
  const { 
    companyLink, 
    isLoading: isLoadingLink, 
    error: linkError, 
    copyToClipboard: copyCompanyLink, 
    hasExistingLink 
  } = useCompanyLink({ branchId: effectiveBranchId })
  
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
    // Verificar si la clase está vencida antes de abrir el modal de edición
    if ('isExpired' in classItem && classItem.isExpired) {
      // No permitir editar clases vencidas, mostrar un mensaje informativo
      toast.error('No es posible editar clases vencidas', {
        description: 'Las clases que han finalizado no pueden ser modificadas',
        duration: 3000
      });
      return; // Salir de la función sin abrir el modal
    }
    
    // Solo permitir editar clases que no están vencidas
    setEditingClass(classItem);
  }

  // Función para iniciar el proceso de eliminación
  const handleDeleteClick = async (classId: string, isExpired: boolean) => {
    try {
      setPopoverOpen(prev => ({ ...prev, [classId]: false })); // Cerrar popover
      
      // Si la clase está vencida, no es necesario verificar reservas futuras
      if (isExpired) {
        await handleDeleteClass(classId, isExpired);
        return;
      }
      
      // Guardamos la información de la clase que se intenta eliminar
      setDeletingClassId(classId);
      setDeletingClassIsExpired(isExpired);
      
      // Verificar si existen reservas futuras relacionadas
      const bookingSummary = await classCheckService.checkFutureBookings(classId);
      
      if (bookingSummary.hasFutureBookings) {
        // Si hay reservas futuras, mostrar advertencia con la información detallada
        setBookingsSummary(bookingSummary);
        setShowWarningModal(true);
      } else {
        // Si no hay reservas futuras, proceder con la eliminación directamente
        await handleDeleteClass(classId, isExpired);
      }
    } catch (error) {
      console.error('❌ Error al verificar reservas para eliminación:', error);
      toast.error('Error al verificar reservas');
    }
  };
  
  // Función para confirmar la eliminación desde el modal de advertencia
  const confirmDeleteClass = async () => {
    if (deletingClassId) {
      try {
        await handleDeleteClass(deletingClassId, deletingClassIsExpired);
        setShowWarningModal(false);
      } catch (error) {
        console.error('❌ Error al confirmar eliminación:', error);
        toast.error('Error al eliminar la clase');
      }
    }
  };

  const handleDeleteClass = async (classId: string, isExpired: boolean) => {
    try {
      // Si la clase está vencida, aplicar eliminación lógica (cambiar estado)
      if (isExpired) {
        console.log('🔄 Aplicando eliminación lógica para clase vencida:', classId);
        
        const { error } = await supabase
          .from('classes')
          .update({
            status: 'completed', // Cambiar estado a "completed" en lugar de eliminar
            updated_at: new Date().toISOString()
          })
          .eq('id', classId);

        if (error) throw error;
        
        await refetchClasses();
        toast.success('Clase archivada exitosamente', {
          description: 'La clase vencida ha sido marcada como completada'
        });
      } 
      // Si no está vencida, verificamos si es única o recurrente
      else {
        // Primero obtenemos los datos de la clase para saber si es recurrente
        const { data: classData, error: fetchError } = await supabase
          .from('classes')
          .select('is_recurring, name')
          .eq('id', classId)
          .single();
          
        if (fetchError) throw fetchError;
        
        // Marcar todas las reservas futuras asociadas a esta clase como canceladas
        const currentTimestamp = new Date().toISOString();
        const today = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
        
        console.log('🔍 Cancelando reservas futuras para la clase:', classId);
        
        // Obtener la cantidad de reservas que se cancelarán para fines de registro
        const { count, error: countError } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', classId)
          .gte('date', today)
          .is('cancelled_at', null);
          
        if (countError) {
          console.error('❌ Error al contar reservas a cancelar:', countError);
        } else {
          console.log(`📊 Se cancelarán ${count || 0} reservas futuras`);
        }
        
        // Actualizar las reservas para marcarlas como canceladas correctamente
        const { error: bookingsError, data: cancelledBookings } = await supabase
          .from('bookings')
          .update({
            cancelled_at: currentTimestamp,
            cancellation_reason: `Clase "${classData?.name || 'sin nombre'}" eliminada por el administrador`,
            updated_at: currentTimestamp,
            payment_status: 'cancelled' // Importante: Actualizar el estado de pago a cancelado
          })
          .eq('class_id', classId)
          .gte('date', today) // Solo cancelar reservas futuras (desde hoy)
          .is('cancelled_at', null) // Solo las que no estén ya canceladas
          .select('id'); // Devolver IDs de las reservas canceladas
          
        if (bookingsError) {
          console.error('❌ Error al cancelar reservas asociadas:', bookingsError);
          // Continuamos con la eliminación de la clase aunque haya error en las reservas
        } else {
          console.log(`✅ Reservas canceladas exitosamente: ${cancelledBookings?.length || 0}`);
        }
        
        // Para clases únicas (no recurrentes), aplicar eliminación física
        if (!classData?.is_recurring) {
          console.log('🗑️ Eliminando clase única no vencida:', classId);
          
          const { error: deleteError } = await supabase
            .from('classes')
            .delete()
            .eq('id', classId);

          if (deleteError) throw deleteError;
          
          const cancelledCount = cancelledBookings?.length || 0;
          toast.success(
            cancelledCount > 0 
              ? `Clase eliminada y ${cancelledCount} ${cancelledCount === 1 ? 'reserva cancelada' : 'reservas canceladas'}`
              : 'Clase eliminada exitosamente',
            {
              description: cancelledCount > 0 
                ? 'La clase ha sido eliminada y todas sus reservas futuras han sido canceladas'
                : 'La clase ha sido eliminada permanentemente'
            }
          );
        } 
        // Para clases recurrentes, cambiar estado y actualizar fecha de fin
        else {
          console.log('🔄 Procesando eliminación de clase recurrente:', classId);
          
          // Para clases recurrentes activas, no eliminarlas físicamente sino:
          // 1. Cambiar el estado a 'completed'
          // 2. Actualizar la fecha de fin (end_time) para ser la fecha actual
          const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
          
          const { error: updateError } = await supabase
            .from('classes')
            .update({
              status: 'completed',           // Cambiar estado a completed
              end_date: currentDate,         // Actualizar fecha de fin
              updated_at: currentTimestamp   // Actualizar timestamp
            })
            .eq('id', classId);

          if (updateError) throw updateError;
          
          const cancelledCount = cancelledBookings?.length || 0;
          toast.success(
            cancelledCount > 0 
              ? `Clase recurrente completada y ${cancelledCount} ${cancelledCount === 1 ? 'reserva cancelada' : 'reservas canceladas'}`
              : 'Clase recurrente completada exitosamente',
            {
              description: 'La clase recurrente ha sido marcada como completada y ya no aceptará nuevas reservas'
            }
          );
        }
        
        await refetchClasses();
      }
      
      // Limpiar los estados de eliminación
      setDeletingClassId(null);
      setDeletingClassIsExpired(false);
    } catch (error: any) {
      console.error('❌ Error al procesar la clase:', error);
      toast.error(error.message || 'Error al procesar la clase');
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
    <div className="w-full space-y-6">
      {/* Sección de Clases */}
      <div className="space-y-5 bg-transparent p-5">
        {/* Header de Clases */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h3 className="text-sm font-medium text-gray-900">Lista de Clases</h3>
            <p className="text-xs text-gray-500">
              Administra las clases disponibles para tus clientes y asegúrate de que tengan 
              toda la información necesaria.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasExistingLink && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={copyCompanyLink}
                      variant="outline"
                      size="sm"
                      className="px-3 py-1.5 h-8 bg-white border-gray-200 text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                      disabled={isLoadingLink}
                    >
                      <IconCopy className="h-3.5 w-3.5 mr-1.5" />
                      Copiar Link
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">Copiar link de clases</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <Button 
              onClick={() => setIsNewClassModalOpen(true)}
              variant="outline"
              size="sm"
              className="px-3 py-1.5 h-8 bg-white border-gray-200 text-gray-700 hover:text-gray-900 hover:bg-gray-50"
            >
              <IconCalendarPlus className="h-3.5 w-3.5 mr-1.5" />
              Crear Clase
            </Button>
          </div>
        </div>

        {/* Lista de Clases */}
        <div className="space-y-2 mt-4">
          {!classes || classes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 bg-gray-50/25 rounded-lg border border-dashed border-gray-100/75">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                <Image 
                  src="/images/Miroodles - Sticker 5.png"
                  width={32}
                  height={32}
                  alt="No hay clases"
                  className="object-contain"
                />
              </div>
              <p className="text-sm text-gray-500">No hay clases registradas</p>
              <Button 
                onClick={() => setIsNewClassModalOpen(true)}
                variant="outline"
                size="sm"
                className="mt-3 px-3 py-1.5 h-8 text-xs bg-white border-gray-200"
              >
                <IconCalendarPlus className="h-3.5 w-3.5 mr-1.5" />
                Crear tu primera clase
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {classes.map((classItem) => {
                const scheduleConfig = classItem.schedule_config as any
                const firstTimeSlot = scheduleConfig?.timeSlots?.[0] || {}

                return (
                  <div
                    key={classItem.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-md",
                      "bg-white hover:bg-gray-50/80",
                      "border border-gray-50 hover:border-gray-100",
                      "transition-all duration-200",
                      "relative overflow-hidden",
                      classItem.isExpired 
                        ? "bg-orange-50/20 border-orange-50" // Fondo sutil para clases vencidas
                        : ""
                    )}
                  >
                    {/* Indicador visual de estado (barra lateral) */}
                    <div className={cn(
                      "absolute left-0 top-0 bottom-0 w-[4px]",
                      classItem.isExpired 
                        ? "bg-orange-500/60" // Color naranja para clases vencidas
                        : classItem.status === 'active' 
                          ? "bg-blue-500/60" // Color azul para clases activas
                          : "bg-gray-300/60"
                    )} />

                    <div 
                      className={cn(
                        "flex-1 pl-2",
                        classItem.isExpired 
                          ? "cursor-not-allowed" // Cursor no permitido para clases vencidas
                          : "cursor-pointer"     // Cursor de pointer para clases editables
                      )}
                      onClick={() => handleClassClick(classItem)}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-gray-900">
                            {classItem.name}
                          </h4>
                          {/* Etiqueta de estado con distinción para vencidas */}
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full",
                            classItem.status !== 'active'
                              ? "bg-gray-50 text-gray-600 border border-gray-100" // Inactiva
                              : classItem.isExpired
                                ? "bg-orange-50 text-orange-700 border border-orange-100" // Vencida pero activa en DB
                                : "bg-blue-50 text-blue-700 border border-blue-100" // Activa y no vencida
                          )}>
                            {classItem.status !== 'active' 
                              ? 'Inactiva' 
                              : classItem.isExpired 
                                ? 'Vencida' 
                                : 'Activa'
                            }
                          </span>
                          
                          {/* Tooltip informativo para clases vencidas */}
                          {classItem.isExpired && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="text-orange-500 cursor-help">
                                    <IconInfoCircle size={14} />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p className="text-xs">Las clases vencidas no pueden ser editadas</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
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
                            ` • ${classItem.start_date.split('T')[0].split('-').reverse().join('/')}` // Formato DD/MM/YYYY sin conversión de zona horaria
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleCopyLink(classItem.shareableLink)}
                              className={cn(
                                "p-1.5 rounded-md",
                                "bg-gray-50 hover:bg-gray-100",
                                "text-gray-500 hover:text-gray-700",
                                "transition-all duration-200",
                                "focus:outline-none focus:ring-1 focus:ring-gray-200",
                                !classItem.shareableLink && "opacity-50 cursor-not-allowed"
                              )}
                              disabled={!classItem.shareableLink}
                            >
                              <IconCopy className="w-3.5 h-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            <p className="text-xs">Copiar enlace</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            className="p-1.5 text-gray-500 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors"
                          >
                            <IconTrash className="w-3.5 h-3.5" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-3" align="end">
                          <div className="text-xs space-y-2">
                            <p className="text-gray-900 font-medium">¿Eliminar esta clase?</p>
                            <p className="text-gray-500">Esta acción no se puede deshacer</p>
                            <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-gray-100">
                              <button 
                                className="px-2 py-1 text-xs bg-white border border-gray-200 rounded-md hover:bg-gray-50"
                                onClick={() => setPopoverOpen(prev => ({ ...prev, [classItem.id]: false }))}
                              >
                                Cancelar
                              </button>
                              <button 
                                className="px-2 py-1 text-xs bg-red-50 text-red-600 border border-red-100 rounded-md hover:bg-red-100"
                                onClick={() => handleDeleteClick(classItem.id, !!classItem.isExpired)}
                              >
                                Eliminar
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

      {/* Modal de advertencia para clases con reservas */}
      <DeleteClassWarningModal
        isOpen={showWarningModal}
        onClose={() => setShowWarningModal(false)}
        onConfirmDelete={confirmDeleteClass}
        bookingSummary={bookingsSummary}
      />
    </div>
  )
} 