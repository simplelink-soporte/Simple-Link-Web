import { getPublicComponent, validateStepOrder } from '@/lib/mappers/preview-to-public';
import { FormStepField } from '@/types/form-steps';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { FormError } from '../shared/FormStatusMessages';
import { FormContainer } from './FormContainer';
import { useForm } from '@/contexts/FormContext';
import { toast } from 'react-hot-toast';
import { useCallback } from 'react';

interface PublicFormContentProps {
  fields: FormStepField[];
  currentStep: number;
  onStepChange: (stepId: string, data: any) => void;
  onNext: () => void;
  onPrev: () => void;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  error: Error | null;
  theme: 'light' | 'dark';
  viewType: "mobile" | "desktop";
  slug: string;
  isNextDisabled: boolean;
  nextLabel: string;
  showNextButton: boolean;
  isPublicView: boolean;
  hideNavigation: boolean;
}

export function PublicFormContent({
  fields,
  currentStep,
  onStepChange,
  onNext,
  onPrev,
  onSubmit,
  isSubmitting,
  error,
  theme,
  viewType,
  slug,
  isNextDisabled: isNextButtonDisabled,
  nextLabel,
  showNextButton,
  isPublicView,
  hideNavigation
}: PublicFormContentProps) {
  const currentField = fields[currentStep];
  const nextField = fields[currentStep + 1];
  const isLastStep = currentStep === fields.length - 1;
  const { state } = useForm();

  const handleFieldUpdate = (field: FormStepField, newSettings: Record<string, any>) => {
    console.log('PublicFormContent - Actualizando campo:', field.id, 'con settings:', newSettings);
    onStepChange(field.id, newSettings);
  };

  const handleNext = useCallback(async () => {
    const currentField = fields[currentStep];
    const nextField = fields[currentStep + 1];

    console.log('[Navigation] Iniciando navegación:', {
      from: currentField?.type,
      currentType: currentField?.type,
      currentStep,
      nextStep: currentStep + 1,
      hasNextField: !!nextField,
      totalFields: fields.length
    });

    // Si estamos en el paso summary, asegurarnos de que podemos navegar a farewell
    if (currentField?.type === 'summary') {
      const farewellField = fields.find(f => f.type === 'farewell');
      if (!farewellField) {
        console.warn('No se encontró el paso farewell');
        return;
      }
      
      const isValidOrder = validateStepOrder(currentField.type, 'farewell');
      if (!isValidOrder) {
        console.warn('Orden de pasos inválido para farewell');
        return;
      }

      await onNext();
      return;
    }

    // Manejo normal de navegación
    if (!nextField) {
      console.log('No hay siguiente paso disponible:', {
        currentStep,
        totalSteps: fields.length,
        currentType: currentField?.type
      });
      return;
    }

    const isValidOrder = validateStepOrder(currentField.type, nextField.type);
    if (!isValidOrder) {
      console.warn('Orden de pasos inválido:', {
        currentType: currentField?.type,
        nextType: nextField?.type
      });
      return;
    }

    await onNext();
  }, [currentStep, fields, onNext]);

  // Determinar si es un paso especial que maneja su propia navegación
  const isSpecialStep = (type: string) => {
    return [
      'greeting',
      'login',
      'farewell',
      'sign-in',
      'sign-up',
      'auth',
      'users'
    ].includes(type);
  };

  // Determinar si debemos ocultar la navegación
  const shouldHideNavigation = () => {
    // Si es un paso especial, mantener la navegación visible
    if (currentField?.type === 'summary') return false;
    
    // Si hideNavigation está explícitamente establecido, respetarlo
    if (hideNavigation) return true;
    
    // Para otros pasos especiales, evaluar caso por caso
    return currentField && isSpecialStep(currentField.type);
  };

  // Verificar si el botón siguiente debe estar deshabilitado
  const isNextDisabled = () => {
    if (isNextButtonDisabled) return true;
    if (!currentField) return true;

    switch (currentField.type) {
      case 'location':
        return !state.location.branchId;
      case 'shifts':
        return !state.shift.startTime;
      case 'items':
        return false; // Los items son opcionales
      default:
        return false;
    }
  };

  // Obtener el texto del botón según el tipo de paso
  const getNextButtonLabel = () => {
    if (currentField?.type === 'farewell') return 'Finalizar';
    return 'Siguiente';
  };

  const renderField = (field: FormStepField) => {
    const PreviewComponent = getPublicComponent(field);
    
    if (!PreviewComponent) {
      console.warn(`No preview component found for field type: ${field.type}`);
      return null;
    }

    return (
      <PreviewComponent
        field={field}
        theme={theme}
        viewType={viewType}
        onNext={handleNext}
        onPrev={onPrev}
        isFirstStep={currentStep === 0}
        isLastStep={isLastStep}
        onStepChange={(newSettings: Record<string, any>) => handleFieldUpdate(field, newSettings)}
        isPublicView={true}
        slug={slug}
      />
    );
  };

  return (
    <FormContainer
      theme={theme}
      viewType={viewType}
      onNext={handleNext}
      onPrev={onPrev}
      isFirstStep={currentStep === 0}
      isLastStep={isLastStep}
      hideNavigation={shouldHideNavigation()}
      isNextDisabled={isNextDisabled()}
      nextLabel={getNextButtonLabel()}
      currentStep={currentStep}
      showNextButton={showNextButton}
    >
      <div className="max-w-lg mx-auto space-y-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentField.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {renderField(currentField)}
            {error && <FormError message={error.message} theme={theme} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </FormContainer>
  );
} 
