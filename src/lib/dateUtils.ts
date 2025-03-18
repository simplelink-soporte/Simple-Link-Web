/**
 * Utilidades para el manejo de fechas y tiempos en el proyecto
 */

import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Formatea una fecha a un formato legible
 * @param dateString - String de fecha (ISO)
 * @returns String formateado de la fecha
 */
export function formatDate(dateString: string): string {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
    return format(date, 'dd/MM/yyyy', { locale: es });
  } catch (error) {
    console.error('Error al formatear fecha:', error);
    return dateString || 'Fecha no disponible';
  }
}

/**
 * Formatea una hora a un formato legible
 * @param timeString - String de hora (formato HH:mm o HH:mm:ss)
 * @returns String formateado de la hora
 */
export function formatTime(timeString: string): string {
  if (!timeString) return 'Hora no disponible';
  
  try {
    // Si es una hora completa con fecha ISO
    if (timeString.includes('T')) {
      const date = parseISO(timeString);
      return format(date, 'HH:mm', { locale: es });
    }
    
    // Si es solo hora en formato HH:mm o HH:mm:ss
    const parts = timeString.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }
    
    return timeString;
  } catch (error) {
    console.error('Error al formatear hora:', error);
    return timeString || 'Hora no disponible';
  }
}

/**
 * Formatea una fecha con hora a un formato legible
 * @param dateTimeString - String de fecha y hora (ISO)
 * @returns String formateado de la fecha con hora
 */
export function formatDateTime(dateTimeString: string): string {
  try {
    const date = parseISO(dateTimeString);
    return format(date, 'dd/MM/yyyy HH:mm', { locale: es });
  } catch (error) {
    console.error('Error al formatear fecha y hora:', error);
    return dateTimeString || 'Fecha y hora no disponible';
  }
}
