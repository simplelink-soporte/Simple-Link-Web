import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { useShiftForm } from '../context/ShiftFormContext';
import { MobileLayout } from '../shared/MobileLayout';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Importación de los componentes de pasos
const LocationStep = React.lazy(() => import('./location/LocationStep'));
const ShiftsStep = React.lazy(() => import('./shifts/ShiftsStep'));
const ItemsStep = React.lazy(() => import('./items/ItemsStep'));
const SummaryStep = React.lazy(() => import('./summary'));
const ConfirmationStep = React.lazy(() => import('./ConfirmationStep'));
const NoCreditsStep = React.lazy(() => import('./NoCreditsStep'));

export type StepComponentProps = {
  onNext: () => void;
  onPrevious: () => void;
  isLastStep: boolean;
  isFirstStep: boolean;
  progress: number;
  viewType: 'mobile' | 'desktop';
};

// Componente para manejar redirecciones entre pasos
interface RedirectProps extends StepComponentProps {
  to: number;
}

const Redirect: React.FC<RedirectProps> = ({ to, onNext, onPrevious, isFirstStep, isLastStep, progress, viewType }) => {
  const { skipToStep } = useShiftForm();
  
  // Efectuar la redirección inmediatamente después de montar el componente
  useEffect(() => {
    // Creamos un evento personalizado para notificar que se está omitiendo un paso
    const skipEvent = new CustomEvent('step-skipped', { 
      detail: { from: to === 3 ? 2 : 3, to } 
    });
    document.dispatchEvent(skipEvent);
    
    // Log para depuración
    console.log(` Redirigiendo del paso ${to === 3 ? 2 : 3} al paso ${to}`);
    
    const timer = setTimeout(() => {
      skipToStep(to);
    }, 10);
    
    return () => clearTimeout(timer);
  }, [to, skipToStep]);
  
  // Mientras tanto, mostrar un estado de carga
  return (
    <div className="p-8 flex flex-col items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
};

export const StepRenderer: React.FC<{
  onNext: () => void;
  onPrevious: () => void;
}> = ({ onNext, onPrevious }) => {
  const { state, goToStep } = useShiftForm();
  const totalSteps = 5; 
  const [viewType, setViewType] = useState<'desktop' | 'mobile'>('desktop');
  const [navigatingBackward, setNavigatingBackward] = useState(false);
  const [skipToStepValue, setSkipToStepValue] = useState<number | null>(null);

  // Determinar si es vista móvil o desktop
  useEffect(() => {
    const checkViewType = () => {
      setViewType(window.innerWidth < 768 ? 'mobile' : 'desktop');
    };
    
    // Verificar al inicio
    checkViewType();
    
    // Escuchar cambios de tamaño de ventana
    window.addEventListener('resize', checkViewType);
    
    // Limpiar listener al desmontar
    return () => {
      window.removeEventListener('resize', checkViewType);
    };
  }, []);

  // Verificar autenticación al iniciar
  useEffect(() => {
    // Si el paso es 'auth' y el usuario está autenticado, automáticamente ir al paso de ubicación
    if (state.step === 'auth' && state.isAuthenticated) {
      goToStep('location');
    }
  }, [state.step, state.isAuthenticated, goToStep]);

  // Detectar navegación hacia atrás desde ServiceStep (paso 3) si skipItemsStep es true
  useEffect(() => {
    // Esta función se ejecutará cuando se emita el evento shift-step-navigation-back
    const handleBackNavigation = (event: Event) => {
      if (state.currentStep === 3 && state.skipItemsStep) {
        console.log('StepRenderer: Detectado evento de navegación hacia atrás desde ServiceStep con skipItemsStep=true');
        
        // Configurar el flag para saltar al paso 1 (ShiftsStep)
        setSkipToStepValue(1);
        setNavigatingBackward(true);
        
        // Evitar el comportamiento normal de la navegación hacia atrás
        event.preventDefault();
      }
    };
    
    // Esta función se ejecutará cuando se emita el evento personalizado shift-skip-items-step-back
    const handleSkipStepBack = (event: CustomEvent) => {
      console.log('StepRenderer: Detectado evento personalizado para saltar paso de artículos hacia atrás', event.detail);
      
      // Si el evento tiene detalles sobre el paso de destino, usarlo
      if (event.detail && event.detail.toStep !== undefined) {
        setSkipToStepValue(event.detail.toStep);
      } else {
        // Valor por defecto si no se especifica
        setSkipToStepValue(1);
      }
      setNavigatingBackward(true);
    };
    
    // Registrar listeners de eventos para detectar navegación hacia atrás y eventos personalizados
    document.addEventListener('shift-step-navigation-back', handleBackNavigation);
    document.addEventListener('shift-skip-items-step-back', handleSkipStepBack as EventListener);
    
    // Limpiar listeners al desmontar
    return () => {
      document.removeEventListener('shift-step-navigation-back', handleBackNavigation);
      document.removeEventListener('shift-skip-items-step-back', handleSkipStepBack as EventListener);
    };
  }, [state.currentStep, state.skipItemsStep, setSkipToStepValue]);

  const currentStep = state.currentStep;
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  const renderStep = useCallback(() => {
    const stepProps: StepComponentProps = {
      onNext,
      onPrevious,
      isLastStep,
      isFirstStep,
      progress: ((currentStep + 1) / totalSteps) * 100,
      viewType
    };

    // Para NoCredits, verificamos si el paso actual es 'noCredits'
    if (state.step === 'noCredits') {
      return (
        <Suspense fallback={<div className="p-8 flex flex-col items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>}>
          <NoCreditsStep {...stepProps} />
        </Suspense>
      );
    }
    
    // Si la empresa no tiene créditos (verificación secundaria), mostrar el paso NoCreditsStep
    if (state.hasNoCredits) {
      return (
        <Suspense fallback={<div className="p-8 flex flex-col items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>}>
          <NoCreditsStep {...stepProps} />
        </Suspense>
      );
    }

    switch (state.currentStep) {
      case 0:
        return <LocationStep {...stepProps} />;
      case 1:
        return <ShiftsStep {...stepProps} />;
      case 2:
        return <ItemsStep {...stepProps} />;
      case 3:
        // Después de Items pasamos directamente a Summary (eliminamos el ServiceStep)
        return (
          <Suspense fallback={<div className="p-8 flex flex-col items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>}>
            <SummaryStep {...stepProps} />
          </Suspense>
        );
      case 4:
        return <ConfirmationStep {...stepProps} />;
      default:
        return <div>Paso no encontrado</div>;
    }
  }, [state.currentStep, viewType, isLastStep, onNext, onPrevious]);

  // Forzar la actualización de las propiedades de navegación móvil
  const [mobileNavProps, setMobileNavProps] = useState({
    nextLabel: isLastStep ? 'Finalizar' : 'Continuar',
    isNextDisabled: false,
    isProcessing: false,
    customOnNext: undefined as (() => void) | undefined
  });
  
  // Actualizar las propiedades de navegación en función del paso actual
  useEffect(() => {
    // Función para obtener las propiedades actualizadas
    const getMobileNavProps = () => {
      const defaultProps = {
        nextLabel: isLastStep ? 'Finalizar' : 'Continuar',
        isNextDisabled: false,
        isProcessing: false,
        customOnNext: undefined as (() => void) | undefined
      };

      // Paso 0: LocationStep - Verificar si se ha seleccionado una ubicación
      if (state.currentStep === 0) {
        let locationData = { selectedLocation: null, isLoading: false };
        
        if (typeof window !== 'undefined' && (window as any).__locationStepData) {
          locationData = (window as any).__locationStepData;
        }
        
        return {
          ...defaultProps,
          isNextDisabled: !locationData.selectedLocation
        };
      }
      
      // Paso 1: ShiftsStep - Verificar si se ha seleccionado un turno
      if (state.currentStep === 1) {
        let shiftsData = { selectedShiftId: null, isLoading: false };
        
        if (typeof window !== 'undefined' && (window as any).__shiftsStepData) {
          shiftsData = (window as any).__shiftsStepData;
        }
        
        return {
          ...defaultProps,
          isNextDisabled: !shiftsData.selectedShiftId
        };
      }
      
      // Paso 2: ItemsStep - La selección es opcional
      if (state.currentStep === 2) {
        let itemsData = { 
          totalItemsSelected: 0, 
          hasItems: false,
          isLoading: false 
        };
        
        if (typeof window !== 'undefined' && (window as any).__itemsStepData) {
          itemsData = (window as any).__itemsStepData;
        }
        
        // Nota: No configuramos isNextDisabled aquí porque la selección de items es opcional
        return {
          ...defaultProps
        };
      }

      // Ajustes específicos para SummaryStep (paso 3)
      if (state.currentStep === 3) {
        let summaryData = { 
          summarySubStep: 'details', 
          selectedPaymentMethod: null,
          isProcessing: false
        };
        
        if (typeof window !== 'undefined' && (window as any).__summaryStepData) {
          summaryData = (window as any).__summaryStepData;
        }
        
        // Determinamos el texto del botón basado en el sub-paso actual
        const buttonLabel = summaryData.summarySubStep === 'payment' ? 'Confirmar Reserva' : 'Continuar';
        
        // Determinamos si el botón debe estar deshabilitado
        const isButtonDisabled = summaryData.summarySubStep === 'payment' && 
                              !summaryData.selectedPaymentMethod;
        
        return {
          nextLabel: buttonLabel,
          isNextDisabled: isButtonDisabled,
          isProcessing: summaryData.isProcessing || false,
          // Función personalizada para el botón Next en SummaryStep
          customOnNext: () => {
            // Verificamos si podemos acceder a los handlers expuestos por SummaryStep
            if (typeof window !== 'undefined' && (window as any).__summaryStepData) {
              const data = (window as any).__summaryStepData;
              
              // Usamos la función de navegación de sub-pasos de SummaryStep
              if (typeof data.handleNextSubStep === 'function') {
                data.handleNextSubStep();
                return; // Importante para evitar que se ejecute onNext del padre
              }
            }
            
            // Si no podemos acceder a los handlers específicos, usamos el comportamiento por defecto
            onNext();
          }
        };
      }

      return defaultProps;
    };

    // Actualizar inmediatamente al cambiar el paso
    setMobileNavProps(getMobileNavProps());
    
    // Escuchar eventos de actualización de los diferentes pasos
    const handleSummaryStepUpdate = () => {
      if (state.currentStep === 3 && viewType === 'mobile') {
        setMobileNavProps(getMobileNavProps());
      }
    };
    
    const handleLocationStepUpdate = () => {
      if (state.currentStep === 0 && viewType === 'mobile') {
        setMobileNavProps(getMobileNavProps());
      }
    };
    
    const handleShiftsStepUpdate = () => {
      if (state.currentStep === 1 && viewType === 'mobile') {
        setMobileNavProps(getMobileNavProps());
      }
    };
    
    const handleItemsStepUpdate = () => {
      if (state.currentStep === 2 && viewType === 'mobile') {
        setMobileNavProps(getMobileNavProps());
      }
    };
    
    // Suscribirse a los eventos personalizados
    window.addEventListener('summary-step-update', handleSummaryStepUpdate);
    window.addEventListener('location-step-update', handleLocationStepUpdate);
    window.addEventListener('shifts-step-update', handleShiftsStepUpdate);
    window.addEventListener('items-step-update', handleItemsStepUpdate);
    
    // Sólo activamos el intervalo cuando estamos en vista móvil
    let interval: NodeJS.Timeout | null = null;
    if (viewType === 'mobile') {
      interval = setInterval(() => {
        setMobileNavProps(getMobileNavProps());
      }, 200);
    }
      
    return () => {
      window.removeEventListener('summary-step-update', handleSummaryStepUpdate);
      window.removeEventListener('location-step-update', handleLocationStepUpdate);
      window.removeEventListener('shifts-step-update', handleShiftsStepUpdate);
      window.removeEventListener('items-step-update', handleItemsStepUpdate);
      if (interval) clearInterval(interval);
    };
  }, [state.currentStep, viewType, isLastStep, onNext]);

  // Función personalizada para el botón "Volver" cuando estamos en SummaryStep
  const getCustomOnBack = () => {
    if (state.currentStep === 3 && viewType === 'mobile') {
      return () => {
        // Verificamos si podemos acceder a los handlers expuestos por SummaryStep
        if (typeof window !== 'undefined' && (window as any).__summaryStepData) {
          const data = (window as any).__summaryStepData;
          
          // Usamos la función de navegación entre sub-pasos de SummaryStep
          if (typeof data.handlePreviousSubStep === 'function') {
            data.handlePreviousSubStep();
            return; // Importante para evitar que se ejecute onPrevious del padre
          }
        }
        
        // Si no podemos acceder a los handlers específicos, usamos el comportamiento por defecto
        onPrevious();
      };
    }
    
    return onPrevious;
  };

  return (
    <>
      <Suspense fallback={
        <div className="p-8 flex flex-col items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      }>
        {viewType === 'mobile' ? (
          <MobileLayout 
            onNext={mobileNavProps.customOnNext || onNext}
            onBack={getCustomOnBack()}
            showBackButton={!isFirstStep}
            nextLabel={mobileNavProps.nextLabel}
            isNextDisabled={mobileNavProps.isNextDisabled}
            isProcessing={mobileNavProps.isProcessing}
          >
            {renderStep()}
          </MobileLayout>
        ) : (
          renderStep()
        )}
      </Suspense>
    </>
  );
};
