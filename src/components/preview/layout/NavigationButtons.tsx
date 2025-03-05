import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface NavigationButtonsProps {
  onNext: () => void;
  onPrev: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  theme: 'light' | 'dark';
  viewType: "mobile" | "desktop";
  isNextDisabled?: boolean;
  nextLabel?: string;
  prevLabel?: string;
  isPreview?: boolean;
  hidePrevButton?: boolean;
  isPublicView?: boolean;
}

export function NavigationButtons({ 
  onNext, 
  onPrev, 
  isFirstStep, 
  isLastStep,
  theme,
  viewType,
  isNextDisabled,
  nextLabel = "Siguiente",
  prevLabel = "Volver",
  isPreview = false,
  hidePrevButton = false,
  isPublicView = false
}: NavigationButtonsProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(false);
    
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [isFirstStep, isLastStep]);

  const shouldShowNextButton = true;
  const isMobilePublic = viewType === "mobile" && isPublicView;

  return (
    <div 
      className={cn(
        "absolute inset-x-0 bottom-0 z-50",
        "will-change-opacity transition-opacity duration-200 ease-in-out",
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      {/* Gradiente de fondo */}
      <div 
        className={cn(
          "absolute inset-x-0 bottom-0 h-32 pointer-events-none",
          "bg-gradient-to-t",
          theme === 'dark'
            ? "from-black via-black/90 to-transparent"
            : "from-white via-white/90 to-transparent"
        )}
      />

      {/* Contenedor de botones */}
      <div className={cn(
        "relative mx-auto px-4 pb-4",
        "flex gap-3 w-full",
        viewType === "mobile" ? "max-w-[320px]" : "max-w-[480px]"
      )}>
        {!hidePrevButton && !isFirstStep && (
          <Button
            variant="outline"
            onClick={onPrev}
            className={cn(
              "flex-1",
              theme === 'dark' && "border-gray-800 hover:bg-neutral-800"
            )}
          >
            {prevLabel}
          </Button>
        )}
        {shouldShowNextButton && (
          <Button
            onClick={onNext}
            disabled={isNextDisabled}
            className={cn(
              "flex-1",
              isMobilePublic && "rounded-full text-base py-6",
              theme === 'dark' 
                ? "bg-white text-black hover:bg-neutral-200"
                : "bg-black text-white hover:bg-neutral-800"
            )}
          >
            {isMobilePublic ? "Continuar" : nextLabel}
          </Button>
        )}
      </div>
    </div>
  );
}