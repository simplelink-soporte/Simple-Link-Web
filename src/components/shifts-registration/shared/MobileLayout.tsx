import React, { ReactNode } from 'react';
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
  return (
    <div className={cn(
      "flex flex-col min-h-screen",
      // Reducción del espacio para el header
      "pt-6 pb-16"
    )}>
      {/* Contenido principal */}
      <main className="flex-1">
        {children}
      </main>
      
      {/* Navegación móvil (header y footer) */}
      <MobileStepNavigation
        onNext={onNext}
        onBack={onBack}
        nextLabel={nextLabel}
        isNextDisabled={isNextDisabled}
        isProcessing={isProcessing}
        showBackButton={showBackButton}
      />
    </div>
  );
}
