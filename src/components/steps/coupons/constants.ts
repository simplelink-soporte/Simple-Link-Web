import { Ticket } from 'lucide-react';
import { CouponsStepSettings } from './types';

export const COUPONS_STEP = {
  id: "coupons",
  label: "Cupones",
  icon: Ticket,
  description: "Códigos de descuento",
  tooltip: "Permite ingresar códigos de descuento o promociones especiales"
} as const;

export const DEFAULT_COUPONS_SETTINGS: CouponsStepSettings = {
  isActive: true,
  showTitle: true,
  showDescription: true,
  showValidityPeriod: true,
  showDiscountAmount: true,
  validateOnEnter: true,
  allowMultiple: false,
  maxAttempts: 3,
  showTerms: true,
  showRemainingUses: true,
  showExpiration: true,
  requireAuthentication: false
}; 