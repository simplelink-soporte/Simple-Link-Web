'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { useShiftForm } from './context/ShiftFormContext';
import { PublishedForm } from '@/types/forms/publish';
import { AlertCircle } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { StepRenderer } from './steps/StepRenderer';
import { useShiftRegistrationAuth } from './hooks/useAuth';

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
  const { state, nextStep, prevStep, checkAuthAndRedirect } = useShiftForm();
  const { user, isLoading: authLoading } = useShiftRegistrationAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [isNextDisabled, setIsNextDisabled] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Verificar autenticación cuando se carga el componente
  useEffect(() => {
    // Ejecutamos la verificación de autenticación inmediatamente
    // No usamos condiciones restrictivas que puedan impedir la verificación
    console.log("ShiftRegistrationForm: Ejecutando verificación de autenticación");
    checkAuthAndRedirect();
    
    // También podemos añadir una verificación adicional cuando cambia el estado de autenticación
    const handleAuthChange = () => {
      console.log("ShiftRegistrationForm: Cambio detectado en estado de autenticación");
      checkAuthAndRedirect();
    };
    
    // Suscribirse a cambios de autenticación (opcional, si implementas un sistema de eventos)
    document.addEventListener('auth-state-changed', handleAuthChange);
    
    return () => {
      document.removeEventListener('auth-state-changed', handleAuthChange);
    };
  }, [checkAuthAndRedirect]);

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
  const totalSteps = 9; // Actualizado para incluir el paso de autenticación
  const progress = Math.round(((state.currentStep + 1) / totalSteps) * 100);

  // Handlers para navegación
  const handleNext = useCallback(async () => {
    // Ejemplo de cómo podríamos manejar validación o procesamiento
    if (state.currentStep === 7) { // Si estamos en el paso de confirmación
      setIsProcessing(true);
      
      try {
        // Aquí iría la lógica para enviar la reserva
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulación
        nextStep();
      } catch (error) {
        console.error('Error al procesar la reserva:', error);
      } finally {
        setIsProcessing(false);
      }
    } else {
      nextStep();
    }
  }, [nextStep, state.currentStep]);

  const handlePrevious = useCallback(() => {
    prevStep();
  }, [prevStep]);

  // Renderizar el paso actual
  const renderCurrentStep = () => {
    return <StepRenderer onNext={handleNext} onPrevious={handlePrevious} />;
  };

  // Mostrar un loader mientras se verifica la autenticación
  if (authLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="p-8 flex flex-col items-center justify-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Verificando autenticación...</p>
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
      case 7:
        return 'Confirmar turno';
      default:
        return 'Continuar';
    }
  };

  return (
    <div className="container mx-auto p-4 pb-32">
      {/* Contenido del paso actual */}
      {state.bookingStatus === 'submitting' ? (
        <div className="p-8 flex flex-col items-center justify-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Procesando su reserva...</p>
        </div>
      ) : (
        // Añadimos la clase para asegurar que los componentes internos puedan tener scroll individual
        <div className={isMobile ? "h-full mobile-content-container" : ""}>
          {renderCurrentStep()}
        </div>
      )}

      {/* Navegación entre pasos */}
      {/* La navegación ya se maneja en cada paso individual, así que eliminamos esto para evitar duplicados */}
    </div>
  );
};
