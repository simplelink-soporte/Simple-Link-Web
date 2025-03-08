import { cn } from "@/lib/utils";
import { NavigationControls } from "./NavigationControls";

interface PreviewContainerProps {
  children: React.ReactNode;
  theme: 'light' | 'dark';
  viewType: "mobile" | "desktop";
  onNext?: () => void;
  onPrev?: () => void;
  isFirstStep?: boolean;
  isLastStep?: boolean;
  isNextDisabled?: boolean;
  nextLabel?: string;
  prevLabel?: string;
  hideNavigation?: boolean;
  isPublicView?: boolean;
}

export function PreviewContainer({
  children,
  theme,
  viewType,
  onNext,
  onPrev,
  isFirstStep,
  isLastStep,
  isNextDisabled,
  nextLabel = "Siguiente",
  prevLabel = "Volver",
  hideNavigation,
  isPublicView = false
}: PreviewContainerProps) {
  const isMobilePublic = viewType === "mobile" && isPublicView;
  
  // Refinamos la lógica para determinar cuándo renderizar los controles
  // Condiciones para renderizar los controles de navegación:
  // 1. No están explícitamente ocultados (hideNavigation = false)
  // 2. Existe una función onNext para permitir avanzar
  // 3. No estamos en vista móvil pública (que maneja sus propios botones)
  //    O estamos en vista desktop (que siempre usa estos controles)
  const shouldRenderControls = !hideNavigation && onNext;

  return (
    <div className={cn(
      "relative flex flex-col min-h-[100dvh]",
      theme === 'dark' ? "bg-black" : "bg-white"
    )}>
      <div className={cn(
        "flex-1 overflow-y-auto",
        viewType === "mobile" ? "px-0" : "px-4",
        "pb-28" // Espacio para los botones
      )}>
        {children}
      </div>

      {/* Controles de navegación */}
      {shouldRenderControls && (
        <NavigationControls
          theme={theme}
          viewType={viewType}
          onNext={onNext}
          onPrev={isFirstStep ? undefined : onPrev}
          isNextDisabled={isNextDisabled}
          isPublicView={isPublicView}
          nextLabel={nextLabel}
          prevLabel={prevLabel}
          showNextButton={true}
          className={cn(
            viewType === "desktop" ? "desktop-navigation" : ""
          )}
        />
      )}
    </div>
  );
} 