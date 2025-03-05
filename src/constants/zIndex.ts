/**
 * Constantes para manejar la jerarquía de z-index en la aplicación
 * Mantiene una estructura organizada de capas visuales
 */
export const Z_LAYERS = {
  // Base de la tabla
  TABLE_BASE: 0,
  
  // Encabezados fijos
  STICKY_HEADER: 10,
  
  // Celdas de la tabla
  CELL_BASE: 20,
  
  // Bloques de reserva
  BOOKING_BASE: 30,
  BOOKING_CONTENT: 31,
  BOOKING_HOVER: 32,
} as const 