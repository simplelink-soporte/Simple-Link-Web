import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { FormStepField } from "@/types/form-steps";
import { PreviewContainer } from "../../layout/PreviewContainer";
import { Button } from "@/components/ui/button";
import { ChevronRight, Clock, ChevronLeft, Check, Filter, Sun, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { format, addDays, isSameDay, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, startOfDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { NavigationButtons } from "../../layout/NavigationButtons";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useAvailability } from '@/hooks/useAvailability';
import { AvailabilitySlot } from '@/types/availability';
import { DURATIONS, COURT_TYPES, TIME_RANGES } from '@/config/availability';
import { useForm } from "@/contexts/FormContext";
import { MobileNavigation } from "../../layout/MobileNavigation";
import { MobileNextButton } from "../../layout/MobileNextButton";
import { MobileShiftsPreview } from './mobile/MobileShiftsPreview';

interface ShiftsPreviewProps {
  field: FormStepField;
  theme: 'light' | 'dark';
  viewType: "mobile" | "desktop";
  onNext: () => void;
  onPrev: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  isPublicView?: boolean;
}

type CourtType = 'indoor' | 'outdoor' | 'covered';
type TimeOfDay = 'morning' | 'afternoon' | 'night';

interface Shift {
  id: string;
  time: string;
  type: string;
  courtNumber: string;
  courtType: string;
  basePrice: number;
  status: ShiftStatus;
}

type ShiftStatus = 'available' | 'popular' | 'lastCall';

const shifts: Shift[] = [
  {
    id: '1',
    time: '09:00',
    type: 'Turno Matutino',
    courtNumber: 'Cancha 1',
    courtType: 'Interior',
    basePrice: 500,
    status: 'available'
  },
  {
    id: '2',
    time: '11:00',
    type: 'Turno Matutino',
    courtNumber: 'Cancha 2',
    courtType: 'Exterior',
    basePrice: 500,
    status: 'popular'
  },
  {
    id: '3',
    time: '13:00',
    type: 'Turno Tarde',
    courtNumber: 'Cancha 3',
    courtType: 'Cubierta',
    basePrice: 500,
    status: 'lastCall'
  },
  {
    id: '4',
    time: '15:00',
    type: 'Turno Tarde',
    courtNumber: 'Cancha 4',
    courtType: 'Interior',
    basePrice: 500,
    status: 'available'
  }
];

interface TimeButtonsProps {
  value: TimeOfDay | null;
  onValueChange: (value: TimeOfDay | null) => void;
  theme?: 'light' | 'dark';
  viewType: 'mobile' | 'desktop';
}

function TimeButtons({ value, onValueChange, theme, viewType }: TimeButtonsProps) {
  const [showTimePopup, setShowTimePopup] = useState(false);
  
  const timeOptions = Object.entries(TIME_RANGES).map(([key, _]) => ({
    id: key as TimeOfDay,
    label: key === 'morning' ? 'Mañana' : key === 'afternoon' ? 'Tarde' : 'Noche'
  }));

  const handleTimeSelect = (time: TimeOfDay) => {
    const currentSelected = timeOptions.find(opt => opt.id === value);
    onValueChange(currentSelected?.id === time ? null : time);
    setShowTimePopup(false);
  };

  const selectedTime = timeOptions.find(opt => opt.id === value);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowTimePopup(!showTimePopup)}
        className={cn(
          "h-7 rounded-lg gap-2",
          "transition-all duration-200 ease-in-out",
          theme === 'dark' 
            ? "bg-zinc-800 hover:bg-zinc-700 text-neutral-300 hover:text-neutral-100"
            : "bg-zinc-300 hover:bg-zinc-400 text-white",
          showTimePopup && (
            theme === 'dark'
              ? "bg-zinc-700 text-neutral-100"
              : "bg-zinc-500 text-white"
          )
        )}
      >
        <Sun className="h-3.5 w-3.5" />
        <span className={cn(
          "text-xs",
          viewType === "mobile" && "hidden"
        )}>
          {value ? selectedTime?.label : "Horario"}
        </span>
      </Button>

      <AnimatePresence>
        {showTimePopup && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "absolute right-0 top-10 z-50",
              "w-[140px] rounded-xl p-2",
              "shadow-lg",
              theme === 'dark'
                ? "bg-neutral-900 border border-neutral-800"
                : "bg-white border border-gray-200"
            )}
          >
            <p className={cn(
              "text-[10px] font-medium text-center pb-2",
              theme === 'dark' ? "text-gray-400" : "text-gray-500"
            )}>
              Momento del día
            </p>
            <div className="space-y-1">
              {timeOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleTimeSelect(option.id)}
                  className={cn(
                    "w-full text-xs font-medium rounded-lg px-3 py-1.5",
                    "transition-all duration-200 ease-in-out",
                    "relative",
                    value === option.id
                      ? theme === 'dark'
                        ? "bg-neutral-800 text-neutral-200"
                        : "bg-gray-100 text-gray-900"
                      : theme === 'dark'
                        ? "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/50"
                  )}
                >
                  <span className="flex items-center justify-between">
                  {option.label}
                    {value === option.id && (
                      <X 
                        className={cn(
                          "h-3 w-3 ml-2",
                          theme === 'dark' ? "text-neutral-400" : "text-gray-500"
                        )} 
                      />
                    )}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ScrollIndicatorProps {
  theme: 'light' | 'dark';
  value: number;
  onChange: (value: number) => void;
}

function ScrollIndicator({ theme, value, onChange }: ScrollIndicatorProps) {
  const formatTime = (value: number) => {
    const hours = Math.floor(value);
    const minutes = (value % 1) * 60;
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  };

  return (
    <div className="space-y-4">
      <p className={cn(
        "text-[10px] text-center font-medium",
        theme === 'dark' ? "text-gray-400" : "text-gray-500"
      )}>
        Duración de partido
      </p>

      <div className="flex items-center gap-2 w-full px-2">
        <span className={cn(
          "text-[9px] font-medium",
          theme === 'dark' ? "text-gray-500" : "text-gray-400"
        )}>
          1h
        </span>

        <div className="relative flex-1">
          <Slider
            defaultValue={[1]}
            value={[value]}
            onValueChange={([newValue]) => onChange(newValue)}
            min={1}
            max={3}
            step={0.5}
            className={cn(
              "[&>:last-child>span]:h-4 [&>:last-child>span]:w-4",
              "[&>:last-child>span]:border-2",
              theme === 'dark'
                ? "[&>:last-child>span]:border-white [&>:last-child>span]:bg-gray-950"
                : "[&>:last-child>span]:border-black [&>:last-child>span]:bg-white",
              "cursor-pointer"
            )}
          />
        </div>

        <span className={cn(
          "text-[9px] font-medium",
          theme === 'dark' ? "text-gray-500" : "text-gray-400"
        )}>
          3h
        </span>
      </div>
    </div>
  );
}

interface Duration {
  value: number;
  label: string;
}

const durations: Duration[] = [
  { value: 0.75, label: '45m' },
  { value: 1, label: '1h' },
  { value: 1.5, label: '1,30h' },
  { value: 2, label: '2h' },
  { value: 2.5, label: '2,30h' },
  { value: 3, label: '3h' },
];

function getStatusColor(status: ShiftStatus, theme: 'light' | 'dark', isSelected: boolean): string {
  if (isSelected) {
    return theme === 'dark' ? 'bg-white' : 'bg-black';
  }
  
  const colors = {
    available: theme === 'dark' ? 'bg-green-500/60' : 'bg-green-500/40',
    popular: theme === 'dark' ? 'bg-blue-500/60' : 'bg-blue-500/40',
    lastCall: theme === 'dark' ? 'bg-orange-500/60' : 'bg-orange-500/40'
  };
  return colors[status];
}

type CourtFilter = 'all' | 'covered' | 'uncovered';

export function ShiftsPreview({ field, theme, viewType, onNext, onPrev, isFirstStep, isLastStep, isPublicView }: ShiftsPreviewProps) {
  const { title, description } = field;
  const { state, setShift } = useForm();
  
  // Obtener datos del contexto
  const { location } = state;
  const currentBranchId = location.branchId || undefined;

  // Si es vista móvil y pública, usar el componente móvil
  if (viewType === "mobile" && isPublicView) {
    return (
      <MobileShiftsPreview
        field={field}
        theme={theme}
        viewType={viewType}
        onNext={onNext}
        onPrev={onPrev}
        isFirstStep={isFirstStep}
        isLastStep={isLastStep}
        isPublicView={isPublicView}
      />
    );
  }

  // Estados locales
  const [selectedDate, setSelectedDate] = useState(() => {
    if (state.shift.date) {
      // Asegurar que la fecha esté en el inicio del día
      return startOfDay(parseISO(state.shift.date));
    }
    return startOfDay(new Date());
  });
  const [currentMonth, setCurrentMonth] = useState(() => startOfDay(new Date()));
  const [duration, setDuration] = useState<number[]>([state.shift.duration || 1]);
  const [selectedTime, setSelectedTime] = useState<TimeOfDay | null>(null);
  const [courtFilter, setCourtFilter] = useState<'all' | CourtType>('all');
  const [selectedShift, setSelectedShift] = useState<string | null>(null);
  const [isLocalUpdate, setIsLocalUpdate] = useState(false);

  // Memoizar los parámetros de useAvailability
  const availabilityParams = useMemo(() => ({
    date: selectedDate,
    duration: duration[0],
    courtType: courtFilter === 'all' ? undefined : courtFilter,
    timeOfDay: selectedTime || undefined,
    branchId: currentBranchId || ''
  }), [selectedDate, duration[0], courtFilter, selectedTime, currentBranchId]);

  // Obtener los slots disponibles
  const {
    slots = [],
    loading: loadingSlots,
    error,
    holdSlot,
    releaseHold,
    durations,
    courtTypes
  } = useAvailability(availabilityParams);

  // Memoización y filtrado de slots
  const filteredSlots = useMemo(() => {
    if (!slots) return [];
    
    // Función para generar una clave única más robusta
    const generateUniqueKey = (slot: AvailabilitySlot) => {
      const baseKey = `${slot.startTime}-${slot.endTime}-${slot.courtId}-${slot.courtName}`;
      const statusKey = slot.status ? `-${slot.status}` : '';
      const priceKey = slot.price ? `-${slot.price}` : '';
      return `${baseKey}${statusKey}${priceKey}`;
    };

    // Primero agrupamos los slots por hora de inicio y cancha
    const groupedSlots = slots.reduce((groups, slot) => {
      const timeKey = slot.startTime;
      const courtKey = slot.courtId;
      const key = `${timeKey}-${courtKey}`;
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(slot);
      return groups;
    }, {} as Record<string, AvailabilitySlot[]>);

    // Para cada grupo, seleccionamos el slot más apropiado
    const uniqueSlots = Object.values(groupedSlots).map(group => {
      if (group.length === 1) return group[0];
      
      // Si hay múltiples slots para la misma hora y cancha,
      // seleccionamos el más apropiado basado en criterios específicos
      return group.reduce((selected, current) => {
        // Priorizar slots disponibles
        if (current.status === 'available' && selected.status !== 'available') {
          return current;
        }
        // Si ambos están disponibles, priorizar el de menor precio
        if (current.status === 'available' && selected.status === 'available') {
          return (current.price || 0) < (selected.price || 0) ? current : selected;
        }
        return selected;
      });
    });

    // Convertimos a array y aplicamos filtros adicionales
    let filtered = uniqueSlots;

    // Aplicar filtro de tiempo si está seleccionado
    if (selectedTime) {
      const timeRanges = {
        morning: { start: '07:00', end: '12:00' },
        afternoon: { start: '12:00', end: '18:00' },
        night: { start: '18:00', end: '23:00' }
      };

      filtered = filtered.filter(slot => {
        const range = timeRanges[selectedTime];
        return slot.startTime >= range.start && slot.startTime < range.end;
      });
    }

    // Ordenamiento mejorado
    return filtered.sort((a, b) => {
      // Primero por hora de inicio
      const timeCompare = a.startTime.localeCompare(b.startTime);
      if (timeCompare !== 0) return timeCompare;
      
      // Luego por tipo de cancha
      const typeCompare = (a.courtType || '').localeCompare(b.courtType || '');
      if (typeCompare !== 0) return typeCompare;
      
      // Finalmente por número de cancha
      return a.courtName.localeCompare(b.courtName);
    });
  }, [slots, selectedTime]);

  // Monitoreo de duplicados y diagnóstico mejorado
  useEffect(() => {
    if (slots.length > 0) {
      const slotAnalysis = slots.reduce((analysis, slot) => {
        const timeKey = slot.startTime;
        const courtKey = slot.courtId;
        
        if (!analysis.timeGroups[timeKey]) {
          analysis.timeGroups[timeKey] = new Set();
        }
        if (!analysis.courtGroups[courtKey]) {
          analysis.courtGroups[courtKey] = new Set();
        }
        
        analysis.timeGroups[timeKey].add(slot.courtId);
        analysis.courtGroups[courtKey].add(slot.startTime);
        
        return analysis;
      }, {
        timeGroups: {} as Record<string, Set<string>>,
        courtGroups: {} as Record<string, Set<string>>
      });

      console.log('Análisis de slots:', {
        totalSlots: slots.length,
        uniqueSlots: filteredSlots.length,
        timeSlots: Object.keys(slotAnalysis.timeGroups).length,
        courtsWithMultipleSlots: Object.entries(slotAnalysis.courtGroups)
          .filter(([_, times]) => times.size > 1)
          .length,
        slotsPerTimeSlot: Object.fromEntries(
          Object.entries(slotAnalysis.timeGroups)
            .map(([time, courts]) => [time, courts.size])
        )
      });
    }
  }, [slots, filteredSlots]);

  // Sincronizar con el estado del contexto cuando cambie
  useEffect(() => {
    if (isLocalUpdate) {
      setIsLocalUpdate(false);
      return;
    }

    if (!state.shift.date) return;

    const newDate = startOfDay(parseISO(state.shift.date));
    if (format(newDate, 'yyyy-MM-dd') !== format(selectedDate, 'yyyy-MM-dd')) {
      setSelectedDate(newDate);
      setDuration([state.shift.duration]);
      setSelectedShift(null);
    }

    if (state.shift.startTime && slots.length > 0) {
      const matchingSlot = slots.find(s => 
        s.startTime === state.shift.startTime && 
        s.endTime === state.shift.endTime
      );
      if (matchingSlot) {
        setSelectedShift(matchingSlot.id);
      }
    }
  }, [state.shift, slots, selectedDate]);

  const containerRef = useRef<HTMLDivElement>(null);

  // Función memoizada para scroll a una fecha específica
  const scrollToDate = useCallback((date: Date) => {
    const element = document.getElementById(`date-${date.toISOString()}`);
    if (element && containerRef.current) {
      const container = containerRef.current;
      const scrollLeft = element.offsetLeft - (container.offsetWidth / 2) + (element.offsetWidth / 2);
      
      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth'
      });
    }
  }, []);

  // Efecto para posicionar el scroll inicial
  useEffect(() => {
    // Pequeño timeout para asegurar que el DOM está listo
    const timer = setTimeout(() => {
      scrollToDate(selectedDate);
    }, 100);

    return () => clearTimeout(timer);
  }, []); // Solo se ejecuta al montar el componente

  // Manejar cambio de fecha
  const handleDateSelect = useCallback((date: Date) => {
    const normalizedDate = startOfDay(date);
    setIsLocalUpdate(true);
    setSelectedDate(normalizedDate);
    setSelectedShift(null);
    
    setShift({
      ...state.shift,
      date: format(normalizedDate, 'yyyy-MM-dd'),
      startTime: null,
      endTime: null,
      courtId: null,
      courtName: null
    });
    
    scrollToDate(normalizedDate);
  }, [state.shift, setShift, scrollToDate]);

  // Manejar la selección de slots
  const handleSlotSelection = useCallback((slot: AvailabilitySlot) => {
    setIsLocalUpdate(true);
    setSelectedShift(slot.id);
    
    setShift({
      date: format(selectedDate, 'yyyy-MM-dd'),
      startTime: slot.startTime,
      endTime: slot.endTime,
      duration: duration[0],
      courtId: slot.courtId,
      courtName: slot.courtName,
      price: slot.price || 0
    });
  }, [selectedDate, duration, setShift]);

  // Logs para debugging
  useEffect(() => {
    console.log('ShiftsPreview - Estado:', {
      loadingSlots,
      slotsLength: slots.length,
      error,
      params: {
        date: selectedDate,
        duration: duration[0],
        courtType: courtFilter === 'all' ? undefined : COURT_TYPES[courtFilter],
        timeOfDay: selectedTime || undefined,
        branchId: currentBranchId
      }
    });
  }, [loadingSlots, slots, error, selectedDate, duration, courtFilter, selectedTime, currentBranchId]);

  // Generar días del mes actual
  const allDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  // Manejar cambio de mes
  const handlePrevMonth = useCallback(() => {
    const newMonth = subMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    
    // Si el día seleccionado no está en el nuevo mes, seleccionar el último día del mes anterior
    if (selectedDate < startOfMonth(newMonth) || selectedDate > endOfMonth(newMonth)) {
      const newDate = endOfMonth(newMonth);
      setSelectedDate(newDate);
      scrollToDate(newDate);
    }
  }, [currentMonth, selectedDate, scrollToDate]);

  const handleNextMonth = useCallback(() => {
    const newMonth = addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    
    // Si el día seleccionado no está en el nuevo mes, seleccionar el primer día del mes siguiente
    if (selectedDate < startOfMonth(newMonth) || selectedDate > endOfMonth(newMonth)) {
      const newDate = startOfMonth(newMonth);
      setSelectedDate(newDate);
      scrollToDate(newDate);
    }
  }, [currentMonth, selectedDate, scrollToDate]);

  const [showTimePopup, setShowTimePopup] = useState(false);
  const [showCourtPopup, setShowCourtPopup] = useState(false);

  const getEndTime = (startTime: string, durationHours: number) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationHours * 60;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (showTimePopup || showCourtPopup) {
        const target = event.target as HTMLElement;
        if (!target.closest('[data-popup="time"]') && !target.closest('[data-popup="court"]')) {
          setShowTimePopup(false);
          setShowCourtPopup(false);
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTimePopup, showCourtPopup]);

  const handleShiftSelect = async (slot: AvailabilitySlot) => {
    if (selectedShift === slot.id) {
      releaseHold(slot.id);
      setSelectedShift(null);
      return;
    }

    if (selectedShift) {
      releaseHold(selectedShift);
    }

    const success = await holdSlot(slot);
    if (success) {
      setSelectedShift(slot.id);
    }
  };

  // Reemplazar la sección de renderizado de turnos
  const renderSlots = () => {
    if (loadingSlots) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
          <p className={cn(
            "text-sm ml-2",
            theme === 'dark' ? "text-gray-400" : "text-gray-500"
          )}>
            Cargando turnos disponibles...
          </p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-8 space-y-2">
          <p className={cn(
            "text-sm text-center",
            theme === 'dark' ? "text-red-400" : "text-red-500"
          )}>
            {error instanceof Error ? error.message : 'Error al cargar los turnos'}
          </p>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className={theme === 'dark' ? "border-gray-800" : ""}
          >
            Reintentar
          </Button>
        </div>
      );
    }

    if (!filteredSlots.length) {
      return (
        <div className="flex flex-col items-center justify-center py-8 space-y-2">
          <p className={cn(
            "text-sm text-center",
            theme === 'dark' ? "text-gray-400" : "text-gray-500"
          )}>
            No hay turnos disponibles para los filtros seleccionados
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {filteredSlots.map((slot) => {
          const isSelected = selectedShift === slot.id;
          
          return (
            <motion.button
              key={`${slot.id}-${slot.startTime}-${slot.courtId}`}
              onClick={() => handleSlotSelection(slot)}
              className={cn(
                "relative w-full px-3 py-2 text-left transition-colors duration-200 rounded-lg",
                theme === 'dark'
                  ? "hover:bg-zinc-800/30"
                  : "hover:bg-gray-100",
                isSelected && (
                  theme === 'dark'
                    ? "bg-zinc-800/70"
                    : "bg-gray-100/70"
                )
              )}
            >
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ 
                      opacity: 1,
                      scale: 1,
                      transition: { 
                        duration: 0.2,
                        ease: [0.16, 1, 0.3, 1],
                      }
                    }}
                    exit={{ 
                      opacity: 0,
                      scale: 0.95,
                      transition: {
                        duration: 0.15,
                        ease: "easeOut"
                      }
                    }}
                    className={cn(
                      "absolute inset-0 z-0 rounded-lg",
                      theme === 'dark' 
                        ? "bg-zinc-800/70"
                        : "bg-gray-200/70"
                    )}
                  />
                )}
              </AnimatePresence>

              <motion.div 
                className="relative z-10 flex-1 min-w-0"
                animate={{
                  color: isSelected 
                    ? theme === 'dark' 
                      ? "#e5e7eb"
                      : "#374151"
                    : theme === 'dark'
                      ? "#e5e7eb"
                      : "#1f2937"
                }}
                transition={{ 
                  duration: 0.25,
                  ease: [0.32, 0.72, 0, 1]
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <motion.p
                    className="font-medium text-sm"
                    animate={{
                      color: isSelected 
                        ? theme === 'dark'
                          ? "#ffffff"
                          : "#111827"
                        : theme === 'dark'
                          ? "#ffffff"
                          : "#111827"
                    }}
                  >
                    {`${slot.startTime} - ${slot.endTime}`}
                  </motion.p>
                  <motion.span
                    className="text-xs font-medium"
                    animate={{
                      color: isSelected 
                        ? theme === 'dark'
                          ? "#e5e7eb"
                          : "#374151"
                        : theme === 'dark'
                          ? "#d1d5db"
                          : "#111827"
                    }}
                  >
                    ${slot.price?.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </motion.span>
                </div>
                <div className="space-y-0.5">
                  <motion.p
                    className="text-[11px]"
                    animate={{
                      color: isSelected 
                        ? theme === 'dark'
                          ? "#d1d5db"
                          : "#4b5563"
                        : theme === 'dark'
                          ? "#9ca3af"
                          : "#6b7280"
                    }}
                  >
                    {slot.courtName} • {slot.courtType}
                  </motion.p>
                  <motion.p
                    className="text-[10px]"
                    animate={{
                      color: isSelected 
                        ? theme === 'dark'
                          ? "#9ca3af"
                          : "#6b7280"
                        : theme === 'dark'
                          ? "#6b7280"
                          : "#9ca3af"
                    }}
                  >
                    {slot.status === 'popular' && "¡Horario popular!"}
                    {slot.status === 'lastCall' && "¡Últimos turnos!"}
                  </motion.p>
                </div>
              </motion.div>
            </motion.button>
          );
        })}
      </div>
    );
  };

  const handleRetry = () => {
    const params = {
      date: selectedDate,
      duration: duration[0],
      courtType: courtFilter === 'all' ? undefined : COURT_TYPES[courtFilter],
      timeOfDay: selectedTime || undefined,
      branchId: currentBranchId || ''
    };
    useAvailability(params);
  };

  const getCourtTypeLabel = (filter: 'all' | CourtType) => {
    if (filter === 'all') return 'Todas';
    return COURT_TYPES[filter];
  };

  // En el filtro de canchas
  const courtOptions = [
    { id: 'all' as const, label: 'Todas' },
    ...Object.entries(COURT_TYPES).map(([key, value]) => ({
      id: key as CourtType,
      label: value
    }))
  ];

  const handleCourtFilterChange = (newFilter: 'all' | CourtType) => {
    setCourtFilter(newFilter);
    setShowCourtPopup(false);
  };

  const handleNext = () => {
    onNext();
  };

  return (
    <PreviewContainer 
      viewType={viewType} 
      theme={theme}
      onNext={handleNext}
      onPrev={onPrev}
      isFirstStep={isFirstStep}
      isLastStep={isLastStep}
      isPublicView={isPublicView}
      isNextDisabled={!selectedShift}
      hideNavigation={viewType === "mobile" && isPublicView}
    >
      <div className="min-h-full flex flex-col relative">
        {viewType === "mobile" && isPublicView && (
          <>
            <MobileNavigation
              theme={theme}
              onPrev={onPrev}
              isPublicView={isPublicView}
            />
            <MobileNextButton
              theme={theme}
              onNext={handleNext}
              isDisabled={!selectedShift}
              isPublicView={isPublicView}
              viewType={viewType}
              variant="shifts"
            />
          </>
        )}
        <div className={cn(
          "flex-1",
          viewType === "mobile" && isPublicView && "pt-16 pb-24"
        )}>
          <div className="pb-4">
            <div className="text-center space-y-1">
              <h1 className={cn(
                "text-lg font-semibold transition-colors",
                theme === 'dark' ? "text-white" : "text-gray-900"
              )}>
                {title || "Seleccionar Horario"}
              </h1>
              <p className={cn(
                "text-sm transition-colors px-6",
                theme === 'dark' ? "text-gray-400" : "text-gray-500"
              )}>
                {description || "Elige el horario que mejor se adapte a tu agenda"}
              </p>
            </div>
          </div>

          <div className="flex-1 pb-24">
            <div className="px-4">
              <div className="mb-8">
                <div className={cn(
                  "w-full rounded-xl p-3",
                  "transition-all duration-200 ease-in-out",
                  theme === 'dark' 
                    ? "bg-neutral-900 text-white"
                    : "bg-gray-100/60 text-gray-900"
                )}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1 flex items-center justify-end">
                      <button
                        onClick={handlePrevMonth}
                        className={cn(
                          "p-1 rounded-lg transition-colors",
                          theme === 'dark'
                            ? "hover:bg-neutral-800 text-gray-400 hover:text-white"
                            : "hover:bg-gray-200 text-gray-500 hover:text-gray-900"
                        )}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                    </div>
                  <p className={cn(
                      "text-xs font-medium capitalize transition-colors px-4",
                    theme === 'dark' ? "text-gray-300" : "text-gray-700"
                  )}>
                      {format(currentMonth, "MMMM yyyy", { locale: es })}
                    </p>
                    <div className="flex-1 flex items-center justify-start">
                      <button
                        onClick={handleNextMonth}
                        className={cn(
                          "p-1 rounded-lg transition-colors",
                          theme === 'dark'
                            ? "hover:bg-neutral-800 text-gray-400 hover:text-white"
                            : "hover:bg-gray-200 text-gray-500 hover:text-gray-900"
                        )}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="relative group">
                    <button
                      className={cn(
                        "absolute left-2 top-1/2 -translate-y-1/2 p-1 z-20",
                        "opacity-0 group-hover:opacity-100 transition-opacity",
                        theme === 'dark' ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"
                      )}
                      onClick={() => {
                        if (containerRef.current) {
                          containerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
                        }
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    <button
                      className={cn(
                        "absolute right-2 top-1/2 -translate-y-1/2 p-1 z-20",
                        "opacity-0 group-hover:opacity-100 transition-opacity",
                        theme === 'dark' ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"
                      )}
                      onClick={() => {
                        if (containerRef.current) {
                          containerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
                        }
                      }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>

                    <LayoutGroup>
                      <div className="flex justify-center overflow-hidden">
                        <motion.div 
                          ref={containerRef}
                          className="flex gap-4 overflow-x-auto scrollbar-hide px-6"
                          layout
                        >
                          <AnimatePresence mode="wait">
                          {allDays.map((date) => {
                            const isSelected = isSameDay(date, selectedDate);
                            
                            return (
                              <motion.button
                                id={`date-${date.toISOString()}`}
                                key={date.toISOString()}
                                onClick={() => handleDateSelect(date)}
                                className={cn(
                                  "flex flex-col items-center px-2 py-1 rounded-lg",
                                  "transition-all duration-200",
                                  isSelected && (
                                    theme === 'dark'
                                      ? "bg-zinc-800"
                                      : "bg-gray-200/70"
                                  )
                                )}
                                layout
                                  initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ 
                                  opacity: isSelected ? 1 : 0.8,
                                  scale: isSelected ? 1 : 0.95,
                                  transition: { duration: 0.2 }
                                }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                              >
                                <span className={cn(
                                  "text-[10px] font-medium mb-1 transition-colors capitalize",
                                  theme === 'dark' ? "text-gray-400" : "text-gray-600"
                                )}>
                                  {format(date, "EEE", { locale: es })}
                                </span>
                                <span className={cn(
                                  "text-sm transition-colors font-medium",
                                  isSelected 
                                    ? theme === 'dark' 
                                      ? "text-white"
                                      : "text-gray-900"
                                    : theme === 'dark' 
                                      ? "text-gray-300" 
                                      : "text-gray-700"
                                )}>
                                  {format(date, "d")}
                                </span>
                              </motion.button>
                            );
                          })}
                          </AnimatePresence>
                        </motion.div>
                      </div>
                    </LayoutGroup>
                  </div>
                </div>
              </div>

              <div className={cn(
                "w-full rounded-xl relative",
                "transition-all duration-200 ease-in-out",
                "z-0",
                theme === 'dark' 
                  ? "bg-neutral-900"
                  : "bg-gray-100/60"
              )}>
                <div className={cn(
                  "w-full p-4 border-b",
                  theme === 'dark' 
                    ? "border-gray-800" 
                    : "border-gray-200/50"
                )}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 max-w-[200px] pl-3">
                      <div className="space-y-1.5">
                        <Label className={cn(
                          "text-[10px] font-medium",
                          theme === 'dark' ? "text-gray-400" : "text-gray-500"
                        )}>
                          Duración
                        </Label>
                        <div>
                          <Slider
                            defaultValue={duration}
                            value={duration}
                            onValueChange={setDuration}
                            min={1}
                            max={3}
                            step={0.5}
                            className={cn(
                              "mb-1.5",
                              "[&_[role=slider]]:h-4 [&_[role=slider]]:w-4",
                              "[&_.relative]:h-2",
                              theme === 'dark'
                                ? "[&_.absolute]:bg-neutral-800 [&_[role=slider]]:border-neutral-600 [&_[role=slider]]:bg-neutral-900"
                                : "[&_.absolute]:bg-gray-300/90 [&_[role=slider]]:border-gray-400",
                              "[&_[role=slider]]:border-2",
                              "[&_[role=slider]]:transition-colors"
                            )}
                          />
                          <span
                            className={cn(
                              "flex w-full items-center justify-between gap-1 px-2",
                              "text-[8px] font-medium",
                              theme === 'dark' ? "text-neutral-500" : "text-gray-400"
                            )}
                            aria-hidden="true"
                          >
                            {[...Array(5)].map((_, i) => (
                              <span 
                                key={i} 
                                className="flex w-0 flex-col items-center justify-center gap-0.5"
                              >
                                <span
                                  className={cn(
                                    "h-0.5 w-px",
                                    theme === 'dark' 
                                      ? "bg-neutral-700" 
                                      : "bg-gray-400",
                                    i % 2 !== 0 && "h-[1px]"
                                  )}
                                />
                                <span className={cn(i % 2 !== 0 && "opacity-0")}>
                                  {1 + i/2}h
                                </span>
                              </span>
                            ))}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative" data-popup="time">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowTimePopup(!showTimePopup)}
                          className={cn(
                            "h-7 rounded-lg gap-2",
                            "transition-all duration-200 ease-in-out",
                            theme === 'dark' 
                              ? "bg-zinc-800 hover:bg-zinc-700 text-neutral-300 hover:text-neutral-100"
                              : "bg-zinc-300 hover:bg-zinc-400 text-white",
                            showTimePopup && (
                              theme === 'dark'
                                ? "bg-zinc-700 text-neutral-100"
                                : "bg-zinc-500 text-white"
                            )
                          )}
                        >
                          <Sun className="h-3.5 w-3.5" />
                          <span className={cn(
                            "text-xs",
                            viewType === "mobile" && "hidden"
                          )}>
                            {selectedTime ? selectedTime === 'morning' ? 'Mañana' : selectedTime === 'afternoon' ? 'Tarde' : 'Noche' : "Horario"}
                          </span>
                        </Button>

                        <AnimatePresence>
                          {showTimePopup && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className={cn(
                                "absolute right-0 top-10 z-50",
                                "w-[140px] rounded-xl p-2",
                                "shadow-lg",
                                theme === 'dark'
                                  ? "bg-neutral-900 border border-neutral-800"
                                  : "bg-white border border-gray-200"
                              )}
                            >
                              <p className={cn(
                                "text-[10px] font-medium text-center pb-2",
                                theme === 'dark' ? "text-gray-400" : "text-gray-500"
                              )}>
                                Momento del día
                              </p>
                              <div className="space-y-1">
                                {Object.keys(TIME_RANGES).map((time) => (
                                  <button
                                    key={time}
                                    onClick={() => {
                                      setSelectedTime(selectedTime === time ? null : time as TimeOfDay);
                                      setShowTimePopup(false);
                                    }}
                                    className={cn(
                                      "w-full text-xs font-medium rounded-lg px-3 py-1.5",
                                      "transition-all duration-200 ease-in-out",
                                      "relative",
                                      selectedTime === time
                                        ? theme === 'dark'
                                          ? "bg-neutral-800 text-neutral-200"
                                          : "bg-gray-100 text-gray-900"
                                        : theme === 'dark'
                                          ? "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
                                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/50"
                                    )}
                                  >
                                    <span className="flex items-center justify-between">
                                      {time === 'morning' ? 'Mañana' : time === 'afternoon' ? 'Tarde' : 'Noche'}
                                      {selectedTime === time && (
                                        <X 
                                          className={cn(
                                            "h-3 w-3 ml-2",
                                            theme === 'dark' ? "text-neutral-400" : "text-gray-500"
                                          )} 
                                        />
                                      )}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="relative" data-popup="court">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCourtPopup(!showCourtPopup)}
                          className={cn(
                            "h-7 rounded-lg gap-2",
                            "transition-all duration-200 ease-in-out",
                            theme === 'dark' 
                              ? "bg-zinc-800 hover:bg-zinc-700 text-neutral-300 hover:text-neutral-100"
                              : "bg-zinc-300 hover:bg-zinc-400 text-white",
                            showCourtPopup && (
                              theme === 'dark'
                                ? "bg-zinc-700 text-neutral-100"
                                : "bg-zinc-500 text-white"
                            )
                          )}
                        >
                          <Filter className="h-3.5 w-3.5" />
                          <span className={cn(
                            "text-xs",
                            viewType === "mobile" && "hidden"
                          )}>
                            {getCourtTypeLabel(courtFilter)}
                          </span>
                        </Button>

                        <AnimatePresence>
                          {showCourtPopup && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className={cn(
                                "absolute right-0 top-10 z-50",
                                "w-[140px] rounded-xl p-2",
                                "shadow-lg",
                                theme === 'dark'
                                  ? "bg-neutral-900 border border-neutral-800"
                                  : "bg-white border border-gray-200"
                              )}
                            >
                              <p className={cn(
                                "text-[10px] font-medium text-center pb-2",
                                theme === 'dark' ? "text-neutral-400" : "text-gray-500"
                              )}>
                                Tipo de cancha
                              </p>
                              <div className="space-y-1">
                                {courtOptions.map((option) => (
                                  <button
                                    key={option.id}
                                    onClick={() => handleCourtFilterChange(courtFilter === option.id ? 'all' : option.id as 'all' | CourtType)}
                                    className={cn(
                                      "w-full text-xs font-medium rounded-lg px-3 py-1.5",
                                      "transition-all duration-200 ease-in-out",
                                      "relative",
                                      courtFilter === option.id
                                        ? theme === 'dark'
                                          ? "bg-neutral-800 text-neutral-200"
                                          : "bg-gray-100 text-gray-900"
                                        : theme === 'dark'
                                          ? "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
                                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/50"
                                    )}
                                  >
                                    <span className="flex items-center justify-between">
                                      {option.label}
                                      {courtFilter === option.id && (
                                        <X 
                                          className={cn(
                                            "h-3 w-3 ml-2",
                                            theme === 'dark' ? "text-neutral-400" : "text-gray-500"
                                          )} 
                                        />
                                      )}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </div>

                {viewType === "mobile" && (selectedTime || courtFilter !== 'all') && (
                  <div className={cn(
                    "px-5 py-2 flex gap-2 flex-wrap",
                    theme === 'dark' 
                      ? "border-neutral-800" 
                      : "border-gray-200/50"
                  )}>
                    {selectedTime && (
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium",
                        theme === 'dark' 
                          ? "bg-zinc-800 text-neutral-300"
                          : "bg-gray-200 text-gray-700"
                      )}>
                        {selectedTime === 'morning' ? 'Mañana' : selectedTime === 'afternoon' ? 'Tarde' : 'Noche'}
                        <button
                          onClick={() => setSelectedTime(null)}
                          className={cn(
                            "p-0.5 rounded-full",
                            theme === 'dark'
                              ? "hover:bg-zinc-700"
                              : "hover:bg-black/10",
                            "transition-colors duration-200"
                          )}
                        >
                          <X className={cn(
                            "h-3 w-3",
                            theme === 'dark' ? "text-neutral-400" : "text-gray-500"
                          )} />
                        </button>
                      </div>
                    )}

                    {courtFilter !== 'all' && (
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium",
                        theme === 'dark' 
                          ? "bg-zinc-800 text-neutral-300"
                          : "bg-gray-200 text-gray-700"
                      )}>
                        {COURT_TYPES[courtFilter]}
                        <button
                          onClick={() => setCourtFilter('all')}
                          className={cn(
                            "p-0.5 rounded-full",
                            theme === 'dark'
                              ? "hover:bg-zinc-700"
                              : "hover:bg-black/10",
                            "transition-colors duration-200"
                          )}
                        >
                          <X className={cn(
                            "h-3 w-3",
                            theme === 'dark' ? "text-neutral-400" : "text-gray-500"
                          )} />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-4">
                  {renderSlots()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PreviewContainer>
  );
} 