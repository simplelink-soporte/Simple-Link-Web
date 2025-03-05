"use client"



import { useState } from "react"

import { motion, AnimatePresence } from "framer-motion"

import { IconQuestionMark } from "@tabler/icons-react"

import { Switch } from "@/components/ui/switch"



interface AgeRestrictionConfig {

  enabled: boolean

  minAge: number

  maxAge: number

  requiresValidation: boolean

}



interface AgeRestrictionModalProps {

  isOpen: boolean

  onClose: () => void

  onConfirm: (config: AgeRestrictionConfig) => void

}



export function AgeRestrictionModal({ isOpen, onClose, onConfirm }: AgeRestrictionModalProps) {

  const [config, setConfig] = useState<AgeRestrictionConfig>({

    enabled: true, // Siempre estará enabled ya que el switch está en el modal principal

    minAge: 0,

    maxAge: 100,

    requiresValidation: false

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

                Restricción de Edad

              </h3>

              

              <div className="space-y-6">

                {/* Edad mínima */}

                <div className="space-y-2">

                  <label className="text-sm font-medium">Edad mínima</label>

                  <input

                    type="number"

                    min="0"

                    max="100"

                    value={config.minAge}

                    onChange={(e) => 

                      setConfig(prev => ({

                        ...prev,

                        minAge: parseInt(e.target.value) || 0

                      }))

                    }

                    className="w-full p-2 border rounded-md focus:border-black outline-none"

                  />

                </div>



                {/* Edad máxima */}

                <div className="space-y-2">

                  <label className="text-sm font-medium">Edad máxima</label>

                  <input

                    type="number"

                    min="0"

                    max="100"

                    value={config.maxAge}

                    onChange={(e) => 

                      setConfig(prev => ({

                        ...prev,

                        maxAge: parseInt(e.target.value) || 0

                      }))

                    }

                    className="w-full p-2 border rounded-md focus:border-black outline-none"

                  />

                </div>



                {/* Requerir validación */}

                <div className="flex items-center justify-between">

                  <div className="space-y-1">

                    <div className="flex items-center gap-2">

                      <label className="text-sm font-medium">Requerir validación</label>

                      <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">

                        <IconQuestionMark className="h-3 w-3 text-gray-500" />

                      </div>

                    </div>

                    <p className="text-sm text-gray-500">

                      Solicitar documento de identidad para verificar la edad

                    </p>

                  </div>

                  <Switch

                    checked={config.requiresValidation}

                    onCheckedChange={(checked) => 

                      setConfig(prev => ({

                        ...prev,

                        requiresValidation: checked

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


