import { theme } from '@/config/theme'
import type { ThemeBreakpoint, ThemeContainer, ThemeSpacing } from '@/config/theme'

/**
 * Obtiene una variable CSS del tema
 */
export function getCssVar(variable: string): string {
  return `var(--${variable})`
}

/**
 * Obtiene un valor de breakpoint del tema
 */
export function getBreakpoint(breakpoint: ThemeBreakpoint): string {
  return getCssVar(`breakpoint-${breakpoint}`)
}

/**
 * Obtiene un valor de contenedor del tema
 */
export function getContainer(size: ThemeContainer = '2xl'): string {
  return getCssVar(`container-${size}`)
}

/**
 * Obtiene un valor de espaciado del tema
 */
export function getSpacing(space: ThemeSpacing): string {
  return getCssVar(`spacing-${space}`)
}

/**
 * Genera una media query para un breakpoint específico
 */
export function mediaQuery(breakpoint: ThemeBreakpoint): string {
  return `@media (min-width: ${getBreakpoint(breakpoint)})`
}

/**
 * Genera clases de Tailwind para padding responsivo
 */
export function responsivePadding(type: 'page' | 'container' | 'section'): string {
  // Reemplazar la interpolación con clases específicas
  if (type === 'page') {
    return 'p-4 sm:p-6 lg:p-8';
  } else if (type === 'container') {
    return 'p-2 sm:p-4 lg:p-6';
  } else {
    // section
    return 'p-3 sm:p-5 lg:p-7';
  }
}

/**
 * Genera clases de Tailwind para gap responsivo
 */
export function responsiveGap(size: 'small' | 'medium' | 'large' | 'xlarge'): string {
  // Mapeo de tamaños a clases específicas
  const gapClasses: Record<string, string> = {
    'small': 'gap-2',     // 0.5rem / 8px
    'medium': 'gap-4',    // 1rem / 16px 
    'large': 'gap-6',     // 1.5rem / 24px
    'xlarge': 'gap-8'     // 2rem / 32px
  };
  
  return gapClasses[size] || 'gap-4';
}

/**
 * Genera clases de Tailwind para márgenes responsivos
 */
export function responsiveMargin(direction: 'x' | 'y' | 't' | 'b' | 'l' | 'r'): string {
  const prefix = direction === 'x' ? 'mx' : direction === 'y' ? 'my' : `m${direction}`;
  
  // Reemplazar la interpolación con clases específicas
  return `${prefix}-4 sm:${prefix}-6 lg:${prefix}-8`;
}

/**
 * Genera clases de Tailwind para bordes redondeados
 */
export function getBorderRadius(size: 'sm' | 'default' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'): string {
  // Mapeo de tamaños a clases específicas
  const radiusClasses: Record<string, string> = {
    'sm': 'rounded-sm',
    'default': 'rounded',
    'md': 'rounded-md',
    'lg': 'rounded-lg',
    'xl': 'rounded-xl',
    '2xl': 'rounded-2xl',
    '3xl': 'rounded-3xl',
    'full': 'rounded-full'
  };
  
  return radiusClasses[size] || 'rounded';
}

/**
 * Genera clases de Tailwind para z-index
 */
export function getZIndex(layer: 'negative' | 'elevate' | 'sticky' | 'header' | 'dropdown' | 'modal' | 'toast' | 'tooltip'): string {
  // Mapeo de tipos de capas a clases CSS específicas
  const zIndexClasses: Record<string, string> = {
    'negative': 'z-[-1]', // Valor negativo para elementos que deben estar por debajo
    'elevate': 'z-base',  // Elementos con elevación básica
    'sticky': 'z-sticky',  // Elementos sticky
    'header': 'z-sticky',  // Cabeceras
    'dropdown': 'z-dropdown', // Menús desplegables
    'modal': 'z-modal',    // Ventanas modales
    'toast': 'z-toast',    // Notificaciones toast
    'tooltip': 'z-tooltip' // Tooltips
  };
  
  return zIndexClasses[layer] || 'z-1';
}

/**
 * Genera clases de Tailwind para transiciones
 */
export function getTransition(speed: 'fast' | 'normal' | 'slow'): string {
  // Mapeo de velocidades a clases específicas
  const transitionClasses: Record<string, string> = {
    'fast': 'transition-all duration-150 ease-in-out',
    'normal': 'transition-all duration-300 ease-in-out', 
    'slow': 'transition-all duration-500 ease-in-out'
  };
  
  return transitionClasses[speed] || 'transition-all duration-300 ease-in-out';
} 