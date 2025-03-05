export interface GreetingStepField {
  id: string;
  type: 'greeting';
  label: string;
  settings: {
    title?: string;
    subtitle?: string;
  };
} 