import { FormStepField } from "@/types/form-steps";

export interface PublishedFormAnalytics {
  views?: number;
  submissions?: number;
  lastSubmission?: Date;
  lastView?: Date;
}

export interface PublishedFormSettings {
  theme: 'light' | 'dark';
  isCustomizable?: boolean;
}

export interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  order: number;
  options?: any;
}

export interface FormSettings {
  title: string;
  description?: string;
  business_name?: string;
  theme?: {
    mode?: 'light' | 'dark';
    primary_color?: string;
    logo_url?: string;
  };
  fields: FormField[];
  isCustomizable?: boolean;
  analytics?: {
    views: number;
    submissions: number;
  };
  paymentMethods?: {
    available: string[];
    percentages?: Record<string, number>;
  };
}

export interface PublishedForm {
  id: string;
  empresa_id: string;
  slug: string;
  fields: any[];
  settings: FormSettings;
  status: 'published' | 'draft' | 'archived';
  customization?: {
    colors?: {
      primary?: string;
    };
    logo?: {
      url?: string;
    };
  };
  metadata?: {
    createdBy?: string;
    updatedBy?: string;
    country?: string | null;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FormPublishResponse {
  url: string;
  formId: string;
}

export interface FormUrlConfig {
  formId: string;
  slug: string;
  customDomain?: string;
  isCustomizable?: boolean;
}

export interface PublicFormLayoutProps {
  form: PublishedForm;
  fields: any[];
  currentStep: number;
  onNext: () => Promise<void>;
  onPrev: () => void;
  isPublicView: boolean;
  slug: string;
  isSubmitting: boolean;
  isNextDisabled: boolean;
  nextLabel: string;
}