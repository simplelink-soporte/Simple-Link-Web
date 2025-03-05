import { ItemsStepField, ItemsStepSettings } from './types';
import { ITEMS_STEP, DEFAULT_ITEMS_SETTINGS } from './constants';

export function createItemsField(settings?: Partial<ItemsStepSettings>): ItemsStepField {
  return {
    id: crypto.randomUUID(),
    type: 'items',
    label: ITEMS_STEP.label,
    title: "Equipamiento Adicional",
    description: "Selecciona el equipamiento que necesites para tu reserva",
    required: false,
    settings: {
      ...DEFAULT_ITEMS_SETTINGS,
      ...settings
    }
  };
} 