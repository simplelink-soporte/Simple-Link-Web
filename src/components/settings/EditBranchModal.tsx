"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { TimeSelector } from "@/components/ui/time-selector"
import { IconPlus, IconTrash, IconLoader, IconBuilding, IconClock, IconMapPin, IconPhone, IconUser } from "@tabler/icons-react"
import { Branch, BranchFormData, BranchSchedule } from "@/types/branch"
import { toast } from "@/components/ui/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { formatScheduleFromDB, formatScheduleForDB } from '@/lib/utils/schedule-utils'

const DAYS = [
  { id: 'monday', label: 'Lunes' },
  { id: 'tuesday', label: 'Martes' },
  { id: 'wednesday', label: 'Miércoles' },
  { id: 'thursday', label: 'Jueves' },
  { id: 'friday', label: 'Viernes' },
  { id: 'saturday', label: 'Sábado' },
  { id: 'sunday', label: 'Domingo' }
] as const

interface EditBranchModalProps {
  branch: Branch | null
  isOpen: boolean
  onClose: () => void
  onSave: (branchId: string, data: BranchFormData) => void
}

export function EditBranchModal({ branch, isOpen, onClose, onSave }: EditBranchModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<BranchFormData>({
    name: '',
    address: '',
    phone: '',
    manager_id: '',
    is_active: true,
    opening_hours: formatScheduleFromDB(null),
    timezone: 'UTC'
  })

  useEffect(() => {
    if (branch) {
      console.log('📝 Cargando datos de la sede:', branch)
      setFormData({
        name: branch.name,
        address: branch.address || '',
        phone: branch.phone || '',
        manager_id: branch.manager_id || '',
        is_active: branch.is_active || false,
        opening_hours: formatScheduleFromDB(branch.opening_hours),
        timezone: branch.timezone || 'UTC'
      })
    }
  }, [branch])

  const handleSave = async () => {
    if (!branch) return

    try {
      setIsSubmitting(true)
      console.log('🔄 Iniciando actualización de sede...')
      
      // Formatear los horarios antes de guardar
      const formattedHours = formatScheduleForDB(formData.opening_hours)
      console.log('📅 Horarios formateados:', formattedHours)
      
      // Construir el objeto opening_hours con la estructura correcta
      const opening_hours = {
        schedule: formattedHours,
        timezone: formData.timezone
      }

      const dataToSave: BranchFormData = {
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        manager_id: formData.manager_id,
        is_active: formData.is_active,
        opening_hours: opening_hours,
        timezone: formData.timezone
      }

      console.log('📤 Datos a guardar:', dataToSave)
      
      await onSave(branch.id, dataToSave)
      console.log('✅ Sede actualizada exitosamente')
      
      toast({
        title: "Éxito",
        description: "La sede se ha actualizado correctamente",
      })
      
      onClose()
    } catch (error) {
      console.error('❌ Error al guardar:', error)
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateDaySchedule = (dayId: string, updates: Partial<BranchSchedule[string]>) => {
    console.log('Actualizando horario del día:', dayId, updates)
    setFormData(prev => ({
      ...prev,
      opening_hours: {
        ...prev.opening_hours,
        [dayId]: {
          ...prev.opening_hours[dayId],
          ...updates
        }
      }
    }))
  }

  const updateTimeRange = (dayId: string, rangeIndex: number, updates: Partial<{ openTime: string, closeTime: string }>) => {
    setFormData(prev => {
      const daySchedule = prev.opening_hours[dayId];
      const newTimeRanges = [...daySchedule.timeRanges];
      
      // Asegurarse de que el rango existe
      if (rangeIndex >= newTimeRanges.length) {
        console.warn('Índice de rango inválido:', rangeIndex);
        return prev;
      }

      // Actualizar el rango específico
      newTimeRanges[rangeIndex] = {
        ...newTimeRanges[rangeIndex],
        ...updates
      };

      console.log(`🕒 Actualizando rango ${rangeIndex} para ${dayId}:`, newTimeRanges[rangeIndex]);
      
      return {
        ...prev,
        opening_hours: {
          ...prev.opening_hours,
          [dayId]: {
            ...daySchedule,
            timeRanges: newTimeRanges
          }
        }
      };
    });
  };

  const addTimeRange = (dayId: string) => {
    setFormData(prev => {
      const daySchedule = prev.opening_hours[dayId];
      const newTimeRanges = [
        ...daySchedule.timeRanges,
        { openTime: '08:00', closeTime: '22:00' }
      ];

      console.log(`➕ Agregando nuevo rango para ${dayId}:`, newTimeRanges);

      return {
        ...prev,
        opening_hours: {
          ...prev.opening_hours,
          [dayId]: {
            ...daySchedule,
            timeRanges: newTimeRanges
          }
        }
      };
    });
  };

  const removeTimeRange = (dayId: string, rangeIndex: number) => {
    setFormData(prev => {
      const daySchedule = prev.opening_hours[dayId];
      const newTimeRanges = daySchedule.timeRanges.filter((_, index) => index !== rangeIndex);

      console.log(`🗑️ Eliminando rango ${rangeIndex} para ${dayId}:`, newTimeRanges);

      return {
        ...prev,
        opening_hours: {
          ...prev.opening_hours,
          [dayId]: {
            ...daySchedule,
            timeRanges: newTimeRanges
          }
        }
      };
    });
  };

  if (!branch) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 bg-white overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="divide-y divide-gray-100"
        >
          <DialogHeader className="p-6 bg-white sticky top-0 z-10">
            <DialogTitle className="text-xl font-semibold">
              Editar Sede
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 overflow-y-auto max-h-[calc(100vh-12rem)]">
            <Accordion type="single" collapsible defaultValue="details" className="space-y-4">
              {/* Información General */}
              <AccordionItem value="details" className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:no-underline [&[data-state=open]]:text-black">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gray-100">
                      <IconBuilding className="h-5 w-5 text-gray-500" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium">Información General</h3>
                      <p className="text-sm text-gray-500">Datos básicos de la sede</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre de la sede</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ej: Sede Principal"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Dirección</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="Ej: Av. Principal #123"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Teléfono</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Ej: +34 600 000 000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="manager">Encargado</Label>
                      <Input
                        id="manager"
                        value={formData.manager_id || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, manager_id: e.target.value }))}
                        placeholder="Ej: Juan Pérez"
                      />
                      <p className="text-xs text-gray-500">
                        Persona responsable de la gestión de esta sede
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Estado</Label>
                        <div className="text-sm text-gray-500">
                          Determina si la sede está activa
                        </div>
                      </div>
                      <Switch
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                      />
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <IconMapPin className="h-4 w-4 flex-shrink-0" />
                        <span>{branch.address || 'Sin dirección'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <IconPhone className="h-4 w-4 flex-shrink-0" />
                        <span>{branch.phone || 'Sin teléfono'}</span>
                      </div>
                      {branch.manager_id && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <IconUser className="h-4 w-4 flex-shrink-0" />
                          <span>{branch.manager_id}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-gray-600">
                        <span>Zona Horaria:</span>
                        <span>{formData.timezone}</span>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Horarios */}
              <AccordionItem value="schedule" className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:no-underline [&[data-state=open]]:text-black">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gray-100">
                      <IconClock className="h-5 w-5 text-gray-500" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium">Horarios</h3>
                      <p className="text-sm text-gray-500">Configuración de horarios por día</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4 pt-4">
                    {DAYS.map((day) => (
                      <div
                        key={day.id}
                        className="p-4 rounded-lg border bg-white space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>{day.label}</Label>
                            <div className="text-sm text-gray-500">
                              Configura los horarios para este día
                            </div>
                          </div>
                          <Switch
                            checked={formData.opening_hours[day.id].isOpen}
                            onCheckedChange={(checked) => updateDaySchedule(day.id, { isOpen: checked })}
                          />
                        </div>

                        {formData.opening_hours[day.id].isOpen && (
                          <div className="space-y-3 pl-6">
                            {formData.opening_hours[day.id].timeRanges.map((range, index) => (
                              <div key={`${day.id}-range-${index}`} className="flex items-center gap-3">
                                <div className="flex-1 grid grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-gray-500">Apertura</Label>
                                    <TimeSelector
                                      value={range.openTime}
                                      onChange={(time) => updateTimeRange(day.id, index, { openTime: time })}
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-gray-500">Cierre</Label>
                                    <TimeSelector
                                      value={range.closeTime}
                                      onChange={(time) => updateTimeRange(day.id, index, { closeTime: time })}
                                    />
                                  </div>
                                </div>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeTimeRange(day.id, index)}
                                  className="h-9 w-9 text-gray-400 hover:text-red-500"
                                  disabled={formData.opening_hours[day.id].timeRanges.length === 1}
                                >
                                  <IconTrash className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addTimeRange(day.id)}
                              className="w-full"
                            >
                              <IconPlus className="h-4 w-4 mr-2" />
                              Agregar horario
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="p-6 bg-gray-50 sticky bottom-0 z-10">
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="min-w-[100px]"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSubmitting || !formData.name || !formData.address || !formData.phone}
                className="min-w-[100px] bg-black hover:bg-gray-800 text-white"
              >
                {isSubmitting ? (
                  <>
                    <IconLoader className="h-4 w-4 animate-spin mr-2" />
                    Guardando...
                  </>
                ) : (
                  'Guardar'
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
} 