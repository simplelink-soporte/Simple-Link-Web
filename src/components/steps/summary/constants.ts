import { ClipboardList } from 'lucide-react';
import { SummaryStepSettings, PaymentType } from './types';

export const PAYMENT_TYPE_TOOLTIPS: Record<PaymentType, string> = {
  club: 'El cliente podrá realizar el pago directamente en las instalaciones del club.',
  full: 'Se requiere el pago completo por adelantado para confirmar la reserva.',
  advance: 'El cliente paga un porcentaje como anticipo y el resto al llegar al club.',
  guarantee: 'Se solicitan datos de tarjeta como garantía sin realizar cargo.'
};

export const DEFAULT_PAYMENT_TYPES: Record<PaymentType, boolean> = {
  club: false,
  full: false,
  advance: false,
  guarantee: false,
};

export const SUMMARY_STEP = {
  id: 'summary',
  type: 'summary',
  icon: ClipboardList,
  label: 'Pago',
  title: 'Configuración de Pago',
  description: 'Personaliza las opciones de pago y visualización',
  required: true,
  settings: {
    isActive: true,
    showCoupons: true,
    paymentTypes: DEFAULT_PAYMENT_TYPES,
    sections: {
      payment: true
    }
  }
} as const; 