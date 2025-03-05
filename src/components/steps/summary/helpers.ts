import { SummaryStepField, SummaryStepSettings } from './types';
import { SUMMARY_STEP } from './constants';

export function createSummaryField(settings?: Partial<SummaryStepSettings>): SummaryStepField {
  return {
    id: crypto.randomUUID(),
    type: 'summary',
    label: SUMMARY_STEP.label,
    title: SUMMARY_STEP.title,
    description: SUMMARY_STEP.description,
    required: SUMMARY_STEP.required,
    settings: {
      ...SUMMARY_STEP.settings,
      ...settings
    }
  };
} 