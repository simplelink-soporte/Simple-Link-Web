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
  // Permite usar un layout personalizado en casos específicos (como el paso SummaryPreview en desktop)
  customLayout?: boolean;
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
  isPublicView = false,
  customLayout = false
}: PreviewContainerProps) {
  const isMobilePublic = viewType === "mobile" && isPublicView;
  
  // Refinamos la lógica para determinar cuándo renderizar los controles
  // Condiciones para renderizar los controles de navegación:
  // 1. No estamos ocultando la navegación explícitamente (hideNavigation=false)
  // 2. Tenemos funciones de navegación (onNext, onPrev)
  // 3. No estamos en modo público móvil (isMobilePublic=false)
  const showNavigation = 
    !hideNavigation && 
    onNext !== undefined && 
    !isMobilePublic;

  // Si se solicita un customLayout y estamos en desktop, devolvemos directamente los children
  // sin la estructura de contenedor predeterminada ni restricciones de ancho
  if (customLayout && viewType === "desktop") {
    return (
      <div className={cn(
        "fixed inset-0 w-screen h-screen overflow-hidden",
        theme === "dark" ? "bg-neutral-900 text-white" : "bg-white text-black"
      )}>
        {children}
        {showNavigation && (
          <div className="absolute bottom-6 right-6 z-50">
            <NavigationControls
              theme={theme}
              onNext={onNext || (() => {})}
              onPrev={onPrev}
              isNextDisabled={isNextDisabled}
              nextLabel={nextLabel}
              prevLabel={prevLabel}
              viewType={viewType}
              isPublicView={isPublicView}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "h-full w-full overflow-auto",
      viewType === "mobile" ? "max-w-md mx-auto" : "max-w-4xl mx-auto",
      theme === "dark" ? "bg-neutral-900 text-white" : "bg-white text-black"
    )}>
      <div className={cn(
        "min-h-full",
        viewType === "mobile" ? "px-0" : "px-6 py-6"
      )}>
        {children}
      </div>
      
      {showNavigation && (
        <div className={cn(
          "flex justify-end",
          viewType === "mobile" ? "px-4 pb-6" : "px-6 pb-6"
        )}>
          <NavigationControls
            theme={theme}
            onNext={onNext || (() => {})}
            onPrev={onPrev}
            isNextDisabled={isNextDisabled}
            nextLabel={nextLabel}
            prevLabel={prevLabel}
            viewType={viewType}
            isPublicView={isPublicView}
          />
        </div>
      )}
    </div>
  );
} 