import { FormStepField } from "@/types/form-steps";

export const BOOKING_FORM_TEMPLATE: FormStepField[] = [
  {
    id: 'step-1',
    type: 'date',
    title: 'Fecha y Hora',
    description: 'Selecciona cuándo quieres jugar',
    required: true,
    order: 1
  },
  {
    id: 'step-2',
    type: 'court',
    title: 'Pista',
    description: 'Elige la pista que prefieras',
    required: true,
    order: 2
  },
  {
    id: 'step-3',
    type: 'players',
    title: 'Jugadores',
    description: 'Indica quiénes van a jugar',
    required: true,
    order: 3
  },
  {
    id: 'step-4',
    type: 'summary',
    title: 'Resumen',
    description: 'Confirma los detalles de tu reserva',
    required: true,
    order: 4
  }
]; 