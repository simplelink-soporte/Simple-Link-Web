'use client';

import React, { createContext, useContext, useReducer, ReactNode, useCallback, useState, useEffect } from 'react';
import { PublishedForm } from '@/types/forms/publish';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { vinculacionService } from '@/services/vinculacionService';
import { ClientOrganizationProvider, useClientOrganizationContext } from '@/contexts/ClientOrganizationContext';

// Tipos para la autenticación
export type AuthView = 'login' | 'register';

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

// Tipos para el estado del formulario de turnos
export type ShiftFormStep = 'auth' | 'location' | 'shifts' | 'items' | 'summary' | 'confirmation';

interface ShiftFormState {
  currentStep: number;
  step: ShiftFormStep;
  authView: AuthView;
  isAuthenticated: boolean;
  isGuest: boolean;
  selectedLocation: string | null;
  selectedShift: string | null;
  duration: number;
  lastDurationChangeTimestamp: number | null;
  // Información completa del turno seleccionado
  shiftDetails: {
    startTime: string;
    endTime: string;
    courtId: string;
    courtName: string;
    price: number;
    date: string; // Fecha del turno
  } | null;
  selectedItems: Record<string, number>;
  itemsTotalPrice: number;
  skipItemsStep: boolean;
  availablePaymentMethods: string[];
  paymentPercentages: Record<string, number>;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    [key: string]: any;
  } | null;
  bookingId: string | null;
  error: Error | null;
  authError: Error | null;
  bookingStatus: 'idle' | 'submitting' | 'success' | 'error';
  authChecked: boolean; // Nueva bandera para verificar si la autenticación ya fue comprobada
}

// Acciones que pueden ser despachadas al reducer
type ShiftFormAction =
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'GO_TO_STEP'; payload: number }
  | { type: 'SET_STEP'; payload: ShiftFormStep }
  | { type: 'SET_IS_AUTHENTICATED'; payload: boolean }
  | { type: 'SET_IS_GUEST'; payload: boolean }
  | { type: 'SET_AUTH_STATUS'; payload: { isAuthenticated: boolean; isGuest: boolean } }
  | { type: 'SET_AUTH_VIEW'; payload: AuthView }
  | { type: 'SET_CUSTOMER_INFO'; payload: ShiftFormState['customerInfo'] }
  | { type: 'SELECT_LOCATION'; payload: string }
  | { type: 'SELECT_SHIFT'; payload: string }
  | { type: 'SET_DURATION'; payload: number }
  | { type: 'SET_DURATION_CHANGE_TIMESTAMP'; payload: number }
  | { type: 'SET_SHIFT_DETAILS'; payload: ShiftFormState['shiftDetails'] }
  | { type: 'SET_SELECTED_ITEMS'; payload: Record<string, number> }
  | { type: 'SET_ITEMS_TOTAL_PRICE'; payload: number }
  | { type: 'SET_SKIP_ITEMS_STEP'; payload: boolean }
  | { type: 'SET_AVAILABLE_PAYMENT_METHODS'; payload: string[] }
  | { type: 'SET_PAYMENT_PERCENTAGES'; payload: Record<string, number> }
  | { type: 'SET_BOOKING_ID'; payload: string }
  | { type: 'SET_BOOKING_STATUS'; payload: ShiftFormState['bookingStatus'] }
  | { type: 'SET_ERROR'; payload: Error | null }
  | { type: 'SET_AUTH_ERROR'; payload: Error | null }
  | { type: 'SET_AUTH_CHECKED'; payload: boolean }
  | { type: 'RESET_FORM' };

// Estado inicial para el contexto
const initialState: ShiftFormState = {
  currentStep: 0,
  step: 'location', // Comenzar en el paso de ubicación
  authView: 'login',
  isAuthenticated: false,
  isGuest: false,
  selectedLocation: null,
  selectedShift: null,
  duration: 1,
  lastDurationChangeTimestamp: null,
  shiftDetails: null,
  selectedItems: {},
  itemsTotalPrice: 0,
  skipItemsStep: false,
  availablePaymentMethods: ['local'],
  paymentPercentages: {},
  customerInfo: null,
  bookingId: null,
  error: null,
  authError: null,
  bookingStatus: 'idle',
  authChecked: false
};

// Reducer para gestionar el estado del formulario
const shiftFormReducer = (state: ShiftFormState, action: ShiftFormAction): ShiftFormState => {
  switch (action.type) {
    case 'NEXT_STEP':
      return { ...state, currentStep: state.currentStep + 1 };
    case 'PREV_STEP':
      return { ...state, currentStep: state.currentStep - 1 };
    case 'GO_TO_STEP':
      return { ...state, currentStep: action.payload };
    case 'SET_STEP':
      return { ...state, step: action.payload };
    case 'SET_IS_AUTHENTICATED':
      return { ...state, isAuthenticated: action.payload };
    case 'SET_IS_GUEST':
      return { ...state, isGuest: action.payload };
    case 'SET_AUTH_STATUS':
      return { ...state, isAuthenticated: action.payload.isAuthenticated, isGuest: action.payload.isGuest };
    case 'SET_AUTH_VIEW':
      return { ...state, authView: action.payload };
    case 'SET_CUSTOMER_INFO':
      return { ...state, customerInfo: action.payload };
    case 'SELECT_LOCATION':
      return { ...state, selectedLocation: action.payload };
    case 'SELECT_SHIFT':
      return { ...state, selectedShift: action.payload };
    case 'SET_DURATION':
      return { ...state, duration: action.payload };
    case 'SET_DURATION_CHANGE_TIMESTAMP':
      return { ...state, lastDurationChangeTimestamp: action.payload };
    case 'SET_SHIFT_DETAILS':
      return { ...state, shiftDetails: action.payload };
    case 'SET_SELECTED_ITEMS':
      return { ...state, selectedItems: action.payload };
    case 'SET_ITEMS_TOTAL_PRICE':
      return { ...state, itemsTotalPrice: action.payload };
    case 'SET_SKIP_ITEMS_STEP':
      return { ...state, skipItemsStep: action.payload };
    case 'SET_AVAILABLE_PAYMENT_METHODS':
      return { ...state, availablePaymentMethods: action.payload };
    case 'SET_PAYMENT_PERCENTAGES':
      return { ...state, paymentPercentages: action.payload };
    case 'SET_BOOKING_ID':
      return { ...state, bookingId: action.payload };
    case 'SET_BOOKING_STATUS':
      return { ...state, bookingStatus: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_AUTH_ERROR':
      return { ...state, authError: action.payload };
    case 'SET_AUTH_CHECKED':
      return { ...state, authChecked: action.payload };
    case 'RESET_FORM':
      return { ...initialState };
    default:
      return state;
  }
};

// Interfaz para el contexto
interface ShiftFormContextProps {
  state: ShiftFormState;
  dispatch: React.Dispatch<ShiftFormAction>;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  setStep: (step: ShiftFormStep) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  setIsGuest: (isGuest: boolean) => void;
  setAuthView: (view: AuthView) => void;
  setCustomerInfo: (info: ShiftFormState['customerInfo']) => void;
  selectLocation: (locationId: string) => void;
  selectShift: (shiftId: string) => void;
  setDuration: (duration: number) => void;
  setShiftDetails: (details: ShiftFormState['shiftDetails']) => void;
  setSelectedItems: (items: Record<string, number>) => void;
  setItemsTotalPrice: (price: number) => void;
  setSkipItemsStep: (skip: boolean) => void;
  setAvailablePaymentMethods: (methods: string[]) => void;
  setPaymentPercentages: (percentages: Record<string, number>) => void;
  setBookingId: (id: string) => void;
  setBookingStatus: (status: ShiftFormState['bookingStatus']) => void;
  setError: (error: Error | null) => void;
  setAuthError: (error: Error | null) => void;
  setAuthChecked: (checked: boolean) => void;
  resetForm: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    name: string;
    email: string;
    password: string;
    passwordConfirmation: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  continueAsGuest: () => void;
}

// Crear el contexto
const ShiftFormContext = createContext<ShiftFormContextProps | undefined>(undefined);

// Props para el proveedor
interface ShiftFormProviderProps {
  children: ReactNode;
  formData: PublishedForm | null;
  empresaId: string;
  availablePaymentMethods?: string[];
}

// Proveedor interno (client-side)
function ClientSideShiftProvider({ children, formData, empresaId, availablePaymentMethods = ['local'] }: ShiftFormProviderProps) {
  const router = useRouter();
  const { user, isLoading: isLoadingAuth } = useAuth();
  const { organization, isLoading: orgLoading } = useClientOrganizationContext();
  const [state, dispatch] = useReducer(shiftFormReducer, initialState);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isCheckingVinculacion, setIsCheckingVinculacion] = useState(false);
  const [hasCheckedVinculacion, setHasCheckedVinculacion] = useState(false);

  // Verificar vinculación cuando el usuario está autenticado
  useEffect(() => {
    // Usar el empresaId que se pasa directamente al contexto en lugar de organization?.id
    if (!user?.id || !empresaId || hasCheckedVinculacion || isCheckingVinculacion) {
      return;
    }

    const userId = user.id;
    // Usar el empresaId directamente en lugar de organization.id
    const realEmpresaId = empresaId;

    console.log('ShiftFormContext: Verificando vinculación para usuario:', userId, 'y empresa:', realEmpresaId);

    async function checkVinculacion() {
      setIsCheckingVinculacion(true);
      try {
        // Intentar obtener la vinculación existente
        const vinculacion = await vinculacionService.getVinculacion(userId, realEmpresaId);
        
        // Si no existe vinculación, crearla
        if (!vinculacion) {
          console.log('ShiftFormContext: Creando nueva vinculación entre usuario y empresa');
          await vinculacionService.createVinculacion(userId, realEmpresaId);
        } else {
          console.log('ShiftFormContext: Vinculación existente encontrada');
        }
      } catch (error) {
        console.error('Error al verificar/crear vinculación:', error);
      } finally {
        setIsCheckingVinculacion(false);
        setHasCheckedVinculacion(true);
      }
    }

    checkVinculacion();
  }, [user?.id, empresaId, hasCheckedVinculacion, isCheckingVinculacion]);

  // Resetear el estado de verificación cuando cambia el usuario o la empresa
  useEffect(() => {
    setHasCheckedVinculacion(false);
  }, [user?.id, empresaId]);

  // Inicializar el estado de autenticación
  useEffect(() => {
    if (!isLoadingAuth && !hasInitialized) {
      // Actualizamos el estado de autenticación
      dispatch({
        type: 'SET_IS_AUTHENTICATED',
        payload: !!user
      });
      
      dispatch({
        type: 'SET_IS_GUEST',
        payload: false
      });

      // Solo cambiamos el paso si el usuario está autenticado
      if (user) {
        dispatch({ type: 'SET_STEP', payload: 'location' });
      }
      
      setHasInitialized(true);
    }
  }, [isLoadingAuth, user, hasInitialized]);

  // Redirigir si el usuario ya está autenticado
  useEffect(() => {
    if (organization && !isLoadingAuth && hasInitialized) {
      if (state.step === 'auth' && state.isAuthenticated) {
        dispatch({ type: 'SET_STEP', payload: 'location' });
      }
    }
  }, [organization, isLoadingAuth, state.step, state.isAuthenticated, hasInitialized]);

  // Acciones de navegación
  const nextStep = useCallback(() => {
    dispatch({ type: 'NEXT_STEP' });
  }, [dispatch]);

  const prevStep = useCallback(() => {
    dispatch({ type: 'PREV_STEP' });
  }, [dispatch]);

  const goToStep = useCallback((step: number) => {
    dispatch({ type: 'GO_TO_STEP', payload: step });
  }, [dispatch]);

  const setStep = useCallback((step: ShiftFormStep) => {
    dispatch({ type: 'SET_STEP', payload: step });
  }, [dispatch]);

  // Funciones para interactuar con el formulario
  const selectLocation = useCallback((locationId: string) => {
    dispatch({ type: 'SELECT_LOCATION', payload: locationId });
  }, [dispatch]);

  const selectShift = useCallback((shiftId: string) => {
    dispatch({ type: 'SELECT_SHIFT', payload: shiftId });
  }, [dispatch]);

  const setDuration = useCallback((duration: number) => {
    dispatch({ type: 'SET_DURATION', payload: duration });
    dispatch({ type: 'SET_DURATION_CHANGE_TIMESTAMP', payload: Date.now() });
  }, [dispatch]);

  const setShiftDetails = useCallback((details: ShiftFormState['shiftDetails']) => {
    dispatch({ type: 'SET_SHIFT_DETAILS', payload: details });
  }, [dispatch]);

  const setSelectedItems = useCallback((items: Record<string, number>) => {
    dispatch({ type: 'SET_SELECTED_ITEMS', payload: items });
  }, [dispatch]);

  const setItemsTotalPrice = useCallback((price: number) => {
    dispatch({ type: 'SET_ITEMS_TOTAL_PRICE', payload: price });
  }, [dispatch]);

  const setSkipItemsStep = useCallback((skip: boolean) => {
    dispatch({ type: 'SET_SKIP_ITEMS_STEP', payload: skip });
  }, [dispatch]);

  const setAvailablePaymentMethods = useCallback((methods: string[]) => {
    dispatch({ type: 'SET_AVAILABLE_PAYMENT_METHODS', payload: methods });
  }, [dispatch]);

  const setPaymentPercentages = useCallback((percentages: Record<string, number>) => {
    dispatch({ type: 'SET_PAYMENT_PERCENTAGES', payload: percentages });
  }, [dispatch]);

  const setCustomerInfo = useCallback((info: ShiftFormState['customerInfo']) => {
    dispatch({ type: 'SET_CUSTOMER_INFO', payload: info });
  }, [dispatch]);

  const resetForm = useCallback(() => {
    dispatch({ type: 'RESET_FORM' });
  }, [dispatch]);

  // Funciones para la autenticación
  const setAuthView = useCallback((view: AuthView) => {
    dispatch({ type: 'SET_AUTH_VIEW', payload: view });
  }, [dispatch]);

  const checkAuthAndRedirect = useCallback(() => {
    // Simplificamos la condición para que se ejecute siempre que tengamos información 
    // de autenticación disponible, sin importar el estado de inicialización
    if (!isLoadingAuth) {
      const isUserAuthenticated = !!user;
      
      // Actualizar el estado de autenticación
      dispatch({
        type: 'SET_IS_AUTHENTICATED',
        payload: isUserAuthenticated
      });
      
      dispatch({
        type: 'SET_IS_GUEST',
        payload: false
      });
      
      // Marcar que se ha verificado la autenticación
      dispatch({ type: 'SET_AUTH_CHECKED', payload: true });
      
      if (isUserAuthenticated) {
        // Si el usuario está autenticado, mostrar el paso de ubicación
        dispatch({ type: 'SET_STEP', payload: 'location' });
        console.log('ShiftFormContext: Usuario autenticado, mostrando paso de ubicación');
      } else {
        // Si no está autenticado, redirigir a la página de login con la URL actual como redirectTo
        const currentUrl = window.location.href;
        const encodedRedirectUrl = encodeURIComponent(currentUrl);
        const loginUrl = `/login?redirectTo=${encodedRedirectUrl}`;
        
        console.log('ShiftFormContext: Usuario no autenticado, redirigiendo a:', loginUrl);
        router.replace(loginUrl); // Usar replace en lugar de push para evitar problemas con la navegación
      }
    }
  }, [isLoadingAuth, user, dispatch, router]);

  // Efecto para inicializar los métodos de pago disponibles
  useEffect(() => {
    if (availablePaymentMethods && availablePaymentMethods.length > 0) {
      dispatch({ 
        type: 'SET_AVAILABLE_PAYMENT_METHODS', 
        payload: availablePaymentMethods 
      });
      console.log('ShiftFormContext: Métodos de pago disponibles establecidos:', availablePaymentMethods);
    }
  }, [availablePaymentMethods, dispatch]);

  const isLoadingValue = React.useMemo(() => {
    return isLoadingAuth || (orgLoading && !organization) || isCheckingVinculacion;
  }, [isLoadingAuth, orgLoading, organization, isCheckingVinculacion]);

  const value = {
    state,
    dispatch,
    nextStep,
    prevStep,
    goToStep,
    setStep,
    setIsAuthenticated: (isAuthenticated: boolean) => dispatch({ type: 'SET_IS_AUTHENTICATED', payload: isAuthenticated }),
    setIsGuest: (isGuest: boolean) => dispatch({ type: 'SET_IS_GUEST', payload: isGuest }),
    setAuthView,
    setCustomerInfo,
    selectLocation,
    selectShift,
    setDuration,
    setShiftDetails,
    setSelectedItems,
    setItemsTotalPrice,
    setSkipItemsStep,
    setAvailablePaymentMethods,
    setPaymentPercentages,
    setBookingId: (id: string) => dispatch({ type: 'SET_BOOKING_ID', payload: id }),
    setBookingStatus: (status: ShiftFormState['bookingStatus']) => dispatch({ type: 'SET_BOOKING_STATUS', payload: status }),
    setError: (error: Error | null) => dispatch({ type: 'SET_ERROR', payload: error }),
    setAuthError: (error: Error | null) => dispatch({ type: 'SET_AUTH_ERROR', payload: error }),
    setAuthChecked: (checked: boolean) => dispatch({ type: 'SET_AUTH_CHECKED', payload: checked }),
    resetForm,
    login: async (email: string, password: string) => {
      // Implementar la lógica de inicio de sesión aquí
    },
    register: async (userData: {
      name: string;
      email: string;
      password: string;
      passwordConfirmation: string;
    }) => {
      // Implementar la lógica de registro aquí
    },
    logout: async () => {
      // Implementar la lógica de cierre de sesión aquí
    },
    continueAsGuest: () => {
      // Implementar la lógica de continuar como invitado aquí
    },
    isLoading: isLoadingValue,
    empresaId,
    user,
    checkAuthAndRedirect
  };

  // Solo renderizamos el contenido cuando la inicialización está completa
  if (!hasInitialized || isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Cargando...</div>
      </div>
    );
  }

  return (
    <ShiftFormContext.Provider value={value}>
      {children}
    </ShiftFormContext.Provider>
  );
}

// Proveedor del contexto
export function ShiftFormProvider({ children, formData, empresaId, availablePaymentMethods }: ShiftFormProviderProps) {
  return (
    <ClientOrganizationProvider empresaId={empresaId}>
      <ClientSideShiftProvider 
        empresaId={empresaId} 
        formData={formData} 
        availablePaymentMethods={availablePaymentMethods}
      >
        {children}
      </ClientSideShiftProvider>
    </ClientOrganizationProvider>
  );
}

// Hook para usar el contexto
export function useShiftForm() {
  const context = useContext(ShiftFormContext);
  if (context === undefined) {
    throw new Error('useShiftForm debe ser usado dentro de un ShiftFormProvider');
  }
  return context;
}
