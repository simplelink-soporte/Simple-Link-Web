import { useState, useCallback } from 'react';

import { FormStepField } from '@/types/form-steps';

import { validateField } from '@/lib/validations/form-fields';

import FormResponsesService from '@/lib/services/forms/responses-service';



interface FormErrors {

  [key: string]: string | null;

}



interface UsePublicFormReturn {

  currentStep: number;

  responses: Record<string, any>;

  errors: FormErrors;

  isSubmitting: boolean;

  submitError: string | null;

  setResponse: (stepId: string, data: any) => void;

  nextStep: () => void;

  prevStep: () => void;

  submitForm: () => Promise<void>;

}



export function usePublicForm(formId: string, fields: FormStepField[] = []): UsePublicFormReturn {

  const [currentStep, setCurrentStep] = useState(0);

  const [responses, setResponses] = useState<Record<string, any>>({});

  const [errors, setErrors] = useState<FormErrors>({});

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [submitError, setSubmitError] = useState<string | null>(null);



  const validateStep = useCallback((stepId: string) => {

    const field = fields.find(f => f.id === stepId);

    if (!field?.settings.required) return true;



    const value = responses[stepId];

    const error = validateField(field.type, value);

    

    setErrors(prev => ({

      ...prev,

      [stepId]: error

    }));



    return !error;

  }, [fields, responses]);



  const setResponse = useCallback((stepId: string, data: any) => {

    setResponses(prev => ({

      ...prev,

      [stepId]: data

    }));

  }, []);



  const nextStep = useCallback(() => {

    if (!Array.isArray(fields) || !fields.length || currentStep < 0 || currentStep >= fields.length) {

      return;

    }



    const currentField = fields[currentStep];

    if (!validateStep(currentField.id)) return;



    if (currentStep < fields.length - 1) {

      setCurrentStep(prev => prev + 1);

    }

  }, [currentStep, fields, validateStep]);



  const prevStep = useCallback(() => {

    if (currentStep > 0) {

      setCurrentStep(prev => prev - 1);

    }

  }, [currentStep]);



  const submitForm = async () => {

    if (!fields.length) return;

    

    setIsSubmitting(true);

    setSubmitError(null);

    

    try {

      await FormResponsesService.saveResponse(formId, {

        formId,

        responses,

        metadata: {

          completedAt: new Date()

        }

      });

    } catch (err) {

      setSubmitError('Error al enviar el formulario');

      throw err;

    } finally {

      setIsSubmitting(false);

    }

  };



  return {

    currentStep,

    responses,

    errors,

    isSubmitting,

    submitError,

    setResponse,

    nextStep,

    prevStep,

    submitForm

  };

} 
