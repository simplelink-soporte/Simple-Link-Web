import { ScheduleData } from './types';

/**
 * Calendario inicial por defecto para las sedes
 */
export const initialSchedule: ScheduleData = {
  monday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] },
  tuesday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] },
  wednesday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] },
  thursday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] },
  friday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] },
  saturday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] },
  sunday: { isOpen: true, timeRanges: [{ openTime: '08:00', closeTime: '22:00' }] }
};

/**
 * Variantes de animación para componentes motion
 */
export const fadeInVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.3 } }
}; 