import { Users } from 'lucide-react';
import { UserStepSettings } from './types';

export const USER_STEP = {
  id: "users",
  label: "Usuarios",
  icon: Users,
  description: "Información del usuario",
  tooltip: "Recopila información personal del usuario"
} as const;

export const DEFAULT_USER_SETTINGS: UserStepSettings = {
  isActive: true,
  showDNI: true,
  showEmail: true,
  showPhone: true,
  showName: true,
  showPassword: false,
  showGender: false
}; 