import { GreetingStepField } from './types';

export function createGreetingField(): GreetingStepField {
  return {
    id: crypto.randomUUID(),
    type: 'greeting',
    label: 'Saludo',
    settings: {
      isActive: true
    }
  };
} 