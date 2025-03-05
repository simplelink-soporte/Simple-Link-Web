 "use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { IconQuestionMark } from "@tabler/icons-react"
import { Switch } from "@/components/ui/switch"

interface AdvancePaymentConfig {
  enabled: boolean
  percentage: number
  applyToAllBookings: boolean
  minimumAmount?: number
  maximumAmount?: number
}

interface AdvancePaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (config: AdvancePaymentConfig) => void
}

export function AdvancePaymentModal({ isOpen, onClose, onConfirm }: AdvancePaymentModalProps) {
  const [config, setConfig] = useState<AdvancePaymentConfig>({
    enabled: true,
    percentage: 30,
    applyToAllBookings: true
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
                Configuración de Anticipo
              </h3>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Porcentaje de anticipo</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={config.percentage}
                    onChange={(e) => 
                      setConfig(prev => ({
                        ...prev,
                        percentage: parseInt(e.target.value) || 0
                      }))
                    }
                    className="w-full p-2 border rounded-md focus:border-black outline-none"
                  />
                  <p className="text-sm text-gray-500">
                    Porcentaje del costo total que se cobrará como anticipo
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Aplicar a todas las reservas</label>
                      <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
                        <IconQuestionMark className="h-3 w-3 text-gray-500" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">
                      Aplicar el anticipo a todas las reservas sin excepción
                    </p>
                  </div>
                  <Switch
                    checked={config.applyToAllBookings}
                    onCheckedChange={(checked) => 
                      setConfig(prev => ({
                        ...prev,
                        applyToAllBookings: checked
                      }))
                    }
                  />
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Monto mínimo (opcional)</label>
                    <input
                      type="number"
                      min="0"
                      value={config.minimumAmount || ''}
                      onChange={(e) => 
                        setConfig(prev => ({
                          ...prev,
                          minimumAmount: e.target.value ? parseInt(e.target.value) : undefined
                        }))
                      }
                      className="w-full p-2 border rounded-md focus:border-black outline-none"
                    />
                    <p className="text-sm text-gray-500">
                      Monto mínimo que se cobrará como anticipo
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Monto máximo (opcional)</label>
                    <input
                      type="number"
                      min="0"
                      value={config.maximumAmount || ''}
                      onChange={(e) => 
                        setConfig(prev => ({
                          ...prev,
                          maximumAmount: e.target.value ? parseInt(e.target.value) : undefined
                        }))
                      }
                      className="w-full p-2 border rounded-md focus:border-black outline-none"
                    />
                    <p className="text-sm text-gray-500">
                      Monto máximo que se cobrará como anticipo
                    </p>
                  </div>
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