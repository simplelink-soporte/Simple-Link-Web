import { useState, useEffect } from 'react';
import { PublishedForm } from '@/types/forms/publish';
import { PublicFormContent } from './PublicFormContent';
import { cn } from '@/lib/utils';
import { sortFormFields } from '@/lib/mappers/preview-to-public';
import { FormStepField } from '@/types/form-steps';
import { NavigationButtons } from './NavigationButtons';

interface PublicFormLayoutProps {
  form: PublishedForm;
  fields: FormStepField[];
  currentStep: number;
  onNext: () => Promise<void>;
  onPrev: () => void;
  isPublicView?: boolean;
  slug: string;
  isNextDisabled?: boolean;
  nextLabel?: string;
  showNextButton?: boolean;
  onStepChange?: (step: number) => void;
  viewType?: "mobile" | "desktop";
}

export function PublicFormLayout({
  form,
  fields,
  currentStep,
  onNext,
  onPrev,
  isPublicView = false,
  slug,
  isNextDisabled = false,
  nextLabel = 'Siguiente',
  showNextButton = true,
  onStepChange = () => {},
  viewType: propViewType
}: PublicFormLayoutProps) {
  const [viewType, setViewType] = useState<"mobile" | "desktop">(propViewType || "desktop");
  const [formFields, setFormFields] = useState(() => sortFormFields(form.fields));
  const currentField = fields[currentStep];

  console.log('[PublicFormLayout] Renderizando con:', {
    currentStep,
    fieldType: currentField?.type,
    slug,
    isNextDisabled,
    showNextButton,
    nextLabel
  });

  useEffect(() => {
    if (!propViewType) {
      const handleResize = () => {
        setViewType(window.innerWidth < 768 ? "mobile" : "desktop");
      };

      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [propViewType]);

  useEffect(() => {
    if (propViewType) {
      setViewType(propViewType);
    }
  }, [propViewType]);

  useEffect(() => {
    setFormFields(sortFormFields(form.fields));
  }, [form.fields]);

  const handleStepChange = (stepId: string, newSettings: any) => {
    console.log('PublicFormLayout - Actualizando paso:', stepId, 'con:', newSettings);
    
    // Actualizar el estado local manteniendo el orden
    setFormFields(prevFields => 
      sortFormFields(
        prevFields.map(field => 
          field.id === stepId 
            ? { ...field, settings: { ...field.settings, ...newSettings } }
            : field
        )
      )
    );

    // Propagar el cambio hacia arriba
    onStepChange(currentStep);
  };

  return (
    <div className={cn(
      "w-full",
      viewType === "mobile" && "w-full max-w-[430px] mx-auto"
    )}>
      <PublicFormContent
        fields={formFields}
        currentStep={currentStep}
        onNext={onNext}
        onPrev={onPrev}
        onSubmit={async () => {}}
        isSubmitting={false}
        error={null}
        theme={form.settings.theme?.mode || 'light'}
        viewType={viewType}
        slug={slug}
        isNextDisabled={isNextDisabled}
        nextLabel={nextLabel}
        showNextButton={showNextButton && viewType !== "mobile"}
        isPublicView={isPublicView}
        hideNavigation={viewType === "mobile" && isPublicView}
        onStepChange={handleStepChange}
      />
    </div>
  );
} 