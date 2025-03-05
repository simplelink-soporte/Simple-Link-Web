import { motion, AnimatePresence } from "framer-motion"
import { IconQuestionMark, IconChevronDown, IconCalendar } from "@tabler/icons-react"
import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { ApplyRateModal } from "./ApplyRateModal"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { AgeRestrictionModal } from "./AgeRestrictionModal"
import { LaunchDateModal } from "./LaunchDateModal"
import { GuestsConfigModal } from "./GuestsConfigModal"
import { AdvanceTimeModal } from "./AdvanceTimeModal"
import { LastDayTimeModal } from "./LastDayTimeModal"
import { CourtCostsModal } from "./CourtCostsModal"
import { ItemCostsModal } from "./ItemCostsModal"
import { FreeResourcesModal } from "./FreeResourcesModal"
import { AdvancePaymentModal } from "./AdvancePaymentModal"

interface AccordionItemProps {
  title: string
  children: React.ReactNode
  isOpen: boolean
  onToggle: () => void
}

const AccordionItem = ({ title, children, isOpen, onToggle }: AccordionItemProps) => {
  return (
    <div className="border-b">
      <button
        className="w-full py-4 flex items-center justify-between text-left"
        onClick={onToggle}
      >
        <span className="font-medium">{title}</span>
        <IconChevronDown
          className={`h-5 w-5 transition-transform duration-200 ${
            isOpen ? "transform rotate-180" : ""
          }`}
        />
      </button>
      <motion.div
        initial={false}
        animate={{
          height: isOpen ? "auto" : 0,
          opacity: isOpen ? 1 : 0,
          marginBottom: isOpen ? 16 : 0
        }}
        transition={{
          duration: 0.3,
          ease: "easeInOut"
        }}
        className="overflow-hidden"
      >
        {children}
      </motion.div>
    </div>
  )
}

interface NewSubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (subscriptionData: Omit<Subscription, 'id'>) => void
}

interface Subscription {
  id?: string
  name: string
  description: string
  price: number
  interval: 'monthly' | 'yearly'
  features: string[]
  launchDate: string
  startDate: string
  endDate: string
  isDefault: boolean
  isPublic: boolean
  requirePayment: boolean
  retentionTime?: number
  requireAdvancePayment: boolean
  preventCancellation: boolean
}

export function NewSubscriptionModal({ isOpen, onClose, onSave }: NewSubscriptionModalProps) {
  const [openSection, setOpenSection] = useState<string>("general")
  const [isRateEnabled, setIsRateEnabled] = useState(false)
  const [isExpirationEnabled, setIsExpirationEnabled] = useState(false)
  const [expirationDate, setExpirationDate] = useState<Date>()
  const [isApplyRateModalOpen, setIsApplyRateModalOpen] = useState(false)
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false)
  const [isAgeRestrictionModalOpen, setIsAgeRestrictionModalOpen] = useState(false)
  const [isLaunchDateModalOpen, setIsLaunchDateModalOpen] = useState(false)
  const [isDefaultSubscription, setIsDefaultSubscription] = useState(false)
  const [isLaunchDateEnabled, setIsLaunchDateEnabled] = useState(false)
  const [isAgeRestrictionEnabled, setIsAgeRestrictionEnabled] = useState(false)
  const [canBookOnline, setCanBookOnline] = useState(false)
  const [requiresApproval, setRequiresApproval] = useState(false)
  const [canReserveItems, setCanReserveItems] = useState(false)
  const [hasGuestLimit, setHasGuestLimit] = useState(false)
  const [isGuestsModalOpen, setIsGuestsModalOpen] = useState(false)
  const [hasAdvanceTimeLimit, setHasAdvanceTimeLimit] = useState(false)
  const [isAdvanceTimeModalOpen, setIsAdvanceTimeModalOpen] = useState(false)
  const [hasLastDayTime, setHasLastDayTime] = useState(false)
  const [isLastDayTimeModalOpen, setIsLastDayTimeModalOpen] = useState(false)
  const [hasCourtCosts, setHasCourtCosts] = useState(false)
  const [isCourtCostsModalOpen, setIsCourtCostsModalOpen] = useState(false)
  const [hasItemCosts, setHasItemCosts] = useState(false)
  const [isItemCostsModalOpen, setIsItemCostsModalOpen] = useState(false)
  const [hasFreeResources, setHasFreeResources] = useState(false)
  const [isFreeResourcesModalOpen, setIsFreeResourcesModalOpen] = useState(false)
  const [isPublic, setIsPublic] = useState(false)
  const [requirePayment, setRequirePayment] = useState(false)
  const [retentionTime, setRetentionTime] = useState(15)
  const [requireAdvancePayment, setRequireAdvancePayment] = useState(false)
  const [isAdvancePaymentModalOpen, setIsAdvancePaymentModalOpen] = useState(false)
  const [preventCancellation, setPreventCancellation] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState(0)

  const toggleSection = (section: string) => {
    setOpenSection(prev => prev === section ? "" : section)
  }

  const handleRateToggle = (checked: boolean) => {
    setIsRateEnabled(checked)
    if (checked) {
      setIsApplyRateModalOpen(true)
    }
  }

  const handleRateConfirm = (startDate: Date, endDate: Date) => {
    // Aquí manejarías las fechas seleccionadas
    console.log('Fechas seleccionadas:', { startDate, endDate })
  }

  // Agregar estas nuevas funciones para manejar los cierres
  const handleGuestsModalClose = (fromOverlay: boolean = false) => {
    setIsGuestsModalOpen(false)
    if (!fromOverlay) setHasGuestLimit(false)
  }

  const handleAdvanceTimeModalClose = (fromOverlay: boolean = false) => {
    setIsAdvanceTimeModalOpen(false)
    if (!fromOverlay) setHasAdvanceTimeLimit(false)
  }

  const handleLastDayTimeModalClose = (fromOverlay: boolean = false) => {
    setIsLastDayTimeModalOpen(false)
    if (!fromOverlay) setHasLastDayTime(false)
  }

  const handleCourtCostsModalClose = (fromOverlay: boolean = false) => {
    setIsCourtCostsModalOpen(false)
    if (!fromOverlay) setHasCourtCosts(false)
  }

  const handleItemCostsModalClose = (fromOverlay: boolean = false) => {
    setIsItemCostsModalOpen(false)
    if (!fromOverlay) setHasItemCosts(false)
  }

  const handleFreeResourcesModalClose = (fromOverlay: boolean = false) => {
    setIsFreeResourcesModalOpen(false)
    if (!fromOverlay) setHasFreeResources(false)
  }

  const handleAdvancePaymentModalClose = (fromOverlay: boolean = false) => {
    setIsAdvancePaymentModalOpen(false)
    if (!fromOverlay) setRequireAdvancePayment(false)
  }

  // Agregar estas funciones de manejo de cierre
  const handleLaunchDateModalClose = (fromOverlay: boolean = false) => {
    setIsLaunchDateModalOpen(false)
    if (!fromOverlay) setIsLaunchDateEnabled(false)
  }

  const handleAgeRestrictionModalClose = (fromOverlay: boolean = false) => {
    setIsAgeRestrictionModalOpen(false)
    if (!fromOverlay) setIsAgeRestrictionEnabled(false)
  }

  const handleRateModalClose = (fromOverlay: boolean = false) => {
    setIsApplyRateModalOpen(false)
    if (!fromOverlay) setIsRateEnabled(false)
  }

  const handleSave = () => {
    // Validar campos requeridos
    if (!name.trim()) {
      // Aquí podrías mostrar un mensaje de error
      return
    }

    // Crear objeto con los datos de la suscripción
    const subscriptionData = {
      name,
      description,
      price,
      interval: 'monthly' as const,
      features: [],
      launchDate: new Date().toISOString(),
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // Un año por defecto
      isDefault: isDefaultSubscription,
      isPublic,
      requirePayment,
      retentionTime: requirePayment ? retentionTime : undefined,
      requireAdvancePayment,
      preventCancellation
    }

    onSave(subscriptionData)
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
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40"
            transition={{ 
              duration: 0.3,
              ease: "easeInOut"
            }}
          />

          <motion.div
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ 
              x: "100%", 
              opacity: 0,
              transition: {
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1]
              }
            }}
            transition={{ 
              type: "spring",
              damping: 30,
              stiffness: 300,
              mass: 0.8,
            }}
            className="fixed inset-y-0 right-0 w-[500px] bg-white shadow-2xl border-l z-50"
          >
            <div className="h-full flex flex-col">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">Crear Nueva Suscripción</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Complete los datos de la nueva suscripción
                </p>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="p-6 space-y-1">
                  <AccordionItem
                    title="General"
                    isOpen={openSection === "general"}
                    onToggle={() => toggleSection("general")}
                  >
                    <div className="space-y-4">
                      {/* Nombre */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Nombre</label>
                        <input
                          type="text"
                          placeholder="Nombre de la suscripción"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full p-2 border rounded-md focus:border-black outline-none transition-colors"
                        />
                      </div>

                      {/* Descripción */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Descripción</label>
                        <textarea
                          placeholder="Describe los beneficios de esta suscripción"
                          rows={3}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="w-full p-2 border rounded-md focus:border-black outline-none transition-colors resize-none"
                        />
                      </div>

                      {/* Suscripción predeterminada */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium">Suscripción predeterminada</label>
                            <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
                              <IconQuestionMark className="h-3 w-3 text-gray-500" />
                            </div>
                          </div>
                          <p className="text-sm text-gray-500">
                            Asignar automáticamente a nuevos usuarios
                          </p>
                        </div>
                        <Switch
                          checked={isDefaultSubscription}
                          onCheckedChange={setIsDefaultSubscription}
                        />
                      </div>

                      {/* Fecha de lanzamiento */}
                      <div className="flex items-center justify-between">
                        <div 
                          className="space-y-1 cursor-pointer"
                          onClick={() => {
                            if (isLaunchDateEnabled) setIsLaunchDateModalOpen(true)
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium">Fecha de lanzamiento</label>
                            <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
                              <IconQuestionMark className="h-3 w-3 text-gray-500" />
                            </div>
                          </div>
                          <p className="text-sm text-gray-500">
                            Programar cuándo estará disponible
                          </p>
                        </div>
                        <Switch
                          checked={isLaunchDateEnabled}
                          onCheckedChange={(checked) => {
                            setIsLaunchDateEnabled(checked)
                            if (checked) setIsLaunchDateModalOpen(true)
                          }}
                        />
                      </div>

                      {/* Restricción de edad */}
                      <div className="flex items-center justify-between">
                        <div 
                          className="space-y-1 cursor-pointer"
                          onClick={() => {
                            if (isAgeRestrictionEnabled) setIsAgeRestrictionModalOpen(true)
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium">Restricción de edad</label>
                            <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
                              <IconQuestionMark className="h-3 w-3 text-gray-500" />
                            </div>
                          </div>
                          <p className="text-sm text-gray-500">
                            Limitar por rango de edad
                          </p>
                        </div>
                        <Switch
                          checked={isAgeRestrictionEnabled}
                          onCheckedChange={(checked) => {
                            setIsAgeRestrictionEnabled(checked)
                            if (checked) setIsAgeRestrictionModalOpen(true)
                          }}
                        />
                      </div>
                    </div>
                  </AccordionItem>

                  <AccordionItem
                    title="Precio"
                    isOpen={openSection === "precio"}
                    onToggle={() => toggleSection("precio")}
                  >
                    <div className="space-y-4">
                      {/* Aplicar Tarifa */}
                      <div className="flex items-center justify-between">
                        <div 
                          className="space-y-1 cursor-pointer"
                          onClick={() => {
                            if (isRateEnabled) setIsApplyRateModalOpen(true)
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium">Aplicar Tarifa</label>
                            <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
                              <IconQuestionMark className="h-3 w-3 text-gray-500" />
                            </div>
                          </div>
                          <p className="text-sm text-gray-500">
                            Habilitar tarifa especial para esta suscripción
                          </p>
                        </div>
                        <Switch
                          checked={isRateEnabled}
                          onCheckedChange={(checked) => {
                            setIsRateEnabled(checked)
                            if (checked) setIsApplyRateModalOpen(true)
                          }}
                        />
                      </div>

                      {/* Fecha de Expiración */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <label className="text-sm font-medium">Fecha de Expiración</label>
                            <p className="text-sm text-gray-500">
                              Establecer fecha límite de la suscripción
                            </p>
                          </div>
                          <Switch
                            checked={isExpirationEnabled}
                            onCheckedChange={(checked) => {
                              setIsExpirationEnabled(checked)
                              if (!checked) setExpirationDate(undefined)
                            }}
                          />
                        </div>

                        {isExpirationEnabled && (
                          <Popover 
                            open={isDatePopoverOpen} 
                            onOpenChange={(open) => {
                              setIsDatePopoverOpen(open)
                              // Solo desactivamos si se cierra explícitamente, no al hacer clic fuera
                              if (!open && !expirationDate) {
                                setIsExpirationEnabled(false)
                              }
                            }}
                          >
                            <PopoverTrigger asChild>
                              <button
                                className={cn(
                                  "w-full flex items-center justify-between px-3 py-2 text-left",
                                  "border rounded-md hover:border-black transition-colors",
                                  !expirationDate && "text-gray-500"
                                )}
                              >
                                <span className="flex items-center gap-2">
                                  <IconCalendar className="h-4 w-4" />
                                  {expirationDate 
                                    ? format(expirationDate, "dd/MM/yy", { locale: es }) 
                                    : "Seleccione una fecha"
                                  }
                                </span>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              {/* Aquí iría el calendario */}
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </div>
                  </AccordionItem>

                  <AccordionItem
                    title="Reglas"
                    isOpen={openSection === "reglas"}
                    onToggle={() => toggleSection("reglas")}
                  >
                    <div className="space-y-4">
                      {/* Reserva en línea */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium">Permitir reservas en línea</label>
                            <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
                              <IconQuestionMark className="h-3 w-3 text-gray-500" />
                            </div>
                          </div>
                          <p className="text-sm text-gray-500">
                            Los miembros podrán reservar canchas a través del portal
                          </p>
                        </div>
                        <Switch
                          checked={canBookOnline}
                          onCheckedChange={setCanBookOnline}
                        />
                      </div>

                      {/* Aprobación de reservas */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium">Requerir aprobación de reservas</label>
                            <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
                              <IconQuestionMark className="h-3 w-3 text-gray-500" />
                            </div>
                          </div>
                          <p className="text-sm text-gray-500">
                            Las reservas deberán ser aprobadas por un administrador
                          </p>
                        </div>
                        <Switch
                          checked={requiresApproval}
                          onCheckedChange={setRequiresApproval}
                        />
                      </div>

                      {/* Reserva de artículos - Versión simplificada */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium">Permitir reserva de artículos</label>
                            <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
                              <IconQuestionMark className="h-3 w-3 text-gray-500" />
                            </div>
                          </div>
                          <p className="text-sm text-gray-500">
                            Los miembros podrán reservar equipamiento adicional
                          </p>
                        </div>
                        <Switch
                          checked={canReserveItems}
                          onCheckedChange={setCanReserveItems}
                        />
                      </div>

                      {/* Límite de invitados - Ejemplo de implementación */}
                      <div className="flex items-center justify-between">
                        <div 
                          className="space-y-1 cursor-pointer"
                          onClick={() => {
                            if (hasGuestLimit) setIsGuestsModalOpen(true)
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium">Permitir invitados</label>
                            <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
                              <IconQuestionMark className="h-3 w-3 text-gray-500" />
                            </div>
                          </div>
                          <p className="text-sm text-gray-500">
                            Establecer reglas para invitados por miembro
                          </p>
                        </div>
                        <Switch
                          checked={hasGuestLimit}
                          onCheckedChange={(checked) => {
                            setHasGuestLimit(checked)
                            if (checked) setIsGuestsModalOpen(true)
                          }}
                        />
                      </div>

                      {/* Tiempo de anticipación */}
                      <div className="flex items-center justify-between">
                        <div 
                          className="space-y-1 cursor-pointer"
                          onClick={() => {
                            if (hasAdvanceTimeLimit) setIsAdvanceTimeModalOpen(true)
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium">Tiempo de anticipación para reservas</label>
                            <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
                              <IconQuestionMark className="h-3 w-3 text-gray-500" />
                            </div>
                          </div>
                          <p className="text-sm text-gray-500">
                            Configurar con cuánta anticipación se pueden hacer reservas
                          </p>
                        </div>
                        <Switch
                          checked={hasAdvanceTimeLimit}
                          onCheckedChange={(checked) => {
                            setHasAdvanceTimeLimit(checked)
                            if (checked) setIsAdvanceTimeModalOpen(true)
                          }}
                        />
                      </div>

                      {/* Hora de apertura último día */}
                      <div className="flex items-center justify-between">
                        <div 
                          className="space-y-1 cursor-pointer"
                          onClick={() => {
                            if (hasLastDayTime) setIsLastDayTimeModalOpen(true)
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium">Hora de apertura del último día</label>
                            <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
                              <IconQuestionMark className="h-3 w-3 text-gray-500" />
                            </div>
                          </div>
                          <p className="text-sm text-gray-500">
                            Establecer horario de apertura para el último día de reserva
                          </p>
                        </div>
                        <Switch
                          checked={hasLastDayTime}
                          onCheckedChange={(checked) => {
                            setHasLastDayTime(checked)
                            if (checked) setIsLastDayTimeModalOpen(true)
                          }}
                        />
                      </div>
                    </div>
                  </AccordionItem>

                  <AccordionItem
                    title="Costos"
                    isOpen={openSection === "costos"}
                    onToggle={() => toggleSection("costos")}
                  >
                    <div className="space-y-4">
                      {/* Costos de Canchas */}
                      <div className="flex items-center justify-between">
                        <div 
                          className="space-y-1 cursor-pointer"
                          onClick={() => {
                            if (hasCourtCosts) setIsCourtCostsModalOpen(true)
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium">Establecer Costos de Canchas</label>
                            <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
                              <IconQuestionMark className="h-3 w-3 text-gray-500" />
                            </div>
                          </div>
                          <p className="text-sm text-gray-500">
                            Configurar precios por tipo de cancha
                          </p>
                        </div>
                        <Switch
                          checked={hasCourtCosts}
                          onCheckedChange={(checked) => {
                            setHasCourtCosts(checked)
                            if (checked) setIsCourtCostsModalOpen(true)
                          }}
                        />
                      </div>

                      {/* Costos de Artículos */}
                      <div className="flex items-center justify-between">
                        <div 
                          className="space-y-1 cursor-pointer"
                          onClick={() => {
                            if (hasItemCosts) setIsItemCostsModalOpen(true)
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium">Establecer Costos de Artículos</label>
                            <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
                              <IconQuestionMark className="h-3 w-3 text-gray-500" />
                            </div>
                          </div>
                          <p className="text-sm text-gray-500">
                            Configurar precios para artículos adicionales
                          </p>
                        </div>
                        <Switch
                          checked={hasItemCosts}
                          onCheckedChange={(checked) => {
                            setHasItemCosts(checked)
                            if (checked) setIsItemCostsModalOpen(true)
                          }}
                        />
                      </div>

                      {/* Recursos Gratuitos */}
                      <div className="flex items-center justify-between">
                        <div 
                          className="space-y-1 cursor-pointer"
                          onClick={() => {
                            if (hasFreeResources) setIsFreeResourcesModalOpen(true)
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium">Recursos Gratuitos</label>
                            <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
                              <IconQuestionMark className="h-3 w-3 text-gray-500" />
                            </div>
                          </div>
                          <p className="text-sm text-gray-500">
                            Configurar recursos sin costo para miembros
                          </p>
                        </div>
                        <Switch
                          checked={hasFreeResources}
                          onCheckedChange={(checked) => {
                            setHasFreeResources(checked)
                            if (checked) setIsFreeResourcesModalOpen(true)
                          }}
                        />
                      </div>
                    </div>
                  </AccordionItem>

                  <AccordionItem
                    title="Configuración"
                    isOpen={openSection === "configuracion"}
                    onToggle={() => toggleSection("configuracion")}
                  >
                    <div className="space-y-4">
                      {/* Es público */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium">Es público</label>
                            <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
                              <IconQuestionMark className="h-3 w-3 text-gray-500" />
                            </div>
                          </div>
                          <p className="text-sm text-gray-500">
                            Visible en el portal de miembros
                          </p>
                        </div>
                        <Switch
                          checked={isPublic}
                          onCheckedChange={setIsPublic}
                        />
                      </div>

                      {/* Requerir pago al reservar */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium">Requerir pago al reservar</label>
                            <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
                              <IconQuestionMark className="h-3 w-3 text-gray-500" />
                            </div>
                          </div>
                          <p className="text-sm text-gray-500">
                            El pago debe completarse antes del tiempo establecido
                          </p>
                        </div>
                        <Switch
                          checked={requirePayment}
                          onCheckedChange={setRequirePayment}
                        />
                      </div>

                      {/* Tiempo de retención */}
                      {requirePayment && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Tiempo de retención (minutos)</label>
                          <input
                            type="number"
                            min="15"
                            value={retentionTime}
                            onChange={(e) => setRetentionTime(Math.max(15, parseInt(e.target.value) || 15))}
                            className="w-full p-2 border rounded-md focus:border-black outline-none"
                          />
                          <p className="text-sm text-gray-500">
                            Tiempo máximo para completar el pago antes de cancelar la reserva
                          </p>
                        </div>
                      )}

                      {/* Requerir anticipo */}
                      <div className="flex items-center justify-between">
                        <div 
                          className="space-y-1 cursor-pointer"
                          onClick={() => {
                            if (requireAdvancePayment) setIsAdvancePaymentModalOpen(true)
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium">Requerir anticipo</label>
                            <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
                              <IconQuestionMark className="h-3 w-3 text-gray-500" />
                            </div>
                          </div>
                          <p className="text-sm text-gray-500">
                            Establecer un porcentaje de pago por adelantado
                          </p>
                        </div>
                        <Switch
                          checked={requireAdvancePayment}
                          onCheckedChange={(checked) => {
                            setRequireAdvancePayment(checked)
                            if (checked) setIsAdvancePaymentModalOpen(true)
                          }}
                        />
                      </div>

                      {/* No permitir cancelación */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium">No permitir cancelación</label>
                            <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
                              <IconQuestionMark className="h-3 w-3 text-gray-500" />
                            </div>
                          </div>
                          <p className="text-sm text-gray-500">
                            Los miembros no podrán cancelar su membresía
                          </p>
                        </div>
                        <Switch
                          checked={preventCancellation}
                          onCheckedChange={setPreventCancellation}
                        />
                      </div>
                    </div>
                  </AccordionItem>
                </div>
              </div>

              <div className="p-6 border-t bg-white">
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onClose}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSave}
                    className="flex-1 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
                  >
                    Guardar
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>

          <ApplyRateModal
            isOpen={isApplyRateModalOpen}
            onClose={() => handleRateModalClose(true)}
            onConfirm={(config) => {
              console.log('Rate config:', config)
              setIsApplyRateModalOpen(false)
              setIsRateEnabled(config.enabled)
            }}
          />

          <LaunchDateModal
            isOpen={isLaunchDateModalOpen}
            onClose={() => handleLaunchDateModalClose(true)}
            onConfirm={(config) => {
              console.log('Launch date config:', config)
              setIsLaunchDateModalOpen(false)
              setIsLaunchDateEnabled(config.enabled)
            }}
          />

          <AgeRestrictionModal
            isOpen={isAgeRestrictionModalOpen}
            onClose={() => handleAgeRestrictionModalClose(true)}
            onConfirm={(config) => {
              console.log('Age restriction config:', config)
              setIsAgeRestrictionModalOpen(false)
              setIsAgeRestrictionEnabled(config.enabled)
            }}
          />

          <GuestsConfigModal
            isOpen={isGuestsModalOpen}
            onClose={() => handleGuestsModalClose(true)} // Para el overlay
            onConfirm={(config) => {
              console.log('Guests config:', config)
              setIsGuestsModalOpen(false)
              setHasGuestLimit(config.enabled)
            }}
          />

          <AdvanceTimeModal
            isOpen={isAdvanceTimeModalOpen}
            onClose={() => handleAdvanceTimeModalClose(true)} // Para el overlay
            onConfirm={(config) => {
              console.log('Advance time config:', config)
              setIsAdvanceTimeModalOpen(false)
              setHasAdvanceTimeLimit(config.enabled)
            }}
          />

          <LastDayTimeModal
            isOpen={isLastDayTimeModalOpen}
            onClose={() => handleLastDayTimeModalClose(true)} // Para el overlay
            onConfirm={(config) => {
              console.log('Last day time config:', config)
              setIsLastDayTimeModalOpen(false)
              setHasLastDayTime(config.enabled)
            }}
          />

          <CourtCostsModal
            isOpen={isCourtCostsModalOpen}
            onClose={() => handleCourtCostsModalClose(true)}
            onConfirm={(config) => {
              console.log('Court costs config:', config)
              setIsCourtCostsModalOpen(false)
              setHasCourtCosts(config.enabled)
            }}
          />

          <ItemCostsModal
            isOpen={isItemCostsModalOpen}
            onClose={() => handleItemCostsModalClose(true)}
            onConfirm={(config) => {
              console.log('Item costs config:', config)
              setIsItemCostsModalOpen(false)
              setHasItemCosts(config.enabled)
            }}
          />

          <FreeResourcesModal
            isOpen={isFreeResourcesModalOpen}
            onClose={() => handleFreeResourcesModalClose(true)}
            onConfirm={(config) => {
              console.log('Free resources config:', config)
              setIsFreeResourcesModalOpen(false)
              setHasFreeResources(config.enabled)
            }}
          />

          <AdvancePaymentModal
            isOpen={isAdvancePaymentModalOpen}
            onClose={() => handleAdvancePaymentModalClose(true)} // Para el overlay
            onConfirm={(config) => {
              console.log('Advance payment config:', config)
              setIsAdvancePaymentModalOpen(false)
              setRequireAdvancePayment(config.enabled)
            }}
          />
        </>
      )}
    </AnimatePresence>
  )
}
