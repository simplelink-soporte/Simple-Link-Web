'use client';

import React, { Suspense } from 'react';
import { useShiftForm } from '../context/ShiftFormContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

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
};

export const StepRenderer: React.FC<{
  onNext: () => void;
  onPrevious: () => void;
}> = ({ onNext, onPrevious }) => {
  const { state } = useShiftForm();
  const totalSteps = 8; // Actualizado para incluir el nuevo paso de Items
  
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
  };

  // Renderizar el paso correspondiente según el estado actual
  const renderStep = () => {
    switch (state.currentStep) {
      case 0:
        return <LocationStep {...stepProps} />;
      case 1:
        return <ShiftsStep {...stepProps} />;
      case 2:
        return <ItemsStep {...stepProps} />;
      case 3:
        return <ServiceStep {...stepProps} />;
      case 4:
        return <DateStep {...stepProps} />;
      case 5:
        return <TimeStep {...stepProps} />;
      case 6:
        return <SummaryStep {...stepProps} />;
      case 7:
        return <ConfirmationStep {...stepProps} />;
      default:
        return <LocationStep {...stepProps} />;
    }
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
