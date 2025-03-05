export const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00', '13:00', 
  '14:00', '15:00', '16:00', '17:00', '18:00', 
  '19:00', '20:00', '21:00', '22:00'
];

export const TIME_RANGES = {
  morning: { start: '09:00', end: '12:59' },
  afternoon: { start: '13:00', end: '18:59' },
  night: { start: '19:00', end: '22:00' }
} as const;

export const HOLD_DURATION = 5 * 60 * 1000; // 5 minutos en milisegundos

export const COURT_TYPES = {
  indoor: 'Interior',
  outdoor: 'Exterior',
  covered: 'Cubierta'
} as const;

export const DURATIONS = [
  { value: 1, label: '1 hora' },
  { value: 1.5, label: '1 hora y media' },
  { value: 2, label: '2 horas' },
  { value: 2.5, label: '2 horas y media' },
  { value: 3, label: '3 horas' }
] as const; 