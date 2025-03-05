export interface ShiftsStepSettings {
  isActive: boolean;
  showFullCalendar: boolean;
  showTimeSlots: boolean;
  showDuration: boolean;
  showCapacity: boolean;
  showPrice: boolean;
  allowMultipleSlots: boolean;
  minDuration: {
    value: number;
    unit: 'minutes' | 'hours';
  };
  maxDuration: {
    value: number;
    unit: 'minutes' | 'hours';
  };
  allowDurationChange: boolean;
  showAvailability: boolean;
}

export interface ShiftsStepField {
  id: string;
  type: 'shifts';
  label: string;
  title: string;
  description: string;
  required: boolean;
  settings: ShiftsStepSettings;
} 