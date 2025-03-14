export type PopupView = 'actions' | 'blocking' | 'shift-info' | 'shift-details' | 'shift-payment' | 'rentals'

export interface GuestForm {
  id: string
  fullName: string
  dni: string
  email: string
  phone?: string
}

export interface ConfirmedBooking {
  courtId: string
  startTime: string
  endTime: string
  guests: GuestForm[]
  type: 'shift' | 'class'
  maxParticipants?: number
  isWaitingList?: boolean
  title?: string
  description?: string
  payment: PaymentDetails & {
    timestamp: string
  }
}

export interface PaymentDetails {
  totalAmount: number
  deposit: number
  paymentStatus: PaymentStatusEnum
  paymentMethod: PaymentMethodEnum
  isPaid: boolean
  manualPrice?: number
  courtPrice?: number
}

export interface RentalSelection {
  itemId: string
  quantity: number
  pricePerUnit: number
  totalPrice: number
  duration?: number
}

export interface Selection {
  selections: {
    courtId: string
    startTime: string
    endTime: string
    slots: number
  }[]
  startCourtId: string
  endCourtId: string
  startTime: string
  endTime: string
  slots: number
}

export type SelectionState = Selection | null;

export interface Court {
  id: string
  name: string
  branch_id: string
  sport: string
  court_type: string
  surface: string
  is_active: boolean
}

export type PaymentStatusEnum = 'pending' | 'partial' | 'completed' | 'cancelled'
export type PaymentMethodEnum = 'cash' | 'stripe' | 'transfer' | 'card'
export type PaymentTypeEnum = 'booking' | 'deposit' | 'remaining' | 'guarantee' | 'no_show_charge' | 'full'
export type ParticipantRoleEnum = 'player' | 'guest'
export type ReservationTypeEnum = 'booking' | 'class'

export interface BookingCreationData {
  courtId: string;
  date: string;
  startTime: string;
  endTime: string;
  title?: string;
  description?: string;
  courtPrice: number;
  rentalItemsPrice: number;
  paymentStatus: PaymentStatusEnum;
  paymentMethod: PaymentMethodEnum;
  paymentType: PaymentTypeEnum;
  depositAmount?: number;
  empresa_id?: string;
  participants?: Array<{
    id: string;
    user_id: string;
    role: ParticipantRoleEnum;
  }>;
  rentalItems?: Array<{
    itemId: string;
    quantity: number;
    pricePerUnit: number;
    totalPrice: number;
  }>;
  stripe_payment_method_id?: string;
  reservationType?: ReservationTypeEnum;
  classId?: string;
  classSessionPrice?: number;
}

export interface BookingParticipant {
  id: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: string;
  name?: string;
}

export interface RentalItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  pricePerUnit?: number;
}

export const PAYMENT_METHODS = {
  CARD: 'card',
  CASH: 'cash',
  TRANSFER: 'transfer'
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const;

export interface Booking {
  id: string;
  courtId: string;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  description: string;
  totalPrice: number;
  paymentStatus: PaymentStatusEnum;
  paymentMethod: PaymentMethodEnum;
  depositAmount: number;
  createdAt: string;
  updatedAt: string;
}

export type BookingType = 'simple_shift' | 'recurring' | 'class' | 'tournament';

export interface ClassDetails {
  name: string
  description: string
}

export interface ClassScheduleConfig {
  isRecurring: boolean
  startDate?: Date
  endDate?: Date
  weekDays: number[]
  timeSlots: Array<{
    startTime: string
    endTime: string
  }>
}

export type BookingStep = 
  | 'type'
  | 'court'
  | 'time'
  | 'participants'
  | 'rentals'
  | 'payment'
  | 'confirmation';

interface BookingPopupProps {
  selection: Selection | null
  isOpen: boolean
  onClose: () => void
  onViewChange: (view: PopupView) => void
  onConfirmBooking?: () => void
  shiftTitle?: string
  shiftDescription?: string
  paymentDetails: PaymentDetails
  guests: GuestForm[]
  selectedRentals: RentalSelection[]
}

export interface ExistingBooking {
  id: string
  courtId: string
  startTime: string
  endTime: string
  price: number
  totalAmount: number
  paymentStatus: 'pending' | 'partial' | 'completed'
  guests?: Array<{
    firstName: string
    lastName: string
  }>
  rentalItems?: Array<{
    name: string
    quantity: number
    pricePerUnit: number
  }>
}

export interface StatusHistoryEntry {
  status: PaymentStatusEnum
  date: string
}

export interface Participant {
  id: string;
  memberId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: string;
  name: string;
}

export interface SelectedBooking {
  id: string;
  courtId: string;
  court: string;
  date: string;
  startTime: string;
  endTime: string;
  totalAmount: number;
  depositAmount: number;
  courtPrice: number;
  rentalItemsPrice: number;
  paymentStatus: PaymentStatusEnum;
  paymentMethod: PaymentMethodEnum;
  paymentType: PaymentTypeEnum;
  title: string;
  description: string;
  participants: Array<{
    id: string;
    memberId: string;
    role: string;
    firstName: string;
    lastName: string;
  }>;
  rentedItems: Array<{
    id: string;
    name: string;
    quantity: number;
    pricePerUnit: number;
  }>;
  reservation_type?: ReservationTypeEnum;
  class_id?: string;
  class_session_price?: number;
}

export interface TimeSelection {
  startTime: string
  endTime: string
  duration?: number
}

export interface PaymentConfig {
  paymentMethodId?: string;
}

export interface PaymentMapping {
  type: PaymentTypeEnum;
  defaultMethod: PaymentMethodEnum;
  defaultStatus: PaymentStatusEnum;
}

// Mapeo de tipos de pago a sus configuraciones por defecto
// NOTA: Para 'deposit' y 'guarantee', aunque aquí configuramos valores predeterminados,
// estos son sobrescritos en useSummaryBooking.ts para asegurar que el método de pago
// sea siempre 'card' cuando se utilizan estos tipos.
export const PAYMENT_TYPE_MAPPINGS: Record<PaymentTypeEnum, PaymentMapping> = {
  booking: {
    type: 'booking',
    defaultMethod: 'cash',
    defaultStatus: 'pending'
  },
  deposit: {
    type: 'deposit',
    defaultMethod: 'card', // Siempre debe ser 'card' para procesar el pago parcial
    defaultStatus: 'partial'
  },
  remaining: {
    type: 'remaining',
    defaultMethod: 'cash',
    defaultStatus: 'pending'
  },
  guarantee: {
    type: 'guarantee',
    defaultMethod: 'card', // Siempre debe ser 'card' para guardar la tarjeta como garantía
    defaultStatus: 'pending'
  },
  no_show_charge: {
    type: 'no_show_charge',
    defaultMethod: 'stripe',
    defaultStatus: 'pending'
  },
  full: {
    type: 'full',
    defaultMethod: 'cash',
    defaultStatus: 'pending'
  }
};
