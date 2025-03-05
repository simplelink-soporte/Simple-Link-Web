'use client';

import { createContext, useContext, useReducer, ReactNode, useCallback, useEffect } from 'react';
import { PublishedForm } from '@/types/forms/publish';
import { PaymentMethodEnum, PaymentStatusEnum, PaymentTypeEnum, PAYMENT_TYPE_MAPPINGS } from '@/types/bookings';

interface LocationState {
  branchId: string | null;
  branchName?: string;
}

interface ShiftState {
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  duration: number;
  courtId: string | null;
  courtName?: string;
  price?: number;
}

export interface PaymentState {
  type: PaymentTypeEnum | null;
  method: PaymentMethodEnum | null;
  selectedPaymentMethod?: {
    id: string;
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    type?: string;
    name?: string;
    description?: string;
  };
  config?: {
    paymentMethodId?: string;
    brand?: string;
    last4?: string;
    expMonth?: number;
    expYear?: number;
  };
  paymentIntentId?: string;
  processed?: boolean;
  status?: string;
}

interface FormState {
  location: LocationState;
  shift: ShiftState;
  payment: PaymentState;
  currentStep: number;
  empresa_id: string | null;
}

type FormAction =
  | { type: 'SET_LOCATION'; payload: LocationState }
  | { type: 'SET_SHIFT'; payload: ShiftState }
  | { type: 'SET_PAYMENT'; payload: PaymentState }
  | { type: 'SET_STEP'; payload: number }
  | { type: 'SET_EMPRESA_ID'; payload: string }
  | { type: 'RESET_FORM' };

interface FormProviderProps {
  children: ReactNode;
  initialForm: PublishedForm | null;
}

const initialState: FormState = {
  location: {
    branchId: null,
  },
  shift: {
    date: null,
    startTime: null,
    endTime: null,
    duration: 1,
    courtId: null,
    price: 0,
  },
  payment: {
    method: null,
    type: null
  },
  currentStep: 0,
  empresa_id: null,
};

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_LOCATION':
      return {
        ...state,
        location: action.payload,
        // Limpiar estados posteriores
        shift: initialState.shift,
      };
    
    case 'SET_SHIFT':
      return {
        ...state,
        shift: action.payload,
      };
    
    case 'SET_PAYMENT':
      console.log('FormContext: Estado antes de actualización:', {
        current: state.payment,
        incoming: action.payload,
        hasSelectedMethod: !!action.payload.selectedPaymentMethod,
        incomingMethod: action.payload.method,
        incomingType: action.payload.type
      });
      
      // Si no viene un tipo de pago, mantener el actual
      const paymentType = action.payload.type || state.payment.type;
      const paymentMapping = paymentType ? PAYMENT_TYPE_MAPPINGS[paymentType as PaymentTypeEnum] : null;
      
      // Si viene un selectedPaymentMethod, usarlo para completar la información
      const selectedMethod = action.payload.selectedPaymentMethod;
      
      // IMPORTANTE: Preservar el paymentIntentId si existe en el estado actual y no viene en el payload
      const paymentIntentId = action.payload.paymentIntentId || state.payment.paymentIntentId;
      
      // Crear un nuevo estado de pago que combine el estado actual con el nuevo
      const newPaymentState = {
        ...state.payment,
        ...action.payload,
        paymentIntentId: paymentIntentId // Asegurar que el paymentIntentId se preserve
      };
      
      console.log('FormContext: Estado después de actualización:', {
        current: state.payment,
        updated: newPaymentState,
        hasPaymentIntentId: !!newPaymentState.paymentIntentId
      });

      return {
        ...state,
        payment: newPaymentState
      };
    
    case 'SET_STEP':
      return {
        ...state,
        currentStep: action.payload,
      };
    
    case 'SET_EMPRESA_ID':
      return {
        ...state,
        empresa_id: action.payload
      };
    
    case 'RESET_FORM':
      // Mantener empresa_id al resetear el formulario
      return {
        ...initialState,
        empresa_id: state.empresa_id,
        currentStep: 0
      };
    
    default:
      return state;
  }
}

interface FormContextType {
  state: FormState;
  setLocation: (location: LocationState) => void;
  setShift: (shift: ShiftState) => void;
  setPayment: (payment: PaymentState) => void;
  setStep: (step: number) => void;
  resetForm: () => void;
}

const FormContext = createContext<FormContextType | undefined>(undefined);

export function FormProvider({ children, initialForm }: FormProviderProps) {
  const [state, dispatch] = useReducer(formReducer, {
    ...initialState,
    empresa_id: initialForm?.empresa_id || null
  });

  // Efecto único para inicializar el estado con el formulario inicial
  useEffect(() => {
    if (initialForm?.empresa_id) {
      dispatch({ 
        type: 'SET_EMPRESA_ID', 
        payload: initialForm.empresa_id 
      });
    }
  }, [initialForm?.empresa_id]);

  // Efecto para limpiar el formulario al cerrar la ventana
  useEffect(() => {
    const handleBeforeUnload = () => {
      dispatch({ type: 'RESET_FORM' });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const resetForm = useCallback(() => {
    dispatch({ type: 'RESET_FORM' });
  }, []);

  const setLocation = useCallback((location: LocationState) => {
    dispatch({ type: 'SET_LOCATION', payload: location });
  }, []);

  const setShift = useCallback((shift: ShiftState) => {
    dispatch({ type: 'SET_SHIFT', payload: shift });
  }, []);

  const setPayment = useCallback((payment: PaymentState) => {
    dispatch({ type: 'SET_PAYMENT', payload: payment });
  }, []);

  const setStep = useCallback((step: number) => {
    dispatch({ type: 'SET_STEP', payload: step });
  }, []);

  return (
    <FormContext.Provider
      value={{
        state,
        setLocation,
        setShift,
        setPayment,
        setStep,
        resetForm,
      }}
    >
      {children}
    </FormContext.Provider>
  );
}

export function useForm() {
  const context = useContext(FormContext);
  if (context === undefined) {
    throw new Error('useForm must be used within a FormProvider');
  }
  return context;
} 