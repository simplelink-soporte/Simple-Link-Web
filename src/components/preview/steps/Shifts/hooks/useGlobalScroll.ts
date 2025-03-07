import { useEffect, useRef, RefObject } from 'react';

interface UseGlobalScrollOptions {
  enabled: boolean;
  preventScrollOnBody?: boolean;
  scrollSpeed?: number;
  initialPadding?: number; // Padding inicial para evitar que los elementos queden en los bordes
}

/**
 * Hook personalizado para capturar eventos de scroll global y redirigirlos
 * a un contenedor específico con comportamiento natural.
 * 
 * @param targetRef - Referencia al elemento donde se aplicará el scroll
 * @param options - Opciones de configuración
 */
export function useGlobalScroll(
  targetRef: RefObject<HTMLDivElement>,
  options: UseGlobalScrollOptions
) {
  const isScrolling = useRef(false);
  const { enabled, preventScrollOnBody = true, scrollSpeed = 1, initialPadding = 20 } = options;

  // Efecto para ajustar el scroll inicial y evitar elementos en los bordes
  useEffect(() => {
    if (!enabled || !targetRef.current) return;
    
    // Pequeño retraso para asegurar que el contenido esté renderizado
    const timeoutId = setTimeout(() => {
      if (targetRef.current) {
        // Aplicar un pequeño scroll inicial para evitar que el primer elemento quede
        // exactamente en el borde superior
        targetRef.current.scrollTop = initialPadding;
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [enabled, initialPadding]);

  useEffect(() => {
    if (!enabled) return;

    // Manejador de eventos para detectar scrolleo en toda la página
    const handleWheel = (e: WheelEvent) => {
      // No procesar si el elemento objetivo no está disponible
      if (!targetRef.current) return;

      // Prevenir scroll por defecto si está configurado así
      if (preventScrollOnBody) {
        e.preventDefault();
      }

      // Simple multiplicador para el scroll - más cercano al comportamiento nativo
      const scrollAmount = e.deltaY * scrollSpeed;
      
      // Aplicar el scroll directamente, sin animaciones adicionales
      targetRef.current.scrollTop += scrollAmount;
    };

    // Agregar el listener con passive: false para poder prevenir el comportamiento por defecto
    window.addEventListener('wheel', handleWheel, { passive: false });

    // Limpieza al desmontar
    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, [enabled, preventScrollOnBody, scrollSpeed, targetRef]);

  return { isScrolling: isScrolling.current };
} 