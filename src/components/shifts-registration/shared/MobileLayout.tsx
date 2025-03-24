import React, { ReactNode, useEffect } from 'react';
import { MobileStepNavigation } from './MobileStepNavigation';
import { cn } from '@/lib/utils';

interface MobileLayoutProps {
  children: ReactNode;
  onNext?: () => Promise<void> | void;
  onBack?: () => void;
  nextLabel?: string;
  isNextDisabled?: boolean;
  isProcessing?: boolean;
  showBackButton?: boolean;
}

/**
 * Layout para vistas móviles en la aplicación de registro de turnos
 * Proporciona un header con botón de volver y un footer con botón de continuar
 * 
 * Nota: Evita usar h-[100vh] para prevenir problemas de layout en móviles
 * Usa una aproximación más flexible para evitar el fondo gris durante las transiciones
 */
export function MobileLayout({
  children,
  onNext,
  onBack,
  nextLabel,
  isNextDisabled = false,
  isProcessing = false,
  showBackButton = true,
}: MobileLayoutProps) {
  // Aplicar restricción de scroll al montar el componente
  useEffect(() => {
    // Guardar el overflow original del body
    const originalOverflow = document.body.style.overflow;
    const originalHeight = document.body.style.height;
    const originalPosition = document.body.style.position;
    const originalWidth = document.body.style.width;
    
    // Prevenir scroll en el body sin cambiar las dimensiones del viewport
    document.body.style.overflow = 'hidden';
    
    // Restaurar el overflow original al desmontar
    return () => {
      // Verificar si hay otros MobileLayout montados para evitar restaurar si otro componente sigue activo
      const otherLayoutsActive = document.querySelectorAll('.mobile-layout-container').length > 1;
      
      if (!otherLayoutsActive) {
        // Restaurar cada propiedad individualmente
        document.body.style.overflow = originalOverflow;
        document.body.style.height = originalHeight;
        document.body.style.position = originalPosition;
        document.body.style.width = originalWidth || '';
      }
    };
  }, []);

  return (
    <div className={cn(
      "flex flex-col mobile-layout-container",
      // Reducción del espacio para el header
      "pt-6 pb-16",
      // Usar min-height en vez de height fija para adaptarse mejor
      "overflow-hidden min-h-[100%] w-full"
    )}>
      {/* Contenido principal */}
      <main className="flex-1 overflow-hidden px-4">
        {children}
      </main>
      
      {/* Navegación móvil (header y footer) */}
      <MobileStepNavigation
        onNext={onNext}
        onBack={onBack}
        nextLabel={nextLabel}
        isNextDisabled={isNextDisabled === undefined ? false : isNextDisabled}
        isProcessing={isProcessing}
        showBackButton={showBackButton}
      />
    </div>
  );
}
