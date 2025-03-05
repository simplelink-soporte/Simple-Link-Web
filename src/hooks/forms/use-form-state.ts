import { useState, useCallback } from 'react';
import { FormStepField } from '@/types/form-steps';
import { PublishedForm } from '@/types/forms/publish';

interface FormMetadata {
  title: string;
  description: string;
}

interface FormUrlConfig {
  // Define the structure of the URL configuration
}

interface UseFormStateReturn {
  currentStep: number;
  fields: FormStepField[];
  metadata: FormMetadata;
  setFields: (fields: FormStepField[]) => void;
  setMetadata: (metadata: FormMetadata) => void;
  nextStep: () => void;
  prevStep: () => void;
  prepareForPublish: () => Omit<PublishedForm, 'id' | 'slug'>;
  isPublished: boolean;
  urlConfig: FormUrlConfig | null;
  setPublished: (published: boolean, urlConfig?: FormUrlConfig) => void;
}

export function useFormState(initialFields: FormStepField[] = []): UseFormStateReturn {
  const [currentStep, setCurrentStep] = useState(0);
  const [fields, setFields] = useState<FormStepField[]>(initialFields);
  const [metadata, setMetadata] = useState<FormMetadata>({
    title: '',
    description: ''
  });
  const [isPublished, setIsPublished] = useState(false);
  const [urlConfig, setUrlConfig] = useState<FormUrlConfig | null>(null);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => 
      prev < fields.filter(f => f.settings.isActive).length - 1 ? prev + 1 : prev
    );
  }, [fields]);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => prev > 0 ? prev - 1 : prev);
  }, []);

  const prepareForPublish = useCallback(() => {
    return {
      title: metadata.title,
      description: metadata.description,
      fields: fields.filter(f => f.settings.isActive),
      status: 'published' as const,
      visibility: 'public' as const,
      settings: {
        theme: 'light',
        allowEdits: true
      },
      analytics: {
        views: 0,
        submissions: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }, [fields, metadata]);

  const setPublished = useCallback((published: boolean, config?: FormUrlConfig) => {
    setIsPublished(published);
    if (config) {
      setUrlConfig(config);
    }
  }, []);

  return {
    currentStep,
    fields,
    metadata,
    setFields,
    setMetadata,
    nextStep,
    prevStep,
    prepareForPublish,
    isPublished,
    urlConfig,
    setPublished
  };
} 