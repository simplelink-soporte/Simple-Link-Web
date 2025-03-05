"use client"















import { useState } from "react"







import { motion, AnimatePresence } from "framer-motion"







import { IconQuestionMark, IconCalendar } from "@tabler/icons-react"







import { Switch } from "@/components/ui/switch"







import { format } from "date-fns"







import { es } from "date-fns/locale"















interface LaunchDateConfig {







  enabled: boolean







  launchDate?: Date      // Fecha de lanzamiento







  activationDate?: Date  // Fecha de activación







  hasExpiration: boolean // Nueva propiedad para controlar si tiene fecha de caducidad







  expirationDate?: Date  // Nueva propiedad para la fecha de caducidad







  notifyUsers: boolean







  notificationDays: number







}















interface LaunchDateModalProps {







  isOpen: boolean







  onClose: () => void







  onConfirm: (config: LaunchDateConfig) => void







}















export function LaunchDateModal({ isOpen, onClose, onConfirm }: LaunchDateModalProps) {







  const [config, setConfig] = useState<LaunchDateConfig>({







    enabled: true,







    hasExpiration: false,







    notifyUsers: false,







    notificationDays: 7







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







                Fecha de Lanzamiento







              </h3>







              







              <div className="space-y-6">







                {/* Selector de fecha de lanzamiento */}



                <div className="space-y-2">



                  <label className="text-sm font-medium">Fecha de lanzamiento</label>



                  <button



                    className="w-full flex items-center justify-between p-2 border rounded-md hover:border-black transition-colors"



                  >



                    <span className="flex items-center gap-2">



                      <IconCalendar className="h-4 w-4" />



                      {config.launchDate 



                        ? format(config.launchDate, "dd/MM/yyyy", { locale: es })



                        : "Seleccionar fecha de lanzamiento"



                      }



                    </span>



                  </button>



                  <p className="text-sm text-gray-500">



                    Fecha en la que la suscripción estará visible para los usuarios



                  </p>



                </div>







                {/* Sección de Activación */}

                <div className="space-y-4 border-t pt-4">

                  <h4 className="text-sm font-medium">Período de Activación</h4>

                  

                  {/* Fecha de inicio */}

                  <div className="space-y-2">

                    <label className="text-sm font-medium">Fecha de inicio</label>

                    <button

                      className="w-full flex items-center justify-between p-2 border rounded-md hover:border-black transition-colors"

                    >

                      <span className="flex items-center gap-2">

                        <IconCalendar className="h-4 w-4" />

                        {config.activationDate 

                          ? format(config.activationDate, "dd/MM/yyyy", { locale: es })

                          : "Seleccionar fecha de inicio"

                        }

                      </span>

                    </button>

                    <p className="text-sm text-gray-500">

                      Fecha en la que la suscripción comenzará a funcionar

                    </p>

                  </div>



                  {/* Control de caducidad */}

                  <div className="flex items-center justify-between">

                    <div className="space-y-1">

                      <div className="flex items-center gap-2">

                        <label className="text-sm font-medium">Establecer fecha de caducidad</label>

                        <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">

                          <IconQuestionMark className="h-3 w-3 text-gray-500" />

                        </div>

                      </div>

                      <p className="text-sm text-gray-500">

                        Define si la suscripción tendrá una fecha de finalización

                      </p>

                    </div>

                    <Switch

                      checked={config.hasExpiration}

                      onCheckedChange={(checked) => 

                        setConfig(prev => ({

                          ...prev,

                          hasExpiration: checked,

                          expirationDate: checked ? prev.expirationDate : undefined

                        }))

                      }

                    />

                  </div>



                  {/* Fecha de caducidad condicional */}

                  {config.hasExpiration && (

                    <div className="space-y-2">

                      <label className="text-sm font-medium">Fecha de caducidad</label>

                      <button

                        className="w-full flex items-center justify-between p-2 border rounded-md hover:border-black transition-colors"

                      >

                        <span className="flex items-center gap-2">

                          <IconCalendar className="h-4 w-4" />

                          {config.expirationDate 

                            ? format(config.expirationDate, "dd/MM/yyyy", { locale: es })

                            : "Seleccionar fecha de caducidad"

                          }

                        </span>

                      </button>

                      <p className="text-sm text-gray-500">

                        Fecha en la que la suscripción dejará de estar activa

                      </p>

                    </div>

                  )}

                </div>



                {/* Notificación a usuarios */}



                <div className="flex items-center justify-between">



                  <div className="space-y-1">



                    <div className="flex items-center gap-2">



                      <label className="text-sm font-medium">Notificar a usuarios</label>



                      <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">



                        <IconQuestionMark className="h-3 w-3 text-gray-500" />



                      </div>



                    </div>



                    <p className="text-sm text-gray-500">



                      Enviar notificación antes del lanzamiento



                    </p>



                  </div>



                  <Switch



                    checked={config.notifyUsers}



                    onCheckedChange={(checked) => 



                      setConfig(prev => ({



                        ...prev,



                        notifyUsers: checked



                      }))



                    }



                  />



                </div>







                {config.notifyUsers && (



                  <div className="space-y-2">



                    <label className="text-sm font-medium">Días de anticipación</label>



                    <input



                      type="number"



                      min="1"



                      value={config.notificationDays}



                      onChange={(e) => 



                        setConfig(prev => ({



                          ...prev,



                          notificationDays: parseInt(e.target.value) || 1



                        }))



                      }



                      className="w-full p-2 border rounded-md focus:border-black outline-none"



                    />



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














