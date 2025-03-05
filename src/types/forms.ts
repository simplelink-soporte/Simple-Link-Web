import { FormStepField } from './form-steps';

export interface FormData {
  id: string;
  title: string;
  description?: string;
  fields: FormStepField[];
  createdAt: Date;
  updatedAt: Date;
  template: 'Clásico' | 'Minimalista' | 'Llamativo';
  url: string;
  isActive: boolean;
  color?: string;
}

export interface PublishedForm {
  id: string;
  slug: string;
  title: string;
  description?: string;
  fields: FormStepField[];
  settings: {
    theme?: 'light' | 'dark';
    isCustomizable?: boolean;
  };
  customization?: {
    colors?: {
      primary?: string;
    };
    logo?: {
      url?: string;
    };
  };
  status: 'published' | 'draft' | 'archived';
} 