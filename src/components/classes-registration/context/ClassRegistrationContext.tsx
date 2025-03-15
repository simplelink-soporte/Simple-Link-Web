"use client"

import { createContext, useContext, useReducer, useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useClasses } from '../hooks/useClasses'
import { ClientOrganizationProvider, useClientOrganizationContext } from '@/contexts/ClientOrganizationContext'
import type { Organization as OrganizationFromDB, PublicClass, ClassPackage, UserPackageFromDB, ClassSession, PaymentMethod } from '../types/models'
import type { ClassRegistrationError } from '../types/error'
import type { AuthView } from '../types/registration'
import type { ReactNode } from 'react'
import type { Database } from '@/types/supabase'
import { vinculacionService } from '@/services/vinculacionService'
import { useBookingCount } from '@/hooks/useBookingCount'

// Definir el tipo AuthUser localmente basado en nuestro sistema
interface AuthUser {
  id: string
  email: string
  role: string
  metadata: {
    name?: string
    [key: string]: any
  }
}

type EmpresaRow = Database['public']['Tables']['empresas']['Row']

export type Step = 'auth' | 'package' | 'class' | 'session' | 'summary' | 'payment' | 'confirmation' | 'noCredits'

interface RegistrationState {
  step: Step
  authView: AuthView
  isAuthenticated: boolean
  isGuest: boolean
  selectedClass: PublicClass | null
  selectedPackage: ClassPackage | null
  userPackages: UserPackageFromDB[]
  authError: ClassRegistrationError | null
  error: ClassRegistrationError | null
  selectedSessions: string[]
  skipPackageSelection: boolean
  bookingIds: string[]
  bookingStatus: 'idle' | 'submitting' | 'success' | 'error'
  bookingError: string | null
  selectedPayment: PaymentMethod | null
}

type RegistrationAction =
  | { type: 'SET_STEP'; payload: Step }
  | { type: 'SET_AUTH_VIEW'; payload: AuthView }
  | { type: 'SET_AUTH_STATUS'; payload: { isAuthenticated: boolean; isGuest: boolean } }
  | { type: 'SET_SELECTED_CLASS'; payload: PublicClass | null }
  | { type: 'SET_SELECTED_PACKAGE'; payload: ClassPackage | null }
  | { type: 'SET_USER_PACKAGES'; payload: UserPackageFromDB[] }
  | { type: 'SET_AUTH_ERROR'; payload: ClassRegistrationError }
  | { type: 'SET_ERROR'; payload: ClassRegistrationError | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SELECT_SESSION'; payload: string }
  | { type: 'DESELECT_SESSION'; payload: string }
  | { type: 'SET_SKIP_PACKAGE'; payload: boolean }
  | { type: 'SET_BOOKING_IDS'; payload: string[] }
  | { type: 'SET_BOOKING_STATUS'; payload: 'idle' | 'submitting' | 'success' | 'error' }
  | { type: 'SET_BOOKING_ERROR'; payload: string | null }
  | { type: 'SELECT_PAYMENT'; payload: PaymentMethod | null }

interface ClassRegistrationContextType {
  state: RegistrationState
  dispatch: React.Dispatch<RegistrationAction>
  organization: EmpresaRow | null
  isLoading: boolean
  setAuthView: (view: AuthView) => void
  goToStep: (step: Step) => void
  selectClass: (classData: PublicClass) => void
  selectSession: (sessionId: string) => void
  deselectSession: (sessionId: string) => void
  selectPayment: (method: PaymentMethod | null) => void
  empresaId: string
  user: AuthUser | null
  updateState: (action: RegistrationAction) => void
}

const initialState: RegistrationState = {
  step: 'auth',
  authView: 'login',
  isAuthenticated: false,
  isGuest: false,
  selectedClass: null,
  selectedPackage: null,
  userPackages: [],
  authError: null,
  error: null,
  selectedSessions: [],
  skipPackageSelection: false,
  bookingIds: [],
  bookingStatus: 'idle',
  bookingError: null,
  selectedPayment: null
}

function registrationReducer(state: RegistrationState, action: RegistrationAction): RegistrationState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.payload }
    case 'SET_AUTH_VIEW':
      return { ...state, authView: action.payload }
    case 'SET_AUTH_STATUS':
      return { 
        ...state, 
        isAuthenticated: action.payload.isAuthenticated,
        isGuest: action.payload.isGuest,
        step: action.payload.isAuthenticated ? 'package' : state.step
      }
    case 'SET_SELECTED_CLASS':
      return { ...state, selectedClass: action.payload }
    case 'SET_SELECTED_PACKAGE':
      return { ...state, selectedPackage: action.payload }
    case 'SET_USER_PACKAGES':
      return { ...state, userPackages: action.payload }
    case 'SET_AUTH_ERROR':
      return { ...state, authError: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'CLEAR_ERROR':
      return { ...state, error: null, authError: null }
    case 'SELECT_SESSION':
      return {
        ...state,
        selectedSessions: [...state.selectedSessions, action.payload]
      }
    case 'DESELECT_SESSION':
      return {
        ...state,
        selectedSessions: state.selectedSessions.filter(id => id !== action.payload)
      }
    case 'SET_SKIP_PACKAGE':
      return { ...state, skipPackageSelection: action.payload }
    case 'SET_BOOKING_IDS':
      return { ...state, bookingIds: action.payload }
    case 'SET_BOOKING_STATUS':
      return { ...state, bookingStatus: action.payload }
    case 'SET_BOOKING_ERROR':
      return { ...state, bookingError: action.payload }
    case 'SELECT_PAYMENT':
      return { ...state, selectedPayment: action.payload }
    default:
      return state
  }
}

const ClassRegistrationContext = createContext<ClassRegistrationContextType | undefined>(undefined)

interface ClassRegistrationProviderProps {
  children: ReactNode
  empresaId: string
}

function ClientSideProvider({ children, empresaId }: ClassRegistrationProviderProps) {
  const router = useRouter()
  const { user, isLoading: isLoadingAuth } = useAuth()
  const { organization, isLoading: orgLoading } = useClientOrganizationContext()
  const [state, dispatch] = useReducer(registrationReducer, initialState)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [isCheckingVinculacion, setIsCheckingVinculacion] = useState(false)
  const [hasCheckedVinculacion, setHasCheckedVinculacion] = useState(false)

  // Verificar créditos disponibles
  const { canMakeBooking, remainingBookings, isPro, isLoading: isLoadingBookingCount } = useBookingCount({ 
    empresaId: organization?.id || '', 
    date: new Date().toISOString().split('T')[0],
    enabled: !!organization?.id
  })

  // Verificar vinculación cuando el usuario está autenticado
  useEffect(() => {
    if (!user?.id || !organization?.id || hasCheckedVinculacion || isCheckingVinculacion) {
      return
    }

    const userId = user.id
    const realEmpresaId = organization.id

    async function checkVinculacion() {
      setIsCheckingVinculacion(true)
      try {
        // Intentar obtener la vinculación existente
        const vinculacion = await vinculacionService.getVinculacion(userId, realEmpresaId)
        
        // Si no existe vinculación, crearla
        if (!vinculacion) {
          await vinculacionService.createVinculacion(userId, realEmpresaId)
        }
      } catch (error) {
        console.error('Error al verificar/crear vinculación:', error)
      } finally {
        setIsCheckingVinculacion(false)
        setHasCheckedVinculacion(true)
      }
    }

    checkVinculacion()
  }, [user?.id, organization?.id, hasCheckedVinculacion, isCheckingVinculacion])

  // Resetear el estado de verificación cuando cambia el usuario o la empresa
  useEffect(() => {
    setHasCheckedVinculacion(false)
  }, [user?.id, organization?.id])

  // Modificamos el efecto de inicialización para mantener el paso inicial
  useEffect(() => {
    if (!isLoadingAuth && !isLoadingBookingCount && !hasInitialized) {
      // Actualizamos el estado de autenticación
      dispatch({
        type: 'SET_AUTH_STATUS',
        payload: { 
          isAuthenticated: !!user, 
          isGuest: false 
        }
      })

      // Solo cambiamos el paso si el usuario está autenticado
      if (user) {
        // Si es PRO o tiene créditos disponibles, permitimos el acceso
        if (isPro || remainingBookings > 0) {
          // Iniciamos en el paso de paquetes por defecto
          dispatch({ type: 'SET_STEP', payload: 'package' })
        } else {
          // Solo mostramos noCredits si NO es PRO y NO tiene créditos
          dispatch({ type: 'SET_STEP', payload: 'noCredits' })
        }
      }
      
      setHasInitialized(true)
    }
  }, [isLoadingAuth, isLoadingBookingCount, user, hasInitialized, isPro, remainingBookings])

  // Efecto para mantener el estado cuando cambiamos de URL
  useEffect(() => {
    if (organization && !isLoadingAuth && !isLoadingBookingCount && hasInitialized) {
      // Si es PRO o tiene créditos disponibles, permitimos el acceso
      if (isPro || remainingBookings > 0) {
        if (state.step === 'auth' && state.isAuthenticated) {
          dispatch({ type: 'SET_STEP', payload: 'class' })
        }
      } else {
        // Solo mostramos noCredits si NO es PRO y NO tiene créditos
        dispatch({ type: 'SET_STEP', payload: 'noCredits' })
      }
    }
  }, [organization, isLoadingAuth, isLoadingBookingCount, state.step, state.isAuthenticated, hasInitialized, isPro, remainingBookings])

  // Agregamos un efecto para manejar cambios en el estado PRO o créditos
  useEffect(() => {
    if (hasInitialized && organization && !isLoadingBookingCount) {
      // Si la empresa se convierte en PRO o recupera créditos, salimos del paso noCredits
      if ((isPro || remainingBookings > 0) && state.step === 'noCredits') {
        dispatch({ type: 'SET_STEP', payload: 'package' })
      }
    }
  }, [isPro, remainingBookings, hasInitialized, organization, state.step, isLoadingBookingCount])

  // Memoizamos el valor de isLoading
  const isLoadingValue = useMemo(() => {
    return isLoadingAuth || (orgLoading && !organization) || isCheckingVinculacion || isLoadingBookingCount
  }, [isLoadingAuth, orgLoading, organization, isCheckingVinculacion, isLoadingBookingCount])

  const setAuthView = useCallback((view: AuthView) => {
    dispatch({ type: 'SET_AUTH_VIEW', payload: view })
  }, [])

  const goToStep = useCallback((step: Step) => {
    dispatch({ type: 'SET_STEP', payload: step })
  }, [])

  const selectClass = useCallback((classData: PublicClass) => {
    console.log('Datos de la clase recibidos:', classData)
    
    // Usar las sesiones generadas por el servicio
    if (classData.sessions && classData.sessions.length > 0) {
      dispatch({ type: 'SET_SELECTED_CLASS', payload: classData })
      return
    }

    // Si no hay sesiones, generarlas (este es el caso de fallback)
    const sessions: ClassSession[] = []
    const { days, timeSlots } = classData.schedule

    days.forEach(day => {
      timeSlots.forEach(slot => {
        const session: ClassSession = {
          id: `${classData.id}-${day}-${slot.startTime}`,
          date: classData.schedule.startDate,
          startTime: slot.startTime,
          endTime: slot.endTime,
          spotsLeft: slot.spotsLeft,
          totalSpots: slot.capacity,
          courts: classData.courts.filter(court => slot.courtIds.includes(court.id)),
          instructor: slot.instructors[0] || classData.instructor || 'Sin instructor',
          price: slot.price,
          selected: false
        }
        sessions.push(session)
      })
    })

    const classWithSessions: PublicClass = {
      ...classData,
      sessions
    }

    console.log('Clase con sesiones generadas:', classWithSessions)
    dispatch({ type: 'SET_SELECTED_CLASS', payload: classWithSessions })
  }, [])

  const selectSession = useCallback((sessionId: string) => {
    dispatch({ type: 'SELECT_SESSION', payload: sessionId })
  }, [])

  const deselectSession = useCallback((sessionId: string) => {
    dispatch({ type: 'DESELECT_SESSION', payload: sessionId })
  }, [])

  const selectPayment = useCallback((method: PaymentMethod | null) => {
    dispatch({ type: 'SELECT_PAYMENT', payload: method })
  }, [dispatch])

  // Envoltorio conveniente para actualizar el estado
  const updateState = useCallback((action: RegistrationAction) => {
    dispatch(action);
  }, []);

  const value = {
    state,
    dispatch,
    organization,
    isLoading: isLoadingValue,
    setAuthView,
    goToStep,
    selectClass,
    selectSession,
    deselectSession,
    selectPayment,
    empresaId,
    user,
    updateState
  }

  // Memoizamos el valor del contexto para evitar recreaciones innecesarias
  const contextValue = useMemo(() => value, [value])

  // Solo renderizamos el contenido cuando la inicialización está completa
  if (!hasInitialized || isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Cargando...</div>
      </div>
    )
  }

  return (
    <ClassRegistrationContext.Provider value={contextValue}>
      {children}
    </ClassRegistrationContext.Provider>
  )
}

export function ClassRegistrationProvider({ children, empresaId }: ClassRegistrationProviderProps) {
  return (
    <ClientOrganizationProvider empresaId={empresaId}>
      <ClientSideProvider empresaId={empresaId}>
        {children}
      </ClientSideProvider>
    </ClientOrganizationProvider>
  )
}

export function useClassRegistration() {
  const context = useContext(ClassRegistrationContext)
  if (context === undefined) {
    throw new Error('useClassRegistration debe ser usado dentro de un ClassRegistrationProvider')
  }
  return context
} 