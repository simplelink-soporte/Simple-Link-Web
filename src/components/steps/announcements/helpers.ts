import { AnnouncementsStepField, AnnouncementsStepSettings } from './types';
import { ANNOUNCEMENTS_STEP, DEFAULT_ANNOUNCEMENTS_SETTINGS } from './constants';

export function createAnnouncementsField(settings?: Partial<AnnouncementsStepSettings>): AnnouncementsStepField {
  return {
    id: crypto.randomUUID(),
    type: 'announcements',
    label: ANNOUNCEMENTS_STEP.label,
    title: "Anuncios Importantes",
    description: "Información relevante sobre tu reserva",
    required: false,
    settings: {
      ...DEFAULT_ANNOUNCEMENTS_SETTINGS,
      ...settings
    }
  };
} 