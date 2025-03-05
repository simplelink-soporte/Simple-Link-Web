 "use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { IconQuestionMark, IconClock } from "@tabler/icons-react"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select-2"

interface LastDayTimeConfig {
  enabled: boolean
  openingTime: string
  applyToWeekends: boolean
  weekendTime?: string
  notifyMembers: boolean
}

interface LastDayTimeModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (config: LastDayTimeConfig) => void
}

export function LastDayTimeModal({ isOpen, onClose, onConfirm }: LastDayTimeModalProps) {
  const [config, setConfig] = useState<LastDayTimeConfig>({
    enabled: true,
    openingTime: "09:00",
    applyToWeekends: false,
    notifyMembers: false
  })

  const timeOptions = [
    "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
    "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00",
    "20:00", "21:00", "22:00"
  ]

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
                Horario de Apertura del Último Día
              </h3>
              
              <div className="space-y-6">
                {/* Hora de apertura */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Hora de apertura</label>
                  <Select
                    value={config.openingTime}
                    onValueChange={(value) => 
                      setConfig(prev => ({
                        ...prev,
                        openingTime: value
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue>
                        <span className="flex items-center gap-2">
                          <IconClock className="h-4 w-4" />
                          {config.openingTime}
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">
                    Hora a la que se abrirá el sistema el último día de reserva
                  </p>
                </div>

                {/* Configuración para fines de semana */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Horario especial para fines de semana</label>
                        <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
                          <IconQuestionMark className="h-3 w-3 text-gray-500" />
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">
                        Establecer un horario diferente para sábados y domingos
                      </p>
                    </div>
                    <Switch
                      checked={config.applyToWeekends}
                      onCheckedChange={(checked) => 
                        setConfig(prev => ({
                          ...prev,
                          applyToWeekends: checked,
                          weekendTime: checked ? prev.weekendTime || "09:00" : undefined
                        }))
                      }
                    />
                  </div>

                  {config.applyToWeekends && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Hora de apertura en fines de semana</label>
                      <Select
                        value={config.weekendTime}
                        onValueChange={(value) => 
                          setConfig(prev => ({
                            ...prev,
                            weekendTime: value
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue>
                            <span className="flex items-center gap-2">
                              <IconClock className="h-4 w-4" />
                              {config.weekendTime}
                            </span>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {timeOptions.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Notificar a miembros */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Notificar a miembros</label>
                      <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
                        <IconQuestionMark className="h-3 w-3 text-gray-500" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">
                      Enviar recordatorio a los miembros sobre el horario de apertura
                    </p>
                  </div>
                  <Switch
                    checked={config.notifyMembers}
                    onCheckedChange={(checked) => 
                      setConfig(prev => ({
                        ...prev,
                        notifyMembers: checked
                      }))
                    }
                  />
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