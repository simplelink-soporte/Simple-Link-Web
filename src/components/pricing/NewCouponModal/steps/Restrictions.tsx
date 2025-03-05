import { motion } from "framer-motion"
import { IconQuestionMark } from "@tabler/icons-react"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { MultiSelect } from "@/components/ui/multi-select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { AudienceFilter, TargetAudience } from "@/types/audience"

interface RestrictionsProps {
  formData: any
  setFormData: (data: any) => void
}

export function Restrictions({ formData, setFormData }: RestrictionsProps) {
  // Datos de ejemplo para las clases
  const classOptions = [
    { id: 'class1', name: 'Clase Principiantes' },
    { id: 'class2', name: 'Clase Intermedia' },
    { id: 'class3', name: 'Clase Avanzada' },
    { id: 'class4', name: 'Entrenamiento Personal' },
    { id: 'class5', name: 'Clase Grupal' }
  ]

  const serviceTypes = [
    {
      id: 'bookings',
      title: 'Reservas de Cancha',
      description: 'Aplicable a reservas de canchas de pádel'
    },
    {
      id: 'classes',
      title: 'Clases',
      description: 'Aplicable a clases y entrenamientos',
      hasClassSelector: true
    },
    {
      id: 'products',
      title: 'Productos y Servicios',
      description: 'Aplicable a productos específicos',
      hasCustomInput: true
    }
  ] as const

  const targetAudiences = [
    {
      id: 'new',
      title: 'Clientes Nuevos',
      description: 'Solo para usuarios que nunca han reservado',
      hasFilters: true
    },
    {
      id: 'recurring',
      title: 'Clientes Recurrentes',
      description: 'Para usuarios que ya han reservado antes',
      hasFilters: true,
      hasBookingFilters: true
    },
    {
      id: 'specific',
      title: 'Usuarios Seleccionados',
      description: 'Basado en usuarios registrados',
      hasUserSelector: true
    }
  ] as const

  // Datos de ejemplo para usuarios
  const userOptions = [
    { id: 'user1', name: 'Juan Pérez' },
    { id: 'user2', name: 'María García' },
    { id: 'user3', name: 'Carlos López' },
    { id: 'user4', name: 'Ana Martínez' }
  ]

  return (
    <div className="space-y-8">
      {/* Servicios Aplicables */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-700">
            Servicios aplicables
          </h3>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="h-4 w-4 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
                  <IconQuestionMark className="h-2.5 w-2.5 text-gray-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent 
                className="bg-white p-3 shadow-lg border rounded-lg max-w-xs"
                side="right"
              >
                <p className="text-xs text-gray-600 leading-relaxed">
                  Selecciona los servicios donde este cupón podrá ser utilizado
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="space-y-3">
          {serviceTypes.map((service) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "p-4 rounded-lg border transition-all duration-200",
                "bg-white border-gray-200 hover:border-gray-300"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900">
                    {service.title}
                  </p>
                  <p className="text-sm text-gray-500">
                    {service.description}
                  </p>
                </div>
                <Switch
                  checked={formData.services?.[service.id]?.enabled || false}
                  onCheckedChange={(checked) => {
                    setFormData({
                      ...formData,
                      services: {
                        ...formData.services,
                        [service.id]: {
                          ...formData.services?.[service.id],
                          enabled: checked
                        }
                      }
                    })
                  }}
                  className="data-[state=checked]:bg-black"
                />
              </div>

              {/* Selector de clases */}
              {service.hasClassSelector && formData.services?.[service.id]?.enabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4"
                >
                  <MultiSelect
                    value={formData.services?.[service.id]?.classes || []}
                    onChange={(classes) => {
                      setFormData({
                        ...formData,
                        services: {
                          ...formData.services,
                          [service.id]: {
                            ...formData.services?.[service.id],
                            classes
                          }
                        }
                      })
                    }}
                    options={classOptions}
                    placeholder="Seleccionar clases aplicables"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Selecciona las clases donde el cupón será válido
                  </p>
                </motion.div>
              )}

              {/* Input para productos */}
              {service.hasCustomInput && formData.services?.[service.id]?.enabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4"
                >
                  <Input
                    placeholder="Ej: Raquetas, Pelotas, Accesorios..."
                    value={formData.services?.[service.id]?.items || ''}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        services: {
                          ...formData.services,
                          [service.id]: {
                            ...formData.services?.[service.id],
                            items: e.target.value
                          }
                        }
                      })
                    }}
                    className={cn(
                      "transition-all duration-200",
                      "border-gray-200",
                      "focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-black",
                      "placeholder:text-gray-400"
                    )}
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Separa los productos con comas
                  </p>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Público Objetivo */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-700">
            Público objetivo
          </h3>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="h-4 w-4 rounded-full bg-gray-100 flex items-center justify-center cursor-help">
                  <IconQuestionMark className="h-2.5 w-2.5 text-gray-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent 
                className="bg-white p-3 shadow-lg border rounded-lg max-w-xs"
                side="right"
              >
                <p className="text-xs text-gray-600 leading-relaxed">
                  Selecciona el tipo de usuarios que podrán utilizar este cupón
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="space-y-3">
          {targetAudiences.map((audience) => (
            <motion.div
              key={audience.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "p-4 rounded-lg border transition-all duration-200",
                "bg-white border-gray-200 hover:border-gray-300",
                formData.targetAudience === audience.id && "ring-1 ring-black/5"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900">
                    {audience.title}
                  </p>
                  <p className="text-sm text-gray-500">
                    {audience.description}
                  </p>
                </div>
                <Switch
                  checked={formData.targetAudience === audience.id}
                  onCheckedChange={(checked) => {
                    setFormData({
                      ...formData,
                      targetAudience: checked ? audience.id : undefined,
                      audienceFilters: checked ? {} : undefined,
                      selectedUsers: checked ? formData.selectedUsers : undefined
                    })
                  }}
                  className="data-[state=checked]:bg-black"
                />
              </div>

              {/* Filtros para clientes nuevos y recurrentes */}
              {audience.hasFilters && formData.targetAudience === audience.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 space-y-4"
                >
                  {/* Género */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Género
                    </label>
                    <div className="flex gap-2">
                      {['all', 'male', 'female'].map((gender) => (
                        <button
                          key={gender}
                          onClick={() => {
                            setFormData({
                              ...formData,
                              audienceFilters: {
                                ...formData.audienceFilters,
                                gender
                              }
                            })
                          }}
                          className={cn(
                            "px-3 py-1.5 text-sm rounded-md transition-colors",
                            formData.audienceFilters?.gender === gender
                              ? "bg-black text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          )}
                        >
                          {gender === 'all' ? 'Todos' : gender === 'male' ? 'Hombres' : 'Mujeres'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Rango de edad */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Rango de edad
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500">Mínima</label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="Ej: 18"
                          value={formData.audienceFilters?.ageRange?.min || ''}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              audienceFilters: {
                                ...formData.audienceFilters,
                                ageRange: {
                                  ...formData.audienceFilters?.ageRange,
                                  min: Number(e.target.value)
                                }
                              }
                            })
                          }}
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500">Máxima</label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="Ej: 65"
                          value={formData.audienceFilters?.ageRange?.max || ''}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              audienceFilters: {
                                ...formData.audienceFilters,
                                ageRange: {
                                  ...formData.audienceFilters?.ageRange,
                                  max: Number(e.target.value)
                                }
                              }
                            })
                          }}
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Filtros específicos para clientes recurrentes */}
                  {audience.hasBookingFilters && (
                    <>
                      {/* Cantidad de reservas */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Cantidad de reservas
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs text-gray-500">Mínima</label>
                            <Input
                              type="number"
                              min="1"
                              placeholder="Ej: 5"
                              value={formData.audienceFilters?.bookingsCount?.min || ''}
                              onChange={(e) => {
                                setFormData({
                                  ...formData,
                                  audienceFilters: {
                                    ...formData.audienceFilters,
                                    bookingsCount: {
                                      ...formData.audienceFilters?.bookingsCount,
                                      min: Number(e.target.value)
                                    }
                                  }
                                })
                              }}
                              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-gray-500">Máxima</label>
                            <Input
                              type="number"
                              min="1"
                              placeholder="Sin límite"
                              value={formData.audienceFilters?.bookingsCount?.max || ''}
                              onChange={(e) => {
                                setFormData({
                                  ...formData,
                                  audienceFilters: {
                                    ...formData.audienceFilters,
                                    bookingsCount: {
                                      ...formData.audienceFilters?.bookingsCount,
                                      max: Number(e.target.value)
                                    }
                                  }
                                })
                              }}
                              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Última reserva */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Última reserva (días)
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs text-gray-500">Hace mínimo</label>
                            <Input
                              type="number"
                              min="0"
                              placeholder="Ej: 30"
                              value={formData.audienceFilters?.lastBooking?.min || ''}
                              onChange={(e) => {
                                setFormData({
                                  ...formData,
                                  audienceFilters: {
                                    ...formData.audienceFilters,
                                    lastBooking: {
                                      ...formData.audienceFilters?.lastBooking,
                                      min: Number(e.target.value)
                                    }
                                  }
                                })
                              }}
                              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-gray-500">Hace máximo</label>
                            <Input
                              type="number"
                              min="0"
                              placeholder="Ej: 90"
                              value={formData.audienceFilters?.lastBooking?.max || ''}
                              onChange={(e) => {
                                setFormData({
                                  ...formData,
                                  audienceFilters: {
                                    ...formData.audienceFilters,
                                    lastBooking: {
                                      ...formData.audienceFilters?.lastBooking,
                                      max: Number(e.target.value)
                                    }
                                  }
                                })
                              }}
                              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {/* Selector de usuarios específicos */}
              {audience.hasUserSelector && formData.targetAudience === audience.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4"
                >
                  <MultiSelect
                    value={formData.selectedUsers || []}
                    onChange={(users) => {
                      setFormData({
                        ...formData,
                        selectedUsers: users
                      })
                    }}
                    options={userOptions}
                    placeholder="Seleccionar usuarios"
                  />
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )
}