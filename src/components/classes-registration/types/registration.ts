import type { ClassPackage, PublicClass, PaymentMethod } from './models'
import type { CompanyLinkSettings } from './settings'

export type Step = 'auth' | 'package' | 'class' | 'session' | 'summary' | 'payment' | 'confirmation' | 'noCredits'
export type AuthView = 'login' | 'register'

export interface RegistrationState {
  currentStep: Step
  authView: AuthView
  isAuthenticated: boolean
  isGuest: boolean
  selectedPackage: ClassPackage | null
  selectedClass: PublicClass | null
  selectedSessions: string[]
  selectedPayment: PaymentMethod | null
  isLoading: boolean
  error: string | null
  settings: CompanyLinkSettings | null
}

export type RegistrationAction =
  | { type: 'SET_STEP'; payload: Step }
  | { type: 'SET_AUTH_VIEW'; payload: AuthView }
  | { type: 'SET_AUTH_STATUS'; payload: { isAuthenticated: boolean; isGuest: boolean } }
  | { type: 'SELECT_PACKAGE'; payload: ClassPackage | null }
  | { type: 'SELECT_CLASS'; payload: PublicClass | null }
  | { type: 'UPDATE_SESSIONS'; payload: string[] }
  | { type: 'SELECT_PAYMENT'; payload: PaymentMethod | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SETTINGS'; payload: CompanyLinkSettings | null }

export interface RegistrationContextValue {
  state: RegistrationState
  dispatch: React.Dispatch<RegistrationAction>
  goToStep: (step: Step) => void
  setAuthView: (view: AuthView) => void
  setAuthStatus: (isAuthenticated: boolean, isGuest: boolean) => void
  selectPackage: (packageId: string | null) => Promise<void>
  selectClass: (classId: string | null, classData?: PublicClass) => Promise<void>
  updateSessions: (sessions: string[]) => void
  selectPayment: (method: PaymentMethod | null) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
} 