import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { Trash2, Plus, Clock, Lock, Unlock } from "lucide-react"

export interface ScheduleRange {
  openTime: string
  closeTime: string
}

export interface ScheduleDay {
  isOpen: boolean
  timeRanges: ScheduleRange[]
}

export interface ScheduleData {
  [key: string]: ScheduleDay
}

export const daysTranslations: { [key: string]: string } = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo'
}

interface ScheduleListProps {
  schedule?: ScheduleData
  onScheduleChange: (schedule: ScheduleData) => void
}

const defaultSchedule: ScheduleData = {
  monday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] },
  tuesday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] },
  wednesday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] },
  thursday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] },
  friday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] },
  saturday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] },
  sunday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] }
}

export function ScheduleList({ schedule, onScheduleChange }: ScheduleListProps) {
  // Estado para controlar qué día está seleccionado actualmente
  const [selectedDay, setSelectedDay] = useState<string | null>('monday');

  // El resto de la lógica permanece igual
  const initialSchedule = useMemo(() => {
    if (!schedule) return defaultSchedule;

    return Object.entries(defaultSchedule).reduce((acc, [day, defaultDay]) => {
      const scheduleDay = schedule[day] as ScheduleDay | undefined;
      
      // Si existe el día en el schedule proporcionado, usar esos datos
      if (scheduleDay) {
        acc[day] = {
          isOpen: typeof scheduleDay.isOpen === 'boolean' ? scheduleDay.isOpen : defaultDay.isOpen,
          timeRanges: Array.isArray(scheduleDay.timeRanges) && scheduleDay.timeRanges.length > 0
            ? scheduleDay.timeRanges.map(range => ({
                openTime: range.openTime || defaultDay.timeRanges[0].openTime,
                closeTime: range.closeTime || defaultDay.timeRanges[0].closeTime
              }))
            : defaultDay.timeRanges
        };
      } else {
        // Si no existe, usar los valores por defecto
        acc[day] = defaultDay;
      }
      return acc;
    }, {} as ScheduleData);
  }, [schedule]);

  const [currentSchedule, setCurrentSchedule] = useState<ScheduleData>(initialSchedule);

  // Actualizar currentSchedule cuando cambie el schedule prop
  useEffect(() => {
    setCurrentSchedule(initialSchedule);
  }, [initialSchedule]);

  const updateSchedule = (newSchedule: ScheduleData) => {
    setCurrentSchedule(newSchedule)
    onScheduleChange(newSchedule)
  }

  const handleDayToggle = (day: string, checked: boolean) => {
    const newSchedule = {
      ...currentSchedule,
      [day]: {
        ...currentSchedule[day],
        isOpen: checked,
        timeRanges: currentSchedule[day].timeRanges?.length > 0 
          ? currentSchedule[day].timeRanges 
          : [{ openTime: '09:00', closeTime: '18:00' }]
      }
    }
    updateSchedule(newSchedule)
  }

  const handleTimeChange = (day: string, index: number, field: 'openTime' | 'closeTime', value: string) => {
    const newSchedule = { ...currentSchedule };
    const daySchedule = newSchedule[day];
    const updatedRanges = [...(daySchedule.timeRanges || [{ openTime: '08:00', closeTime: '22:00' }])];
    updatedRanges[index] = {
      ...updatedRanges[index],
      [field]: value
    };
    newSchedule[day] = {
      ...daySchedule,
      timeRanges: updatedRanges
    };
    updateSchedule(newSchedule);
  };

  const addRange = (day: string) => {
    const newSchedule = { ...currentSchedule };
    const daySchedule = newSchedule[day];
    const currentRanges = daySchedule.timeRanges || [{ openTime: '08:00', closeTime: '22:00' }];
    const lastRange = currentRanges[currentRanges.length - 1];
    const newRange = {
      openTime: lastRange ? lastRange.closeTime : '08:00',
      closeTime: lastRange ? incrementTime(lastRange.closeTime, 2) : '10:00'
    };
    newSchedule[day] = {
      ...daySchedule,
      timeRanges: [...currentRanges, newRange]
    };
    updateSchedule(newSchedule);
  };

  const removeRange = (day: string, index: number) => {
    const daySchedule = currentSchedule[day]
    if (!daySchedule?.timeRanges || daySchedule.timeRanges.length <= 1) return
    
    const newSchedule = { ...currentSchedule }
    const updatedRanges = [...daySchedule.timeRanges]
    updatedRanges.splice(index, 1)
    newSchedule[day] = {
      ...daySchedule,
      timeRanges: updatedRanges
    }
    updateSchedule(newSchedule)
  }

  const incrementTime = (time: string, hours: number): string => {
    const [h, m] = time.split(':').map(Number)
    const newHour = (h + hours) % 24
    return `${newHour.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      {/* Navegación horizontal de días */}
      <div className="flex items-center gap-4 border-b pb-3 overflow-x-auto hide-scrollbar">
        {Object.entries(currentSchedule).map(([day, daySchedule]) => (
          <button
            key={day}
            type="button"
            onClick={() => setSelectedDay(day)}
            className={cn(
              "text-xs font-medium transition-colors",
              selectedDay === day 
                ? "text-gray-900" 
                : "text-gray-500/70 hover:text-gray-700",
              !daySchedule.isOpen && "text-gray-400/60"
            )}
          >
            {daysTranslations[day]}
          </button>
        ))}
      </div>
      
      {/* Configuración del día seleccionado */}
      {selectedDay && (
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h4 className="text-sm font-medium text-gray-700">{daysTranslations[selectedDay]}</h4>
              <button 
                type="button"
                onClick={() => handleDayToggle(selectedDay, !currentSchedule[selectedDay].isOpen)}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                {currentSchedule[selectedDay].isOpen ? (
                  <>
                    <Unlock className="h-3.5 w-3.5 text-gray-400" />
                    <span>Abierto</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5 text-gray-400" />
                    <span>Cerrado</span>
                  </>
                )}
              </button>
            </div>
          </div>
          
          {currentSchedule[selectedDay].isOpen && currentSchedule[selectedDay].timeRanges && (
            <div className="space-y-3">
              {currentSchedule[selectedDay].timeRanges.map((range, index) => (
                <div key={index} className="flex items-center gap-3 py-2 border-b border-gray-100">
                  <div className="flex-1 flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-gray-300" />
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={range.openTime}
                        onChange={(e) => handleTimeChange(selectedDay, index, 'openTime', e.target.value)}
                        className="text-sm text-gray-600 border-0 bg-transparent focus:outline-none focus:ring-0 w-20"
                      />
                      <span className="text-xs text-gray-400">a</span>
                      <input
                        type="time"
                        value={range.closeTime}
                        onChange={(e) => handleTimeChange(selectedDay, index, 'closeTime', e.target.value)}
                        className="text-sm text-gray-600 border-0 bg-transparent focus:outline-none focus:ring-0 w-20"
                      />
                    </div>
                  </div>
                  {currentSchedule[selectedDay].timeRanges.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRange(selectedDay, index)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addRange(selectedDay)}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 mt-3 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar horario
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 