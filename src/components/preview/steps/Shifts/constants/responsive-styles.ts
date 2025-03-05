export const RESPONSIVE_STYLES = {
  container: {
    mobile: 'fixed inset-0 bg-white dark:bg-neutral-900 overflow-y-auto',
    desktop: 'space-y-6 px-4 py-6'
  },
  header: {
    mobile: 'text-base font-medium',
    desktop: 'text-lg font-medium'
  },
  calendar: {
    mobile: 'w-full',
    desktop: 'w-full'
  },
  shiftsGrid: {
    mobile: 'grid grid-cols-1 gap-3',
    desktop: 'grid grid-cols-2 gap-4'
  },
  shiftCard: {
    mobile: 'p-3 rounded-xl bg-white dark:bg-neutral-800 shadow-sm',
    desktop: 'p-4 rounded-xl bg-white dark:bg-neutral-800 shadow-md'
  },
  filters: {
    mobile: 'flex items-center space-x-2',
    desktop: 'flex items-center space-x-3'
  }
} as const;

// Tipo para las claves de los estilos
export type ResponsiveStyleKey = keyof typeof RESPONSIVE_STYLES;

// Tipo para los viewTypes disponibles
export type ViewType = 'mobile' | 'desktop';

// Tipo para los temas disponibles
export type Theme = 'light' | 'dark'; 