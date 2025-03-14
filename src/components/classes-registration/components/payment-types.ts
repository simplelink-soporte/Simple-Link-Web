// Tipos de pago disponibles
export type PaymentTypeEnum = 'full' | 'deposit' | 'booking' | 'guarantee';

export interface GuaranteeConfig {
  percentage: number;
}

export interface PaymentType {
  id: PaymentTypeEnum;
  name: string;
  description: string;
  icon?: string;
  details?: string[];
  requiresCard?: boolean;
  guaranteeConfig?: GuaranteeConfig;
}

// Lista de tipos de pago disponibles
export const PAYMENT_TYPES: PaymentType[] = [
  {
    id: 'booking',
    name: 'Pago en el Club',
    description: 'Pagar al llegar al club',
    details: ['Realiza el pago directamente en las instalaciones del club']
  },
  {
    id: 'full',
    name: 'Pago Completo',
    description: 'Pagar el monto total de la reserva',
    details: ['Realiza el pago completo ahora y asegura tu reserva inmediatamente']
  },
  {
    id: 'deposit',
    name: 'Pago con Seña',
    description: 'Pagar solo la seña ahora',
    details: ['Paga una seña del 30% ahora y el resto al llegar al club']
  },
  {
    id: 'guarantee',
    name: 'Garantía',
    description: 'Dejar tarjeta como garantía',
    details: [
      'Se solicitarán los datos de tu tarjeta como garantía',
      'No se realizará ningún cargo inmediato',
      'En caso de no presentarse, se realizará un cargo del porcentaje establecido'
    ],
    requiresCard: true,
    guaranteeConfig: {
      percentage: 30
    }
  }
];

// Nombres de opciones de pago a excluir (si es necesario)
export const EXCLUDED_PAYMENT_OPTIONS = [
  'Efectivo',
  'Tarjeta de crédito/débito'
];
