"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ClassSchedule } from "../ClassSchedule"
import type { Database } from "@/types/supabase"

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
}

export function ClassEditBasic({ 
  classData,
  onValidationChange,
  onChange 
}: ClassEditBasicProps) {
  const [title, setTitle] = useState(classData?.name || '')
  const [description, setDescription] = useState(classData?.description || '')
  const [scheduleConfig, setScheduleConfig] = useState(() => {
    // Inicializar la configuración del horario con los datos de la clase
    const defaultConfig = {
      isRecurring: false,
      startDate: undefined,
      endDate: undefined,
      weekDays: [],
      timeSlots: []
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
        courtIds: slot.courtIds
      })) || []

      return {
        isRecurring: classData.is_recurring,
        startDate,
        endDate,
        weekDays,
        timeSlots
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
        timeSlots: scheduleConfig.timeSlots.map(({ id, ...slot }) => slot) // Remover el id antes de guardar
      }
    })
  }, [title, description, scheduleConfig, onValidationChange, onChange])

  return (
    <div className="space-y-8">
      {/* Campos básicos */}
      <div className="space-y-6">
        {/* Título */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Título de la clase
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ingresa el título de la clase"
          />
        </div>

        {/* Descripción */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Descripción
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe los detalles de la clase"
            className="min-h-[100px]"
          />
        </div>
      </div>

      {/* Horarios */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900">Horarios y Capacidad</h3>
        <ClassSchedule
          config={scheduleConfig}
          onChange={setScheduleConfig}
          onValidationChange={() => {}}
          selectedBranchIds={classData?.branch_id ? [classData.branch_id] : undefined}
        />
      </div>
    </div>
  )
}
