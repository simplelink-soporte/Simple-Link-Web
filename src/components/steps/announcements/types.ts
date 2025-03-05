export interface AnnouncementsStepSettings {
  isActive: boolean;
  showTitle: boolean;
  showDescription: boolean;
  showIcon: boolean;
  showDismissButton: boolean;
  style: 'info' | 'warning' | 'error' | 'success';
  dismissible: boolean;
  persistent: boolean;
  showTimestamp: boolean;
  showPriority: boolean;
  allowMultiple: boolean;
  maxAnnouncements: number;
}

export interface AnnouncementsStepField {
  id: string;
  type: 'announcements';
  label: string;
  title: string;
  description: string;
  required: boolean;
  settings: AnnouncementsStepSettings;
} 