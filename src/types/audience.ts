export interface AudienceFilter {
  gender?: 'all' | 'male' | 'female'
  ageRange?: {
    min?: number
    max?: number
  }
  bookingsCount?: {
    min?: number
    max?: number
  }
  lastBooking?: {
    min?: number // días
    max?: number // días
  }
}

export interface TargetAudience {
  type: 'new' | 'recurring' | 'specific'
  filters?: AudienceFilter
  specificUsers?: string[]
} 