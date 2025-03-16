import { es } from 'date-fns/locale';
import { format } from 'date-fns';
import type { ClassSession } from '../../../types/models';
import type { FormattedSessionDate } from './types';

/**
 * Comprueba si dos arreglos de sesiones tienen la misma disponibilidad
 * @param oldSessions Arreglo de sesiones anterior
 * @param newSessions Arreglo de sesiones nuevo
 * @returns true si ambos arreglos tienen la misma disponibilidad, false en caso contrario
 */
export const haveSameAvailability = (oldSessions: ClassSession[] = [], newSessions: ClassSession[] = []): boolean => {
  if (oldSessions.length !== newSessions.length) return false;
  
  for (let i = 0; i < oldSessions.length; i++) {
    const oldSession = oldSessions[i];
    const newSession = newSessions[i];
    
    if (
      oldSession.id !== newSession.id ||
      oldSession.spotsLeft !== newSession.spotsLeft ||
      oldSession.totalSpots !== newSession.totalSpots
    ) {
      return false;
    }
  }
  
  return true;
};

/**
 * Formatea una fecha para mostrarla en el componente de sesión
 * @param dateStr Fecha en formato ISO (YYYY-MM-DD)
 * @returns Objeto con el día de la semana, número de día y mes formateados
 */
export const formatSessionDate = (dateStr: string): FormattedSessionDate => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  
  const dayName = format(date, 'EEEE', { locale: es });
  const dayNumber = format(date, 'd', { locale: es });
  const monthName = format(date, 'MMMM', { locale: es });
  
  return {
    dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
    dayNumber,
    monthName: monthName.charAt(0).toUpperCase() + monthName.slice(1)
  };
};

/**
 * Verifica si una sesión de clase está disponible para ser seleccionada
 * @param session Sesión de clase a verificar
 * @returns true si la sesión está disponible, false en caso contrario
 */
export const isSessionAvailable = (session: ClassSession): boolean => {
  return session.spotsLeft !== null && session.spotsLeft > 0;
};
