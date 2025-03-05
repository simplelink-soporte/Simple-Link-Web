import { Clock } from 'lucide-react';
import { ShiftsStepSettings } from './types';

export const SHIFTS_STEP = {
  id: "shifts",
  label: "Turnos",
  icon: Clock,
  description: "Horarios disponibles",
  tooltip: "Permite seleccionar los horarios disponibles"
} as const;

export const DEFAULT_SHIFTS_SETTINGS: ShiftsStepSettings = {
  isActive: true,
  showFullCalendar: true,
  showTimeSlots: true,
  showDuration: true,
  showCapacity: true,
  showPrice: true,
  allowMultipleSlots: false,
  minDuration: {
    value: 60,
    unit: 'minutes'
  },
  maxDuration: {
    value: 120,
    unit: 'minutes'
  },
  allowDurationChange: true,
  showAvailability: true
}; 