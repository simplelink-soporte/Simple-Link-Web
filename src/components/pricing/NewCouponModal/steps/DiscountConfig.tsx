import { motion } from "framer-motion"
import { IconPercentage, IconCash, IconClock, IconQuestionMark } from "@tabler/icons-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select-3"
import { TimeSelector } from "@/components/ui/time-selector"
import { Switch } from "@/components/ui/switch"
import type { Coupon } from "@/types/coupon"
import { cn } from "@/lib/utils"
import { TimeRangeSelector } from "../components/TimeRangeSelector"
import { CustomCalendar } from "@/components/ui/custom-calendar"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { MultiSelect } from "@/components/ui/multi-select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface DiscountConfigProps {
  formData: Partial<Coupon>
  setFormData: (data: Partial<Coupon>) => void
}

interface DayTimeRestriction {
  isSelected: boolean
  timeMode: 'all' | 'custom'
  startTime?: string
  endTime?: string
}

interface TimeRestrictions {
  [key: number]: DayTimeRestriction
}

export function DiscountConfig({ formData, setFormData }: DiscountConfigProps) {
  const discountTypes = [
    {
      id: 'percentage',
      title: 'Porcentaje',
      icon: IconPercentage,
      suffix: '%',
      maxValue: 100,
      placeholder: 'Ej: 15'
    },
    {
      id: 'fixed',
      title: 'Monto Fijo',
      icon: IconCash,
      suffix: '€',
      maxValue: undefined,
      placeholder: 'Ej: 10'
    }
  ] as const

  const weekDays = [
    { id: 0, label: 'D' },
    { id: 1, label: 'L' },
    { id: 2, label: 'M' },
    { id: 3, label: 'X' },
    { id: 4, label: 'J' },
    { id: 5, label: 'V' },
    { id: 6, label: 'S' }
  ]

  const weekDaysComplete = [
    { id: 0, label: 'Domingo' },
    { id: 1, label: 'Lunes' },
    { id: 2, label: 'Martes' },
    { id: 3, label: 'Miércoles' },
    { id: 4, label: 'Jueves' },
    { id: 5, label: 'Viernes' },
    { id: 6, label: 'Sábado' }
  ]

  const timeOptions = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
    '20:00', '21:00', '22:00', '23:00'
  ]

  const handleDayTimeChange = (dayId: number, changes: Partial<DayTimeRestriction>) => {
    const currentRestrictions = formData.timeRestrictions || {}
    const currentDaySettings = currentRestrictions[dayId] || {
      isSelected: false,
      timeMode: 'all'
    }

    setFormData({
      ...formData,
      timeRestrictions: {
        ...currentRestrictions,
        [dayId]: {
          ...currentDaySettings,
          ...changes
        }
      }
    })
  }

  // Datos de ejemplo para las sedes
  const locationOptions = [
    { id: 'sede1', name: 'Sede Central' },
    { id: 'sede2', name: 'Sede Norte' },
    { id: 'sede3', name: 'Sede Sur' },
    { id: 'sede4', name: 'Sede Este' },
    { id: 'sede5', name: 'Sede Oeste' }
  ]

  return (
    <div className="space-y-8">
      {/* Tipo y valor del descuento */}
      <section className="space-y-4">
        <label className="text-sm font-medium">
          Modo de descuento
        </label>

        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            {discountTypes.map((type) => (
              <motion.button
                key={type.id}
                onClick={() => setFormData({ ...formData, type: type.id, value: 0 })}
                className={cn(
                  "px-4 py-2 rounded-lg transition-all duration-200",
                  "hover:bg-gray-50",
                  "focus:outline-none focus:ring-0",
                  "flex items-center gap-2",
                  formData.type === type.id
                    ? "bg-gray-50 ring-1 ring-black/5"
                    : "bg-white border border-gray-200"
                )}
                whileTap={{ scale: 0.98 }}
              >
                <type.icon 
                  className={cn(
                    "w-4 h-4 transition-colors duration-200",
                    formData.type === type.id
                      ? "text-black"
                      : "text-gray-500"
                  )}
                  strokeWidth={1.5} 
                />
                <span className={cn(
                  "text-sm font-medium transition-colors duration-200",
                  formData.type === type.id ? "text-black" : "text-gray-700"
                )}>
                  {type.title}
                </span>
              </motion.button>
            ))}
          </div>

          <div className="flex-1">
            <div className="relative">
              <Input
                type="number"
                min="0"
                max={formData.type === 'percentage' ? 100 : undefined}
                placeholder={formData.type === 'percentage' ? "Ej: 15" : "Ej: 10"}
                value={formData.value || ''}
                onChange={(e) => {
                  const value = Number(e.target.value)
                  if (formData.type === 'percentage' && value > 100) return
                  setFormData({ ...formData, value })
                }}
                className={cn(
                  "pr-8 transition-all duration-200",
                  "border-gray-200",
                  "focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-black",
                  "placeholder:text-gray-400",
                  "[appearance:textfield]",
                  "[&::-webkit-outer-spin-button]:appearance-none",
                  "[&::-webkit-inner-spin-button]:appearance-none"
                )}
                style={{ MozAppearance: 'textfield' }}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                {formData.type === 'percentage' ? '%' : '€'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fechas de inicio y fin */}
      <section className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Fecha de inicio */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Fecha de inicio
              </label>
              <span className="text-xs text-gray-500 invisible">
                Opcional
              </span>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <button className={cn(
                  "w-full p-3 rounded-lg text-left",
                  "border border-gray-200 bg-white",
                  "hover:border-gray-300 transition-colors duration-200",
                  !formData.startDate && "text-gray-500"
                )}>
                  <span className="text-sm">
                    {formData.startDate
                      ? format(formData.startDate, "d 'de' MMMM, yyyy", { locale: es })
                      : "Seleccionar fecha"}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="p-0">
                <CustomCalendar
                  selected={formData.startDate}
                  onSelect={(date) => setFormData({ ...formData, startDate: date })}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Fecha de fin */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Fecha de fin
              </label>
              <span className="text-xs text-gray-500">
                Opcional
              </span>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <button className={cn(
                  "w-full p-3 rounded-lg text-left",
                  "border border-gray-200 bg-white",
                  "hover:border-gray-300 transition-colors duration-200",
                  !formData.endDate && "text-gray-500"
                )}>
                  <span className="text-sm">
                    {formData.endDate
                      ? format(formData.endDate, "d 'de' MMMM, yyyy", { locale: es })
                      : "Sin fecha de fin"}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="p-0">
                <CustomCalendar
                  selected={formData.endDate}
                  onSelect={(date) => setFormData({ ...formData, endDate: date })}
                  disabled={(date) => date < (formData.startDate || new Date())}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </section>

      {/* Monto Mínimo de Compra */}
      <section className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100">
          <div className="space-y-0.5">
            <h3 className="text-sm font-medium text-gray-900">Monto Mínimo de Compra</h3>
            <p className="text-sm text-gray-500">El cupón solo se aplicará si la compra supera un monto específico</p>
          </div>
          <Switch
            checked={formData.hasMinPurchase || false}
            onCheckedChange={(checked) => {
              setFormData({ 
                ...formData, 
                hasMinPurchase: checked,
                minPurchase: checked ? formData.minPurchase || 0 : undefined
              })
            }}
            className="data-[state=checked]:bg-black"
          />
        </div>

        {formData.hasMinPurchase && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4"
          >
            <div className="relative w-full max-w-[200px]">
              <Input
                type="number"
                min="0"
                placeholder="Ej: 50"
                value={formData.minPurchase || ''}
                onChange={(e) => {
                  const value = Number(e.target.value)
                  setFormData({ ...formData, minPurchase: value })
                }}
                className={cn(
                  "pr-8 transition-all duration-200",
                  "border-gray-200",
                  "focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-black",
                  "placeholder:text-gray-400",
                  "[appearance:textfield]",
                  "[&::-webkit-outer-spin-button]:appearance-none",
                  "[&::-webkit-inner-spin-button]:appearance-none"
                )}
                style={{ MozAppearance: 'textfield' }}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                €
              </div>
            </div>
          </motion.div>
        )}
      </section>

      {/* Cupón Recurrente */}
      <section className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100">
          <div className="space-y-0.5">
            <h3 className="text-sm font-medium text-gray-900">Cupón Recurrente</h3>
            <p className="text-sm text-gray-500">El cupón se aplicará en días específicos</p>
          </div>
          <Switch
            checked={formData.isRecurring || false}
            onCheckedChange={(checked) => {
              setFormData({ 
                ...formData, 
                isRecurring: checked,
                timeRestrictions: checked ? {} : undefined
              })
            }}
            className="data-[state=checked]:bg-black"
          />
        </div>

        {/* Días aplicables - Solo visible si es recurrente */}
        {formData.isRecurring && (
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">
              Días aplicables
            </label>
            <div className="flex justify-center gap-2">
              {weekDays.map((day) => {
                const isSelected = formData.timeRestrictions?.[day.id]?.isSelected

                return (
                  <button
                    key={day.id}
                    onClick={() => {
                      const currentSettings = formData.timeRestrictions?.[day.id]
                      handleDayTimeChange(day.id, {
                        isSelected: !currentSettings?.isSelected,
                        timeMode: 'all'
                      })
                    }}
                    className={cn(
                      "w-9 h-9 rounded-lg text-sm font-medium transition-all duration-200",
                      isSelected
                        ? "bg-black text-white"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    {day.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {/* Configuración de días */}
      {formData.isRecurring && (
        <div className="space-y-3">
          {weekDaysComplete.map((day, index) => {
            const daySettings = formData.timeRestrictions?.[day.id]
            
            if (!daySettings?.isSelected) return null

            return (
              <motion.div
                key={day.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "group p-4 rounded-lg border transition-all duration-200",
                  "bg-white border-gray-200 hover:border-gray-300"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {day.label}
                  </span>
                  <TimeRangeSelector
                    value={daySettings.timeMode || 'all'}
                    onChange={(value) => {
                      handleDayTimeChange(day.id, {
                        timeMode: value,
                        startTime: value === 'custom' ? '09:00' : undefined,
                        endTime: value === 'custom' ? '22:00' : undefined
                      })
                    }}
                  />
                </div>

                {daySettings.timeMode === 'custom' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 grid grid-cols-2 gap-4"
                  >
                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-500">Desde</label>
                      <TimeSelector
                        value={daySettings.startTime || '09:00'}
                        onChange={(value) => {
                          handleDayTimeChange(day.id, { startTime: value })
                        }}
                        className={cn(
                          "border-gray-200",
                          "focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-black"
                        )}
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-500">Hasta</label>
                      <TimeSelector
                        value={daySettings.endTime || '22:00'}
                        onChange={(value) => {
                          handleDayTimeChange(day.id, { endTime: value })
                        }}
                        className={cn(
                          "border-gray-200",
                          "focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-black"
                        )}
                      />
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Sedes Aplicables */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">
              Sedes aplicables
            </label>
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
                    Selecciona las sedes donde este cupón será válido. Debes seleccionar al menos una sede.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <button
            onClick={() => {
              const allLocations = locationOptions.map(loc => loc.id)
              setFormData({
                ...formData,
                locations: formData.locations?.length === locationOptions.length ? [] : allLocations
              })
            }}
            className="text-xs font-medium text-gray-500 hover:text-gray-900"
          >
            {formData.locations?.length === locationOptions.length 
              ? 'Deseleccionar todas' 
              : 'Seleccionar todas'
            }
          </button>
        </div>
        <MultiSelect
          value={formData.locations || []}
          onChange={(locations) => {
            setFormData({
              ...formData,
              locations
            })
          }}
          options={locationOptions}
          placeholder="Seleccionar sedes"
        />
      </section>
    </div>
  )
}