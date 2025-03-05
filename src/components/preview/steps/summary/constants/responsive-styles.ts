export const RESPONSIVE_STYLES = {
  container: {
    mobile: 'fixed inset-x-0 top-[300px] bottom-0 bg-white dark:bg-neutral-900 z-10 overflow-y-auto rounded-t-[2rem] shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.2)]',
    desktop: 'space-y-6 px-4 py-6'
  },
  modal: {
    mobile: 'fixed bottom-0 left-0 right-0 max-h-[90vh] rounded-t-xl w-full',
    desktop: 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl w-[480px] max-h-[85vh]'
  },
  header: {
    mobile: 'text-base font-medium sticky top-0 bg-inherit',
    desktop: 'text-lg font-medium'
  },
  content: {
    mobile: 'p-4',
    desktop: 'p-6'
  },
  grid: {
    mobile: 'grid grid-cols-1 gap-4',
    desktop: 'grid grid-cols-2 gap-6'
  },
  button: {
    mobile: 'w-full py-3',
    desktop: 'py-2 px-4'
  }
} as const;

// Tipo para las claves de los estilos
export type ResponsiveStyleKey = keyof typeof RESPONSIVE_STYLES;

// Tipo para los viewTypes disponibles
export type ViewType = 'mobile' | 'desktop';

// Tipo para los temas disponibles
export type Theme = 'light' | 'dark'; 