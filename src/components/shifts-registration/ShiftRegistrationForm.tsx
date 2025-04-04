'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { useShiftForm } from './context/ShiftFormContext';
import { PublishedForm } from '@/types/forms/publish';
import { AlertCircle } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { StepRenderer } from './steps/StepRenderer';
import { useShiftRegistrationAuth } from './hooks/useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { format } from 'date-fns';
import { useBookingCount } from '@/hooks/useBookingCount';

// Tipos para los pasos
type StepComponentProps = {
  onNext: () => void;
  onPrevious: () => void;
  isLastStep: boolean;
  isFirstStep: boolean;
  progress: number;
};

// Componente temporal para los pasos (se reemplazará con componentes reales)
const StepPlaceholder: React.FC<StepComponentProps & { title: string }> = ({
  title,
  onNext,
  onPrevious,
  isLastStep,
  isFirstStep,
}) => {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      <p className="text-gray-600 mb-6">
        Este es un componente temporal para el paso {title}.
      </p>
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">Utilice los botones de navegación para continuar.</p>
      </div>
    </div>
  );
};

// Componente principal del formulario
export const ShiftRegistrationForm: React.FC<{ form: PublishedForm }> = ({ form }) => {
  const { 
    state, 
    nextStep, 
    prevStep, 
    checkAuthAndRedirect, 
    dispatch, 
    setAvailablePaymentMethods, 
    setPaymentPercentages, 
    setHasNoCredits 
  } = useShiftForm();
  const { user, isLoading: authLoading } = useShiftRegistrationAuth();
  const { organization, isLoading: orgLoading } = useOrganization();
  const [isMobile, setIsMobile] = useState(false);
  const [isNextDisabled, setIsNextDisabled] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Verificar créditos disponibles - usando el ID de la empresa del formulario, no del usuario autenticado
  const { canMakeBooking, remainingBookings, isPro, isLoading: isLoadingBookingCount } = useBookingCount({ 
    empresaId: form.empresa_id || organization?.id || '', 
    date: new Date().toISOString().split('T')[0],
    enabled: !!form.empresa_id || !!organization?.id
  });

  // Efecto para verificar si hay créditos disponibles, usando ID de empresa del formulario
  useEffect(() => {
    if (!isLoadingBookingCount && (form.empresa_id || organization?.id)) {
      const empresaId = form.empresa_id || organization?.id;
      const noCreditsAvailable = !isPro && remainingBookings <= 0;
      
      // Almacenar el estado en localStorage para persistencia entre recargas
      if (noCreditsAvailable && empresaId) {
        localStorage.setItem(`shift_no_credits_${empresaId}`, 'true');
        setHasNoCredits(true);
        dispatch({ type: 'SET_STEP', payload: 'noCredits' });
      } else if (empresaId) {
        localStorage.removeItem(`shift_no_credits_${empresaId}`);
        setHasNoCredits(false);
      }
    }
  }, [canMakeBooking, remainingBookings, isPro, form.empresa_id, organization?.id, isLoadingBookingCount, dispatch, setHasNoCredits]);

  // Verificar estado guardado al cargar el componente
  useEffect(() => {
    const empresaId = form.empresa_id || organization?.id;
    if (empresaId) {
      const savedNoCredits = localStorage.getItem(`shift_no_credits_${empresaId}`);
      if (savedNoCredits === 'true') {
        setHasNoCredits(true);
        dispatch({ type: 'SET_STEP', payload: 'noCredits' });
      }
    }
  }, [form.empresa_id, organization?.id, setHasNoCredits, dispatch]);

  // Verificar autenticación cuando se carga el componente
  useEffect(() => {
    // Ejecutamos la verificación de autenticación inmediatamente
    // No usamos condiciones restrictivas que puedan impedir la verificación
    checkAuthAndRedirect();
    
    // También podemos añadir una verificación adicional cuando cambia el estado de autenticación
    const handleAuthChange = () => {
      checkAuthAndRedirect();
    };
    
    // Suscribirse a cambios de autenticación (opcional, si implementas un sistema de eventos)
    document.addEventListener('auth-state-changed', handleAuthChange);
    
    return () => {
      document.removeEventListener('auth-state-changed', handleAuthChange);
    };
  }, [checkAuthAndRedirect]);

  // Inicializar los métodos de pago y porcentajes disponibles desde el formulario
  useEffect(() => {
    if (form && form.settings) {
      // Establecer los métodos de pago disponibles
      if (form.settings.paymentMethods?.available && 
          Array.isArray(form.settings.paymentMethods.available)) {
        setAvailablePaymentMethods(form.settings.paymentMethods.available);
      }

      // Establecer los porcentajes configurados para cada método de pago
      if (form.settings.paymentMethods?.percentages) {
        setPaymentPercentages(form.settings.paymentMethods.percentages);
      }
    }
  }, [form, setAvailablePaymentMethods, setPaymentPercentages]);

  // Detectar si es dispositivo móvil
  useEffect(() => {
    const checkIfMobile = () => {
      const mobileBreakpoint = 768; // Punto de quiebre para dispositivos móviles
      setIsMobile(window.innerWidth < mobileBreakpoint);
    };

    // Verificar inicialmente
    checkIfMobile();

    // Añadir listener para cambios de tamaño
    window.addEventListener('resize', checkIfMobile);

    // Limpiar listener al desmontar
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Determinar el paso actual y el total de pasos
  const totalSteps = 5; // Actualizado: 1.Ubicación, 2.Turnos, 3.Artículos, 4.Resumen, 5.Confirmación
  const progress = Math.round(((state.currentStep + 1) / totalSteps) * 100);

  // Handlers para navegación
  const handleNext = useCallback(async () => {
    // Ejemplo de cómo podríamos manejar validación o procesamiento
    if (state.currentStep === 3) { // Si estamos en el paso de resumen
      setIsProcessing(true);
      
      try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        setIsProcessing(false);
        dispatch({ type: 'NEXT_STEP' }); // Avanzar al siguiente paso
      } catch (error) {
        console.error('Error:', error);
        setIsProcessing(false);
        // Manejar el error
      }
    } else {
      // Simplemente avanzar al siguiente paso
      dispatch({ type: 'NEXT_STEP' });
    }
  }, [state.currentStep, dispatch]);

  const handlePrevious = useCallback(() => {
    prevStep();
  }, [prevStep]);

  // Renderizar el paso actual
  const renderCurrentStep = () => {
    return <StepRenderer onNext={handleNext} onPrevious={handlePrevious} />;
  };

  // Mostrar un loader mientras se verifica la autenticación o los créditos
  if (authLoading || isLoadingBookingCount) {
    return (
      <div className="container mx-auto p-4">
        <div className="p-8 flex flex-col items-center justify-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">
            {authLoading ? "Verificando autenticación..." : "Verificando disponibilidad de créditos..."}
          </p>
        </div>
      </div>
    );
  }

  // Si hay un error en el estado del formulario
  if (state.error) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{state.error.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Determinar el label del botón según el paso
  const getNextButtonLabel = () => {
    switch (state.currentStep) {
      case 3: // Paso de resumen
        return 'Confirmar turno';
      default:
        return 'Continuar';
    }
  };

  return (
    <div className="w-full">
      {state.bookingStatus === 'submitting' ? (
        <div className="p-8 flex flex-col items-center justify-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Procesando su reserva...</p>
        </div>
      ) : (
        <div className={isMobile ? "mobile-content-container" : ""}>
          {renderCurrentStep()}
        </div>
      )}
    </div>
  );
};
