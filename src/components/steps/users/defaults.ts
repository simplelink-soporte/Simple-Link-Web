import { UserSettings } from '@/types/form-steps';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  login: {
    showEmail: true,
    showDNI: false,
    showPhone: false,
    showPassword: true,
  },
  register: {
    showName: true,
    showEmail: true,
    showPhone: true,
    showDNI: false,
    showPassword: true,
    showLocation: true,
    showGender: false,
    showBirthday: false,
  }
}; 