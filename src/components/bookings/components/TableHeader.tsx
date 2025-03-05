import { Button } from "@/components/ui/button"
import { IconSettings, IconChevronLeft, IconChevronRight } from "@tabler/icons-react"
import { DateSelector } from "../DateSelector"
import { RefreshButton } from "./RefreshButton"
import { cn } from "@/lib/utils"
import { format, addDays, subDays, isToday } from "date-fns"
import { es } from "date-fns/locale"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface TableHeaderProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
  onConfigClick: () => void
  onRefreshClick: () => void
  isRefreshing?: boolean
  currentBranch: { timezone: string }
}

export function TableHeader({
  selectedDate,
  onDateChange,
  onConfigClick,
  onRefreshClick,
  isRefreshing = false,
  currentBranch
}: TableHeaderProps) {
  const [direction, setDirection] = useState<'up' | 'down'>('up')

  // Función para capitalizar la primera letra
  const capitalizeFirstLetter = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  // Función para obtener la abreviación de la zona horaria
  const getTimezoneAbbr = (timezone: string) => {
    return timezone.split('/').pop()?.replace('_', ' ') || timezone
  }

  // Funciones de navegación con animación mejorada
  const handleDateChange = (newDate: Date, dir: 'up' | 'down') => {
    setDirection(dir)
    onDateChange(newDate)
  }

  const handlePrevDay = () => {
    handleDateChange(subDays(selectedDate, 1), 'down')
  }

  const handleNextDay = () => {
    handleDateChange(addDays(selectedDate, 1), 'up')
  }

  const handleToday = () => {
    const today = new Date()
    const dir = selectedDate > today ? 'down' : 'up'
    handleDateChange(today, dir)
  }

  // Obtener el texto del botón central
  const getCentralButtonText = () => {
    if (isToday(selectedDate)) {
      return "Hoy"
    }
    return capitalizeFirstLetter(format(selectedDate, "EEEE", { locale: es }))
  }

  return (
    <div className="p-4 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          {/* DateSelector */}
          <DateSelector
            selectedDate={selectedDate}
            onDateChange={onDateChange}
            className="shadow-none h-10 w-[4.5rem]"
            direction={direction}
          />

          {/* Fecha detallada */}
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900">
              {capitalizeFirstLetter(format(selectedDate, "MMMM d, yyyy", { locale: es }))}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {capitalizeFirstLetter(format(selectedDate, "EEEE", { locale: es }))}
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <span className="text-xs text-gray-400 font-medium">
                      ({getTimezoneAbbr(currentBranch?.timezone || '')})
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Zona horaria: {currentBranch?.timezone}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Navegación de días integrada */}
        <div className="flex h-10 rounded-md border border-gray-200 bg-white">
          <button
            onClick={handlePrevDay}
            className={cn(
              "flex items-center justify-center px-2",
              "hover:bg-gray-50 transition-colors",
              "border-r border-gray-200"
            )}
          >
            <IconChevronLeft className="h-4 w-4" stroke={2} />
          </button>
          
          <div className="relative flex items-center">
            <button
              onClick={handleToday}
              className={cn(
                "px-3 font-medium min-w-[100px] text-sm h-10",
                "hover:bg-gray-50 transition-colors",
                "text-gray-700 flex items-center justify-center"
              )}
            >
              <AnimatePresence initial={false} mode="wait" custom={direction}>
                <motion.span
                  key={selectedDate.toISOString()}
                  custom={direction}
                  initial={{ y: direction === 'up' ? 20 : -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: direction === 'up' ? -20 : 20, opacity: 0 }}
                  transition={{
                    duration: 0.2,
                    ease: "easeInOut"
                  }}
                >
                  {getCentralButtonText()}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>

          <button
            onClick={handleNextDay}
            className={cn(
              "flex items-center justify-center px-2",
              "hover:bg-gray-50 transition-colors",
              "border-l border-gray-200"
            )}
          >
            <IconChevronRight className="h-4 w-4" stroke={2} />
          </button>
        </div>

        {/* Botón de Actualizar */}
        <RefreshButton
          onRefreshClick={onRefreshClick}
          isRefreshing={isRefreshing}
        />

        {/* Botón de Configuración */}
        <Button
          variant="outline"
          size="icon"
          className="p-2 bg-white hover:bg-gray-50 rounded-md border border-gray-200"
          onClick={onConfigClick}
        >
          <IconSettings className="h-5 w-5 text-gray-600" stroke={1.5} />
        </Button>
      </div>
    </div>
  )
} 