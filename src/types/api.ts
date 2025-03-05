import { PaymentMethodEnum, PaymentStatusEnum, PaymentTypeEnum } from '@/types/bookings';

// Tipos para el endpoint de cargo por no-show
export interface NoShowChargeRequest {
  bookingId: string;
  amount: number;
  stripeAccountId: string;
  reason?: string;
  empresaId: string;
  stripePaymentMethodId: string;
}

export interface NoShowChargeResponse {
  success: boolean;
  data?: {
    booking_id: string;
    cancelled_at: string;
    payment_id?: string;
    payment_status?: string;
    charge_status?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface NoShowChargeError {
  type: string;
  code: string;
  message: string;
  decline_code?: string;
}

export interface BookingCreationData {
  courtId: string;
  date: string;
  startTime: string;
  endTime: string;
  courtPrice: number;
  rentalItemsPrice: number;
  paymentMethod: PaymentMethodEnum;
  paymentStatus: PaymentStatusEnum;
  paymentType: PaymentTypeEnum;
  depositAmount?: number;
  title?: string;
  description?: string;
  participants?: Array<{
    id: string;
    userId: string;
    role: string;
  }>;
  rentalItems?: Array<{
    itemId: string;
    quantity: number;
    pricePerUnit: number;
    totalPrice: number;
  }>;
  empresa_id?: string;
  stripe_payment_method_id?: string;
}

export interface PaymentServiceError {
  code: string;
  message: string;
  details?: any;
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  chargeStatus?: string;
  error?: PaymentServiceError;
}