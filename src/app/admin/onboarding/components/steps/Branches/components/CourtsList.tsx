import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SingleSelect } from "@/components/ui/single-select"
import { MultiSelect } from "@/components/ui/multi-select"
import { cn } from "@/lib/utils"
import { Trash2, Check, HelpCircle, Plus, ChevronDown, PlusCircle } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { SectionTitle } from "@/components/ui/section-title"
import { Switch } from "@/components/ui/switch"
import { motion } from "framer-motion"
import { CustomPricing } from "@/components/bookings/CustomPricing"
import { DurationPricing } from "@/components/bookings/DurationPricing"

// Tipos
interface TimeRangeType {
  startTime: string
  endTime: string
  percentage: number
}

export interface DayPrice {
  isSelected: boolean
  timeRanges: TimeRangeType[]
}

export interface CourtData {
  id: string
  name: string
  sports: string[]
  type: string
  characteristics: string[]
  available_durations: number[]
  duration_pricing: Record<string, number>
  custom_pricing: {
    [key: string]: {
      isSelected: boolean
      timeRanges: TimeRangeType[]
    }
  }
  is_active: boolean
}

// Opciones
const sportOptions = [
  { id: "padel", name: "Padel" },
  { id: "tennis", name: "Tennis" },
  { id: "badminton", name: "Badminton" },
  { id: "squash", name: "Squash" },
  { id: "pickleball", name: "Pickleball" }
]

const courtTypeOptions = [
  { id: "interior", name: "Interior" },
  { id: "exterior", name: "Exterior" },
  { id: "cubierta", name: "Cubierta" }
]

const durationOptions = [
  { id: 60, name: '60min' },
  { id: 90, name: '90min' },
  { id: 120, name: '120min' },
]

const characteristicsOptions = [
  { id: 'cristal-estandar', name: 'Cristal Estándar' },
  { id: 'cristal-panoramico', name: 'Cristal Panorámico' },
  { id: 'muro-hormigon', name: 'Muro de Hormigón' },
  { id: 'cesped-sintetico', name: 'Césped Sintético' },
  { id: 'tierra-batida', name: 'Tierra Batida' },
  { id: 'hormigon-pulido', name: 'Hormigón Pulido' },
  { id: 'goma-profesional', name: 'Goma Profesional' }
]

export const daysTranslations: { [key: string]: string } = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo'
}

// Función auxiliar para obtener el texto de las opciones seleccionadas
const getSelectedOptionsLabel = (selectedIds: string[], options: { id: string, name: string }[]) => {
  if (selectedIds.length === 0) return ""
  const selectedNames = selectedIds.map(id => options.find(opt => opt.id === id)?.name).filter(Boolean)
  return selectedNames.join(", ")
}

interface CourtsListProps {
  courts: CourtData[]
  onCourtsChange: (courts: CourtData[]) => void
}

// Función auxiliar para validar una pista
const isValidCourt = (court: CourtData): boolean => {
  return (
    court.name !== '' &&
    court.sports.length > 0 &&
    court.type !== '' &&
    court.characteristics.length > 0 &&
    court.available_durations.length > 0 &&
    Object.keys(court.duration_pricing).length > 0
  )
}

// Agregar esta función de utilidad
const ensureValidCourt = (court: CourtData): CourtData => {
  return {
    ...court,
    sports: Array.isArray(court.sports) ? court.sports : ['padel'],
    available_durations: Array.isArray(court.available_durations) ? court.available_durations : [60],
    duration_pricing: court.duration_pricing || { '60': 10 },
    custom_pricing: court.custom_pricing || {}
  };
};

export function CourtsList({ courts, onCourtsChange }: CourtsListProps) {
  const [openCourtId, setOpenCourtId] = useState<string | null>(null)
  const [showAddCourtDialog, setShowAddCourtDialog] = useState(false)
  const [showCustomDuration, setShowCustomDuration] = useState(false)
  const [customDuration, setCustomDuration] = useState('')
  const [currentCourtId, setCurrentCourtId] = useState<string | null>(null)

  // Manejadores de eventos
  const handleAddCourt = () => {
    const newCourt: CourtData = {
      id: `court-${courts.length + 1}`,
      name: `Pista ${courts.length + 1}`,
      sports: [],
      type: '',
      characteristics: [],
      available_durations: [60],
      duration_pricing: { '60': 10 },
      custom_pricing: {},
      is_active: true
    }
    onCourtsChange([...courts, newCourt])
    setShowAddCourtDialog(false)
  }

  const handleCopyPreviousCourt = () => {
    if (courts.length > 0) {
      const lastCourt = courts[courts.length - 1]
      const newCourt = {
        ...JSON.parse(JSON.stringify(lastCourt)),
        id: `court-${courts.length + 1}`,
        name: `Pista ${courts.length + 1}`,
        is_active: true
      }
      onCourtsChange([...courts, newCourt])
    }
    setShowAddCourtDialog(false)
  }

  const handleRemoveCourt = (courtId: string) => {
    if (courts.length <= 1) return
    onCourtsChange(courts.filter(court => court.id !== courtId))
  }

  const handleCourtChange = (courtId: string, field: keyof CourtData, value: any) => {
    onCourtsChange(courts.map(court => 
      court.id === courtId 
        ? { ...court, [field]: value }
        : court
    ))
  }

  const handleDurationPricingChange = (courtId: string, pricing: Record<string, number>) => {
    const court = courts.find(c => c.id === courtId)
    if (!court) return

    // Actualizar duration_pricing y available_durations
    const available_durations = Object.keys(pricing).map(Number).sort((a, b) => a - b)
    
    onCourtsChange(courts.map(c => 
      c.id === courtId 
        ? {
            ...c,
            duration_pricing: pricing,
            available_durations: available_durations
          }
        : c
    ))
  }

  const handleCustomPricingChange = (courtId: string, customPricing: CourtData['custom_pricing']) => {
    onCourtsChange(courts.map(court => 
      court.id === courtId 
        ? {
            ...court,
            custom_pricing: customPricing
          }
        : court
    ))
  }

  const handleTimeRangeUpdate = (
    courtId: string, 
    day: string, 
    index: number, 
    field: keyof TimeRangeType, 
    value: string | number
  ) => {
    const court = courts.find(c => c.id === courtId)
    if (!court) return

    const updatedCustomPricing = {
      ...court.custom_pricing,
      [day]: {
        isSelected: true,
        timeRanges: court.custom_pricing[day]?.timeRanges.map((range, i) => 
          i === index 
            ? { ...range, [field]: value }
            : range
        ) || []
      }
    }

    handleCustomPricingChange(courtId, updatedCustomPricing)
  }

  const handleTimeRangeAdd = (courtId: string, day: string) => {
    const court = courts.find(c => c.id === courtId)
    if (!court) return

    const newTimeRange: TimeRangeType = {
      startTime: "09:00",
      endTime: "22:00",
      percentage: 0
    }

    const updatedCustomPricing = {
      ...court.custom_pricing,
      [day]: {
        isSelected: true,
        timeRanges: [
          ...(court.custom_pricing[day]?.timeRanges || []),
          newTimeRange
        ]
      }
    }

    handleCustomPricingChange(courtId, updatedCustomPricing)
  }

  const handleTimeRangeRemove = (courtId: string, day: string, index: number) => {
    const court = courts.find(c => c.id === courtId)
    if (!court) return

    const updatedCustomPricing = {
      ...court.custom_pricing,
      [day]: {
        isSelected: true,
        timeRanges: court.custom_pricing[day]?.timeRanges.filter((_, i) => i !== index) || []
      }
    }

    handleCustomPricingChange(courtId, updatedCustomPricing)
  }

  const handleAddCustomDuration = (courtId: string) => {
    if (!customDuration) return
    
    const durationNumber = parseInt(customDuration)
    if (isNaN(durationNumber)) return
    
    handleDurationAdd(courtId, durationNumber)
    setShowCustomDuration(false)
    setCustomDuration('')
    setCurrentCourtId(null)
  }

  const handleDurationAdd = (courtId: string, newDurationId: number) => {
      const court = courts.find(c => c.id === courtId)
      
      if (court) {
      const currentDurations = [...court.available_durations]
        
        if (!currentDurations.includes(newDurationId)) {
        const updatedDurations = [...currentDurations, newDurationId].sort((a, b) => a - b)
        
        // Actualizar el duration_pricing con el nuevo valor
        const updatedPricing = {
          ...court.duration_pricing,
          [newDurationId]: 10 // Precio por defecto
        }

          onCourtsChange(courts.map(c => 
            c.id === courtId 
              ? {
                  ...c,
                available_durations: updatedDurations,
                duration_pricing: updatedPricing
                }
              : c
          ))
        }
      }
  }

  const handleDurationRemove = (courtId: string, durationId: number) => {
    const court = courts.find(c => c.id === courtId)
    
    if (court && court.available_durations.length > 1) {
      const updatedDurations = court.available_durations.filter(d => d !== durationId)
      
      // Eliminar el precio de la duración removida
      const { [durationId]: removedPrice, ...updatedPricing } = court.duration_pricing

      onCourtsChange(courts.map(c => 
        c.id === courtId 
          ? {
              ...c,
              available_durations: updatedDurations,
              duration_pricing: updatedPricing
            }
          : c
      ))
    }
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Pistas"
        subtitle="Configura las pistas disponibles en esta sede"
        tooltip="Agrega y configura las pistas de tu sede. Puedes especificar tipos de pista, deportes disponibles y establecer precios según la duración y horarios."
      />
      <div className="space-y-6">
        {courts.map((court, index) => {
          const validCourt = ensureValidCourt(court); // Validar la estructura de la cancha
          
          return (
            <Collapsible 
              key={validCourt.id}
              open={openCourtId === validCourt.id}
              onOpenChange={(open) => {
                setOpenCourtId(open ? validCourt.id : null)
              }}
            >
              <div className="border rounded-lg bg-white">
                <div className={cn(
                  "flex items-center justify-between p-4",
                  "hover:bg-gray-50/50 transition-colors",
                  "border-b border-transparent",
                  "data-[state=open]:border-gray-100"
                )}>
                  <div className="flex items-center gap-4">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-0 hover:bg-transparent">
                        <ChevronDown className="h-4 w-4 text-gray-500 transition-transform duration-200 [&[data-state=open]>svg]:rotate-180" />
                      </Button>
                    </CollapsibleTrigger>
                    <div>
                      <h4 className="text-sm font-medium">{validCourt.name}</h4>
                      <p className="text-xs text-gray-500">
                        {validCourt.sports.length} deportes · {validCourt.available_durations.length} duraciones
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveCourt(validCourt.id)}
                    className={cn(
                      "shrink-0",
                      index === 0 && "opacity-50 cursor-not-allowed"
                    )}
                    disabled={index === 0}
                    title={index === 0 ? "No se puede eliminar la pista principal" : "Eliminar pista"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <CollapsibleContent>
                  <div className="p-6 animate-in fade-in-0 duration-200">
                    <div className="grid gap-6">
                      <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                          <Label>Nombre de la pista</Label>
                          {index === 0 && (
                            <span className="text-xs text-gray-500 italic">
                              Pista principal (no se puede eliminar)
                            </span>
                          )}
                        </div>
                        <Input
                          value={validCourt.name}
                          onChange={(e) => handleCourtChange(validCourt.id, 'name', e.target.value)}
                          placeholder="Ej: Pista Central"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="grid gap-2">
                          <Label>Deportes disponibles</Label>
                          <MultiSelect
                            value={validCourt.sports}
                            onChange={(values) => handleCourtChange(validCourt.id, 'sports', values)}
                            options={sportOptions}
                            placeholder={validCourt.sports.length === 0 
                              ? "Seleccionar deportes" 
                              : getSelectedOptionsLabel(validCourt.sports, sportOptions)}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Tipo de pista</Label>
                          <SingleSelect
                            value={validCourt.type}
                            onChange={(value) => handleCourtChange(validCourt.id, 'type', value)}
                            options={courtTypeOptions}
                            placeholder="Seleccionar tipo"
                          />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label>Características de la Pista</Label>
                        <MultiSelect
                          value={validCourt.characteristics}
                          onChange={(values) => handleCourtChange(validCourt.id, 'characteristics', values)}
                          options={characteristicsOptions}
                          placeholder={validCourt.characteristics.length === 0 
                            ? "Seleccionar características" 
                            : getSelectedOptionsLabel(validCourt.characteristics, characteristicsOptions)}
                        />
                      </div>

                      {/* Duraciones disponibles */}
                      <div className="grid gap-2">
                        <Label>Duraciones disponibles</Label>
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            {durationOptions.map((duration) => (
                              <button
                                key={duration.id}
                                type="button"
                                onClick={() => {
                                  const currentDurations = validCourt.available_durations || []
                                  if (currentDurations.includes(duration.id) && currentDurations.length <= 1) {
                                    return
                                  }
                                  
                                  if (currentDurations.includes(duration.id)) {
                                    handleDurationRemove(validCourt.id, duration.id)
                                  } else {
                                    handleDurationAdd(validCourt.id, duration.id)
                                  }
                                }}
                                className={cn(
                                  "min-w-[80px] px-3 py-1.5 text-sm rounded-md",
                                  "border transition-colors duration-200",
                                  validCourt.available_durations?.includes(duration.id)
                                    ? "bg-gray-100 text-gray-900 border-gray-200 hover:bg-gray-200"
                                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
                                  validCourt.available_durations?.includes(duration.id) && 
                                  validCourt.available_durations?.length === 1 && 
                                  "cursor-not-allowed opacity-50"
                                )}
                              >
                                {duration.name}
                              </button>
                            ))}

                            {/* Duraciones personalizadas */}
                            {validCourt.available_durations.map((durationId) => {
                              if (durationOptions.find(d => d.id === durationId)) return null
                              return (
                                <button
                                  key={durationId}
                                  type="button"
                                  onClick={() => {
                                    if (validCourt.available_durations.length <= 1) {
                                      return
                                    }
                                    handleDurationRemove(validCourt.id, durationId)
                                  }}
                                  className={cn(
                                    "min-w-[80px] px-3 py-1.5 text-sm rounded-md bg-gray-100 text-gray-900 border border-gray-200 hover:bg-gray-200",
                                    validCourt.available_durations.length === 1 && "cursor-not-allowed opacity-50"
                                  )}
                                >
                                  {`${durationId}min`}
                                </button>
                              )
                            })}

                            {/* Botón para mostrar input de duración personalizada */}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setShowCustomDuration(true)
                                setCurrentCourtId(validCourt.id)
                              }}
                              className={cn(
                                "flex items-center gap-1",
                                showCustomDuration && currentCourtId === validCourt.id && "hidden"
                              )}
                            >
                              <PlusCircle className="h-4 w-4" />
                              <span>Personalizada</span>
                            </Button>
                          </div>

                          {/* Input para duración personalizada */}
                          {showCustomDuration && currentCourtId === validCourt.id && (
                            <div className="flex items-center gap-2">
                              <div className="relative flex-1 max-w-[200px]">
                                <Input
                                  type="number"
                                  min="1"
                                  placeholder="Duración en minutos"
                                  value={customDuration}
                                  onChange={(e) => setCustomDuration(e.target.value)}
                                  className="pr-12"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                                  min
                                </span>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleAddCustomDuration(validCourt.id)}
                              >
                                Agregar
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setShowCustomDuration(false)
                                  setCustomDuration('')
                                  setCurrentCourtId(null)
                                }}
                              >
                                Cancelar
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Precios por duración */}
                      <div className="grid gap-4 mt-6">
                          <Label className="flex items-center gap-2">
                            Precios específicos
                            <span className="text-xs text-gray-500">(por duración)</span>
                          </Label>
                        <DurationPricing
                          durations={validCourt.available_durations}
                          pricing={validCourt.duration_pricing}
                          onChange={(pricing) => handleDurationPricingChange(validCourt.id, pricing)}
                                                  />
                                                </div>

                      {/* Precios personalizados */}
                      <div className="grid gap-4 mt-6">
                        <Label className="flex items-center gap-2">
                          Precios personalizados
                          <span className="text-xs text-gray-500">(por día y horario)</span>
                        </Label>
                        <CustomPricing
                          pricing={validCourt.custom_pricing}
                          onChange={(pricing) => handleCustomPricingChange(validCourt.id, pricing)}
                          basePricing={validCourt.duration_pricing}
                          availableDurations={validCourt.available_durations}
                        />
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )
        })}

        <Button
          variant="outline"
          onClick={() => setShowAddCourtDialog(true)}
          className="w-full"
        >
          Añadir pista
        </Button>
      </div>

      {/* Diálogo para añadir pista */}
      <AlertDialog open={showAddCourtDialog} onOpenChange={setShowAddCourtDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Añadir nueva pista</AlertDialogTitle>
            <AlertDialogDescription>
              Selecciona cómo quieres añadir la nueva pista
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={handleAddCourt}
              className="w-full sm:w-auto"
            >
              Nueva pista
            </Button>
            <Button
              onClick={handleCopyPreviousCourt}
              className="w-full sm:w-auto bg-black hover:bg-black/90 text-white"
              disabled={courts.length === 0}
            >
              Copiar última pista
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 