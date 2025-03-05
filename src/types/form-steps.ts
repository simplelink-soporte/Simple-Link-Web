import { GreetingStepField } from '@/components/steps/greeting/types';
import { FarewellStepField } from '@/components/steps/farewell/types';
import { UserStepField } from '@/components/steps/users/types';
import { LocationStepField } from '@/components/steps/location/types';
import { ShiftsStepField } from '@/components/steps/shifts/types';
import { ItemsStepField } from '@/components/steps/items/types';
import { SummaryStepField } from '@/components/steps/summary/types';
import { AnnouncementsStepField } from '@/components/steps/announcements/types';
import { CouponsStepField } from '@/components/steps/coupons/types';

// Tipo unión de todos los tipos de pasos
export type FormStepField = {
  id: string;
  type: string;
  title?: string;
  description?: string;
  required?: boolean;
  settings?: Record<string, any>;
} & (
  | GreetingStepField
  | FarewellStepField
  | UserStepField
  | LocationStepField
  | ShiftsStepField
  | ItemsStepField
  | SummaryStepField
  | AnnouncementsStepField
  | CouponsStepField
);

export interface FormPreviewState {
  currentStep: number;
  fields: FormStepField[];
  style: string;
  theme: 'light' | 'dark';
}

export interface StepComponentProps {
  field: FormStepField;
  theme: 'light' | 'dark';
  viewType: "mobile" | "desktop";
  onNext: () => void;
  onPrev: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

// Definimos la interfaz para los settings de usuarios
export interface UserSettings {
  login: {
    showEmail: boolean;
    showDNI: boolean;
    showPhone: boolean;
    showPassword: boolean;
  };
  register: {
    showName: boolean;
    showEmail: boolean;
    showPhone: boolean;
    showDNI: boolean;
    showPassword: boolean;
    showLocation: boolean;
    showGender: boolean;
    showBirthday: boolean;
  };
} 