export interface Court {
  id: string
  name: string
  branch_id: string
  sport: 'padel' | 'tennis' | 'badminton' | 'pickleball' | 'squash'
  court_type: 'indoor' | 'outdoor' | 'covered'
  surface: string
  is_active: boolean
} 