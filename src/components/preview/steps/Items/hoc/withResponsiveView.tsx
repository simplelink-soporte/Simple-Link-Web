import { ComponentType } from 'react';
import { cn } from '@/lib/utils';
import { RESPONSIVE_STYLES } from '../constants/responsive-styles';
import { useResponsiveStyles } from '../hooks/useResponsiveStyles';

export interface WithResponsiveViewProps {
  viewType: 'mobile' | 'desktop';
  theme: 'light' | 'dark';
  isPublicView?: boolean;
  [key: string]: any;
}

interface ResponsiveOptions {
  /** Clases específicas para la vista móvil */
  mobileClassName?: string;
  /** Clases específicas para la vista desktop */
  desktopClassName?: string;
  /** Identificador para obtener estilos predefinidos */
  styleKey?: keyof typeof RESPONSIVE_STYLES;
  /** Deshabilitar contenedor wrapper */
  disableWrapper?: boolean;
  /** Forzar ancho completo */
  fullWidth?: boolean;
}

/**
 * HOC que proporciona capacidades responsive a los componentes de Items
 * @param Component - Componente a envolver
 * @param options - Opciones de configuración del componente responsive
 */
export function withResponsiveView<P extends WithResponsiveViewProps>(
  Component: ComponentType<P>,
  options: ResponsiveOptions = {}
) {
  const ResponsiveComponent = (props: P) => {
    const { viewType, theme, isPublicView, ...rest } = props;
    const { getStyle } = useResponsiveStyles(viewType);

    // Si el wrapper está deshabilitado, renderizar el componente directamente
    if (options.disableWrapper || options.fullWidth) {
      return <Component {...props as P} />;
    }

    // Obtener estilos base desde las constantes si se proporciona styleKey
    const baseStyles = options.styleKey ? getStyle(options.styleKey) : '';

    // Combinar estilos base con clases específicas proporcionadas en options
    const containerClassName = cn(
      baseStyles,
      viewType === 'mobile' ? options.mobileClassName : options.desktopClassName,
      // Clases base que se aplican siempre
      'transition-all duration-300',
      theme === 'dark' ? 'dark' : 'light'
    );

    return (
      <div className={containerClassName}>
        <Component {...props as P} />
      </div>
    );
  };

  // Asignar un nombre descriptivo al componente para DevTools
  ResponsiveComponent.displayName = `withResponsiveView(${Component.displayName || Component.name || 'Component'})`;

  return ResponsiveComponent;
} 