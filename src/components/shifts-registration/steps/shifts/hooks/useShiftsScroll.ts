import { useEffect, useRef, RefObject } from 'react';

interface UseShiftsScrollOptions {
  enabled: boolean;
  scrollSpeed?: number;
  initialPadding?: number;
}

/**
 * Hook personalizado para capturar todos los eventos de scroll global 
 * y redirigirlos al contenedor de turnos, bloqueando completamente 
 * el scroll de la página.
 * 
 * @param targetRef - Referencia al elemento donde se aplicará el scroll
 * @param options - Opciones de configuración
 */
export function useShiftsScroll(
  targetRef: RefObject<HTMLDivElement>,
  options: UseShiftsScrollOptions
) {
  const isScrolling = useRef(false);
  // Crear la referencia lastTouchY fuera del useEffect
  const lastTouchY = useRef<number | null>(null);
  const { enabled, scrollSpeed = 1, initialPadding = 20 } = options;

  // Efecto para ajustar el scroll inicial
  useEffect(() => {
    if (!enabled || !targetRef.current) return;
    
    // Pequeño retraso para asegurar que el contenido esté renderizado
    const timeoutId = setTimeout(() => {
      if (targetRef.current) {
        // Aplicar un pequeño scroll inicial 
        targetRef.current.scrollTop = initialPadding;
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [enabled, initialPadding]);

  // Efecto para manejar el scroll global
  useEffect(() => {
    if (!enabled) return;

    // Función para bloquear el scroll del documento
    const blockPageScroll = () => {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.body.style.removeProperty('overflow');
        document.documentElement.style.removeProperty('overflow');
      };
    };

    // Bloquear scroll de la página inmediatamente
    const unblockScroll = blockPageScroll();

    // Manejador de eventos para detectar scrolleo en toda la página
    const handleWheel = (e: WheelEvent) => {
      // No procesar si el elemento objetivo no está disponible
      if (!targetRef.current) return;
      
      // Siempre prevenir el comportamiento predeterminado
      e.preventDefault();

      // Calcular la cantidad de scroll
      const scrollAmount = e.deltaY * scrollSpeed;
      
      // Aplicar el scroll directamente al contenedor de turnos
      targetRef.current.scrollTop += scrollAmount;
      
      // Marcar que estamos scrolleando
      isScrolling.current = true;
      
      // Limpiar el estado después de un breve periodo
      setTimeout(() => {
        isScrolling.current = false;
      }, 150);
    };

    // Agregar el listener con passive: false para poder prevenir el comportamiento por defecto
    window.addEventListener('wheel', handleWheel, { passive: false });

    // También capturar eventos de touch para dispositivos móviles
    const handleTouchMove = (e: TouchEvent) => {
      if (!targetRef.current || e.touches.length !== 1) return;
      
      // Solo prevenir si estamos tocando cerca del contenedor
      const touch = e.touches[0];
      
      // Si el toque está dentro del viewport, dirigir al contenedor
      if (touch.clientY > 0 && touch.clientY < window.innerHeight) {
        e.preventDefault();
        
        // Procesar el movimiento solo si tenemos un toque anterior para comparar
        if (lastTouchY.current !== null) {
          const deltaY = lastTouchY.current - touch.clientY;
          targetRef.current.scrollTop += deltaY * scrollSpeed;
        }
        
        // Actualizar la posición del último toque
        lastTouchY.current = touch.clientY;
      }
    };
    
    // Manejador para el inicio del toque
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        lastTouchY.current = e.touches[0].clientY;
      }
    };
    
    // Manejador para el fin del toque
    const handleTouchEnd = () => {
      lastTouchY.current = null;
    };
    
    // Agregar listeners para touch
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });

    // Limpieza al desmontar
    return () => {
      unblockScroll();
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, scrollSpeed]);

  return { isScrolling: isScrolling.current };
}
