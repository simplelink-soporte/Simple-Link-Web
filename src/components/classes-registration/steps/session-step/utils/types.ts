import type { ClassSession } from '../../../types/models';

/**
 * Estado para controlar la disponibilidad de sesiones
 */
export interface SessionAvailability {
  [sessionId: string]: {
    isLoading: boolean;
    spotsLeft: number | null;
  }
}

/**
 * Opciones para la paginación de sesiones
 */
export interface SessionPaginationOptions {
  pageSize: number;
  pageNumber: number;
}

/**
 * Opciones para la actualización de disponibilidad de sesiones
 */
export interface AvailabilityUpdateOptions {
  forceUpdate?: boolean;
  visibleSessionsOnly?: boolean;
}

/**
 * Formato de fecha para mostrar en las tarjetas de sesión
 */
export interface FormattedSessionDate {
  dayName: string;
  dayNumber: string;
  monthName: string;
}
