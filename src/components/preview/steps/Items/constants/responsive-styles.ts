export const RESPONSIVE_STYLES = {
  container: {
    mobile: 'fixed inset-x-0 top-0 bottom-0 bg-white dark:bg-neutral-900 z-10 overflow-y-auto',
    desktop: 'space-y-6 px-4 py-6'
  },
  header: {
    mobile: 'text-base font-medium sticky top-0 bg-inherit px-4 py-6',
    desktop: 'text-lg font-medium'
  },
  searchBar: {
    mobile: 'px-4 sticky top-0 z-20 bg-inherit py-3 border-b dark:border-gray-800',
    desktop: 'px-0 py-4'
  },
  itemsGrid: {
    mobile: 'grid grid-cols-1 gap-3 px-4',
    desktop: 'grid grid-cols-2 gap-4'
  },
  itemCard: {
    mobile: 'p-3 rounded-xl bg-white dark:bg-neutral-800 shadow-sm',
    desktop: 'p-4 rounded-xl bg-white dark:bg-neutral-800 shadow-md'
  },
  quantitySelector: {
    mobile: 'flex items-center space-x-2 mt-2',
    desktop: 'flex items-center space-x-3 mt-3'
  }
} as const;

// Tipo para las claves de los estilos
export type ResponsiveStyleKey = keyof typeof RESPONSIVE_STYLES;

// Tipo para los viewTypes disponibles
export type ViewType = 'mobile' | 'desktop';

// Tipo para los temas disponibles
export type Theme = 'light' | 'dark'; 