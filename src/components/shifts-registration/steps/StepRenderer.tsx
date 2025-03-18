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

export const StepRenderer: React.FC<{
  onNext: () => void;
  onPrevious: () => void;
}> = ({ onNext, onPrevious }) => {
  const { state } = useShiftForm();
  const totalSteps = 8; // Actualizado para incluir el nuevo paso de Items
  
  // Estado para detectar si es móvil o desktop
  const [viewType, setViewType] = useState<'mobile' | 'desktop'>('desktop');
  
  // Efecto para detectar si es móvil
  useEffect(() => {
    const checkIfMobile = () => {
      setViewType(window.innerWidth < 768 ? 'mobile' : 'desktop');
    };

    // Verificar inicialmente
    checkIfMobile();

    // Añadir listener para cambios de tamaño
    window.addEventListener('resize', checkIfMobile);

    // Limpiar listener al desmontar
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);
  
  // Calcular propiedades comunes para todos los pasos
  const isFirstStep = state.currentStep === 0;
  const isLastStep = state.currentStep === totalSteps - 1;
  const progress = Math.round(((state.currentStep + 1) / totalSteps) * 100);
  
  // Props comunes para todos los pasos
  const stepProps: StepComponentProps = {
    onNext,
    onPrevious,
    isFirstStep,
    isLastStep,
    progress,
    viewType,
  };

  // Renderizar el paso correspondiente según el estado actual
  const renderStep = () => {
    let currentStep;
    
    switch (state.currentStep) {
      case 0:
        currentStep = <LocationStep {...stepProps} />;
        break;
      case 1:
        // ShiftsStep ya tiene su propia lógica para manejar la vista móvil
        return <ShiftsStep {...stepProps} />;
      case 2:
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
      return (
        <MobileLayout
          onNext={onNext}
          onBack={onPrevious}
          showBackButton={!isFirstStep}
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
