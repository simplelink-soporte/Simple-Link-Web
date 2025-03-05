import { PaymentMethodEnum, PaymentTypeEnum, PaymentStatusEnum } from './bookings'

export interface Payment {
  id: string;
  booking_id: string;
  deposit_amount: number;
  total_price: number;
  payment_method: PaymentMethodEnum;
  payment_status: PaymentStatusEnum;
  stripe_payment_method_id?: string;
  stripe_account_id?: string;
  charge_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentInsert extends Omit<Payment, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentState {
  method: string | null;
  type: string | null;
  status?: string;
  paymentIntentId?: string;
  selectedPaymentMethod?: PaymentMethod;
  config?: {
    paymentMethodId: string;
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
}

export interface PaymentConfig {
  paymentMethodId: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  type: string;
  name?: string;
  description?: string;
}

export interface BookingPaymentData {
  courtId: string;
  date: string;
  startTime: string;
  endTime: string;
  courtPrice: number;
  rentalItemsPrice: number;
  paymentMethod: PaymentMethodEnum;
  paymentType: PaymentTypeEnum;
  paymentStatus: PaymentStatusEnum;
  depositAmount?: number;
  stripe_payment_intent_id?: string;
  stripe_payment_method_id?: string;
  stripe_customer_id?: string;
  stripe_account_id?: string;
  participants?: Array<BookingParticipant>;
  rentalItems?: Array<RentalItem>;
  empresa_id?: string;
}

export interface BookingParticipant {
  id: string;
  userId: string;
  role: string;
}

export interface RentalItem {
  id: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
}

export interface FullPaymentRequest {
  amount: number;
  stripePaymentMethodId: string;
  stripeAccountId: string;
  stripeCustomerId: string;
  empresaId: string;
  description?: string;
  paymentType?: string;
  metadata?: {
    type: string;
    description: string;
    [key: string]: any;
  };
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  chargeStatus?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface StripePaymentResult {
  success: boolean;
  paymentIntentId?: string;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
} 