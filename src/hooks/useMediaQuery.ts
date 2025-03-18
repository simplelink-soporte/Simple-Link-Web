/**
 * Hook para detectar media queries con React
 */

import { useState, useEffect } from 'react';

/**
 * Hook personalizado para detectar media queries
 * @param query - Media query a evaluar (ej: '(max-width: 768px)')
 * @returns Boolean que indica si la media query coincide
 */
export function useMediaQuery(query: string): boolean {
  // Estado para almacenar si la media query coincide
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    // Comprobar si window está disponible (para SSR)
    if (typeof window !== 'undefined') {
      // Crear el media query
      const media = window.matchMedia(query);
      
      // Establecer estado inicial
      setMatches(media.matches);
      
      // Función para actualizar el estado
      const listener = (event: MediaQueryListEvent) => {
        setMatches(event.matches);
      };
      
      // Agregar listener para cambios
      // Usamos try-catch ya que algunos navegadores antiguos no soportan addEventListener
      try {
        media.addEventListener('change', listener);
        return () => {
          media.removeEventListener('change', listener);
        };
      } catch (e) {
        // Fallback para navegadores antiguos
        media.addListener(listener);
        return () => {
          media.removeListener(listener);
        };
      }
    }
    
    // Devolver una función de limpieza vacía para SSR
    return () => {};
  }, [query]);
  
  return matches;
}
