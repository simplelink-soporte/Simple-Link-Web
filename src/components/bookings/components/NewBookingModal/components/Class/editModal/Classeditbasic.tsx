"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ClassSchedule } from "../ClassSchedule"
import type { Database } from "@/types/supabase"
import { IconList, IconLayersSubtract, IconPlus } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { SessionsReviewModal } from "./SessionsReviewModal"
import { SuspendedSession } from "@/types/classes"
import { AddSpecificSessionModal } from "./AddSpecificSessionModal"
import { toast } from "sonner"

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
      suspendedSessions: []
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

      return {
        isRecurring: classData.is_recurring,
        startDate,
        endDate,
        weekDays,
        timeSlots,
        suspendedSessions
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
        suspendedSessions: scheduleConfig.suspendedSessions
      } as any
    })
  }, [title, description, scheduleConfig, onValidationChange, onChange])

  return (
    <div className="space-y-8">
      {/* Campos básicos */}
      <div className="space-y-6">
        {/* Título */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-900">
            Nombre de la clase
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Clase de iniciación, Torneo semanal, etc."
            className="w-full"
          />
        </div>
        
        {/* Descripción */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-900">
            Descripción <span className="text-gray-500 text-sm font-normal">(opcional)</span>
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Agrega detalles sobre la clase"
            className="w-full min-h-[100px]"
          />
        </div>
      </div>

      {/* Separador */}
      <motion.div 
        className="h-px bg-gray-100 w-full"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
      />

      {/* Botones para gestionar sesiones */}
      <div className="space-y-3">
        {/* Botón para acceder a las sesiones */}
        <button
          onClick={() => setShowSessionsModal(true)}
          className={cn(
            "w-full px-3 py-2 rounded-lg",
            "text-xs text-gray-600",
            "border border-gray-200/75",
            "hover:bg-gray-50 hover:border-gray-300/75",
            "transition-all duration-200",
            "flex items-center justify-center gap-2"
          )}
        >
          <IconList size={14} className="text-gray-400" />
          Revisar sesiones
        </button>

        {/* Botón para agregar una sesión específica */}
        <button
          onClick={() => setShowAddSessionModal(true)}
          className={cn(
            "w-full px-3 py-2 rounded-lg",
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
            timeSlots: [...prev.timeSlots, newSession]
          }));
          
          // Mostrar mensaje de éxito
          toast.success("Sesión específica agregada correctamente", {
            description: `Fecha: ${newSession.date}, Horario: ${newSession.startTime}-${newSession.endTime}`
          });
        }}
      />

      {/* Horarios */}
      <div className="space-y-4">
        <ClassSchedule
          config={{
            isRecurring: scheduleConfig.isRecurring,
            startDate: scheduleConfig.startDate,
            endDate: scheduleConfig.endDate,
            weekDays: scheduleConfig.weekDays,
            timeSlots: scheduleConfig.timeSlots
          }}
          onChange={(newConfig) => {
            setScheduleConfig(prev => ({
              ...prev,
              // Mantener el valor original de isRecurring
              isRecurring: prev.isRecurring,
              // Mantener la fecha de inicio original
              startDate: prev.startDate,
              // Solo permitir actualizar la fecha de fin
              endDate: newConfig.endDate,
              weekDays: newConfig.weekDays,
              timeSlots: newConfig.timeSlots
            }))
          }}
          onValidationChange={() => {}}
          hideRecurringSwitch={true}
          readOnlyStartDate={true}
        />
      </div>
    </div>
  )
}
