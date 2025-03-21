import { DateTime } from 'luxon';
import { format } from 'date-fns';

/**
 * Servicio para transformar formatos de fecha y hora entre diferentes representaciones
 * Maneja la conversión entre time y timestamp
 */
class BookingTransformerService {
  private static instance: BookingTransformerService;

  private constructor() {}

  public static getInstance(): BookingTransformerService {
    if (!BookingTransformerService.instance) {
      BookingTransformerService.instance = new BookingTransformerService();
    }
    return BookingTransformerService.instance;
  }

  /**
   * Convierte un tiempo en formato timestamp desde UTC a la zona horaria local
   * Utilizado principalmente para visualización de horarios
   */
  public convertBookingTimeToLocal(time: string, timezone: string, date: Date): string {
    console.log(`BookingTransformer - convertBookingTimeToLocal:`, { 
      time, 
      timezone,
      fecha: format(date, 'yyyy-MM-dd') 
    });
    
    // Primero, intenta convertir el timestamp a DateTime
    const dateTime = this.convertDatabaseTimeToDateTime(time, date, timezone);
    
    // Si la conversión fue exitosa, extrae la hora en formato HH:mm
    if (dateTime.isValid) {
      const localTime = dateTime.toFormat('HH:mm');
      console.log(`BookingTransformer - Tiempo convertido a local: ${time} → ${localTime} (${timezone})`);
      return localTime;
    }
    
    // Si falló la conversión con el método principal, usa una estrategia alternativa
    console.warn(`BookingTransformer - Fallback: usando estrategia alternativa para: ${time}`);
    
    // Extraer solo la parte de la hora si tenemos un timestamp
    let timeOnly = time;
    if (time.includes('T')) {
      timeOnly = time.split('T')[1].substring(0, 5);
    } else if (time.includes(' ')) {
      timeOnly = time.split(' ')[1].substring(0, 5);
    }
    
    // Aplicar ajuste de zona horaria
    return this.adjustTimeForTimezone(timeOnly, timezone, date);
  }

  /**
   * Ajusta la hora para la zona horaria correspondiente
   */
  public adjustTimeForTimezone(time: string, timezone: string, date: Date): string {
    const [hours, minutes] = time.split(':').map(Number);
    const dateObj = new Date(date);
    dateObj.setHours(hours, minutes, 0, 0);
    
    // Usar Luxon para una conversión más precisa de zona horaria
    const utcDateTime = DateTime.fromJSDate(dateObj, { zone: 'UTC' });
    const localDateTime = utcDateTime.setZone(timezone);
    
    // Formatear la hora con Luxon para mayor consistencia
    return localDateTime.toFormat('HH:mm');
  }

  /**
   * Convierte un string de tiempo (HH:MM) a un objeto DateTime de Luxon
   * Esta función es crucial para la conversión de horarios de slots
   */
  public convertTimeStringToDateTime(time: string, date: Date, timezone: string): DateTime {
    try {
      console.log(`BookingTransformer - Convirtiendo time string a DateTime:`, { 
        time, 
        fecha: format(date, 'yyyy-MM-dd'),
        timezone
      });
      
      // Validar el formato HH:MM
      if (!time || !time.includes(':')) {
        console.error('BookingTransformer - Error: formato de tiempo inválido:', time);
        return DateTime.invalid('Formato de tiempo inválido');
      }
      
      // Extraer hora y minutos
      const [hours, minutes] = time.split(':').map(Number);
      
      // Si hay valores inválidos, reportarlo
      if (isNaN(hours) || isNaN(minutes)) {
        console.error('BookingTransformer - Error: valores numéricos inválidos en tiempo:', time);
        return DateTime.invalid('Valores numéricos inválidos');
      }
      
      // Estrategia 1: Crear un objeto Date en UTC y luego convertirlo
      const dateObj = new Date(date);
      dateObj.setUTCHours(hours, minutes, 0, 0); // Usar UTC para consistencia
      
      // Convertir a DateTime y luego ajustar la zona horaria
      const dateTime = DateTime.fromJSDate(dateObj, { zone: 'UTC' }).setZone(timezone);
      
      console.log(`BookingTransformer - Time string convertido:`, {
        original: time,
        convertido: dateTime.toFormat('yyyy-MM-dd HH:mm:ss ZZ')
      });
      
      return dateTime;
    } catch (error) {
      console.error('BookingTransformer - Error al convertir time string a DateTime:', error, time);
      return DateTime.invalid('Error en la conversión: ' + String(error));
    }
  }

  /**
   * Convierte un timestamp de la base de datos a un objeto DateTime de Luxon
   * Esta es la función principal para manipular los tiempos en todo el sistema
   */
  public convertDatabaseTimeToDateTime(timestamp: string, date: Date, timezone: string): DateTime {
    try {
      console.log(`BookingTransformer - Convirtiendo tiempo de base de datos:`, { 
        timestamp, 
        fecha: format(date, 'yyyy-MM-dd'),
        timezone
      });
      
      // Validar que el timestamp no sea nulo o vacío
      if (!timestamp) {
        console.error('BookingTransformer - Error: timestamp vacío o nulo');
        return DateTime.invalid('Timestamp nulo o vacío');
      }
      
      let result: DateTime;
      
      // Estrategia 1: Timestamp ISO/SQL completo (contiene fecha y hora)
      if (timestamp.includes(' ') || timestamp.includes('T')) {
        let utcDateTime: DateTime;
        
        if (timestamp.includes('T')) {
          // Formato ISO: '2025-03-21T14:00:00'
          utcDateTime = DateTime.fromISO(timestamp, { zone: 'UTC' });
        } else {
          // Formato SQL: '2025-03-21 14:00:00'
          utcDateTime = DateTime.fromSQL(timestamp, { zone: 'UTC' });
        }
        
        if (utcDateTime.isValid) {
          // Convertir a la zona horaria especificada
          result = utcDateTime.setZone(timezone);
          console.log(`BookingTransformer - Conversión desde timestamp completo exitosa:`, {
            original: timestamp,
            convertido: result.toFormat('yyyy-MM-dd HH:mm:ss ZZ')
          });
          return result;
        }
      }
      
      // Estrategia 2: Solo tiempo (HH:MM o HH:MM:SS)
      // Extraer solo la parte de tiempo si hay fecha+tiempo
      let timeOnly = timestamp;
      if (timestamp.includes('T')) {
        timeOnly = timestamp.split('T')[1].substring(0, 5);
      } else if (timestamp.includes(' ')) {
        timeOnly = timestamp.split(' ')[1].substring(0, 5);
      }
      
      // Crear una fecha completa con el tiempo especificado
      const [hours, minutes] = timeOnly.split(':').map(Number);
      const dateObj = new Date(date);
      dateObj.setUTCHours(hours, minutes, 0, 0);
      
      // Crear DateTime en UTC y convertir a zona horaria local
      const utcDateTime = DateTime.fromJSDate(dateObj, { zone: 'UTC' });
      result = utcDateTime.setZone(timezone);
      
      console.log(`BookingTransformer - Conversión desde tiempo (HH:MM) exitosa:`, {
        original: timestamp,
        timeOnly,
        convertido: result.toFormat('yyyy-MM-dd HH:mm:ss ZZ')
      });
      
      return result;
    } catch (error) {
      console.error('BookingTransformer - Error en convertDatabaseTimeToDateTime:', error);
      return DateTime.invalid('Error en la conversión: ' + String(error));
    }
  }

  /**
   * Convierte una hora en formato HH:mm a minutos desde la medianoche
   * Función clave para los cálculos y comparaciones de tiempo
   */
  public timeToMinutes(time: string): number {
    try {
      if (!time || !time.includes(':')) {
        console.error('BookingTransformer - Error: Formato de tiempo inválido en timeToMinutes:', time);
        return 0;
      }
      
      // Extraer componentes de hora y minutos
      const [hours, minutes] = time.split(':').map(Number);
      
      if (isNaN(hours) || isNaN(minutes)) {
        console.error('BookingTransformer - Error: Componentes numéricos inválidos en timeToMinutes:', time);
        return 0;
      }
      
      // Calcular minutos desde la medianoche
      const totalMinutes = (hours * 60) + minutes;
      
      // Para debugging
      if (totalMinutes < 0 || totalMinutes > 1440) {
        console.warn('BookingTransformer - Advertencia: Minutos fuera de rango (0-1440):', {
          tiempo: time,
          minutos: totalMinutes
        });
      }
      
      return totalMinutes;
    } catch (error) {
      console.error('BookingTransformer - Error en timeToMinutes:', error, time);
      return 0;
    }
  }

  /**
   * Convierte minutos desde la medianoche a formato HH:mm
   * Función complementaria a timeToMinutes
   */
  public minutesToTime(minutes: number): string {
    try {
      if (isNaN(minutes) || minutes < 0) {
        console.error('BookingTransformer - Error: Valor inválido en minutesToTime:', minutes);
        return '00:00';
      }
      
      // Manejar casos donde los minutos exceden un día (por seguridad)
      if (minutes >= 1440) {
        console.warn('BookingTransformer - Ajustando minutos que exceden un día:', minutes);
        minutes = minutes % 1440;
      }
      
      // Calcular horas y minutos
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      
      // Formatear con ceros a la izquierda
      const formattedHours = hours.toString().padStart(2, '0');
      const formattedMinutes = mins.toString().padStart(2, '0');
      
      return `${formattedHours}:${formattedMinutes}`;
    } catch (error) {
      console.error('BookingTransformer - Error en minutesToTime:', error, minutes);
      return '00:00';
    }
  }

  /**
   * Extrae los minutos desde la medianoche de un timestamp
   * Maneja tanto formato de time como formato de timestamp
   */
  public extractTimeMinutesFromTimestamp(timestamp: string): number {
    try {
      // Si es un timestamp (contiene espacios o T)
      if (timestamp.includes(' ') || timestamp.includes('T')) {
        let timeStr: string;
        
        if (timestamp.includes('T')) {
          // Formato ISO
          timeStr = timestamp.split('T')[1].substring(0, 5);
        } else {
          // Formato SQL
          timeStr = timestamp.split(' ')[1].substring(0, 5);
        }
        
        return this.timeToMinutes(timeStr);
      }
      
      // Si es formato hora simple (HH:MM)
      return this.timeToMinutes(timestamp);
    } catch (error) {
      console.error('BookingTransformer - Error al extraer minutos del timestamp:', error, timestamp);
      return 0; // Valor por defecto en caso de error
    }
  }

  /**
   * Convierte time a timestamp para guardar en la base de datos
   */
  public timeToTimestamp(time: string, date: string): string {
    return `${date} ${time}:00`;
  }
}

export default BookingTransformerService.getInstance();
