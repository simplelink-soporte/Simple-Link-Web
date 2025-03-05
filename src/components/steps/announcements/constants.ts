import { Bell } from 'lucide-react';
import { AnnouncementsStepSettings } from './types';

export const ANNOUNCEMENTS_STEP = {
  id: "announcements",
  label: "Anuncios",
  icon: Bell,
  description: "Información importante",
  tooltip: "Muestra anuncios o información relevante que el usuario debe conocer"
} as const;

export const DEFAULT_ANNOUNCEMENTS_SETTINGS: AnnouncementsStepSettings = {
  isActive: true,
  showTitle: true,
  showDescription: true,
  showIcon: true,
  showDismissButton: true,
  style: 'info',
  dismissible: true,
  persistent: false,
  showTimestamp: false,
  showPriority: false,
  allowMultiple: true,
  maxAnnouncements: 3
}; 