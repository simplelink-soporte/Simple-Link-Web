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

interface NewBranchModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (branchData: BranchFormData) => void
}

type ModalStep = 'details' | 'schedule'

interface TimeRange {
  openTime: string
  closeTime: string
}

interface Schedule {
  day: string
  isOpen: boolean
  timeRanges: TimeRange[]
}

interface BranchFormData {
  name: string
  address: string
  phone: string
  manager?: string
  isActive: boolean
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
  
  const [formData, setFormData] = useState<BranchFormData>({
    name: '',
    address: '',
    phone: '',
    manager: '',
    isActive: true,
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
      await onSave(formData)
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
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px]"
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
                    <div className="space-y-6">
                      {/* Nombre */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Nombre de la sucursal</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="ej. Sede Norte"
                            className="w-full pb-2 border-b border-gray-300 focus:border-black outline-none transition-colors bg-transparent"
                          />
                        </div>
                      </div>

                      {/* Dirección */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Dirección</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={formData.address}
                            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                            placeholder="ej. Calle Principal 123"
                            className="w-full pb-2 border-b border-gray-300 focus:border-black outline-none transition-colors bg-transparent"
                          />
                        </div>
                      </div>

                      {/* Teléfono */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Teléfono</label>
                        <div className="relative">
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="ej. +34 123 456 789"
                            className="w-full pb-2 border-b border-gray-300 focus:border-black outline-none transition-colors bg-transparent"
                          />
                        </div>
                      </div>

                      {/* Encargado (Opcional) */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Encargado
                          <span className="text-gray-400 font-normal ml-1">(opcional)</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={formData.manager}
                            onChange={(e) => setFormData(prev => ({ ...prev, manager: e.target.value }))}
                            placeholder="ej. Juan Pérez"
                            className="w-full pb-2 border-b border-gray-300 focus:border-black outline-none transition-colors bg-transparent"
                          />
                        </div>
                      </div>

                      {/* Estado de la sucursal */}
                      <div className="flex items-center justify-between pt-4">
                        <div className="space-y-0.5">
                          <label className="text-sm font-medium">Estado de la sucursal</label>
                          <p className="text-sm text-gray-500">
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
                      {/* Reutilizar Horarios */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-gray-700">Reutilizar Horarios</h3>
                        <div className="grid grid-cols-2 gap-3">
                          {existingBranches.map((branch) => {
                            const isSelected = JSON.stringify(branch.schedule) === JSON.stringify(formData.schedule)
                            
                            return (
                              <button
                                key={branch.branchId}
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    schedule: [...branch.schedule]
                                  }))
                                }}
                                className={cn(
                                  "group relative p-3 rounded-lg border text-left transition-all duration-200",
                                  isSelected
                                    ? "border-black bg-gray-50 ring-1 ring-black/5"
                                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
                                )}
                              >
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <p className={cn(
                                      "text-sm font-medium",
                                      isSelected ? "text-black" : "text-gray-700"
                                    )}>
                                      {branch.branchName}
                                    </p>
                                    <div className={cn(
                                      "h-2 w-2 rounded-full transition-all duration-200",
                                      isSelected ? "bg-black scale-110" : "bg-gray-300"
                                    )} />
                                  </div>
                                  <p className={cn(
                                    "text-xs",
                                    isSelected ? "text-gray-900" : "text-gray-500"
                                  )}>
                                    {branch.schedule[0].timeRanges[0].openTime} - {branch.schedule[0].timeRanges[0].closeTime}
                                  </p>
                                </div>
                              </button>
                            )
                          })}
                          
                          {/* Opción de Personalizado */}
                          <button
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                schedule: DAYS.map(day => ({
                                  day: day.id,
                                  isOpen: true,
                                  timeRanges: [{
                                    openTime: '08:00',
                                    closeTime: '22:00'
                                  }]
                                }))
                              }))
                            }}
                            className={cn(
                              "p-3 rounded-lg border border-dashed text-left transition-all duration-200",
                              JSON.stringify(formData.schedule) === JSON.stringify(DAYS.map(day => ({
                                day: day.id,
                                isOpen: true,
                                timeRanges: [{
                                  openTime: '08:00',
                                  closeTime: '22:00'
                                }]
                              })))
                                ? "border-black bg-gray-50"
                                : "border-gray-300 hover:border-gray-400 hover:bg-gray-50/50"
                            )}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-900">Personalizado</p>
                                <div className={cn(
                                  "h-2 w-2 rounded-full transition-all duration-200",
                                  JSON.stringify(formData.schedule) === JSON.stringify(DAYS.map(day => ({
                                    day: day.id,
                                    isOpen: true,
                                    timeRanges: [{
                                      openTime: '08:00',
                                      closeTime: '22:00'
                                    }]
                                  })))
                                    ? "bg-black scale-110"
                                    : "bg-gray-300"
                                )} />
                              </div>
                              <p className="text-xs text-gray-500">
                                Configurar horarios manualmente
                              </p>
                            </div>
                          </button>
                        </div>
                      </div>

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