import { UserStepField, UserStepSettings } from './types';
import { USER_STEP, DEFAULT_USER_SETTINGS } from './constants';

export function createUserField(settings?: Partial<UserStepSettings>): UserStepField {
  return {
    id: crypto.randomUUID(),
    type: 'users',
    label: USER_STEP.label,
    title: "Iniciar Sesión",
    description: "Ingresa tus datos para continuar",
    required: false,
    settings: {
      ...DEFAULT_USER_SETTINGS,
      ...settings
    }
  };
} 