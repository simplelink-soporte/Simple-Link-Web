import { MapPin } from 'lucide-react';
import { LocationStepSettings } from './types';

export const LOCATION_STEP = {
  id: "location",
  label: "Ubicación",
  icon: MapPin,
  description: "Datos de localización",
  tooltip: "Permite seleccionar la sucursal"
} as const;

export const DEFAULT_LOCATION_SETTINGS: LocationStepSettings = {
  isActive: true,
  showMap: true,
  showAddress: true,
  showDirections: true,
  defaultLocation: {
    lat: -34.6037,
    lng: -58.3816
  },
  showBranches: true,
  showSchedule: true,
  showContactInfo: true,
  allowMultipleBranches: false
}; 