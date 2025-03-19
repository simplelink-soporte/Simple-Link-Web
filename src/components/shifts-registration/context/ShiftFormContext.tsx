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
export type ShiftFormStep = 'auth' | 'location' | 'shifts' | 'service' | 'date' | 'time' | 'summary' | 'confirmation';

interface ShiftFormState {
  currentStep: number;
  step: ShiftFormStep;
  authView: AuthView;
  isAuthenticated: boolean;
  isGuest: boolean;
  selectedLocation: string | null;
  selectedShift: string | null;
  selectedService: string | null;
  selectedDate: string | null;
  selectedTimeSlot: string | null;
  duration: number;
  lastDurationChangeTimestamp: number | null;
  // Información completa del turno seleccionado
  shiftDetails: {
    startTime: string;
    endTime: string;
    courtId: string;
    courtName: string;
    price: number;
  } | null;
  selectedItems: Record<string, number>;
  itemsTotalPrice: number;
  skipItemsStep: boolean;
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

// Acciones del reducer
type ShiftFormAction =
  | { type: 'SET_STEP'; payload: ShiftFormStep }
  | { type: 'SET_AUTH_VIEW'; payload: AuthView }
  | { type: 'SET_AUTH_STATUS'; payload: { isAuthenticated: boolean; isGuest: boolean } }
  | { type: 'SET_AUTH_CHECKED'; payload: boolean } 
  | { type: 'SET_CURRENT_STEP'; payload: number }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'SELECT_LOCATION'; payload: string }
  | { type: 'SELECT_SHIFT'; payload: string }
  | { type: 'SELECT_SERVICE'; payload: string }
  | { type: 'SELECT_DATE'; payload: string }
  | { type: 'SELECT_TIME_SLOT'; payload: string }
  | { type: 'SET_DURATION'; payload: number }
  | { type: 'SET_DURATION_CHANGE_TIMESTAMP'; payload: number }
  | { type: 'SET_SHIFT_DETAILS'; payload: ShiftFormState['shiftDetails'] }
  | { type: 'SET_SELECTED_ITEMS'; payload: Record<string, number> }
  | { type: 'SET_ITEMS_TOTAL_PRICE'; payload: number }
  | { type: 'SET_SKIP_ITEMS_STEP'; payload: boolean }
  | { type: 'SET_CUSTOMER_INFO'; payload: ShiftFormState['customerInfo'] }
  | { type: 'SET_BOOKING_ID'; payload: string }
  | { type: 'SET_ERROR'; payload: Error | null }
  | { type: 'SET_AUTH_ERROR'; payload: Error | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_BOOKING_STATUS'; payload: ShiftFormState['bookingStatus'] }
  | { type: 'RESET_FORM' };

// Estado inicial
const initialState: ShiftFormState = {
  currentStep: 0,
  step: 'auth',
  authView: 'login',
  isAuthenticated: false,
  isGuest: false,
  selectedLocation: null,
  selectedShift: null,
  selectedService: null,
  selectedDate: null,
  selectedTimeSlot: null,
  duration: 1,
  lastDurationChangeTimestamp: null,
  shiftDetails: null,
  selectedItems: {},
  itemsTotalPrice: 0,
  skipItemsStep: false,
  customerInfo: null,
  bookingId: null,
  error: null,
  authError: null,
  bookingStatus: 'idle',
  authChecked: false, 
};

// Reducer para manejar las acciones
const shiftFormReducer = (state: ShiftFormState, action: ShiftFormAction): ShiftFormState => {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.payload };
    case 'SET_AUTH_VIEW':
      return { ...state, authView: action.payload };
    case 'SET_AUTH_STATUS':
      return { 
        ...state, 
        isAuthenticated: action.payload.isAuthenticated,
        isGuest: action.payload.isGuest,
        step: action.payload.isAuthenticated ? 'location' : state.step
      };
    case 'SET_AUTH_CHECKED':
      return { ...state, authChecked: action.payload };
    case 'SET_CURRENT_STEP':
      return { ...state, currentStep: action.payload };
    case 'NEXT_STEP':
      return { ...state, currentStep: state.currentStep + 1 };
    case 'PREV_STEP':
      return { ...state, currentStep: state.currentStep - 1 };
    case 'SELECT_LOCATION':
      return { ...state, selectedLocation: action.payload };
    case 'SELECT_SHIFT':
      return { ...state, selectedShift: action.payload };
    case 'SELECT_SERVICE':
      return { ...state, selectedService: action.payload };
    case 'SELECT_DATE':
      return { ...state, selectedDate: action.payload };
    case 'SELECT_TIME_SLOT':
      return { ...state, selectedTimeSlot: action.payload };
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
    case 'SET_CUSTOMER_INFO':
      return { ...state, customerInfo: action.payload };
    case 'SET_BOOKING_ID':
      return { ...state, bookingId: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_AUTH_ERROR':
      return { ...state, authError: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null, authError: null };
    case 'SET_BOOKING_STATUS':
      return { ...state, bookingStatus: action.payload };
    case 'RESET_FORM':
      return initialState;
    default:
      return state;
  }
};

// Tipo para el contexto
interface ShiftFormContextType {
  state: ShiftFormState;
  dispatch: React.Dispatch<ShiftFormAction>;
  formData: PublishedForm | null;
  nextStep: () => void;
  prevStep: () => void;
  skipToStep: (step: number) => void;
  goBackToStep: (targetStep: number) => void;
  selectLocation: (locationId: string) => void;
  selectShift: (shiftId: string) => void;
  selectService: (serviceId: string) => void;
  selectDate: (date: string) => void;
  selectTimeSlot: (timeSlotId: string) => void;
  setDuration: (duration: number) => void;
  setShiftDetails: (details: ShiftFormState['shiftDetails']) => void;
  setSelectedItems: (items: Record<string, number>) => void;
  setItemsTotalPrice: (price: number) => void;
  setSkipItemsStep: (skip: boolean) => void;
  setCustomerInfo: (info: ShiftFormState['customerInfo']) => void;
  resetForm: () => void;
  organization: any | null;
  isLoading: boolean;
  setAuthView: (view: AuthView) => void;
  goToStep: (step: ShiftFormStep) => void;
  empresaId: string;
  user: AuthUser | null;
  checkAuthAndRedirect: () => void;
}

// Crear el contexto
const ShiftFormContext = createContext<ShiftFormContextType | undefined>(undefined);

// Props para el proveedor
interface ShiftFormProviderProps {
  children: ReactNode;
  formData: PublishedForm | null;
  empresaId: string;
}

// Proveedor interno (client-side)
function ClientSideShiftProvider({ children, formData, empresaId }: ShiftFormProviderProps) {
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
        type: 'SET_AUTH_STATUS',
        payload: { 
          isAuthenticated: !!user, 
          isGuest: false 
        }
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
  }, []);

  const prevStep = useCallback(() => {
    if (state.currentStep > 0) {
      // Si estamos en el paso 3 (ServiceStep) y skipItemsStep es true,
      // y vamos a ir al paso 2 (ItemsStep), deberíamos saltar al paso 1 (ShiftsStep)
      if (state.currentStep === 3 && state.skipItemsStep) {
        console.log('ShiftFormContext: Detectada navegación hacia atrás desde ServiceStep con skipItemsStep=true');
        console.log('ShiftFormContext: Omitiendo el paso de artículos al retroceder');
        
        // Emitir un evento para notificar que estamos omitiendo un paso hacia atrás
        const skipBackwardEvent = new CustomEvent('shift-skip-step-backward', {
          detail: { fromStep: 3, skipStep: 2, toStep: 1 }
        });
        document.dispatchEvent(skipBackwardEvent);
        
        // Saltar directamente al paso 1
        dispatch({ type: 'SET_CURRENT_STEP', payload: 1 });
      } else {
        // Comportamiento normal
        dispatch({ type: 'PREV_STEP' });
      }
    }
  }, [state.currentStep, state.skipItemsStep]);

  // Función para saltar a un paso específico
  const skipToStep = useCallback((step: number) => {
    const currentStep = state.currentStep;
    
    // Si estamos omitiendo el paso de artículos al navegar hacia adelante
    if (currentStep === 1 && step === 3 && state.skipItemsStep) {
      console.log(`ShiftFormContext: Omitiendo el paso 2 (artículos) al navegar de ${currentStep} a ${step}`);
      
      // Emitir un evento para notificar que estamos omitiendo un paso hacia adelante
      const skipForwardEvent = new CustomEvent('shift-skip-step-forward', {
        detail: { fromStep: 1, skipStep: 2, toStep: 3 }
      });
      document.dispatchEvent(skipForwardEvent);
    }
    
    dispatch({ type: 'SET_CURRENT_STEP', payload: step });
  }, [state.currentStep, state.skipItemsStep]);

  // Retroceder a un paso específico
  const goBackToStep = useCallback((targetStep: number) => {
    // Verificar si estamos omitiendo algún paso intermedio al retroceder
    if (state.currentStep > targetStep) {
      const skippedSteps = [];
      
      // Si estamos en el paso 3 y vamos a ir al paso 1, y skipItemsStep es true
      // entonces estamos omitiendo el paso 2
      if (state.currentStep === 3 && targetStep === 1 && state.skipItemsStep) {
        skippedSteps.push(2);
      }
      
      if (skippedSteps.length > 0) {
        console.log(`ShiftFormContext: Omitiendo pasos ${skippedSteps.join(', ')} al retroceder de ${state.currentStep} a ${targetStep}`);
        
        // Emitir un evento detallando los pasos omitidos
        const skipMultipleEvent = new CustomEvent('shift-skip-multiple-steps', {
          detail: { fromStep: state.currentStep, toStep: targetStep, skippedSteps }
        });
        document.dispatchEvent(skipMultipleEvent);
      }
    }
    
    dispatch({ type: 'SET_CURRENT_STEP', payload: targetStep });
  }, [state.currentStep, state.skipItemsStep]);

  // Funciones para interactuar con el formulario
  const selectLocation = useCallback((locationId: string) => {
    dispatch({ type: 'SELECT_LOCATION', payload: locationId });
  }, []);

  const selectShift = useCallback((shiftId: string) => {
    dispatch({ type: 'SELECT_SHIFT', payload: shiftId });
  }, []);

  const selectService = useCallback((serviceId: string) => {
    dispatch({ type: 'SELECT_SERVICE', payload: serviceId });
  }, []);

  const selectDate = useCallback((date: string) => {
    dispatch({ type: 'SELECT_DATE', payload: date });
  }, []);

  const selectTimeSlot = useCallback((timeSlotId: string) => {
    dispatch({ type: 'SELECT_TIME_SLOT', payload: timeSlotId });
  }, []);

  const setDuration = useCallback((duration: number) => {
    dispatch({ type: 'SET_DURATION', payload: duration });
    dispatch({ type: 'SET_DURATION_CHANGE_TIMESTAMP', payload: Date.now() });
  }, []);

  const setShiftDetails = useCallback((details: ShiftFormState['shiftDetails']) => {
    dispatch({ type: 'SET_SHIFT_DETAILS', payload: details });
  }, []);

  const setSelectedItems = useCallback((items: Record<string, number>) => {
    dispatch({ type: 'SET_SELECTED_ITEMS', payload: items });
  }, []);

  const setItemsTotalPrice = useCallback((price: number) => {
    dispatch({ type: 'SET_ITEMS_TOTAL_PRICE', payload: price });
  }, []);

  const setSkipItemsStep = useCallback((skip: boolean) => {
    dispatch({ type: 'SET_SKIP_ITEMS_STEP', payload: skip });
  }, []);

  const setCustomerInfo = useCallback((info: ShiftFormState['customerInfo']) => {
    dispatch({ type: 'SET_CUSTOMER_INFO', payload: info });
  }, []);

  const resetForm = useCallback(() => {
    dispatch({ type: 'RESET_FORM' });
  }, []);

  // Funciones para la autenticación
  const setAuthView = useCallback((view: AuthView) => {
    dispatch({ type: 'SET_AUTH_VIEW', payload: view });
  }, []);

  const goToStep = useCallback((step: ShiftFormStep) => {
    dispatch({ type: 'SET_STEP', payload: step });
  }, []);

  const checkAuthAndRedirect = useCallback(() => {
    // Simplificamos la condición para que se ejecute siempre que tengamos información 
    // de autenticación disponible, sin importar el estado de inicialización
    if (!isLoadingAuth) {
      const isUserAuthenticated = !!user;
      
      // Actualizar el estado de autenticación
      dispatch({
        type: 'SET_AUTH_STATUS',
        payload: { 
          isAuthenticated: isUserAuthenticated, 
          isGuest: false 
        }
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

  // Memoizamos el valor de isLoading
  const isLoadingValue = React.useMemo(() => {
    return isLoadingAuth || (orgLoading && !organization) || isCheckingVinculacion;
  }, [isLoadingAuth, orgLoading, organization, isCheckingVinculacion]);

  const value = {
    state,
    dispatch,
    formData,
    nextStep,
    prevStep,
    skipToStep,
    goBackToStep,
    selectLocation,
    selectShift,
    selectService,
    selectDate,
    selectTimeSlot,
    setDuration,
    setShiftDetails,
    setSelectedItems,
    setItemsTotalPrice,
    setSkipItemsStep,
    setCustomerInfo,
    resetForm,
    organization,
    isLoading: isLoadingValue,
    setAuthView,
    goToStep,
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
export function ShiftFormProvider({ children, formData, empresaId }: ShiftFormProviderProps) {
  return (
    <ClientOrganizationProvider empresaId={empresaId}>
      <ClientSideShiftProvider empresaId={empresaId} formData={formData}>
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
