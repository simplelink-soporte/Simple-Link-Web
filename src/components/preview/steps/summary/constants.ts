import { CreditCard } from "lucide-react";
import { PaymentMethod, Coupon, PaymentType } from "./types";

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'credit_card',
    name: 'Tarjeta de Crédito',
    icon: CreditCard,
    description: 'Visa, Mastercard, American Express'
  },
  {
    id: 'debit_card',
    name: 'Tarjeta de Débito',
    icon: CreditCard,
    description: 'Todas las tarjetas'
  }
];

export const AVAILABLE_COUPONS: Coupon[] = [
  {
    code: 'WELCOME2024',
    discount: 15,
    type: 'percentage',
    description: 'Descuento para nuevos usuarios'
  },
  {
    code: 'SUMMER',
    discount: 20,
    type: 'percentage',
    description: 'Descuento especial de verano'
  }
];

export const PAYMENT_TYPES: PaymentType[] = [
  {
    id: 'club',
    name: 'Club',
    description: 'Pago en el club',
    details: ['Pago directo en las instalaciones del club']
  },
  {
    id: 'full',
    name: 'Pago completo',
    description: 'Pago total por adelantado',
    details: ['Pago del 100% del valor de la reserva']
  },
  {
    id: 'advance',
    name: 'Pago parcial',
    description: 'Pago parcial por adelantado',
    details: ['Pago del 30% del valor de la reserva']
  },
  {
    id: 'guarantee',
    name: 'Garantía',
    description: 'Tarjeta como garantía',
    details: [
      'Se requiere tarjeta como garantía',
      'No se realizará ningún cargo inmediato',
      'En caso de no presentarse, se cargará el porcentaje establecido'
    ],
    requiresCard: true,
    guaranteeConfig: {
      percentage: 30 // Valor por defecto
    }
  }
]; 