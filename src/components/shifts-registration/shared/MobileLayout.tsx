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
    
    // Prevenir scroll en el body
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100%';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    
    // Restaurar el overflow original al desmontar
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.height = originalHeight;
      document.body.style.position = originalPosition;
      document.body.style.width = '';
    };
  }, []);

  return (
    <div className={cn(
      "flex flex-col",
      // Reducción del espacio para el header
      "pt-6 pb-16",
      // Eliminar scroll completamente
      "overflow-hidden h-[100vh] w-full"
    )}>
      {/* Contenido principal */}
      <main className="flex-1 overflow-hidden">
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
