import { NavigationControls } from "@/components/preview/layout/NavigationControls";

interface NavigationButtonsProps {
  theme: 'light' | 'dark';
  viewType: "mobile" | "desktop";
  onNext: () => void;
  onPrev?: () => void;
  isFirstStep?: boolean;  
  isLastStep?: boolean;
  isNextDisabled?: boolean;
  nextLabel?: string;
  prevLabel?: string;
  isPreview?: boolean;
  hidePrevButton?: boolean;
  isPublicView?: boolean;
}

/**
 * Componente de compatibilidad que utiliza NavigationControls internamente
 * para mantener la compatibilidad con código existente
 */
export function NavigationButtons({ 
  theme,
  viewType,
  onNext, 
  onPrev, 
  isFirstStep, 
  isLastStep,
  isNextDisabled,
  nextLabel = "Siguiente",
  prevLabel = "Volver",
  isPreview = false,
  hidePrevButton = false,
  isPublicView = false
}: NavigationButtonsProps) {
  // Adaptar los props al formato de NavigationControls
  return (
    <NavigationControls
      theme={theme}
      viewType={viewType}
      onNext={onNext}
      onPrev={(hidePrevButton || isFirstStep) ? undefined : onPrev}
      isNextDisabled={isNextDisabled}
      isPublicView={isPublicView}
      nextLabel={nextLabel}
      prevLabel={prevLabel}
      showNextButton={true}
      gap={8}
    />
  );
} 