export interface CouponsStepSettings {
  isActive: boolean;
  showTitle: boolean;
  showDescription: boolean;
  showValidityPeriod: boolean;
  showDiscountAmount: boolean;
  validateOnEnter: boolean;
  allowMultiple: boolean;
  maxAttempts: number;
  showTerms: boolean;
  showRemainingUses: boolean;
  showExpiration: boolean;
  requireAuthentication: boolean;
}

export interface CouponsStepField {
  id: string;
  type: 'coupons';
  label: string;
  title: string;
  description: string;
  required: boolean;
  settings: CouponsStepSettings;
} 