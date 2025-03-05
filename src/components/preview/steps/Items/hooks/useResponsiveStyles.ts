import { useMemo } from 'react';
import { RESPONSIVE_STYLES, ViewType, ResponsiveStyleKey } from '../constants/responsive-styles';

interface UseResponsiveStylesReturn {
  /** Obtiene el estilo correspondiente para la vista actual */
  getStyle: (key: ResponsiveStyleKey) => string;
  /** Indica si la vista actual es desktop */
  isDesktop: boolean;
  /** Indica si la vista actual es mobile */
  isMobile: boolean;
  /** Obtiene los estilos para ambas vistas */
  styles: typeof RESPONSIVE_STYLES;
}

/**
 * Hook personalizado para manejar estilos responsive en Items
 * @param viewType - Tipo de vista actual ('mobile' | 'desktop')
 * @returns Objeto con utilidades para manejar estilos responsive
 */
export function useResponsiveStyles(viewType: ViewType): UseResponsiveStylesReturn {
  const getStyle = useMemo(() => {
    return (key: ResponsiveStyleKey): string => {
      const styles = RESPONSIVE_STYLES[key];
      return styles[viewType] || '';
    };
  }, [viewType]);

  return {
    getStyle,
    isDesktop: viewType === 'desktop',
    isMobile: viewType === 'mobile',
    styles: RESPONSIVE_STYLES
  };
} 