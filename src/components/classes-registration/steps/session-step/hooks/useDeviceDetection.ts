import { useState, useEffect } from 'react';

/**
 * Hook personalizado para detectar si el dispositivo es móvil basado en el ancho de la ventana
 * @returns boolean que indica si el dispositivo es móvil (true) o desktop (false)
 */
export function useDeviceDetection(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    // Verificar inicialmente
    checkIsMobile();

    // Agregar listener para cambios de tamaño
    window.addEventListener('resize', checkIsMobile);

    // Limpiar listener
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return isMobile;
}
