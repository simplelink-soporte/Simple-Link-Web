import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { FormStepField } from "@/types/form-steps";
import { PreviewContainer } from "../../layout/PreviewContainer";
import { Button } from "@/components/ui/button";
import { ChevronRight, Clock, ChevronLeft, Check, Filter, Sun, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { format, addDays, isSameDay, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, startOfDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { NavigationControls } from "../../layout/NavigationControls";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useAvailability } from '@/hooks/useAvailability';
import { AvailabilitySlot } from '@/types/availability';
import { DURATIONS, COURT_TYPES, TIME_RANGES } from '@/config/availability';
import { useForm } from "@/contexts/FormContext";
import { MobileNavigation } from "../../layout/MobileNavigation";
import { MobileNextButton } from "../../layout/MobileNextButton";
import { MobileShiftsPreview } from './mobile/MobileShiftsPreview';
import { DesktopShiftsPreview } from './desktop/DesktopShiftsPreview';
import { ShiftsPreviewProps } from './types';

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

export function ShiftsPreview(props: ShiftsPreviewProps) {
  const { viewType } = props;
  
  // Renderizar el componente adecuado según el tipo de vista
  return viewType === 'mobile' 
    ? <MobileShiftsPreview {...props} /> 
    : <DesktopShiftsPreview {...props} />;
} 