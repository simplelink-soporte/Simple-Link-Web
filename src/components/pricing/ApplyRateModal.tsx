import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { IconQuestionMark } from "@tabler/icons-react"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select-2"

interface ApplyRateModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (config: RateConfig) => void
}

interface RateConfig {
  gracePeriod: number
  autoCancelDays: number
  billingCycleDays: number
  hasInitiationFee: boolean
  initiationFee?: number
  // Nuevos campos
  frequency: {
    type: 'monthly' | 'quarterly' | 'custom'
    customDays?: number
    enabled: boolean
    amount: number
  }
  expirationDays: {
    enabled: boolean
    days: number
  }
  prorateMembership: boolean
}

export function ApplyRateModal({ isOpen, onClose, onConfirm }: ApplyRateModalProps) {
  const [config, setConfig] = useState<RateConfig>({
    gracePeriod: 7,
    autoCancelDays: 30,
    billingCycleDays: 5,
    hasInitiationFee: false,
    initiationFee: 0,
    frequency: {
      type: 'monthly',
      enabled: false,
      amount: 0
    },
    expirationDays: {
      enabled: false,
      days: 0
    },
    prorateMembership: false
  })

  const handleSubmit = () => {
    onConfirm(config)
    onClose()
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
                Configuración de Tarifa
              </h3>
              
              <div className="space-y-6">
                {/* Período de gracia */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">
                      Días de retraso para suspender
                    </label>
                    <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
                      <IconQuestionMark className="h-3 w-3 text-gray-500" />
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={config.gracePeriod}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      gracePeriod: parseInt(e.target.value) || 0
                    }))}
                    className="w-full p-2 border rounded-md focus:border-black outline-none transition-colors"
                  />
                  <p className="text-xs text-gray-500">
                    Período de gracia antes de suspender la cuenta por falta de pago
                  </p>
                </div>

                {/* Días para cancelación automática */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">
                      Días de atraso para cancelación
                    </label>
                    <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
                      <IconQuestionMark className="h-3 w-3 text-gray-500" />
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={config.autoCancelDays}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      autoCancelDays: parseInt(e.target.value) || 0
                    }))}
                    className="w-full p-2 border rounded-md focus:border-black outline-none transition-colors"
                  />
                  <p className="text-xs text-gray-500">
                    Días después de los cuales la membresía se cancela automáticamente
                  </p>
                </div>

                {/* Días para generar factura */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">
                      Días de anticipación para facturación
                    </label>
                    <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
                      <IconQuestionMark className="h-3 w-3 text-gray-500" />
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={config.billingCycleDays}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      billingCycleDays: parseInt(e.target.value) || 0
                    }))}
                    className="w-full p-2 border rounded-md focus:border-black outline-none transition-colors"
                  />
                  <p className="text-xs text-gray-500">
                    Días de anticipación para generar la factura del siguiente ciclo
                  </p>
                </div>

                {/* Tarifa de iniciación */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Tarifa de iniciación</label>
                        <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
                          <IconQuestionMark className="h-3 w-3 text-gray-500" />
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">
                        Cobrar una tarifa única al inicio de la membresía
                      </p>
                    </div>
                    <Switch
                      checked={config.hasInitiationFee}
                      onCheckedChange={(checked) => {
                        setConfig(prev => ({
                          ...prev,
                          hasInitiationFee: checked,
                          initiationFee: checked ? prev.initiationFee : 0
                        }))
                      }}
                    />
                  </div>

                  {config.hasInitiationFee && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Monto de la tarifa</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={config.initiationFee}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          initiationFee: parseFloat(e.target.value) || 0
                        }))}
                        className="w-full p-2 border rounded-md focus:border-black outline-none transition-colors"
                      />
                    </div>
                  )}
                </div>

                {/* Frecuencia de Pago */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Frecuencia de Pago</label>
                        <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
                          <IconQuestionMark className="h-3 w-3 text-gray-500" />
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">
                        Habilitar pagos regulares a lo largo del tiempo
                      </p>
                    </div>
                    <Switch
                      checked={config.frequency.enabled}
                      onCheckedChange={(checked) => 
                        setConfig(prev => ({
                          ...prev,
                          frequency: {
                            ...prev.frequency,
                            enabled: checked
                          }
                        }))
                      }
                    />
                  </div>

                  {config.frequency.enabled && (
                    <div className="space-y-4">
                      <Select
                        value={config.frequency.type}
                        onValueChange={(value: typeof config.frequency.type) => 
                          setConfig(prev => ({
                            ...prev,
                            frequency: {
                              ...prev.frequency,
                              type: value
                            }
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona la frecuencia" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Mensual</SelectItem>
                          <SelectItem value="quarterly">Trimestral</SelectItem>
                          <SelectItem value="custom">Personalizado</SelectItem>
                        </SelectContent>
                      </Select>

                      {config.frequency.type === 'custom' && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Días del período</label>
                          <input
                            type="number"
                            min="1"
                            value={config.frequency.customDays || ''}
                            onChange={(e) => 
                              setConfig(prev => ({
                                ...prev,
                                frequency: {
                                  ...prev.frequency,
                                  customDays: parseInt(e.target.value) || 0
                                }
                              }))
                            }
                            className="w-full p-2 border rounded-md focus:border-black outline-none"
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Monto del cargo</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={config.frequency.amount}
                          onChange={(e) => 
                            setConfig(prev => ({
                              ...prev,
                              frequency: {
                                ...prev.frequency,
                                amount: parseFloat(e.target.value) || 0
                              }
                            }))
                          }
                          className="w-full p-2 border rounded-md focus:border-black outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Vencimiento de Membresía */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Vencimiento Automático</label>
                        <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
                          <IconQuestionMark className="h-3 w-3 text-gray-500" />
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">
                        Cancelar automáticamente la membresía después de X días
                      </p>
                    </div>
                    <Switch
                      checked={config.expirationDays.enabled}
                      onCheckedChange={(checked) => 
                        setConfig(prev => ({
                          ...prev,
                          expirationDays: {
                            ...prev.expirationDays,
                            enabled: checked
                          }
                        }))
                      }
                    />
                  </div>

                  {config.expirationDays.enabled && (
                    <div className="space-y-2">
                      <input
                        type="number"
                        min="1"
                        value={config.expirationDays.days}
                        onChange={(e) => 
                          setConfig(prev => ({
                            ...prev,
                            expirationDays: {
                              ...prev.expirationDays,
                              days: parseInt(e.target.value) || 0
                            }
                          }))
                        }
                        className="w-full p-2 border rounded-md focus:border-black outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Prorrateo de Membresía */}
                {(config.frequency.type === 'monthly' || 
                  config.frequency.type === 'quarterly') && 
                  config.frequency.enabled && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium">Prorrateo de Membresía</label>
                          <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
                            <IconQuestionMark className="h-3 w-3 text-gray-500" />
                          </div>
                        </div>
                        <p className="text-sm text-gray-500">
                          Habilitar prorrateo del primer pago para alinear ciclos de facturación
                        </p>
                      </div>
                      <Switch
                        checked={config.prorateMembership}
                        onCheckedChange={(checked) => 
                          setConfig(prev => ({
                            ...prev,
                            prorateMembership: checked
                          }))
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
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
