import type { 
  AuthFormData, 
  SessionFormData, 
  PaymentFormData, 
  RegistrationFormData,
  PackageData
} from './schemas'

// Validar email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validar teléfono (formato argentino)
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^(?:(?:00)?549?)?0?(?:11|[2368]\d)(?:(?=\d{0,2}15)\d{2})??\d{8}$/
  return phoneRegex.test(phone)
}

// Validar DNI
export function isValidDNI(dni: string): boolean {
  const dniRegex = /^\d{7,8}$/
  return dniRegex.test(dni)
}

// Validar fecha
export function isValidDate(date: string): boolean {
  const dateObj = new Date(date)
  return dateObj instanceof Date && !isNaN(dateObj.getTime())
}

// Validar hora
export function isValidTime(time: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  return timeRegex.test(time)
}

// Validar formulario de autenticación
export function validateAuthForm(data: Partial<AuthFormData>): string[] {
  const errors: string[] = []

  if (!data.email) {
    errors.push('El email es requerido')
  } else if (!isValidEmail(data.email)) {
    errors.push('El email no es válido')
  }

  if (data.phone && !isValidPhone(data.phone)) {
    errors.push('El teléfono no es válido')
  }

  if (data.dni && !isValidDNI(data.dni)) {
    errors.push('El DNI no es válido')
  }

  return errors
}

// Validar paquete
export function validatePackageData(data: Partial<PackageData>): string[] {
  const errors: string[] = []

  if (!data.name) {
    errors.push('El nombre es requerido')
  }

  if (!data.class_count || data.class_count < 1) {
    errors.push('Debe tener al menos 1 clase')
  }

  if (data.price === undefined || data.price < 0) {
    errors.push('El precio no puede ser negativo')
  }

  if (!data.expiration_days || data.expiration_days < 1) {
    errors.push('Debe tener al menos 1 día de validez')
  }

  if (!data.available_payment_methods || data.available_payment_methods.length === 0) {
    errors.push('Debe tener al menos un método de pago')
  }

  if (!data.branch_ids || data.branch_ids.length === 0) {
    errors.push('Debe estar asociado a al menos una sucursal')
  }

  return errors
}

// Validar sesión
export function validateSession(data: Partial<SessionFormData>): string[] {
  const errors: string[] = []

  if (!data.date) {
    errors.push('La fecha es requerida')
  } else if (!isValidDate(data.date)) {
    errors.push('La fecha no es válida')
  }

  if (!data.startTime) {
    errors.push('La hora de inicio es requerida')
  } else if (!isValidTime(data.startTime)) {
    errors.push('La hora de inicio no es válida')
  }

  if (!data.endTime) {
    errors.push('La hora de fin es requerida')
  } else if (!isValidTime(data.endTime)) {
    errors.push('La hora de fin no es válida')
  }

  if (data.totalSpots !== undefined && data.totalSpots < 1) {
    errors.push('El total de cupos debe ser mayor a 0')
  }

  if (data.spotsLeft !== undefined && data.spotsLeft < 0) {
    errors.push('Los cupos disponibles no pueden ser negativos')
  }

  return errors
}

// Validar pago
export function validatePayment(data: Partial<PaymentFormData>): string[] {
  const errors: string[] = []

  if (!data.method) {
    errors.push('El método de pago es requerido')
  }

  if (!data.amount || data.amount <= 0) {
    errors.push('El monto debe ser mayor a 0')
  }

  if (data.installments !== undefined && data.installments < 1) {
    errors.push('El número de cuotas debe ser mayor a 0')
  }

  return errors
}

// Validar registro completo
export function validateRegistration(data: Partial<RegistrationFormData>): string[] {
  const errors: string[] = []

  if (!data.classId) {
    errors.push('La clase es requerida')
  }

  if (!data.sessions || data.sessions.length === 0) {
    errors.push('Debe seleccionar al menos una sesión')
  }

  if (!data.payment) {
    errors.push('La información de pago es requerida')
  } else {
    errors.push(...validatePayment(data.payment))
  }

  return errors
} 