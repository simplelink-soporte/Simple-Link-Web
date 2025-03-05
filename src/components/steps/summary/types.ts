export type PaymentType = 'club' | 'full' | 'advance' | 'guarantee';

export interface SummaryStepSettings {
  isActive: boolean;
  showCoupons: boolean;
  paymentTypes: Record<PaymentType, boolean>;
  sections: {
    payment: boolean;
  };
}

export interface SummaryStepField {
  id: string;
  type: 'summary';
  label: string;
  title: string;
  description: string;
  required: boolean;
  settings: SummaryStepSettings;
} 