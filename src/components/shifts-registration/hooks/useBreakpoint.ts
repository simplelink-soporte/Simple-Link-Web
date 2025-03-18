import { useState, useEffect } from 'react';

type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

// Definición de los breakpoints en píxeles (siguiendo Tailwind CSS por defecto)
const breakpointMap: Record<Breakpoint, number> = {
  'xs': 0,     // 0px
  'sm': 640,   // 640px
  'md': 768,   // 768px
  'lg': 1024,  // 1024px
  'xl': 1280,  // 1280px
  '2xl': 1536, // 1536px
};

/**
 * Hook personalizado para comprobar si la ventana del navegador está por debajo
 * de un breakpoint específico.
 * 
 * @param breakpoint El breakpoint a comparar ('sm', 'md', 'lg', 'xl', '2xl')
 * @returns boolean - true si el viewport es menor que el breakpoint
 */
export function useBreakpoint(breakpoint: Breakpoint): boolean {
  const [isBelowBreakpoint, setIsBelowBreakpoint] = useState<boolean>(false);

  useEffect(() => {
    // Función para comprobar el breakpoint
    const checkBreakpoint = () => {
      const windowWidth = window.innerWidth;
      const breakpointValue = breakpointMap[breakpoint];
      
      setIsBelowBreakpoint(windowWidth < breakpointValue);
    };

    // Comprobar inmediatamente al montar
    checkBreakpoint();

    // Agregar listener para resize
    window.addEventListener('resize', checkBreakpoint);

    // Cleanup al desmontar
    return () => {
      window.removeEventListener('resize', checkBreakpoint);
    };
  }, [breakpoint]);

  return isBelowBreakpoint;
}

/**
 * Hook personalizado para obtener el breakpoint actual.
 * 
 * @returns La breakpoint actual ('xs', 'sm', 'md', 'lg', 'xl', '2xl')
 */
export function useCurrentBreakpoint(): Breakpoint {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>('xs');

  useEffect(() => {
    // Función para determinar el breakpoint actual
    const determineBreakpoint = () => {
      const windowWidth = window.innerWidth;
      
      // Ordenamos los breakpoints de mayor a menor
      const breakpoints = Object.entries(breakpointMap)
        .sort((a, b) => b[1] - a[1]) as [Breakpoint, number][];
      
      // Encontramos el primer breakpoint que es menor o igual al ancho actual
      for (const [bp, width] of breakpoints) {
        if (windowWidth >= width) {
          setCurrentBreakpoint(bp);
          return;
        }
      }
      
      // Si no encontramos ninguno, establecemos el más pequeño
      setCurrentBreakpoint('xs');
    };

    // Comprobar inmediatamente al montar
    determineBreakpoint();

    // Agregar listener para resize
    window.addEventListener('resize', determineBreakpoint);

    // Cleanup al desmontar
    return () => {
      window.removeEventListener('resize', determineBreakpoint);
    };
  }, []);

  return currentBreakpoint;
}
