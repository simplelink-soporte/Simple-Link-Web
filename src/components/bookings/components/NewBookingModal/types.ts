import type { RentalSelection } from '@/types/items'

export type BookingType = 'simple_shift' | 'class';

export type PaymentMethodEnum = 'cash' | 'card' | 'transfer' | 'stripe';
export type PaymentStatusEnum = 'completed' | 'partial' | 'pending' | 'cancelled';

export interface PaymentDetails {
  totalAmount: number;
  deposit: number;
  courtPrice: number;
  rentalItemsPrice: number;
  paymentStatus: PaymentStatusEnum;
  paymentMethod: PaymentMethodEnum;
  isPaid: boolean;
  manualPrice?: number;
}

export interface TimeSelection {
  startTime: string;
  endTime: string;
  duration?: number;
}

export interface BookingParticipant {
  id: string;
  userId?: string;
  name: string;
  lastName?: string;
  email?: string;
  role: ParticipantRoleEnum;
  fullName?: string;
}

export type ParticipantRoleEnum = 'player' | 'instructor';

export type BookingStep = 
  | 'participants'
  | 'rentals'
  | 'payment'
  | 'confirmation'
  | 'congrats'
  | 'class-details'
  | 'class-schedule'
  | 'noCredits';

export interface ClassDetails {
  name: string
  description: string
  visibility: 'public' | 'private'
  branch_id?: string
}

export interface ClassPaymentConfig {
  paymentMethods: string[]
  currency: string
  paymentStatus: string
}

export interface TimeSlot {
  startTime: string
  endTime: string
  price: number
  capacity: number
  instructors: string[]
  courtIds: string[]
}

export interface ScheduleConfig {
  startDate: Date
  endDate?: Date
  isRecurring: boolean
  weekDays: number[]
  timeSlots: TimeSlot[]
}

export interface BookingState {
  currentStep: BookingStep
  selectedBookingType: BookingType
  selectedDate: Date | null
  selectedCourts: string[]
  timeSelection: TimeSelection | null
  participants: BookingParticipant[]
  rentals: RentalSelection[]
  paymentDetails: PaymentDetails | null
  classDetails: ClassDetails
  classPaymentConfig: ClassPaymentConfig
  scheduleConfig: ScheduleConfig
} 