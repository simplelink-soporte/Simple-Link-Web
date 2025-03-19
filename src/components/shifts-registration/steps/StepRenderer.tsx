'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useShiftForm } from '../context/ShiftFormContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { MobileLayout } from '../shared/MobileLayout';

// Importación de los componentes de pasos
const ServiceStep = React.lazy(() => import('./ServiceStep'));
const LocationStep = React.lazy(() => import('./location/LocationStep'));
const ShiftsStep = React.lazy(() => import('./shifts/ShiftsStep'));
const ItemsStep = React.lazy(() => import('./items/ItemsStep'));
const DateStep = React.lazy(() => import('./DateStep'));
const TimeStep = React.lazy(() => import('./TimeStep'));
const SummaryStep = React.lazy(() => import('./SummaryStep'));
const ConfirmationStep = React.lazy(() => import('./ConfirmationStep'));

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
      <p className="mt-4 text-gray-600">Redirigiendo...</p>
    </div>
  );
};

export const StepRenderer: React.FC<{
  onNext: () => void;
  onPrevious: () => void;
}> = ({ onNext, onPrevious }) => {
  const { state } = useShiftForm();
  const totalSteps = 8; // Actualizado para incluir el nuevo paso de Items
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

  // Parámetros comunes para todos los pasos
  const isLastStep = state.currentStep === 7;
  const isFirstStep = state.currentStep === 0;
  const progress = ((state.currentStep + 1) / 8) * 100;
  
  const stepProps: StepComponentProps = {
    onNext,
    onPrevious,
    isLastStep,
    isFirstStep,
    progress,
    viewType
  };
  
  // Renderizar el paso correspondiente según el estado actual
  const renderStep = () => {
    let currentStep;
    
    // Si estamos en el paso 2 (items) y skipItemsStep es true, saltar al paso 3
    // Pero SOLO si no estamos navegando hacia atrás
    if (state.currentStep === 2 && state.skipItemsStep && !navigatingBackward) {
      console.log('StepRenderer: Evaluando si omitir el paso de artículos (2)');
      console.log(`   Estado actual: skipItemsStep=${state.skipItemsStep}, duración=${state.duration}`);
      
      // Comprobar si acabamos de cambiar la duración (última actualización en los últimos 5 segundos)
      const durationUpdatedRecently = state.lastDurationChangeTimestamp && 
                                    (Date.now() - state.lastDurationChangeTimestamp < 5000);
      
      if (durationUpdatedRecently) {
        console.log('StepRenderer: La duración cambió recientemente. NO omitiendo el paso de artículos para permitir verificar disponibilidad con la nueva duración.');
        // No omitir el paso si la duración cambió recientemente
        return (
          <ItemsStep {...stepProps} />
        );
      }
      
      console.log('StepRenderer: Omitiendo el paso de artículos (2) y redirigiendo al paso de servicios (3)');
      return <Redirect to={3} {...stepProps} />;
    }
    
    // Si estamos yendo hacia atrás desde el paso 3 al 2, y skipItemsStep es true, ir directamente al paso 1
    if (state.currentStep === 2 && state.skipItemsStep && navigatingBackward) {
      console.log('StepRenderer: Omitiendo el paso de artículos (2) al retroceder y redirigiendo al paso de turnos (1)');
      return <Redirect to={1} {...stepProps} />;
    }
    
    // Si se configuró un paso para saltar, redirigir a ese paso
    if (skipToStepValue !== null) {
      console.log('StepRenderer: Redirigiendo a paso configurado:', skipToStepValue);
      const targetStep = skipToStepValue;
      
      // Resetear el valor para evitar redirecciones no deseadas en el futuro
      setTimeout(() => {
        console.log('StepRenderer: Reseteando skipToStepValue');
        setSkipToStepValue(null);
        setNavigatingBackward(false);
      }, 100);
      
      return <Redirect to={targetStep} {...stepProps} />;
    }
    
    // Si estamos en el paso 1, devolver ShiftsStep directamente ya que tiene su propia lógica de navegación
    if (state.currentStep === 1) {
      console.log('StepRenderer: Usando ShiftsStep con su propia navegación');
      return <ShiftsStep {...stepProps} />;
    }
    
    // Para todos los demás pasos que no implementan su propia navegación, aseguraremos que tengan la navegación adecuada
    switch (state.currentStep) {
      case 0:
        currentStep = <LocationStep {...stepProps} />;
        break;
      case 2:
        // ItemsStep se encargará de saltar al siguiente paso si no hay ítems disponibles
        currentStep = <ItemsStep {...stepProps} />;
        break;
      case 3:
        currentStep = <ServiceStep {...stepProps} />;
        break;
      case 4:
        currentStep = <DateStep {...stepProps} />;
        break;
      case 5:
        currentStep = <TimeStep {...stepProps} />;
        break;
      case 6:
        currentStep = <SummaryStep {...stepProps} />;
        break;
      case 7:
        currentStep = <ConfirmationStep {...stepProps} />;
        break;
      default:
        currentStep = <div>Paso no encontrado</div>;
    }
    
    // Para todos los pasos (excepto ShiftsStep) en modo móvil, aplicamos automáticamente el MobileLayout
    if (viewType === 'mobile') {
      // Identificar si el paso actual necesita deshabilitar el botón Next
      // Esto depende de la implementación interna de cada componente de paso
      let isStepNextDisabled = false;
      
      // Para pasos conocidos que requieren validación específica, podemos establecer esto manualmente
      if (state.currentStep === 1 && !state.selectedShift) {
        console.log('StepRenderer: Paso de turnos detectado - botón Next deshabilitado debido a que no hay turno seleccionado');
        isStepNextDisabled = true;
      }
      
      return (
        <MobileLayout
          onNext={onNext}
          onBack={onPrevious}
          showBackButton={!isFirstStep}
          isNextDisabled={isStepNextDisabled}
        >
          {currentStep}
        </MobileLayout>
      );
    }
    
    // En modo desktop, retornamos el paso sin envolver
    return currentStep;
  };

  return (
    <Suspense
      fallback={
        <div className="p-8 flex flex-col items-center justify-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      }
    >
      {renderStep()}
    </Suspense>
  );
};
