import { Send } from 'lucide-react';
import { FarewellStepSettings } from './types';

export const FAREWELL_STEP = {
  id: "farewell",
  label: "Despedida",
  icon: Send,
  description: "Mensaje final",
  tooltip: "Mensaje de confirmación y agradecimiento al finalizar el formulario"
} as const;

export const DEFAULT_FAREWELL_SETTINGS: FarewellStepSettings = {
  isActive: true,
  showConfirmationNumber: true,
  showBookingSummary: true,
  showContactInfo: true,
  showSocialShare: true,
  showAddToCalendar: true,
  showDirections: true,
  messageStyle: 'success',
  customMessage: '',
  showQRCode: false,
  actions: {
    downloadPDF: true,
    sendEmail: true,
    addToCalendar: true,
    share: true
  }
}; 