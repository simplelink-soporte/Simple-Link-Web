import { FarewellStepField, FarewellStepSettings } from './types';
import { FAREWELL_STEP, DEFAULT_FAREWELL_SETTINGS } from './constants';

export function createFarewellField(settings?: Partial<FarewellStepSettings>): FarewellStepField {
  return {
    id: crypto.randomUUID(),
    type: 'farewell',
    label: FAREWELL_STEP.label,
    title: "¡Reserva Confirmada!",
    description: "Tu reserva se ha completado exitosamente",
    required: false,
    settings: {
      ...DEFAULT_FAREWELL_SETTINGS,
      ...settings
    }
  };
} 