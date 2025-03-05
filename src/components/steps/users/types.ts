import { UserSettings } from '@/types/form-steps';

export interface UserStepField {
  id: string;
  type: 'users';
  label: string;
  settings: UserSettings;
} 