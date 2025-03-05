import { FormStepField } from "@/types/form-steps";

export const validateStepOrder = (fields: FormStepField[]): { isValid: boolean; error?: string } => {
  // Encontrar índices de los pasos relevantes
  const locationIndex = fields.findIndex(f => f.type === 'location');
  const shiftsIndex = fields.findIndex(f => f.type === 'shifts');
  const farewellIndex = fields.findIndex(f => f.type === 'farewell');

  // Si existe ubicación y turnos, verificar el orden
  if (locationIndex !== -1 && shiftsIndex !== -1) {
    if (shiftsIndex < locationIndex) {
      return {
        isValid: false,
        error: 'El paso "Turnos" debe estar después del paso "Ubicación"'
      };
    }
  }

  // Si existe despedida, verificar que esté al final
  if (farewellIndex !== -1 && farewellIndex !== fields.length - 1) {
    return {
      isValid: false,
      error: 'El paso "Despedida" debe ser el último paso'
    };
  }

  return { isValid: true };
}; 