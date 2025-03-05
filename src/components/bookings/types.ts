import { Court } from '@/types/courts'

export interface Booking {
  id?: string
  courtId: string
  startTime: string
  endTime: string
  date: string
  title?: string
  description?: string
  price?: number
  paymentStatus?: 'pending' | 'partial' | 'completed'
  participants?: string[]
  type?: 'shift' | 'class'
}

export interface TimeSlot {
  hour: string
  subSlots: {
    time: string
    minutes: number
    isAvailable: boolean
  }[]
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

export interface BlockedSlot {
  courtId: string
  startTime: string
  endTime: string
  reason?: string
}

export interface ConfirmationModal {
  isOpen: boolean
  title: string
  description: string
  onConfirm: () => void
  onCancel: () => void
}

export type BookingType = 'shift' | 'class'

// Constantes
export const MAX_VISIBLE_COURTS = 4
export const TIME_COLUMN_WIDTH = 60
export const CELL_HEIGHT = 48
export const SUBSLOT_HEIGHT = CELL_HEIGHT / 4
export const BORDER_WIDTH = 1
export const TIME_INTERVAL = 15
export const SLOTS_PER_HOUR = 4 