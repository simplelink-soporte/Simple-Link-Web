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







interface CourtCost {



  id: string



  courtType: string



  pricePerHour: number



  minTimeSlot: number



  applyWeekendRate: boolean



  weekendTimeBlocks: WeekendTimeBlock[]



}







interface CourtCostsConfig {



  enabled: boolean



  costs: CourtCost[]



  allowDynamicPricing: boolean



  dynamicPricingRules?: {



    peakHourIncrease: number



    peakHours: string[]



  }



}







interface CourtCostsModalProps {



  isOpen: boolean



  onClose: () => void



  onConfirm: (config: CourtCostsConfig) => void



}







export function CourtCostsModal({ isOpen, onClose, onConfirm }: CourtCostsModalProps) {



  const [config, setConfig] = useState<CourtCostsConfig>({



    enabled: true,



    costs: [



      {



        id: "1",



        courtType: "Cancha 1",



        pricePerHour: 0,



        minTimeSlot: 60,



        applyWeekendRate: false,



        weekendTimeBlocks: []



      }



    ],



    allowDynamicPricing: false



  })







  const courtTypes = Array.from({ length: 8 }, (_, i) => `Cancha ${i + 1}`)







  const minTimeOptions = [



    { value: 30, label: "30 minutos" },



    { value: 45, label: "45 minutos" },



    { value: 60, label: "1 hora" },



    { value: 90, label: "1 hora 30 minutos" },



    { value: 120, label: "2 horas" }



  ]







  const daysOptions = [



    { value: 'saturday', label: 'Sábado' },



    { value: 'sunday', label: 'Domingo' }



  ]







  const timeOptions = [



    "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",



    "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00",



    "20:00", "21:00", "22:00"



  ]







  const addNewCost = () => {



    setConfig(prev => ({



      ...prev,



      costs: [



        ...prev.costs,



        {



          id: Math.random().toString(36).substr(2, 9),



          courtType: courtTypes[0],



          pricePerHour: 0,



          minTimeSlot: 60,



          applyWeekendRate: false,



          weekendTimeBlocks: []



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







  const addWeekendTimeBlock = (courtId: string) => {



    setConfig(prev => ({



      ...prev,



      costs: prev.costs.map(cost => 



        cost.id === courtId



          ? {



              ...cost,



              weekendTimeBlocks: [



                ...cost.weekendTimeBlocks,



                {



                  id: Math.random().toString(36).substr(2, 9),



                  day: 'saturday',



                  startTime: "09:00",



                  endTime: "10:00",



                  price: cost.pricePerHour



                }



              ]



            }



          : cost



      )



    }))



  }







  const removeWeekendTimeBlock = (courtId: string, blockId: string) => {



    setConfig(prev => ({



      ...prev,



      costs: prev.costs.map(cost => 



        cost.id === courtId



          ? {



              ...cost,



              weekendTimeBlocks: cost.weekendTimeBlocks.filter(block => block.id !== blockId)



            }



          : cost



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



                Configuración de Costos de Canchas



              </h3>



              



              <div className="space-y-6">



                {/* Lista de costos por tipo de cancha */}



                <div className="space-y-4">



                  {config.costs.map((cost) => (



                    <div key={cost.id} className="p-4 border rounded-md space-y-4">



                      <div className="flex items-center justify-between">



                        <Select



                          value={cost.courtType}



                          onValueChange={(value) => {



                            setConfig(prev => ({



                              ...prev,



                              costs: prev.costs.map(c => 



                                c.id === cost.id ? { ...c, courtType: value } : c



                              )



                            }))



                          }}



                        >



                          <SelectTrigger className="w-[200px]">



                            <SelectValue placeholder="Seleccionar cancha" />



                          </SelectTrigger>



                          <SelectContent>



                            {courtTypes.map((type) => (



                              <SelectItem key={type} value={type}>



                                {type}



                              </SelectItem>



                            ))}



                          </SelectContent>



                        </Select>



                        



                        <button



                          onClick={() => removeCost(cost.id)}



                          className="p-1 hover:bg-gray-100 rounded-full transition-colors"



                        >



                          <IconTrash className="h-5 w-5 text-gray-500" />



                        </button>



                      </div>







                      <div className="space-y-4">



                        {/* Precio por hora */}



                        <div className="space-y-2">



                          <label className="text-sm font-medium">Precio por hora</label>



                          <input



                            type="number"



                            min="0"



                            step="0.01"



                            value={cost.pricePerHour}



                            onChange={(e) => {



                              setConfig(prev => ({



                                ...prev,



                                costs: prev.costs.map(c => 



                                  c.id === cost.id ? { ...c, pricePerHour: parseFloat(e.target.value) || 0 } : c



                                )



                              }))



                            }}



                            className="w-full p-2 border rounded-md focus:border-black outline-none"



                          />



                        </div>







                        {/* Tiempo mínimo de reserva */}



                        <div className="space-y-2">



                          <label className="text-sm font-medium">Tiempo mínimo de reserva</label>



                          <Select



                            value={cost.minTimeSlot.toString()}



                            onValueChange={(value) => {



                              setConfig(prev => ({



                                ...prev,



                                costs: prev.costs.map(c => 



                                  c.id === cost.id ? { ...c, minTimeSlot: parseInt(value) } : c



                                )



                              }))



                            }}



                          >



                            <SelectTrigger>



                              <SelectValue />



                            </SelectTrigger>



                            <SelectContent>



                              {minTimeOptions.map((option) => (



                                <SelectItem key={option.value} value={option.value.toString()}>



                                  {option.label}



                                </SelectItem>



                              ))}



                            </SelectContent>



                          </Select>



                        </div>







                        {/* Tarifa de fin de semana */}



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



                                    weekendTimeBlocks: checked ? [] : c.weekendTimeBlocks



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



                                        <SelectValue />



                                      </SelectTrigger>



                                      <SelectContent>



                                        {daysOptions.map((day) => (



                                          <SelectItem key={day.value} value={day.value}>



                                            {day.label}



                                          </SelectItem>



                                        ))}



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



                      </div>



                    </div>



                  ))}







                  <button



                    onClick={addNewCost}



                    className="w-full p-2 border border-dashed rounded-md hover:border-black transition-colors flex items-center justify-center gap-2 text-sm"



                  >



                    <IconPlus className="h-4 w-4" />



                    Agregar tipo de cancha



                  </button>



                </div>







                {/* Precios dinámicos */}



                <div className="space-y-4">



                  <div className="flex items-center justify-between">



                    <div className="space-y-1">



                      <div className="flex items-center gap-2">



                        <label className="text-sm font-medium">Precios dinámicos</label>



                        <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">



                          <IconQuestionMark className="h-3 w-3 text-gray-500" />



                        </div>



                      </div>



                      <p className="text-sm text-gray-500">



                        Ajustar precios según horarios de alta demanda



                      </p>



                    </div>



                    <Switch



                      checked={config.allowDynamicPricing}



                      onCheckedChange={(checked) => {



                        setConfig(prev => ({



                          ...prev,



                          allowDynamicPricing: checked,



                          dynamicPricingRules: checked ? {



                            peakHourIncrease: 20,



                            peakHours: ["18:00", "19:00", "20:00"]



                          } : undefined



                        }))



                      }}



                    />



                  </div>







                  {config.allowDynamicPricing && config.dynamicPricingRules && (



                    <div className="space-y-4">



                      <div className="space-y-2">



                        <label className="text-sm font-medium">Incremento en hora pico (%)</label>



                        <input



                          type="number"



                          min="0"



                          max="100"



                          value={config.dynamicPricingRules.peakHourIncrease}



                          onChange={(e) => {



                            setConfig(prev => ({



                              ...prev,



                              dynamicPricingRules: {



                                ...prev.dynamicPricingRules!,



                                peakHourIncrease: parseInt(e.target.value) || 0



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






