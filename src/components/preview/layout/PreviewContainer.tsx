import { cn } from "@/lib/utils";
import { NavigationButtons } from "./NavigationButtons";

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
  const shouldShowNavigation = !hideNavigation && onNext && onPrev && !isMobilePublic;

  return (
    <div className={cn(
      "relative flex flex-col min-h-[100dvh]",
      theme === 'dark' ? "bg-black" : "bg-white"
    )}>
      <div className={cn(
        "flex-1 overflow-y-auto",
        viewType === "mobile" ? "px-0" : "px-4",
        shouldShowNavigation && !isMobilePublic && "pb-20",
        isMobilePublic && "pb-28" // Espacio para el botón flotante
      )}>
        {children}
      </div>

      {shouldShowNavigation && !isMobilePublic && (
        <div className={cn(
          "absolute bottom-0 left-0 right-0 z-10",
          "bg-gradient-to-t from-white dark:from-black to-transparent",
          "pt-4 pb-3",
          viewType === "mobile" ? "px-3" : "px-4"
        )}>
          <NavigationButtons
            onNext={onNext}
            onPrev={onPrev}
            isFirstStep={isFirstStep || false}
            isLastStep={isLastStep || false}
            theme={theme}
            viewType={viewType}
            isNextDisabled={isNextDisabled}
            nextLabel={nextLabel}
            prevLabel={prevLabel}
            isPreview={true}
            hidePrevButton={false}
            isPublicView={isPublicView}
          />
        </div>
      )}
    </div>
  );
} 