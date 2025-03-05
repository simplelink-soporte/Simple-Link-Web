 "use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { IconQuestionMark } from "@tabler/icons-react"
import { Switch } from "@/components/ui/switch"

interface GuestsConfig {
  enabled: boolean
  maxGuestsPerMember: number
  maxGuestsPerReservation: number
  requiresGuestInfo: boolean
  guestFeeEnabled: boolean
  guestFee: number
}

interface GuestsConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (config: GuestsConfig) => void
}

export function GuestsConfigModal({ isOpen, onClose, onConfirm }: GuestsConfigModalProps) {
  const [config, setConfig] = useState<GuestsConfig>({
    enabled: true,
    maxGuestsPerMember: 3,
    maxGuestsPerReservation: 2,
    requiresGuestInfo: false,
    guestFeeEnabled: false,
    guestFee: 0
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
                Configuración de Invitados
              </h3>
              
              <div className="space-y-6">
                {/* Máximo de invitados por miembro */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Máximo de invitados por miembro</label>
                  <input
                    type="number"
                    min="1"
                    value={config.maxGuestsPerMember}
                    onChange={(e) => 
                      setConfig(prev => ({
                        ...prev,
                        maxGuestsPerMember: parseInt(e.target.value) || 1
                      }))
                    }
                    className="w-full p-2 border rounded-md focus:border-black outline-none"
                  />
                  <p className="text-sm text-gray-500">
                    Número máximo de invitados que un miembro puede traer en total
                  </p>
                </div>

                {/* Máximo de invitados por reserva */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Máximo de invitados por reserva</label>
                  <input
                    type="number"
                    min="1"
                    value={config.maxGuestsPerReservation}
                    onChange={(e) => 
                      setConfig(prev => ({
                        ...prev,
                        maxGuestsPerReservation: parseInt(e.target.value) || 1
                      }))
                    }
                    className="w-full p-2 border rounded-md focus:border-black outline-none"
                  />
                  <p className="text-sm text-gray-500">
                    Número máximo de invitados permitidos en una sola reserva
                  </p>
                </div>

                {/* Requerir información de invitados */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Requerir información de invitados</label>
                      <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
                        <IconQuestionMark className="h-3 w-3 text-gray-500" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">
                      Solicitar datos básicos de los invitados
                    </p>
                  </div>
                  <Switch
                    checked={config.requiresGuestInfo}
                    onCheckedChange={(checked) => 
                      setConfig(prev => ({
                        ...prev,
                        requiresGuestInfo: checked
                      }))
                    }
                  />
                </div>

                {/* Tarifa por invitado */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Habilitar tarifa por invitado</label>
                        <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
                          <IconQuestionMark className="h-3 w-3 text-gray-500" />
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">
                        Cobrar una tarifa adicional por cada invitado
                      </p>
                    </div>
                    <Switch
                      checked={config.guestFeeEnabled}
                      onCheckedChange={(checked) => 
                        setConfig(prev => ({
                          ...prev,
                          guestFeeEnabled: checked,
                          guestFee: checked ? prev.guestFee : 0
                        }))
                      }
                    />
                  </div>

                  {config.guestFeeEnabled && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Monto por invitado</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={config.guestFee}
                        onChange={(e) => 
                          setConfig(prev => ({
                            ...prev,
                            guestFee: parseFloat(e.target.value) || 0
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