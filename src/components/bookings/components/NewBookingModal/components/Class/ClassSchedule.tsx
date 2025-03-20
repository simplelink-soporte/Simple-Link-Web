import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect, KeyboardEvent } from "react"
import { IconPlus, IconX, IconCalendar, IconClock, IconUsers, IconRepeat } from "@tabler/icons-react"
import { Switch } from "@/components/ui/switch"
import { CustomCalendar } from "@/components/ui/custom-calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { TimeSelector } from "@/components/ui/time-selector"
import { SingleSelect } from "@/components/ui/single-select"
import { useGroupedCourts } from '@/hooks/useGroupedCourts'
import { useBranches } from '@/hooks/useBranches'
import { toast } from "@/components/ui/use-toast"
import { toZonedTime } from 'date-fns-tz'

interface TimeSlot {
  id: string
  startTime: string
  endTime: string
  capacity: number
  instructors: string[]
  price: number
  courtIds: string[]
}

interface ClassScheduleConfig {
  isRecurring: boolean
  startDate: Date | undefined
  endDate: Date | undefined
  weekDays: number[]
  timeSlots: TimeSlot[]
}

interface ClassScheduleProps {
  config?: ClassScheduleConfig
  onChange: (config: ClassScheduleConfig) => void
  onValidationChange: (isValid: boolean) => void
  hideRecurringSwitch?: boolean
  readOnlyStartDate?: boolean
}

export function ClassSchedule({
  config = {
    isRecurring: false,
    startDate: undefined,
    endDate: undefined,
    weekDays: [],
    timeSlots: []
  },
  onChange,
  onValidationChange,
  hideRecurringSwitch,
  readOnlyStartDate
}: ClassScheduleProps) {
  const { currentBranch } = useBranches()
  const { courtOptions, isLoading: isLoadingCourts, error: courtsError } = useGroupedCourts({ 
    branchId: currentBranch?.id 
  })
  const [newInstructor, setNewInstructor] = useState<string>("")
  const [instructorInputs, setInstructorInputs] = useState<{ [key: string]: string }>({})

  const timezone = currentBranch?.timezone || 'Europe/Madrid'

  // Transformar las opciones agrupadas en una lista plana
  const flatCourtOptions = courtOptions.reduce<Array<{ id: string, name: string }>>((acc, group) => {
    return [...acc, ...group.options.map(opt => ({
      id: opt.value,
      name: `${group.label} - ${opt.label}`
    }))]
  }, [])

  useEffect(() => {
    if (courtsError) {
      console.error('❌ Error al cargar las canchas:', courtsError)
      toast({
        title: "Error",
        description: "No se pudieron cargar las canchas. Por favor, intente nuevamente.",
        variant: "destructive"
      })
    }
  }, [courtsError])

  useEffect(() => {
    // Validación
    const isValid = config.startDate !== undefined && 
                   config.timeSlots.length > 0 && 
                   config.timeSlots.every(slot => 
                     slot.price > 0 && 
                     slot.capacity > 0 && 
                     slot.startTime && 
                     slot.endTime && 
                     slot.courtIds.length > 0 && 
                     slot.instructors.length > 0
                   )
    onValidationChange?.(isValid)

    // Actualizar los días cuando no es recurrente y la fecha ha cambiado
    if (!config.isRecurring && config.startDate) {
      const currentDate = new Date(config.startDate)
      const currentDayOfWeek = currentDate.getUTCDay()
      
      // Solo actualizar si el día de la semana no está ya establecido
      if (!config.weekDays.includes(currentDayOfWeek)) {
        onChange({
          ...config,
          weekDays: [currentDayOfWeek]
        })
      }
    }
  }, [config, onValidationChange, onChange])

  const handleAddTimeSlot = () => {
    const newSlot: TimeSlot = {
      id: crypto.randomUUID(),
      startTime: "09:00",
      endTime: "10:00",
      capacity: 4,
      instructors: [],
      price: 10,
      courtIds: []
    }
    onChange({
      ...config,
      timeSlots: [...config.timeSlots, newSlot]
    })
  }

  const handlePriceChange = (slotId: string, price: number) => {
    const updatedSlots = config.timeSlots.map(slot => 
      slot.id === slotId
        ? { ...slot, price: Math.max(0, price) }
        : slot
    )
    onChange({ ...config, timeSlots: updatedSlots })
  }

  const handleInstructorInputChange = (slotId: string, value: string) => {
    setInstructorInputs(prev => ({
      ...prev,
      [slotId]: value
    }))
  }

  const handleAddInstructorToSlot = (slotId: string) => {
    const instructorValue = instructorInputs[slotId]
    if (!instructorValue?.trim()) return

    const updatedSlots = config.timeSlots.map(slot => 
      slot.id === slotId
        ? { ...slot, instructors: [...slot.instructors, instructorValue.trim()] }
        : slot
    )
    onChange({ ...config, timeSlots: updatedSlots })
    
    setInstructorInputs(prev => ({
      ...prev,
      [slotId]: ''
    }))
  }

  const handleRemoveInstructor = (slotId: string, instructorToRemove: string) => {
    const updatedSlots = config.timeSlots.map(slot => 
      slot.id === slotId
        ? { 
            ...slot, 
            instructors: slot.instructors.filter(i => i !== instructorToRemove)
          }
        : slot
    )
    onChange({ ...config, timeSlots: updatedSlots })
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>, slotId: string) => {
    if (e.key === 'Enter' && newInstructor.trim()) {
      const updatedSlots = config.timeSlots.map(slot => 
        slot.id === slotId
          ? { ...slot, instructors: [...slot.instructors, newInstructor.trim()] }
          : slot
      )
      onChange({ ...config, timeSlots: updatedSlots })
      setNewInstructor("")
    }
  }

  const weekDays = ["D", "L", "M", "X", "J", "V", "S"]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Tipo de Clase y Fechas */}
      <div className="space-y-6">
        {/* Switch de Clase Recurrente */}
        {!hideRecurringSwitch && (
          <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100">
            <div className="space-y-0.5">
              <h3 className="text-sm font-medium text-gray-900">Clase Recurrente</h3>
              <p className="text-sm text-gray-500">La clase se repetirá semanalmente</p>
            </div>
            <Switch
              checked={config.isRecurring}
              onCheckedChange={(checked) => onChange({ ...config, isRecurring: checked })}
              className="data-[state=checked]:bg-black"
            />
          </div>
        )}

        {/* Fechas */}
        <div className="grid grid-cols-2 gap-4">
          {/* Fecha de inicio */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              {config.isRecurring ? 'Fecha de inicio' : 'Fecha de la clase'}
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <button className={cn(
                  "w-full p-3 rounded-lg text-left",
                  "border border-gray-200 bg-white",
                  "hover:border-gray-300 transition-colors duration-200",
                  !config.startDate && "text-gray-500"
                )}>
                  <span className="text-sm">
                    {config.startDate
                      ? format(config.startDate, "d 'de' MMMM, yyyy", { locale: es })
                      : "Seleccionar fecha"}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="p-0">
                <CustomCalendar
                  selected={config.startDate}
                  onSelect={(date) => {
                    if (!date) return;

                    // Ya no convertimos la fecha a otra zona horaria para evitar el cambio de día
                    const dayOfWeek = date.getUTCDay();

                    onChange({
                      ...config,
                      startDate: date,
                      weekDays: !config.isRecurring ? [dayOfWeek] : config.weekDays,
                    });
                  }}
                  disabled={readOnlyStartDate ? () => true : undefined}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Fecha de fin (solo si es recurrente) */}
          {config.isRecurring && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Fecha de fin (opcional)
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <button className={cn(
                    "w-full p-3 rounded-lg text-left",
                    "border border-gray-200 bg-white",
                    "hover:border-gray-300 transition-colors duration-200",
                    !config.endDate && "text-gray-500"
                  )}>
                    <span className="text-sm">
                      {config.endDate
                        ? format(config.endDate, "d 'de' MMMM, yyyy", { locale: es })
                        : "Sin fecha de fin"}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="p-0">
                  <CustomCalendar
                    selected={config.endDate}
                    onSelect={(date) => onChange({ ...config, endDate: date })}
                    disabled={(date) => date < (config.startDate || new Date())}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        {/* Días de la semana (solo si es recurrente) */}
        {config.isRecurring && (
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">
              Días de la semana
            </label>
            <div className="flex justify-center gap-2">
              {weekDays.map((day, index) => (
                <button
                  key={day}
                  onClick={() => onChange({
                    ...config,
                    weekDays: config.weekDays.includes(index)
                      ? config.weekDays.filter(d => d !== index)
                      : [...config.weekDays, index]
                  })}
                  className={cn(
                    "w-9 h-9 rounded-lg text-sm font-medium transition-all duration-200",
                    config.weekDays.includes(index)
                      ? "bg-black text-white"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  )}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Horarios */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Horarios</h3>
          <button
            onClick={handleAddTimeSlot}
            className={cn(
              "text-sm text-gray-600 hover:text-gray-900",
              "transition-colors duration-200"
            )}
          >
            Agregar horario
          </button>
        </div>

        <AnimatePresence>
          {config.timeSlots.map((slot, index) => (
            <motion.div
              key={slot.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group relative"
            >
              <div className="p-6 bg-white rounded-xl border border-gray-100">
                <div className="space-y-6">
                  {/* Horario */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Inicio
                      </label>
                      <TimeSelector
                        value={slot.startTime}
                        onChange={(time) => {
                          const updatedSlots = config.timeSlots.map(s =>
                            s.id === slot.id ? { ...s, startTime: time } : s
                          )
                          onChange({ ...config, timeSlots: updatedSlots })
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Fin
                      </label>
                      <TimeSelector
                        value={slot.endTime}
                        onChange={(time) => {
                          const updatedSlots = config.timeSlots.map(s =>
                            s.id === slot.id ? { ...s, endTime: time } : s
                          )
                          onChange({ ...config, timeSlots: updatedSlots })
                        }}
                      />
                    </div>
                  </div>

                  {/* Cancha */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Cancha
                    </label>
                    <SingleSelect
                      value={slot.courtIds?.[0] || ''}
                      onChange={(courtId) => {
                        const updatedSlots = config.timeSlots.map(s =>
                          s.id === slot.id ? { ...s, courtIds: courtId ? [courtId] : [] } : s
                        )
                        onChange({
                          ...config,
                          timeSlots: updatedSlots
                        })
                      }}
                      options={flatCourtOptions}
                      placeholder="Seleccionar cancha"
                    />
                    {courtsError && (
                      <p className="text-sm text-red-500 mt-1">
                        Error al cargar las canchas. Por favor, intente nuevamente.
                      </p>
                    )}
                    {!isLoadingCourts && !courtsError && flatCourtOptions.length === 0 && (
                      <p className="text-sm text-gray-500 mt-1">
                        No hay canchas disponibles para esta sede.
                      </p>
                    )}
                  </div>

                  {/* Capacidad y Precio */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Capacidad */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Capacidad
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={slot.capacity}
                        onChange={(e) => {
                          const updatedSlots = config.timeSlots.map(s =>
                            s.id === slot.id ? { ...s, capacity: parseInt(e.target.value) || 1 } : s
                          )
                          onChange({ ...config, timeSlots: updatedSlots })
                        }}
                        className={cn(
                          "w-full px-3 py-2 rounded-lg border bg-white",
                          "focus:outline-none focus:border-gray-300",
                          "transition-colors duration-200",
                          "[appearance:textfield]",
                          "[&::-webkit-outer-spin-button]:appearance-none",
                          "[&::-webkit-inner-spin-button]:appearance-none"
                        )}
                        style={{ MozAppearance: 'textfield' }}
                      />
                    </div>

                    {/* Precio */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Precio
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                          $
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={slot.price}
                          onChange={(e) => {
                            const updatedSlots = config.timeSlots.map(s =>
                              s.id === slot.id ? { ...s, price: parseInt(e.target.value) || 0 } : s
                            )
                            onChange({ ...config, timeSlots: updatedSlots })
                          }}
                          className={cn(
                            "w-full pl-7 pr-3 py-2 rounded-lg border bg-white",
                            "focus:outline-none focus:border-gray-300",
                            "transition-colors duration-200",
                            "[appearance:textfield]",
                            "[&::-webkit-outer-spin-button]:appearance-none",
                            "[&::-webkit-inner-spin-button]:appearance-none"
                          )}
                          style={{ MozAppearance: 'textfield' }}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Profesores */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700">
                      Profesores
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {slot.instructors.map((instructor) => (
                        <motion.span
                          key={`${slot.id}-${instructor}`}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                        >
                          {instructor}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleRemoveInstructor(slot.id, instructor)
                            }}
                            className="p-1 hover:text-red-500 transition-colors"
                          >
                            <IconX className="w-3 h-3" />
                          </button>
                        </motion.span>
                      ))}
                      <div className="flex-1 min-w-[200px] flex items-center gap-2">
                        <input
                          type="text"
                          value={instructorInputs[slot.id] || ''}
                          onChange={(e) => handleInstructorInputChange(slot.id, e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleAddInstructorToSlot(slot.id)
                            }
                          }}
                          placeholder="Agregar profesor..."
                          className={cn(
                            "flex-1 px-3 py-1 text-sm",
                            "border-none focus:outline-none bg-transparent"
                          )}
                        />
                        <button
                          onClick={() => handleAddInstructorToSlot(slot.id)}
                          className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                        >
                          Agregar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const updatedSlots = config.timeSlots.filter(s => s.id !== slot.id)
                    onChange({ ...config, timeSlots: updatedSlots })
                  }}
                  className={cn(
                    "absolute top-4 right-4 p-2 rounded-lg",
                    "text-gray-400 hover:text-red-500 hover:bg-red-50",
                    "opacity-0 group-hover:opacity-100 transition-all duration-200"
                  )}
                >
                  <IconX className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {config.timeSlots.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <p className="text-sm text-gray-500">
              Agrega al menos un horario para la clase
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
} 