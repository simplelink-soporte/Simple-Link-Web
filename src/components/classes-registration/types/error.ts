// Tipos de error específicos para el registro de clases
export type ClassRegistrationErrorType = 
  | 'AUTH_ERROR'
  | 'LOAD_ERROR'
  | 'VALIDATION_ERROR'
  | 'API_ERROR'
  | 'UNKNOWN_ERROR'

export interface ClassRegistrationError {
  type: ClassRegistrationErrorType
  message: string
  details?: unknown
}

// Funciones auxiliares para crear errores tipados
export const createClassRegistrationError = (
  type: ClassRegistrationErrorType,
  message: string,
  details?: unknown
): ClassRegistrationError => ({
  type,
  message,
  details
})

// Función para convertir errores desconocidos a nuestro formato
export const normalizeError = (error: unknown): ClassRegistrationError => {
  if (error instanceof Error) {
    return createClassRegistrationError(
      'UNKNOWN_ERROR',
      error.message,
      error
    )
  }
  
  if (typeof error === 'string') {
    return createClassRegistrationError(
      'UNKNOWN_ERROR',
      error
    )
  }
  
  return createClassRegistrationError(
    'UNKNOWN_ERROR',
    'Ha ocurrido un error inesperado',
    error
  )
} 