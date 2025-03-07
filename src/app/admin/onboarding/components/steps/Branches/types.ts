/**
 * Representa un rango de tiempo para el horario
 */
export interface ScheduleRange {
  openTime: string;
  closeTime: string;
}

/**
 * Representa un día en el horario
 */
export interface ScheduleDay {
  isOpen: boolean;
  timeRanges: ScheduleRange[];
}

/**
 * Representa el horario completo de una sede
 */
export interface ScheduleData {
  [key: string]: ScheduleDay;
}

/**
 * Representa un rango de tiempo con porcentaje para precios personalizados
 */
export interface TimeRangeType {
  startTime: string;
  endTime: string;
  percentage: number;
}

/**
 * Representa los precios personalizados para un día
 */
export interface DayPrice {
  isSelected: boolean;
  timeRanges: TimeRangeType[];
}

/**
 * Representa una pista de la sede
 */
export interface CourtData {
  id: string;
  name: string;
  sports: string[];
  type: string;
  characteristics: string[];
  available_durations: number[];
  duration_pricing: Record<string, number>;
  custom_pricing: {
    [key: string]: {
      isSelected: boolean;
      timeRanges: TimeRangeType[];
    };
  };
  is_active: boolean;
}

/**
 * Representa los datos completos de una sede
 */
export interface BranchFormData {
  name: string;
  address: string;
  phone: string;
  manager: string;
  isActive: boolean;
  timezone: string;
  schedule: ScheduleData;
  courts: CourtData[];
}

/**
 * Props para el componente BranchesStep
 */
export interface BranchesStepProps {
  onReturnToSelection: () => void;
}

/**
 * Representa una sede en el sistema
 */
export interface Branch {
  id: string;
  name: string;
  data?: BranchFormData;
} 