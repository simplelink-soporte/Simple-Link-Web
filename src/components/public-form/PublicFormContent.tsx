'use client';

import { useEffect, useState, useCallback } from 'react';
import { useForm } from '@/contexts/FormContext';
import { FormPublishService } from '@/lib/services/forms/publish-service';
import { validateStepOrder, getStepType } from '@/lib/mappers/preview-to-public';
import { PublishedForm } from '@/types/forms/publish';
import { PublicFormLayout } from './layout/PublicFormLayout';
import { toast } from 'sonner';

interface PublicFormContentProps {
  form: PublishedForm;
}

export function PublicFormContent({ form }: PublicFormContentProps) {
  const { state, setStep, resetForm } = useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [viewType, setViewType] = useState<"mobile" | "desktop">("desktop");

  // Detectar el tipo de vista al montar y en resize
  useEffect(() => {
    const handleResize = () => {
      setViewType(window.innerWidth < 768 ? "mobile" : "desktop");
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Obtener el campo actual y siguiente
  const currentField = form.fields[state.currentStep];
  const currentType = getStepType(currentField?.type);
  const nextField = form.fields[state.currentStep + 1];

  // Mostrar el botón siguiente solo si NO es vista móvil pública
  const isMobilePublic = viewType === "mobile";
  const showNextButton = !isMobilePublic;
  const isNextDisabled = isNavigating;

  useEffect(() => {
    console.log('[PublicFormContent] Estado actual:', {
      currentStep: state.currentStep,
      totalSteps: form.fields.length,
      currentField: currentField?.type,
      currentType,
      nextField: nextField?.type,
      showNextButton,
      isNextDisabled
    });
  }, [state.currentStep, form.fields.length, currentField, currentType, nextField, showNextButton, isNextDisabled]);

  useEffect(() => {
    console.log('[PublicFormContent] Inicializando formulario:', {
      id: form.id,
      empresa_id: form.empresa_id,
      totalSteps: form.fields.length,
      currentStep: state.currentStep,
      canNavigateNext: showNextButton
    });
    resetForm();
  }, [form, resetForm, showNextButton]);

  useEffect(() => {
    const formService = new FormPublishService();
    formService.incrementViews(form.slug).catch(console.error);
  }, [form.slug]);

  // Manejar la navegación entre pasos
  const handleNext = useCallback(async () => {
    if (isNavigating) {
      console.log('[Navigation] Navegación en progreso, ignorando');
      return;
    }

    try {
      setIsNavigating(true);
      console.log('[Navigation] Iniciando navegación:', {
        from: currentField?.type,
        currentType,
        currentStep: state.currentStep,
        nextStep: state.currentStep + 1,
        hasNextField: !!nextField
      });

      // Navegar al siguiente paso
      setStep(state.currentStep + 1);
      console.log('[Navigation] Navegación completada al paso:', state.currentStep + 1);

    } catch (error) {
      console.error('[Navigation] Error en navegación:', error);
      toast.error('Error al navegar al siguiente paso');
    } finally {
      setIsNavigating(false);
    }
  }, [state.currentStep, setStep, isNavigating, currentField, currentType, nextField]);

  const handlePrev = useCallback(() => {
    if (state.currentStep <= 0) {
      console.log('[Navigation] Ya estamos en el primer paso');
      return;
    }
    setStep(state.currentStep - 1);
    console.log('[Navigation] Retrocediendo al paso:', state.currentStep - 1);
  }, [state.currentStep, setStep]);

  const handleExitClick = useCallback(() => {
    const hasUnsavedChanges = Object.values(state).some(value => value !== null);
    if (hasUnsavedChanges) {
      setShowExitDialog(true);
    } else {
      window.location.href = '/';
    }
  }, [state]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">
            Cargando formulario...
          </h2>
          <p className="text-gray-500">
            Por favor, espera un momento
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">
            Error al procesar el formulario
          </h2>
          <p className="text-gray-500">
            {error.message || 'Error inesperado al procesar el formulario'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <PublicFormLayout
      form={form}
      fields={form.fields}
      currentStep={state.currentStep}
      onNext={handleNext}
      onPrev={handlePrev}
      isPublicView
      slug={form.slug}
      isNextDisabled={isNextDisabled}
      showNextButton={showNextButton}
      nextLabel={currentType === 'farewell' ? 'Finalizar' : 'Siguiente'}
      viewType={viewType}
    />
  );
}