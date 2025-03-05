// Definir los tipos de estado de pago como const enum
export type PaymentStatusEnum = 'pending' | 'partial' | 'completed'
export type PaymentMethodEnum = 'cash' | 'stripe' | 'transfer'

export interface StatusHistoryEntry {
  status: PaymentStatusEnum
  date: string
}

export interface BookingParticipant {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  role?: string;
}

export interface SelectedBooking {
  id: string
  date: string
  startTime: string
  endTime: string
  court: string
  price: number
  totalAmount: number
  participants: BookingParticipant[]
  rentedItems?: {
    name: string
    quantity: number
    pricePerUnit: number
  }[]
  paymentStatus: PaymentStatusEnum
  depositAmount: number
  paymentMethod: PaymentMethodEnum
  statusHistory?: StatusHistoryEntry[]
  title?: string
  description?: string
}

export interface BookingCreationData {
  courtId: string
  date: string
  startTime: string
  endTime: string
  title?: string
  description?: string
  totalPrice: number
  paymentStatus: PaymentStatusEnum
  paymentMethod: PaymentMethodEnum
  depositAmount?: number
  participants?: Array<{
    memberId: string
    role: string
  }>
  rentalItems?: Array<{
    itemId: string
    quantity: number
    pricePerUnit: number
  }>
} 