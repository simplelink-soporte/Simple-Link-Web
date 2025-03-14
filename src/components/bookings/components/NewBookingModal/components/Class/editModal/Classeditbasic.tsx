"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ClassSchedule } from "../ClassSchedule"
import type { Database } from "@/types/supabase"
import { IconList, IconCalendar, IconPlus, IconClock, IconUsers, IconCoin, IconPencil, IconCurrency, IconX } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { SessionsReviewModal } from "./SessionsReviewModal"
import { SuspendedSession } from "@/types/classes"
import { AddSpecificSessionModal } from "./AddSpecificSessionModal"
import { toast } from "sonner"
import { CustomCalendar } from "@/components/ui/custom-calendar"
import { format } from "date-fns"
import { es } from "date-fns/locale"

// Extendemos ClassScheduleConfig para incluir suspendedSessions
interface ExtendedClassScheduleConfig {
  isRecurring: boolean
  startDate: Date | undefined
  endDate: Date | undefined
  weekDays: number[]
  timeSlots: Array<{
    id: string
    startTime: string
    endTime: string
    capacity: number
    instructors: string[]
    price: number
    courtIds: string[]
  }>
  suspendedSessions: SuspendedSession[]
  specificSessions: Array<{
    date: string
    startTime: string
    endTime: string
    capacity: number
    price: number
    instructors: string[]
    courtIds: string | string[]
    createdAt?: string
  }>
}

interface ClassEditBasicProps {
  classData?: Database['public']['Tables']['classes']['Row']
  onValidationChange: (isValid: boolean) => void
  onChange: (data: Partial<Database['public']['Tables']['classes']['Row']>) => void
}

interface ScheduleConfigType {
  days: number[]
  timeSlots: Array<{
    price: number
    endTime: string
    capacity: number
    courtIds?: string[]
    startTime: string
    instructors: string[]
  }>
  suspendedSessions?: SuspendedSession[]
}

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  capacity: number;
  price: number;
  instructors: string[];
  courtIds: string[];
}

export function ClassEditBasic({ 
  classData,
  onValidationChange,
  onChange 
}: ClassEditBasicProps) {
  const [title, setTitle] = useState(classData?.name || '')
  const [description, setDescription] = useState(classData?.description || '')
  const [showSessionsModal, setShowSessionsModal] = useState(false)
  const [showAddSessionModal, setShowAddSessionModal] = useState(false)
  const [scheduleConfig, setScheduleConfig] = useState<ExtendedClassScheduleConfig>(() => {
    // Inicializar la configuración del horario con los datos de la clase
    const defaultConfig = {
      isRecurring: false,
      startDate: undefined,
      endDate: undefined,
      weekDays: [],
      timeSlots: [],
      suspendedSessions: [],
      specificSessions: []
    }

    if (!classData) return defaultConfig

    try {
      // Convertir las fechas de string a Date en UTC
      const startDate = classData.start_date ? (() => {
        const date = new Date(classData.start_date)
        return new Date(Date.UTC(
          date.getUTCFullYear(),
          date.getUTCMonth(),
          date.getUTCDate(),
          12, 0, 0
        ))
      })() : undefined

      const endDate = classData.end_date ? (() => {
        const date = new Date(classData.end_date)
        return new Date(Date.UTC(
          date.getUTCFullYear(),
          date.getUTCMonth(),
          date.getUTCDate(),
          12, 0, 0
        ))
      })() : undefined

      // Obtener la configuración existente
      const existingConfig = classData.schedule_config as ScheduleConfigType

      // Extraer los días de la semana del schedule_config
      const weekDays = existingConfig?.days || []

      // Mapear los time slots al formato esperado
      const timeSlots = existingConfig?.timeSlots.map(slot => ({
        id: crypto.randomUUID(),
        startTime: slot.startTime,
        endTime: slot.endTime,
        capacity: slot.capacity,
        price: slot.price,
        instructors: slot.instructors,
        courtIds: slot.courtIds || []
      })) || []

      // Obtener las sesiones suspendidas si existen
      const suspendedSessions = existingConfig?.suspendedSessions || []

      // Obtener las sesiones específicas si existen
      const specificSessions = existingConfig?.specificSessions || []

      return {
        isRecurring: classData.is_recurring,
        startDate,
        endDate,
        weekDays,
        timeSlots,
        suspendedSessions,
        specificSessions
      }
    } catch (error) {
      console.error('Error parsing schedule config:', error)
      return defaultConfig
    }
  })

  // Validar campos y notificar cambios
  useEffect(() => {
    const isValid = title.trim().length > 0 && 
                   scheduleConfig.timeSlots.length > 0

    onValidationChange(isValid)
    
    onChange({
      name: title,
      description: description || null,
      is_recurring: scheduleConfig.isRecurring,
      start_date: scheduleConfig.startDate?.toISOString(),
      end_date: scheduleConfig.endDate?.toISOString(),
      schedule_config: {
        days: scheduleConfig.weekDays,
        timeSlots: scheduleConfig.timeSlots.map(({ id, ...slot }) => ({
          ...slot,
          courtIds: slot.courtIds || []
        })),
        suspendedSessions: scheduleConfig.suspendedSessions,
        specificSessions: scheduleConfig.specificSessions
      } as any
    })
  }, [title, description, scheduleConfig, onValidationChange, onChange])

  return (
    <div className="space-y-8">
      {/* Campos básicos */}
      <div className="space-y-4">
        {/* Título */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700 block">
            Nombre de la clase
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Clase de iniciación, Torneo semanal, etc."
            className="w-full text-xs py-1.5 px-3"
          />
        </div>
        
        {/* Descripción */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700 block">
            Descripción <span className="text-gray-500 text-xs font-normal">(opcional)</span>
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Agrega detalles sobre la clase"
            className="w-full text-xs py-1.5 px-3 min-h-[80px] resize-none"
          />
        </div>

        {/* Botones para gestionar sesiones */}
        <div className="space-y-2 pt-1">
          {/* Botón para acceder a las sesiones */}
          <button
            onClick={() => setShowSessionsModal(true)}
            className={cn(
              "w-full px-3 py-1.5 rounded-lg",
              "text-xs text-white",
              "bg-gray-800 border border-gray-800",
              "hover:bg-gray-900 hover:border-gray-900",
              "transition-all duration-200",
              "flex items-center justify-center gap-2"
            )}
          >
            <IconList size={14} className="text-gray-300" />
            Revisar sesiones
          </button>

          {/* Botón para agregar una sesión específica */}
          <button
            onClick={() => setShowAddSessionModal(true)}
            className={cn(
              "w-full px-3 py-1.5 rounded-lg",
              "text-xs text-gray-600",
              "border border-gray-200/75",
              "hover:bg-gray-50 hover:border-gray-300/75",
              "transition-all duration-200",
              "flex items-center justify-center gap-2"
            )}
          >
            <IconPlus size={14} className="text-gray-400" />
            Nueva sesión específica
          </button>
        </div>
      </div>

      {/* Fechas de Inicio y Fin de la Clase */}
      <div className="grid grid-cols-2 gap-3">
        {/* Fecha de Inicio (solo lectura) */}
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Fecha de inicio</label>
          <div 
            className="flex items-center py-2 px-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed text-xs"
          >
            <IconCalendar size={14} className="mr-1.5 text-gray-400" />
            {scheduleConfig.startDate 
              ? format(scheduleConfig.startDate, "d 'de' MMMM 'de' yyyy", { locale: es })
              : "No establecida"}
          </div>
        </div>

        {/* Fecha de Fin (solo lectura) */}
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Fecha de finalización</label>
          <div 
            className="flex items-center py-2 px-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed text-xs"
          >
            <IconCalendar size={14} className="mr-1.5 text-gray-400" />
            {scheduleConfig.endDate 
              ? format(scheduleConfig.endDate, "d 'de' MMMM 'de' yyyy", { locale: es })
              : "Sin fecha de finalización"}
          </div>
        </div>
      </div>

      {/* Sección de Sesiones Fijas */}
      <div className="space-y-2 mt-4">
        <div className="space-y-1">
          <h3 className="text-xs font-medium text-gray-900">Sesiones fijas</h3>
          <p className="text-xs text-gray-500">Para ver las sesiones individuales seleccione "Revisar sesiones".</p>
        </div>
        
        {scheduleConfig.timeSlots.length === 0 ? (
          <div className="text-center py-3 text-xs text-gray-500">
            No hay sesiones fijas configuradas
          </div>
        ) : (
          <div className="space-y-1.5">
            {scheduleConfig.timeSlots.map((slot, index) => (
              <div 
                key={slot.id || index} 
                className="py-3 px-4 border border-gray-200 rounded-lg bg-white hover:border-gray-300 transition-all flex flex-col"
              >
                <div className="flex items-center justify-between">
                  {/* Info de la sesión */}
                  <div>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center text-gray-700 text-xs">
                        <IconClock size={14} className="mr-1 text-gray-500" />
                        <span>{slot.startTime} - {slot.endTime}</span>
                      </div>
                      <div className="flex items-center text-gray-700 text-xs">
                        <IconUsers size={14} className="mr-1 text-gray-500" />
                        <span>{slot.capacity}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 mt-0.5">
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">Días:</span>{" "}
                        {scheduleConfig.weekDays.map(day => {
                          const weekdays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
                          return weekdays[day];
                        }).join(", ")}
                      </div>
                    </div>
                  </div>
                  
                  {/* Precio (editable inline) */}
                  <div className="flex items-center">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                      <input
                        type="number"
                        value={slot.price}
                        min="0"
                        className="py-1 pl-7 pr-2 w-24 text-xs border-none bg-transparent focus:outline-none focus:ring-0"
                        onChange={(e) => {
                          const priceValue = parseInt(e.target.value, 10);
                          if (!isNaN(priceValue) && priceValue >= 0) {
                            const updatedTimeSlots = [...scheduleConfig.timeSlots];
                            updatedTimeSlots[index] = {
                              ...slot,
                              price: priceValue
                            };
                            setScheduleConfig(prev => ({
                              ...prev,
                              timeSlots: updatedTimeSlots
                            }));
                          }
                        }}
                        onBlur={() => {
                          toast.success("Precio actualizado", {
                            duration: 2000,
                            position: "bottom-right"
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Sección de instructores */}
                <div className="mt-3 pt-2 border-t border-gray-100">
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {slot.instructors.length > 0 ? (
                      slot.instructors.map((instructor, instrIndex) => (
                        <div 
                          key={`${index}-${instrIndex}`} 
                          className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-xs text-gray-700"
                        >
                          {instructor}
                          <button
                            className="ml-1.5 text-gray-400 hover:text-gray-600"
                            onClick={() => {
                              const updatedInstructors = [...slot.instructors];
                              updatedInstructors.splice(instrIndex, 1);
                              
                              const updatedTimeSlots = [...scheduleConfig.timeSlots];
                              updatedTimeSlots[index] = {
                                ...slot,
                                instructors: updatedInstructors
                              };
                              
                              setScheduleConfig(prev => ({
                                ...prev,
                                timeSlots: updatedTimeSlots
                              }));
                            }}
                          >
                            <IconX size={12} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500">No hay instructores asignados</div>
                    )}
                  </div>
                  
                  {/* Input para agregar instructores */}
                  <form
                    className="flex items-center"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const input = e.currentTarget.elements.namedItem('new-instructor') as HTMLInputElement;
                      const newInstructor = input.value.trim();
                      
                      if (newInstructor) {
                        const updatedTimeSlots = [...scheduleConfig.timeSlots];
                        updatedTimeSlots[index] = {
                          ...slot,
                          instructors: [...slot.instructors, newInstructor]
                        };
                        
                        setScheduleConfig(prev => ({
                          ...prev,
                          timeSlots: updatedTimeSlots
                        }));
                        
                        input.value = '';
                      }
                    }}
                  >
                    <input
                      type="text"
                      name="new-instructor"
                      placeholder="Agregar instructor..."
                      className="py-1 px-2 text-xs w-full border-none bg-transparent focus:outline-none focus:ring-0"
                    />
                    <button
                      type="submit"
                      className="text-xs text-gray-500 hover:text-gray-600 font-medium"
                    >
                      Agregar
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para revisar sesiones */}
      <SessionsReviewModal
        isOpen={showSessionsModal}
        onClose={() => setShowSessionsModal(false)}
        timeSlots={scheduleConfig.timeSlots}
        classId={classData?.id || ''}
        selectedDate={scheduleConfig.startDate?.toISOString().split('T')[0]}
        suspendedSessions={scheduleConfig.suspendedSessions}
        // Propiedades para clases recurrentes
        isRecurring={scheduleConfig.isRecurring}
        startDate={scheduleConfig.startDate?.toISOString().split('T')[0]}
        endDate={scheduleConfig.endDate?.toISOString().split('T')[0]}
        scheduleDays={scheduleConfig.weekDays}
        // Sesiones específicas del schedule_config
        specificSessions={scheduleConfig.specificSessions}
        onSessionsUpdate={(updatedTimeSlots) => {
          setScheduleConfig(prev => ({
            ...prev,
            timeSlots: updatedTimeSlots
          }))
        }}
      />

      {/* Modal para agregar sesión específica */}
      <AddSpecificSessionModal
        isOpen={showAddSessionModal}
        onClose={() => setShowAddSessionModal(false)}
        classId={classData?.id || ''}
        onAddSession={(newSession) => {
          // Agregamos la nueva sesión a la lista existente
          setScheduleConfig(prev => ({
            ...prev,
            specificSessions: [...prev.specificSessions, newSession]
          }));
          
          // Mostrar mensaje de éxito
          toast.success("Sesión específica agregada correctamente", {
            description: `Fecha: ${newSession.date}, Horario: ${newSession.startTime}-${newSession.endTime}`
          });
        }}
      />
    </div>
  )
}
