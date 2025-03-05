import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { Trash2, Plus } from "lucide-react"

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
  // Modificar la inicialización del schedule
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Horarios de apertura</h3>
          <p className="text-sm text-muted-foreground">
            Configura los horarios de apertura para cada día de la semana
          </p>
        </div>
      </div>
      <div className="space-y-2 border rounded-lg divide-y">
        {Object.entries(currentSchedule).map(([day, daySchedule]) => (
          <div key={day} className="flex flex-col sm:flex-row items-start gap-4 p-3">
            <div className="w-full sm:w-28 pb-2 sm:pb-0 sm:pt-1 border-b sm:border-0">
              <span className="text-xs font-medium text-gray-700">
                {daysTranslations[day]}
              </span>
            </div>
            <div className="flex flex-col flex-1 gap-3 w-full">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`checkbox-${day}`}
                  checked={daySchedule.isOpen}
                  onCheckedChange={(checked) => handleDayToggle(day, checked as boolean)}
                  className="h-3.5 w-3.5 rounded-[4px] border-gray-300 data-[state=checked]:bg-black data-[state=checked]:border-black"
                />
                <Label htmlFor={`checkbox-${day}`} className="text-xs text-gray-600">
                  {daySchedule.isOpen ? 'Abierto' : 'Cerrado'}
                </Label>
              </div>
              {daySchedule.isOpen && daySchedule.timeRanges && daySchedule.timeRanges.length > 0 && (
                <div className="space-y-2">
                  {daySchedule.timeRanges.map((range, index) => (
                    <div key={index} className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-2 min-w-[280px]">
                        <input
                          type="time"
                          value={range.openTime}
                          onChange={(e) => handleTimeChange(day, index, 'openTime', e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border rounded"
                        />
                        <span className="text-sm text-gray-500">a</span>
                        <input
                          type="time"
                          value={range.closeTime}
                          onChange={(e) => handleTimeChange(day, index, 'closeTime', e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border rounded"
                        />
                      </div>
                      {daySchedule.timeRanges.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRange(day, index)}
                          className="h-8 w-8 p-0 ml-auto sm:ml-0"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addRange(day)}
                    className="text-xs"
                  >
                    + Agregar horario
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 