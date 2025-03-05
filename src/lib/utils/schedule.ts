type DaySchedule = {
  isOpen: boolean;
  timeRanges: Array<{
    openTime: string;
    closeTime: string;
  }>;
};

type WeekSchedule = Record<string, DaySchedule>;

const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAYS_ES = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo'
};

export function formatScheduleRange(schedule: WeekSchedule | null): string {
  if (!schedule) return 'Horario no disponible';

  // Encontrar los días que están abiertos
  const openDays = DAYS_ORDER.filter(day => 
    schedule[day]?.isOpen && schedule[day]?.timeRanges?.length > 0
  );

  if (openDays.length === 0) return 'Horario no disponible';

  // Encontrar el rango de días
  const firstDay = openDays[0];
  const lastDay = openDays[openDays.length - 1];
  
  // Encontrar el rango de horarios
  let earliestTime = '23:59';
  let latestTime = '00:00';

  openDays.forEach(day => {
    schedule[day].timeRanges.forEach(range => {
      if (range.openTime < earliestTime) earliestTime = range.openTime;
      if (range.closeTime > latestTime) latestTime = range.closeTime;
    });
  });

  // Formatear el rango de días
  const daysRange = firstDay === lastDay
    ? DAYS_ES[firstDay as keyof typeof DAYS_ES]
    : `${DAYS_ES[firstDay as keyof typeof DAYS_ES]} a ${DAYS_ES[lastDay as keyof typeof DAYS_ES]}`;

  // Formatear el rango de horarios
  return `${daysRange}, de ${earliestTime} a ${latestTime}`;
} 