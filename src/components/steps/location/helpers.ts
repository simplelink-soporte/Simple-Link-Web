import { LocationStepField, LocationStepSettings } from './types';
import { LOCATION_STEP, DEFAULT_LOCATION_SETTINGS } from './constants';

export function createLocationField(settings?: Partial<LocationStepSettings>): LocationStepField {
  return {
    id: crypto.randomUUID(),
    type: 'location',
    label: LOCATION_STEP.label,
    title: "Seleccionar Sucursal",
    description: "Elige la sucursal más cercana a tu ubicación",
    required: false,
    settings: {
      ...DEFAULT_LOCATION_SETTINGS,
      ...settings
    }
  };
} 