export type Sport = 'padel' | 'tennis' | 'badminton' | 'pickleball' | 'squash'
export type CourtType = 'indoor' | 'outdoor' | 'covered'
export type SurfaceType = 'crystal' | 'synthetic' | 'clay' | 'grass' | 'rubber' | 'concrete' | 'panoramic' | 'premium'
export type DurationOption = 30 | 45 | 60 | 90 | 120

export interface TimeRange {
  start: string
  end: string
  price: number
}

export interface DayPricing {
  default: number
  timeRanges?: TimeRange[]
}

export interface CourtPricing {
  default: number
  defaultTimeRanges?: TimeRange[]
  byDay?: {
    [key: string]: DayPricing
  }
}

export interface Court {
  id: string
  name: string
  branch_id: string
  sport: 'padel' | 'tennis' | 'badminton' | 'pickleball' | 'squash'
  court_type: 'indoor' | 'outdoor' | 'covered'
  surface: string
  is_active: boolean
  duration_pricing: Record<string, number>
  custom_pricing: Record<string, {
    isSelected: boolean
    timeRanges: Array<{
      endTime: string
      startTime: string
      percentage: number
    }>
  }>
  available_durations: number[]
  created_at?: string
  updated_at?: string
}

export type CreateCourtDTO = {
  name: string
  branch_id: string
  sport: Court['sport']
  court_type: Court['court_type']
  surface: string
  is_active: boolean
  duration_pricing: Record<string, number>
  custom_pricing: Court['custom_pricing']
  available_durations: number[]
} 