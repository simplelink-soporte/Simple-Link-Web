export interface FarewellStepSettings {
  isActive: boolean;
  showConfirmationNumber: boolean;
  showBookingSummary: boolean;
  showContactInfo: boolean;
  showSocialShare: boolean;
  showAddToCalendar: boolean;
  showDirections: boolean;
  messageStyle: 'success' | 'info';
  customMessage: string;
  showQRCode: boolean;
  actions: {
    downloadPDF: boolean;
    sendEmail: boolean;
    addToCalendar: boolean;
    share: boolean;
  };
}

export interface FarewellStepField {
  id: string;
  type: 'farewell';
  label: string;
  title: string;
  description: string;
  required: boolean;
  settings: FarewellStepSettings;
} 