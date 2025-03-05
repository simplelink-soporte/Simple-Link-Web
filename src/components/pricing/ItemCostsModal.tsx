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



interface WeekendTimeBlock {

  id: string

  day: 'saturday' | 'sunday'

  startTime: string

  endTime: string

  price: number

}



interface ItemCost {

  id: string

  itemName: string

  price: number

  applyWeekendRate: boolean

  weekendTimeBlocks: WeekendTimeBlock[]

  requiresDeposit: boolean

  depositAmount?: number

}



interface ItemCostsConfig {

  enabled: boolean

  costs: ItemCost[]

  allowBulkDiscounts: boolean

  bulkDiscountRules?: {

    minItems: number

    discountPercentage: number

  }

}



interface ItemCostsModalProps {

  isOpen: boolean

  onClose: () => void

  onConfirm: (config: ItemCostsConfig) => void

}



export function ItemCostsModal({ isOpen, onClose, onConfirm }: ItemCostsModalProps) {

  const [config, setConfig] = useState<ItemCostsConfig>({

    enabled: true,

    costs: [

      {

        id: "1",

        itemName: "",

        price: 0,

        applyWeekendRate: false,

        weekendTimeBlocks: [],

        requiresDeposit: false

      }

    ],

    allowBulkDiscounts: false

  })



  const timeOptions = [

    "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",

    "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00",

    "20:00", "21:00", "22:00"

  ]



  const daysOptions = [

    { value: 'saturday', label: 'Sábado' },

    { value: 'sunday', label: 'Domingo' }

  ]



  const addWeekendTimeBlock = (itemId: string) => {

    setConfig(prev => ({

      ...prev,

      costs: prev.costs.map(cost => 

        cost.id === itemId

          ? {

              ...cost,

              weekendTimeBlocks: [

                ...cost.weekendTimeBlocks,

                {

                  id: Math.random().toString(36).substr(2, 9),

                  day: 'saturday',

                  startTime: "09:00",

                  endTime: "10:00",

                  price: cost.price

                }

              ]

            }

          : cost

      )

    }))

  }



  const removeWeekendTimeBlock = (itemId: string, blockId: string) => {

    setConfig(prev => ({

      ...prev,

      costs: prev.costs.map(cost => 

        cost.id === itemId

          ? {

              ...cost,

              weekendTimeBlocks: cost.weekendTimeBlocks.filter(block => block.id !== blockId)

            }

          : cost

      )

    }))

  }



  const addNewCost = () => {

    setConfig(prev => ({

      ...prev,

      costs: [

        ...prev.costs,

        {

          id: Math.random().toString(36).substr(2, 9),

          itemName: "",

          price: 0,

          applyWeekendRate: false,

          weekendTimeBlocks: [],

          requiresDeposit: false

        }

      ]

    }))

  }



  const removeCost = (id: string) => {

    setConfig(prev => ({

      ...prev,

      costs: prev.costs.filter(cost => cost.id !== id)

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

                Configuración de Costos de Artículos

              </h3>

              

              <div className="space-y-6">

                {/* Lista de costos por artículo */}

                <div className="space-y-4">

                  {config.costs.map((cost) => (

                    <div key={cost.id} className="p-4 border rounded-md space-y-4">

                      <div className="flex items-center justify-between">

                        <input

                          type="text"

                          placeholder="Nombre del artículo"

                          value={cost.itemName}

                          onChange={(e) => {

                            setConfig(prev => ({

                              ...prev,

                              costs: prev.costs.map(c => 

                                c.id === cost.id ? { ...c, itemName: e.target.value } : c

                              )

                            }))

                          }}

                          className="w-full p-2 border rounded-md focus:border-black outline-none mr-2"

                        />

                        

                        <button

                          onClick={() => removeCost(cost.id)}

                          className="p-1 hover:bg-gray-100 rounded-full transition-colors"

                        >

                          <IconTrash className="h-5 w-5 text-gray-500" />

                        </button>

                      </div>



                      <div className="space-y-4">

                        <div className="space-y-2">

                          <label className="text-sm font-medium">Precio base</label>

                          <input

                            type="number"

                            min="0"

                            step="0.01"

                            value={cost.price}

                            onChange={(e) => {

                              setConfig(prev => ({

                                ...prev,

                                costs: prev.costs.map(c => 

                                  c.id === cost.id ? { ...c, price: parseFloat(e.target.value) || 0 } : c

                                )

                              }))

                            }}

                            className="w-full p-2 border rounded-md focus:border-black outline-none"

                          />

                        </div>



                        <div className="flex items-center justify-between">

                          <div className="space-y-1">

                            <label className="text-sm font-medium">Tarifa de fin de semana</label>

                            <p className="text-sm text-gray-500">

                              Aplicar precio especial en fines de semana

                            </p>

                          </div>

                          <Switch

                            checked={cost.applyWeekendRate}
                            onCheckedChange={(checked) => {
                              setConfig(prev => ({
                                ...prev,
                                costs: prev.costs.map(c => 
                                  c.id === cost.id ? {
                                    ...c,
                                    applyWeekendRate: checked,
                                    weekendTimeBlocks: checked ? [] : []
                                  } : c
                                )
                              }))
                            }}
                          />

                        </div>



                        {cost.applyWeekendRate && (

                          <div className="space-y-4">

                            <div className="flex items-center justify-between">

                              <label className="text-sm font-medium">Bloques de horario especial</label>

                              <button

                                onClick={() => addWeekendTimeBlock(cost.id)}

                                className="text-sm text-black hover:text-gray-700 flex items-center gap-1"

                              >

                                <IconPlus className="h-4 w-4" />

                                Agregar bloque

                              </button>

                            </div>



                            <div className="space-y-3">

                              {cost.weekendTimeBlocks.map((block) => (

                                <div 

                                  key={block.id} 

                                  className="p-3 border rounded-md space-y-3 bg-gray-50"

                                >

                                  <div className="flex items-center justify-between">

                                    <Select

                                      value={block.day}

                                      onValueChange={(value: 'saturday' | 'sunday') => {

                                        setConfig(prev => ({

                                          ...prev,

                                          costs: prev.costs.map(c => 

                                            c.id === cost.id

                                              ? {

                                                  ...c,

                                                  weekendTimeBlocks: c.weekendTimeBlocks.map(b =>

                                                    b.id === block.id ? { ...b, day: value } : b

                                                  )

                                                }

                                              : c

                                          )

                                        }))

                                      }}

                                    >

                                      <SelectTrigger className="w-[120px]">

                                        <SelectValue placeholder="Día" />

                                      </SelectTrigger>

                                      <SelectContent>

                                        <SelectItem value="saturday">Sábado</SelectItem>

                                        <SelectItem value="sunday">Domingo</SelectItem>

                                      </SelectContent>

                                    </Select>



                                    <button

                                      onClick={() => removeWeekendTimeBlock(cost.id, block.id)}

                                      className="p-1 hover:bg-gray-200 rounded-full transition-colors"

                                    >

                                      <IconTrash className="h-4 w-4 text-gray-500" />

                                    </button>

                                  </div>



                                  <div className="flex items-center gap-2">

                                    <Select

                                      value={block.startTime}

                                      onValueChange={(value) => {

                                        setConfig(prev => ({

                                          ...prev,

                                          costs: prev.costs.map(c => 

                                            c.id === cost.id

                                              ? {

                                                  ...c,

                                                  weekendTimeBlocks: c.weekendTimeBlocks.map(b =>

                                                    b.id === block.id ? { ...b, startTime: value } : b

                                                  )

                                                }

                                              : c

                                          )

                                        }))

                                      }}

                                    >

                                      <SelectTrigger className="w-[120px]">

                                        <SelectValue placeholder="Inicio" />

                                      </SelectTrigger>

                                      <SelectContent>

                                        {timeOptions.map((time) => (

                                          <SelectItem key={time} value={time}>{time}</SelectItem>

                                        ))}

                                      </SelectContent>

                                    </Select>



                                    <span className="text-sm text-gray-500">a</span>



                                    <Select

                                      value={block.endTime}

                                      onValueChange={(value) => {

                                        setConfig(prev => ({

                                          ...prev,

                                          costs: prev.costs.map(c => 

                                            c.id === cost.id

                                              ? {

                                                  ...c,

                                                  weekendTimeBlocks: c.weekendTimeBlocks.map(b =>

                                                    b.id === block.id ? { ...b, endTime: value } : b

                                                  )

                                                }

                                              : c

                                          )

                                        }))

                                      }}

                                    >

                                      <SelectTrigger className="w-[120px]">

                                        <SelectValue placeholder="Fin" />

                                      </SelectTrigger>

                                      <SelectContent>

                                        {timeOptions.map((time) => (

                                          <SelectItem key={time} value={time}>{time}</SelectItem>

                                        ))}

                                      </SelectContent>

                                    </Select>

                                  </div>



                                  <div className="space-y-2">

                                    <label className="text-sm font-medium">Precio por hora</label>

                                    <input

                                      type="number"

                                      min="0"

                                      step="0.01"

                                      value={block.price}

                                      onChange={(e) => {

                                        setConfig(prev => ({

                                          ...prev,

                                          costs: prev.costs.map(c => 

                                            c.id === cost.id

                                              ? {

                                                  ...c,

                                                  weekendTimeBlocks: c.weekendTimeBlocks.map(b =>

                                                    b.id === block.id ? { ...b, price: parseFloat(e.target.value) || 0 } : b

                                                  )

                                                }

                                              : c

                                          )

                                        }))

                                      }}

                                      className="w-full p-2 border rounded-md focus:border-black outline-none"

                                    />

                                  </div>

                                </div>

                              ))}

                            </div>

                          </div>

                        )}



                        <div className="flex items-center justify-between">

                          <div className="space-y-1">

                            <label className="text-sm font-medium">Requiere depósito</label>

                            <p className="text-sm text-gray-500">

                              Solicitar depósito reembolsable

                            </p>

                          </div>

                          <Switch

                            checked={cost.requiresDeposit}

                            onCheckedChange={(checked) => {

                              setConfig(prev => ({

                                ...prev,

                                costs: prev.costs.map(c => 

                                  c.id === cost.id ? { 

                                    ...c, 

                                    requiresDeposit: checked,

                                    depositAmount: checked ? c.depositAmount || 0 : undefined

                                  } : c

                                )

                              }))

                            }}

                          />

                        </div>



                        {cost.requiresDeposit && (

                          <div className="space-y-2">

                            <label className="text-sm font-medium">Monto del depósito</label>

                            <input

                              type="number"

                              min="0"

                              step="0.01"

                              value={cost.depositAmount || 0}

                              onChange={(e) => {

                                setConfig(prev => ({

                                  ...prev,

                                  costs: prev.costs.map(c => 

                                    c.id === cost.id ? { ...c, depositAmount: parseFloat(e.target.value) || 0 } : c

                                  )

                                }))

                              }}

                              className="w-full p-2 border rounded-md focus:border-black outline-none"

                            />

                          </div>

                        )}

                      </div>

                    </div>

                  ))}



                  <button

                    onClick={addNewCost}

                    className="w-full p-2 border border-dashed rounded-md hover:border-black transition-colors flex items-center justify-center gap-2 text-sm"

                  >

                    <IconPlus className="h-4 w-4" />

                    Agregar artículo

                  </button>

                </div>



                {/* Descuentos por cantidad */}

                <div className="space-y-4">

                  <div className="flex items-center justify-between">

                    <div className="space-y-1">

                      <div className="flex items-center gap-2">

                        <label className="text-sm font-medium">Descuentos por cantidad</label>

                        <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">

                          <IconQuestionMark className="h-3 w-3 text-gray-500" />

                        </div>

                      </div>

                      <p className="text-sm text-gray-500">

                        Aplicar descuento al rentar múltiples artículos

                      </p>

                    </div>

                    <Switch

                      checked={config.allowBulkDiscounts}

                      onCheckedChange={(checked) => {

                        setConfig(prev => ({

                          ...prev,

                          allowBulkDiscounts: checked,

                          bulkDiscountRules: checked ? {

                            minItems: 3,

                            discountPercentage: 10

                          } : undefined

                        }))

                      }}

                    />

                  </div>



                  {config.allowBulkDiscounts && config.bulkDiscountRules && (

                    <div className="space-y-4">

                      <div className="space-y-2">

                        <label className="text-sm font-medium">Cantidad mínima de artículos</label>

                        <input

                          type="number"

                          min="2"

                          value={config.bulkDiscountRules.minItems}

                          onChange={(e) => {

                            setConfig(prev => ({

                              ...prev,

                              bulkDiscountRules: {

                                ...prev.bulkDiscountRules!,

                                minItems: parseInt(e.target.value) || 2

                              }

                            }))

                          }}

                          className="w-full p-2 border rounded-md focus:border-black outline-none"

                        />

                      </div>



                      <div className="space-y-2">

                        <label className="text-sm font-medium">Porcentaje de descuento</label>

                        <input

                          type="number"

                          min="0"

                          max="100"

                          value={config.bulkDiscountRules.discountPercentage}

                          onChange={(e) => {

                            setConfig(prev => ({

                              ...prev,

                              bulkDiscountRules: {

                                ...prev.bulkDiscountRules!,

                                discountPercentage: parseInt(e.target.value) || 0

                              }

                            }))

                          }}

                          className="w-full p-2 border rounded-md focus:border-black outline-none"

                        />

                      </div>

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




