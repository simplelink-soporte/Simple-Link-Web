import { CouponsStepField, CouponsStepSettings } from './types';
import { COUPONS_STEP, DEFAULT_COUPONS_SETTINGS } from './constants';

export function createCouponsField(settings?: Partial<CouponsStepSettings>): CouponsStepField {
  return {
    id: crypto.randomUUID(),
    type: 'coupons',
    label: COUPONS_STEP.label,
    title: "Cupones de Descuento",
    description: "Ingresa un código de descuento si lo tienes",
    required: false,
    settings: {
      ...DEFAULT_COUPONS_SETTINGS,
      ...settings
    }
  };
} 