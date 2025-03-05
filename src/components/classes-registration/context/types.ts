import type { ClassPackage, PublicClass, PaymentMethod } from '../types'

export interface RegistrationState {
  step: RegistrationStep
  isAuthenticated: boolean
  isGuest: boolean
  selectedPackage: ClassPackage | null
  selectedClass: PublicClass | null
  selectedSessions: string[]
  selectedPayment: PaymentMethod | null
  isLoading: boolean
  error: string | null
}

export type RegistrationStep = 'auth' | 'package' | 'class' | 'session' | 'payment'

export type RegistrationAction =
  | { type: 'SET_STEP'; payload: RegistrationStep }
  | { type: 'SET_AUTH_STATUS'; payload: { isAuthenticated: boolean; isGuest: boolean } }
  | { type: 'SELECT_PACKAGE'; payload: ClassPackage | null }
  | { type: 'SELECT_CLASS'; payload: PublicClass | null }
  | { type: 'UPDATE_SESSIONS'; payload: string[] }
  | { type: 'SELECT_PAYMENT'; payload: PaymentMethod | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }

export interface RegistrationContextValue {
  state: RegistrationState
  dispatch: React.Dispatch<RegistrationAction>
}
