 "use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { IconQuestionMark, IconPlus, IconTrash } from "@tabler/icons-react"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select-2"

interface FreeResource {
  id: string
  resourceType: 'court' | 'item'
  name: string
  availableDays: string[]
  timeSlots: {
    start: string
    end: string
  }[]
  requiresReservation: boolean
}

interface FreeResourcesConfig {
  enabled: boolean
  resources: FreeResource[]
  maxResourcesPerMember: number
  requiresMembership: boolean
}

interface FreeResourcesModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (config: FreeResourcesConfig) => void
}

export function FreeResourcesModal({ isOpen, onClose, onConfirm }: FreeResourcesModalProps) {
  const [config, setConfig] = useState<FreeResourcesConfig>({
    enabled: true,
    resources: [],
    maxResourcesPerMember: 1,
    requiresMembership: true
  })

  const daysOfWeek = [
    "Lunes", "Martes", "Miércoles", "Jueves", 
    "Viernes", "Sábado", "Domingo"
  ]

  const timeOptions = [
    "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
    "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00",
    "20:00", "21:00", "22:00"
  ]

  const addNewResource = () => {
    setConfig(prev => ({
      ...prev,
      resources: [
        ...prev.resources,
        {
          id: Math.random().toString(36).substr(2, 9),
          resourceType: 'court',
          name: '',
          availableDays: [],
          timeSlots: [],
          requiresReservation: false
        }
      ]
    }))
  }

  const removeResource = (id: string) => {
    setConfig(prev => ({
      ...prev,
      resources: prev.resources.filter(resource => resource.id !== id)
    }))
  }

  const addTimeSlot = (resourceId: string) => {
    setConfig(prev => ({
      ...prev,
      resources: prev.resources.map(resource => 
        resource.id === resourceId
          ? {
              ...resource,
              timeSlots: [
                ...resource.timeSlots,
                { start: "09:00", end: "10:00" }
              ]
            }
          : resource
      )
    }))
  }

  const removeTimeSlot = (resourceId: string, index: number) => {
    setConfig(prev => ({
      ...prev,
      resources: prev.resources.map(resource => 
        resource.id === resourceId
          ? {
              ...resource,
              timeSlots: resource.timeSlots.filter((_, i) => i !== index)
            }
          : resource
      )
    }))
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed left-1/2 top-[15%] -translate-x-1/2 w-full max-w-md bg-white rounded-lg shadow-lg z-50"
          >
            <div className="p-6 max-h-[75vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">
                Configuración de Recursos Gratuitos
              </h3>
              
              <div className="space-y-6">
                {/* Configuración general */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Máximo de recursos por miembro</label>
                    <input
                      type="number"
                      min="1"
                      value={config.maxResourcesPerMember}
                      onChange={(e) => 
                        setConfig(prev => ({
                          ...prev,
                          maxResourcesPerMember: parseInt(e.target.value) || 1
                        }))
                      }
                      className="w-full p-2 border rounded-md focus:border-black outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Requiere membresía</label>
                        <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
                          <IconQuestionMark className="h-3 w-3 text-gray-500" />
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">
                        Solo miembros pueden acceder a recursos gratuitos
                      </p>
                    </div>
                    <Switch
                      checked={config.requiresMembership}
                      onCheckedChange={(checked) => 
                        setConfig(prev => ({
                          ...prev,
                          requiresMembership: checked
                        }))
                      }
                    />
                  </div>
                </div>

                {/* Lista de recursos */}
                <div className="space-y-4">
                  {config.resources.map((resource) => (
                    <div key={resource.id} className="p-4 border rounded-md space-y-4">
                      <div className="flex items-center justify-between">
                        <Select
                          value={resource.resourceType}
                          onValueChange={(value: 'court' | 'item') => {
                            setConfig(prev => ({
                              ...prev,
                              resources: prev.resources.map(r => 
                                r.id === resource.id ? { ...r, resourceType: value } : r
                              )
                            }))
                          }}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Tipo de recurso" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="court">Cancha</SelectItem>
                            <SelectItem value="item">Artículo</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <button
                          onClick={() => removeResource(resource.id)}
                          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <IconTrash className="h-5 w-5 text-gray-500" />
                        </button>
                      </div>

                      <input
                        type="text"
                        placeholder="Nombre del recurso"
                        value={resource.name}
                        onChange={(e) => {
                          setConfig(prev => ({
                            ...prev,
                            resources: prev.resources.map(r => 
                              r.id === resource.id ? { ...r, name: e.target.value } : r
                            )
                          }))
                        }}
                        className="w-full p-2 border rounded-md focus:border-black outline-none"
                      />

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Días disponibles</label>
                        <div className="flex flex-wrap gap-2">
                          {daysOfWeek.map((day) => (
                            <button
                              key={day}
                              onClick={() => {
                                setConfig(prev => ({
                                  ...prev,
                                  resources: prev.resources.map(r => 
                                    r.id === resource.id
                                      ? {
                                          ...r,
                                          availableDays: r.availableDays.includes(day)
                                            ? r.availableDays.filter(d => d !== day)
                                            : [...r.availableDays, day]
                                        }
                                      : r
                                  )
                                }))
                              }}
                              className={`px-3 py-1 rounded-full text-sm ${
                                resource.availableDays.includes(day)
                                  ? 'bg-black text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">Horarios disponibles</label>
                          <button
                            onClick={() => addTimeSlot(resource.id)}
                            className="text-sm text-black hover:text-gray-700"
                          >
                            Agregar horario
                          </button>
                        </div>
                        
                        <div className="space-y-2">
                          {resource.timeSlots.map((slot, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Select
                                value={slot.start}
                                onValueChange={(value) => {
                                  setConfig(prev => ({
                                    ...prev,
                                    resources: prev.resources.map(r => 
                                      r.id === resource.id
                                        ? {
                                            ...r,
                                            timeSlots: r.timeSlots.map((s, i) => 
                                              i === index ? { ...s, start: value } : s
                                            )
                                          }
                                        : r
                                    )
                                  }))
                                }}
                              >
                                <SelectTrigger className="w-[120px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {timeOptions.map((time) => (
                                    <SelectItem key={time} value={time}>
                                      {time}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              
                              <span>a</span>
                              
                              <Select
                                value={slot.end}
                                onValueChange={(value) => {
                                  setConfig(prev => ({
                                    ...prev,
                                    resources: prev.resources.map(r => 
                                      r.id === resource.id
                                        ? {
                                            ...r,
                                            timeSlots: r.timeSlots.map((s, i) => 
                                              i === index ? { ...s, end: value } : s
                                            )
                                          }
                                        : r
                                    )
                                  }))
                                }}
                              >
                                <SelectTrigger className="w-[120px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {timeOptions.map((time) => (
                                    <SelectItem key={time} value={time}>
                                      {time}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <button
                                onClick={() => removeTimeSlot(resource.id, index)}
                                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                              >
                                <IconTrash className="h-4 w-4 text-gray-500" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium">Requiere reserva</label>
                            <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
                              <IconQuestionMark className="h-3 w-3 text-gray-500" />
                            </div>
                          </div>
                          <p className="text-sm text-gray-500">
                            Los usuarios deben reservar con anticipación
                          </p>
                        </div>
                        <Switch
                          checked={resource.requiresReservation}
                          onCheckedChange={(checked) => {
                            setConfig(prev => ({
                              ...prev,
                              resources: prev.resources.map(r => 
                                r.id === resource.id ? { ...r, requiresReservation: checked } : r
                              )
                            }))
                          }}
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={addNewResource}
                    className="w-full p-2 border border-dashed rounded-md hover:border-black transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <IconPlus className="h-4 w-4" />
                    Agregar recurso gratuito
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => onConfirm(config)}
                  className="px-4 py-2 text-sm bg-black text-white rounded-md hover:bg-gray-800 font-medium"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}