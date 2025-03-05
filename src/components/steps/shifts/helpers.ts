import { ShiftsStepField, ShiftsStepSettings } from './types';
import { SHIFTS_STEP, DEFAULT_SHIFTS_SETTINGS } from './constants';

export function createShiftsField(settings?: Partial<ShiftsStepSettings>): ShiftsStepField {
  return {
    id: crypto.randomUUID(),
    type: 'shifts',
    label: SHIFTS_STEP.label,
    title: "Seleccionar Turno",
    description: "Elige el horario que prefieras",
    required: false,
    settings: {
      ...DEFAULT_SHIFTS_SETTINGS,
      ...settings
    }
  };
} 