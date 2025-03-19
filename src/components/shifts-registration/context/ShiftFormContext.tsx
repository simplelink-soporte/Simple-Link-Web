'use client';

import React, { createContext, useContext, useReducer, ReactNode, useCallback } from 'react';
import { PublishedForm } from '@/types/forms/publish';

// Tipos para el estado del formulario de turnos
export type ShiftFormStep = 'location' | 'shifts' | 'service' | 'date' | 'time' | 'summary' | 'confirmation';

interface ShiftFormState {
  currentStep: number;
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
  bookingStatus: 'idle' | 'submitting' | 'success' | 'error';
}

// Acciones del reducer
type ShiftFormAction =
  | { type: 'SET_STEP'; payload: number }
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
  | { type: 'SET_BOOKING_STATUS'; payload: ShiftFormState['bookingStatus'] }
  | { type: 'RESET_FORM' };

// Estado inicial
const initialState: ShiftFormState = {
  currentStep: 0,
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
  bookingStatus: 'idle'
};

// Reducer para manejar las acciones
const shiftFormReducer = (state: ShiftFormState, action: ShiftFormAction): ShiftFormState => {
  switch (action.type) {
    case 'SET_STEP':
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
}

// Crear el contexto
const ShiftFormContext = createContext<ShiftFormContextType | undefined>(undefined);

// Props para el proveedor
interface ShiftFormProviderProps {
  children: ReactNode;
  formData: PublishedForm | null;
}

// Proveedor del contexto
export function ShiftFormProvider({ children, formData }: ShiftFormProviderProps) {
  const [state, dispatch] = useReducer(shiftFormReducer, initialState);

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
        dispatch({ type: 'SET_STEP', payload: 1 });
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
        detail: { fromStep: currentStep, skipStep: 2, toStep: step }
      });
      document.dispatchEvent(skipForwardEvent);
    }
    
    dispatch({ type: 'SET_STEP', payload: step });
  }, [state.currentStep, state.skipItemsStep]);

  // Función para saltar a un paso específico hacia atrás, omitiendo los pasos intermedios si es necesario
  const goBackToStep = useCallback((targetStep: number) => {
    // Verificar si el paso objetivo es anterior al actual
    if (targetStep < state.currentStep) {
      console.log(`ShiftFormContext: Saltando hacia atrás del paso ${state.currentStep} al paso ${targetStep}`);
      
      // Si estamos en el paso de servicio y queremos ir al de turnos saltando el de artículos
      if (state.currentStep === 3 && targetStep === 1 && state.skipItemsStep) {
        // Emitir un evento para notificar que estamos omitiendo un paso hacia atrás
        const skipBackwardEvent = new CustomEvent('shift-skip-items-step-back', {
          detail: { fromStep: state.currentStep, skipStep: 2, toStep: targetStep }
        });
        document.dispatchEvent(skipBackwardEvent);
      }
      
      // Saltar directamente al paso objetivo
      dispatch({ type: 'SET_STEP', payload: targetStep });
    }
  }, [state.currentStep, state.skipItemsStep]);

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
    dispatch({ 
      type: 'SET_DURATION', 
      payload: duration 
    });
    
    // Cuando cambia la duración, actualizar el timestamp
    dispatch({
      type: 'SET_DURATION_CHANGE_TIMESTAMP',
      payload: Date.now()
    });
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

  // Valor del contexto
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
    resetForm
  };

  return (
    <ShiftFormContext.Provider value={value}>
      {children}
    </ShiftFormContext.Provider>
  );
}

// Hook para usar el contexto
export function useShiftForm() {
  const context = useContext(ShiftFormContext);
  if (context === undefined) {
    throw new Error('useShiftForm must be used within a ShiftFormProvider');
  }
  return context;
}
