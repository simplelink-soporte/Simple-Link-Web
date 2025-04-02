"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { useState, useEffect } from "react"
import { IconChevronRight, IconMapPin, IconPhone, IconUser, IconClock, IconTrash, IconPlus, IconLoader } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { TimeSelector } from "@/components/ui/time-selector"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { SingleSelect } from "@/components/ui/single-select"
import { BranchFormData, TimeRange, DaySchedule, OpeningHours } from "@/types/branch"
import useOrganization from "@/hooks/useOrganization"

interface NewBranchModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (branchData: BranchFormData) => void
}

type ModalStep = 'details' | 'schedule'

interface Schedule {
  day: string
  isOpen: boolean
  timeRanges: TimeRange[]
}

// Interfaz local para manejar los datos del formulario
interface LocalBranchFormData {
  name: string
  address: string
  phone: string
  manager: string
  isActive: boolean
  timezone: string
  schedule: Schedule[]
}

const DAYS = [
  { id: 'monday', label: 'Lunes' },
  { id: 'tuesday', label: 'Martes' },
  { id: 'wednesday', label: 'Miércoles' },
  { id: 'thursday', label: 'Jueves' },
  { id: 'friday', label: 'Viernes' },
  { id: 'saturday', label: 'Sábado' },
  { id: 'sunday', label: 'Domingo' }
]

const TIME_OPTIONS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
  '20:00', '21:00', '22:00', '23:00', '00:00'
]

// Agregar esta interfaz para los horarios de sucursales
interface BranchSchedulePreset {
  branchId: number
  branchName: string
  schedule: Schedule[]
}

// Función auxiliar para formatear los rangos de horario
function formatTimeRanges(timeRanges: TimeRange[]): string {
  return timeRanges
    .map(range => `${range.openTime} - ${range.closeTime}`)
    .join(' / ');
}

export function NewBranchModal({ isOpen, onClose, onSave }: NewBranchModalProps) {
  const [mounted, setMounted] = useState(false)
  const [currentStep, setCurrentStep] = useState<ModalStep>('details')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Lista de zonas horarias disponibles
  const timezones = [
    { id: 'Europe/Madrid', name: 'Europe/Madrid (UTC+1/+2)' },
    { id: 'Europe/London', name: 'Europe/London (UTC+0/+1)' },
    { id: 'America/New_York', name: 'America/New_York (UTC-5/-4)' },
    { id: 'America/Los_Angeles', name: 'America/Los_Angeles (UTC-8/-7)' },
    { id: 'America/Mexico_City', name: 'America/Mexico_City (UTC-6/-5)' },
    { id: 'America/Tijuana', name: 'America/Tijuana (UTC-8/-7)' },
    { id: 'America/Chihuahua', name: 'America/Chihuahua (UTC-7/-6)' },
    { id: 'America/Cancun', name: 'America/Cancun (UTC-5)' }
  ]
  
  const { organization, organizationId } = useOrganization()
  
  const [formData, setFormData] = useState<LocalBranchFormData>({
    name: '',
    address: '',
    phone: '',
    manager: '',
    isActive: true,
    timezone: 'Europe/Madrid',
    schedule: DAYS.map(day => ({
      day: day.id,
      isOpen: true,
      timeRanges: [{
        openTime: '08:00',
        closeTime: '22:00'
      }]
    }))
  })

  // Agregar este estado de ejemplo para las sucursales existentes
  const [existingBranches] = useState<BranchSchedulePreset[]>([
    {
      branchId: 1,
      branchName: "Sede Principal",
      schedule: DAYS.map(day => ({
        day: day.id,
        isOpen: true,
        timeRanges: [{
          openTime: '09:00',
          closeTime: '20:00'
        }]
      }))
    },
    {
      branchId: 2,
      branchName: "Sede Norte",
      schedule: DAYS.map(day => ({
        day: day.id,
        isOpen: true,
        timeRanges: [{
          openTime: '07:00',
          closeTime: '23:00'
        }]
      }))
    }
  ])

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep('details')
      setFormData({
        name: '',
        address: '',
        phone: '',
        manager: '',
        isActive: true,
        timezone: 'Europe/Madrid',
        schedule: DAYS.map(day => ({
          day: day.id,
          isOpen: true,
          timeRanges: [{
            openTime: '08:00',
            closeTime: '22:00'
          }]
        }))
      })
    }
  }, [isOpen])

  const handleContinue = () => {
    if (currentStep === 'details') {
      if (formData.name && formData.address && formData.phone) {
        setCurrentStep('schedule')
      }
    } else {
      handleSave()
    }
  }

  const handleBack = () => {
    if (currentStep === 'schedule') {
      setCurrentStep('details')
    } else {
      onClose()
    }
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 'details':
        return 'Información de la Sucursal'
      case 'schedule':
        return 'Horarios de Atención'
      default:
        return ''
    }
  }

  const getStepDescription = () => {
    switch (currentStep) {
      case 'details':
        return 'Complete los datos básicos de la nueva sucursal'
      case 'schedule':
        return 'Configure los horarios de apertura y cierre'
      default:
        return ''
    }
  }

  const handleSave = async () => {
    try {
      setIsSubmitting(true)
      
      // Verificar si tenemos acceso a la organización
      if (!organizationId) {
        toast({
          title: "Error",
          description: "No se pudo obtener la información de la organización",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }
      
      // Transformar el formato de horarios al formato requerido por la tabla sedes
      const scheduleData = formData.schedule.reduce((acc, day) => {
        acc[day.day] = {
          isOpen: day.isOpen,
          timeRanges: day.timeRanges.map(range => ({
            openTime: range.openTime,
            closeTime: range.closeTime
          }))
        }
        return acc
      }, {} as Record<string, DaySchedule>)
      
      // Crear el objeto OpeningHours
      const openingHours: OpeningHours = {
        schedule: scheduleData,
        timezone: formData.timezone
      }
      
      // Transformar de nuestra estructura interna a la estructura requerida por la API
      const branchData: BranchFormData = {
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        manager_id: formData.manager, // Mapeo de manager a manager_id
        is_active: formData.isActive, // Mapeo de isActive a is_active
        timezone: formData.timezone,
        opening_hours: openingHours,
        settings: {}, // Añadiendo el campo settings vacío para cumplir con la interfaz
        organization_id: organizationId // Añadiendo el ID de la organización
      }
      
      await onSave(branchData)
      toast({
        title: "Sede creada",
        description: "La sede se ha creado correctamente",
      })
      onClose()
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la sede. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-white/80 backdrop-blur-[2px]"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              zIndex: 9998
            }}
            transition={{ 
              duration: 0.3,
              ease: "easeInOut"
            }}
          />
          <motion.div
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
              mass: 0.8,
            }}
            className="fixed inset-y-0 right-0 w-[500px] bg-white shadow-2xl border-l"
            style={{ zIndex: 9999 }}
          >
            <div className="h-full flex flex-col">
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ 
                  delay: 0.1,
                  duration: 0.3,
                  ease: "easeOut"
                }}
                className="p-6 border-b"
              >
                <motion.h2 
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.15, duration: 0.3 }}
                  className="text-xl font-semibold"
                >
                  {getStepTitle()}
                </motion.h2>
                <motion.p 
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  className="text-sm text-gray-500 mt-1"
                >
                  {getStepDescription()}
                </motion.p>
              </motion.div>

              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ 
                  delay: 0.3,
                  duration: 0.3,
                  ease: "easeOut"
                }}
                className="flex-1 overflow-y-auto"
              >
                <div className="p-6">
                  {currentStep === 'details' ? (
                    <div className="space-y-4">
                      {/* Nombre */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700 block">
                          Nombre de la sucursal
                        </label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="ej. Sede Norte"
                          className="w-full text-xs py-1.5 px-3"
                        />
                      </div>

                      {/* Dirección */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700 block">
                          Dirección
                        </label>
                        <Input
                          value={formData.address}
                          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="ej. Calle Principal 123"
                          className="w-full text-xs py-1.5 px-3"
                        />
                      </div>

                      {/* Teléfono */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700 block">
                          Teléfono
                        </label>
                        <Input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="ej. +34 123 456 789"
                          className="w-full text-xs py-1.5 px-3"
                        />
                      </div>

                      {/* Encargado (Opcional) */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700 block">
                          Encargado <span className="text-gray-400 font-normal">(opcional)</span>
                        </label>
                        <Input
                          type="text"
                          value={formData.manager}
                          onChange={(e) => setFormData(prev => ({ ...prev, manager: e.target.value }))}
                          placeholder="ej. Juan Pérez"
                          className="w-full text-xs py-1.5 px-3"
                        />
                      </div>
                      
                      {/* Zona Horaria */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700 block">
                          Zona Horaria
                        </label>
                        <SingleSelect
                          value={formData.timezone}
                          onChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}
                          options={timezones}
                          placeholder="Selecciona la zona horaria"
                        />
                      </div>

                      {/* Estado de la sucursal */}
                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                        <div>
                          <label className="text-xs font-medium text-gray-700 block">
                            Estado de la sucursal
                          </label>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Activar o desactivar la sucursal
                          </p>
                        </div>
                        <Switch
                          checked={formData.isActive}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* Configuración por día */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-gray-700">Configuración por Día</h3>
                          <button
                            onClick={() => {
                              const allOpen = formData.schedule.every(day => day.isOpen)
                              setFormData(prev => ({
                                ...prev,
                                schedule: prev.schedule.map(day => ({
                                  ...day,
                                  isOpen: !allOpen
                                }))
                              }))
                            }}
                            className="text-xs font-medium text-gray-500 hover:text-gray-900"
                          >
                            {formData.schedule.every(day => day.isOpen) ? 'Desactivar todos' : 'Activar todos'}
                          </button>
                        </div>

                        <div className="space-y-3">
                          {DAYS.map((day, index) => (
                            <motion.div
                              key={day.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className={cn(
                                "group p-4 rounded-lg border transition-all duration-200",
                                formData.schedule[index].isOpen
                                  ? "bg-white border-gray-200 hover:border-gray-300"
                                  : "bg-gray-50 border-gray-200"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Switch
                                    checked={formData.schedule[index].isOpen}
                                    onCheckedChange={(checked) => {
                                      const newSchedule = [...formData.schedule]
                                      newSchedule[index].isOpen = checked
                                      setFormData(prev => ({ ...prev, schedule: newSchedule }))
                                    }}
                                  />
                                  <span className={cn(
                                    "text-sm font-medium transition-colors",
                                    formData.schedule[index].isOpen ? "text-gray-900" : "text-gray-500"
                                  )}>
                                    {day.label}
                                  </span>
                                </div>
                                
                                {/* Resumen de horarios movido a la derecha */}
                                {formData.schedule[index].isOpen && (
                                  <span className="text-xs text-gray-500">
                                    {formData.schedule[index].timeRanges.map((range, i) => (
                                      <span key={i}>
                                        {range.openTime} - {range.closeTime}
                                        {i < formData.schedule[index].timeRanges.length - 1 ? ' / ' : ''}
                                      </span>
                                    ))}
                                  </span>
                                )}
                              </div>

                              {formData.schedule[index].isOpen && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="mt-4 space-y-3"
                                >
                                  {formData.schedule[index].timeRanges.map((timeRange, rangeIndex) => (
                                    <div key={rangeIndex} className="flex items-center gap-3">
                                      <div className="flex-1 grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                          <label className="text-xs text-gray-500">Apertura</label>
                                          <TimeSelector
                                            value={timeRange.openTime}
                                            onChange={(time) => {
                                              const newSchedule = [...formData.schedule]
                                              newSchedule[index].timeRanges[rangeIndex].openTime = time
                                              setFormData(prev => ({ ...prev, schedule: newSchedule }))
                                            }}
                                            className="text-sm"
                                          />
                                        </div>
                                        <div className="space-y-1.5">
                                          <label className="text-xs text-gray-500">Cierre</label>
                                          <TimeSelector
                                            value={timeRange.closeTime}
                                            onChange={(time) => {
                                              const newSchedule = [...formData.schedule]
                                              newSchedule[index].timeRanges[rangeIndex].closeTime = time
                                              setFormData(prev => ({ ...prev, schedule: newSchedule }))
                                            }}
                                            className="text-sm"
                                          />
                                        </div>
                                      </div>
                                      
                                      {/* Botón para eliminar rango si hay más de uno */}
                                      {formData.schedule[index].timeRanges.length > 1 && (
                                        <div className="flex items-center h-[34px] mt-[22px]">
                                          <button
                                            onClick={() => {
                                              const newSchedule = [...formData.schedule]
                                              newSchedule[index].timeRanges = newSchedule[index].timeRanges.filter(
                                                (_, i) => i !== rangeIndex
                                              )
                                              setFormData(prev => ({ ...prev, schedule: newSchedule }))
                                            }}
                                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                          >
                                            <IconTrash className="h-4 w-4" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  ))}

                                  {/* Botón para agregar nuevo rango */}
                                  <button
                                    onClick={() => {
                                      const newSchedule = [...formData.schedule]
                                      newSchedule[index].timeRanges.push({
                                        openTime: '08:00',
                                        closeTime: '22:00'
                                      })
                                      setFormData(prev => ({ ...prev, schedule: newSchedule }))
                                    }}
                                    className="mt-2 w-full py-2 px-3 text-sm text-gray-500 border border-dashed 
                                             rounded-lg hover:border-gray-400 hover:text-gray-700 
                                             transition-colors flex items-center justify-center gap-2"
                                  >
                                    <IconPlus className="h-4 w-4" />
                                    Agregar rango horario
                                  </button>
                                </motion.div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>

              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.3 }}
                className="p-6 border-t bg-white"
              >
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleBack}
                    className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    {currentStep === 'details' ? 'Cancelar' : 'Volver'}
                  </motion.button>
                  <Button 
                    onClick={currentStep === 'details' ? handleContinue : handleSave}
                    disabled={isSubmitting || (currentStep === 'details' && (!formData.name || !formData.address || !formData.phone))}
                    className={cn(
                      "flex-1 px-4 py-2 rounded-md transition-colors flex items-center justify-center gap-2",
                      currentStep === 'details'
                        ? formData.name && formData.address && formData.phone
                          ? "bg-black text-white hover:bg-gray-800"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-black text-white hover:bg-gray-800"
                    )}
                  >
                    {isSubmitting ? (
                      <>
                        <IconLoader className="h-4 w-4 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <span>{currentStep === 'details' ? 'Continuar' : 'Guardar'}</span>
                        {currentStep === 'details' && <IconChevronRight className="h-4 w-4" />}
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  if (!mounted) return null

  return createPortal(modalContent, document.body)
}