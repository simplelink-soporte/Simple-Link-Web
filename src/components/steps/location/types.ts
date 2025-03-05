export interface LocationStepSettings {
  isActive: boolean;
  showMap: boolean;
  showAddress: boolean;
  showDirections: boolean;
  defaultLocation: {
    lat: number;
    lng: number;
  };
  showBranches: boolean;
  showSchedule: boolean;
  showContactInfo: boolean;
  allowMultipleBranches: boolean;
}

export interface LocationStepField {
  id: string;
  type: 'location';
  label: string;
  title: string;
  description: string;
  required: boolean;
  settings: LocationStepSettings;
} 