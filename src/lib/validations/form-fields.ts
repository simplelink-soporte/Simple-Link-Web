type ValidationRule = {
  validate: (value: any) => boolean;
  message: string;
};

export const fieldValidations: Record<string, ValidationRule[]> = {
  text: [
    {
      validate: (value: string) => value.length > 0,
      message: 'Este campo es requerido'
    }
  ],
  email: [
    {
      validate: (value: string) => value.length > 0,
      message: 'El email es requerido'
    },
    {
      validate: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      message: 'Email inválido'
    }
  ],
  phone: [
    {
      validate: (value: string) => value.length > 0,
      message: 'El teléfono es requerido'
    },
    {
      validate: (value: string) => /^\+?[\d\s-]{8,}$/.test(value),
      message: 'Teléfono inválido'
    }
  ]
};

export function validateField(type: string, value: any): string | null {
  const rules = fieldValidations[type];
  if (!rules) return null;

  for (const rule of rules) {
    if (!rule.validate(value)) {
      return rule.message;
    }
  }

  return null;
} 