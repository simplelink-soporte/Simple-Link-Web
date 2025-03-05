 "use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { IconQuestionMark } from "@tabler/icons-react"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select-2"

interface AdvanceTimeConfig {
  enabled: boolean
  daysInAdvance: number
  allowSameDay: boolean
  maxDaysInAdvance: number
  restrictWeekends: boolean
  weekendDaysInAdvance?: number
}

interface AdvanceTimeModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (config: AdvanceTimeConfig) => void
}

export function AdvanceTimeModal({ isOpen, onClose, onConfirm }: AdvanceTimeModalProps) {
  const [config, setConfig] = useState<AdvanceTimeConfig>({
    enabled: true,
    daysInAdvance: 7,
    allowSameDay: true,
    maxDaysInAdvance: 30,
    restrictWeekends: false
  })

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
                Tiempo de Anticipación para Reservas
              </h3>
              
              <div className="space-y-6">
                {/* Días mínimos de anticipación */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Días mínimos de anticipación</label>
                  <input
                    type="number"
                    min="0"
                    value={config.daysInAdvance}
                    onChange={(e) => 
                      setConfig(prev => ({
                        ...prev,
                        daysInAdvance: parseInt(e.target.value) || 0
                      }))
                    }
                    className="w-full p-2 border rounded-md focus:border-black outline-none"
                  />
                  <p className="text-sm text-gray-500">
                    Cuántos días antes se debe realizar la reserva
                  </p>
                </div>

                {/* Permitir mismo día */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Permitir reservas el mismo día</label>
                      <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
                        <IconQuestionMark className="h-3 w-3 text-gray-500" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">
                      Los usuarios podrán reservar para el día actual
                    </p>
                  </div>
                  <Switch
                    checked={config.allowSameDay}
                    onCheckedChange={(checked) => 
                      setConfig(prev => ({
                        ...prev,
                        allowSameDay: checked
                      }))
                    }
                  />
                </div>

                {/* Días máximos de anticipación */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Días máximos de anticipación</label>
                  <input
                    type="number"
                    min="1"
                    value={config.maxDaysInAdvance}
                    onChange={(e) => 
                      setConfig(prev => ({
                        ...prev,
                        maxDaysInAdvance: parseInt(e.target.value) || 1
                      }))
                    }
                    className="w-full p-2 border rounded-md focus:border-black outline-none"
                  />
                  <p className="text-sm text-gray-500">
                    Hasta cuántos días en el futuro se puede reservar
                  </p>
                </div>

                {/* Restricción para fines de semana */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Reglas especiales para fines de semana</label>
                        <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
                          <IconQuestionMark className="h-3 w-3 text-gray-500" />
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">
                        Aplicar anticipación diferente para sábados y domingos
                      </p>
                    </div>
                    <Switch
                      checked={config.restrictWeekends}
                      onCheckedChange={(checked) => 
                        setConfig(prev => ({
                          ...prev,
                          restrictWeekends: checked,
                          weekendDaysInAdvance: checked ? prev.weekendDaysInAdvance : undefined
                        }))
                      }
                    />
                  </div>

                  {config.restrictWeekends && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Días de anticipación para fines de semana</label>
                      <input
                        type="number"
                        min="1"
                        value={config.weekendDaysInAdvance || ''}
                        onChange={(e) => 
                          setConfig(prev => ({
                            ...prev,
                            weekendDaysInAdvance: parseInt(e.target.value) || 0
                          }))
                        }
                        className="w-full p-2 border rounded-md focus:border-black outline-none"
                      />
                    </div>
                  )}
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