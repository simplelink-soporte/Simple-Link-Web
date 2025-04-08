/**
 * Servicio de logging simple para la aplicación
 * Proporciona funciones para registrar mensajes de diferentes niveles de severidad
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogData {
  [key: string]: any;
}

/**
 * Formatea un objeto para mostrarlo en la consola
 */
const formatData = (data?: LogData): string => {
  if (!data) return '';
  try {
    return JSON.stringify(data, null, 2);
  } catch (error) {
    return `[Error al formatear datos: ${error}]`;
  }
};

/**
 * Obtiene la marca de tiempo actual en formato ISO
 */
const getTimestamp = (): string => {
  return new Date().toISOString();
};

/**
 * Función base para logging
 */
const log = (level: LogLevel, message: string, data?: LogData): void => {
  const timestamp = getTimestamp();
  
  // Formato para mensaje de consola
  const consoleMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  // Seleccionar método de consola según nivel
  switch (level) {
    case 'debug':
      console.debug(consoleMessage, data ? formatData(data) : '');
      break;
    case 'info':
      console.info(consoleMessage, data ? formatData(data) : '');
      break;
    case 'warn':
      console.warn(consoleMessage, data ? formatData(data) : '');
      break;
    case 'error':
      console.error(consoleMessage, data ? formatData(data) : '');
      break;
    default:
      console.log(consoleMessage, data ? formatData(data) : '');
  }
};

/**
 * API pública del logger
 */
const logger = {
  debug: (message: string, data?: LogData) => log('debug', message, data),
  info: (message: string, data?: LogData) => log('info', message, data),
  warn: (message: string, data?: LogData) => log('warn', message, data),
  error: (message: string, data?: LogData) => log('error', message, data),
};

export default logger;
