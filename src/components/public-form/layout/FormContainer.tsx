import { cn } from "@/lib/utils";
import { NavigationControls } from "@/components/preview/layout/NavigationControls";
import { motion, AnimatePresence } from "framer-motion";

interface FormContainerProps {
  children: React.ReactNode;
  theme: 'light' | 'dark';
  viewType: "mobile" | "desktop";
  onNext: () => void;
  onPrev: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  hideNavigation: boolean;
  isNextDisabled: boolean;
  nextLabel: string;
  currentStep: number;
  showNextButton?: boolean;
  /** Indica si se está utilizando un layout personalizado que necesita anchura completa */
  customLayout?: boolean;
}

export function FormContainer({
  children,
  theme,
  viewType,
  onNext,
  onPrev,
  isFirstStep,
  isLastStep,
  hideNavigation,
  isNextDisabled,
  nextLabel,
  currentStep,
  showNextButton = true,
  customLayout = false
}: FormContainerProps) {
  // Determinar si debemos mostrar la navegación
  const shouldShowNavigation = !hideNavigation && showNextButton;

  // Si se está usando un layout personalizado, aplicar estilos adecuados
  if (customLayout && viewType === "desktop") {
    return (
      <main className={cn(
        "w-full min-h-[100dvh] flex flex-col",
        theme === 'dark' ? "bg-black" : "bg-white"
      )}>
        <div className="flex-1 w-full h-full">
          {children}
        </div>

        {/* Navegación */}
        {shouldShowNavigation && (
          <NavigationControls
            theme={theme}
            viewType={viewType}
            onNext={onNext}
            onPrev={!isFirstStep ? onPrev : undefined}
            isNextDisabled={isNextDisabled}
            isPublicView={true}
            nextLabel={nextLabel}
            showNextButton={showNextButton}
            className="absolute bottom-6 right-6 z-50"
          />
        )}
      </main>
    );
  }

  // Layout estándar con restricciones
  return (
    <main className={cn(
      "w-full min-h-[100dvh] flex flex-col",
      theme === 'dark' ? "bg-black" : "bg-white"
    )}>
      <div className={cn(
        "flex-1 w-full mx-auto",
        viewType === "mobile"
          ? "px-4 pt-6 pb-24 w-[95%] sm:w-[90%] md:w-[85%] lg:w-[80%] xl:w-[75%] max-w-5xl"
          : "px-6 pt-8 pb-24 w-[95%] sm:w-[90%] md:w-[85%] lg:w-[80%] xl:w-[75%] max-w-5xl"
      )}>
        <div className="h-full">
          {children}
        </div>
      </div>

      {/* Navegación */}
      {shouldShowNavigation && (
        <AnimatePresence mode="sync" initial={false}>
          <motion.div
            key={`nav-${currentStep}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 0.5,
              ease: [0.23, 1, 0.32, 1]
            }}
            style={{
              willChange: 'opacity',
              backfaceVisibility: 'hidden'
            }}
          >
            <NavigationControls
              theme={theme}
              viewType={viewType}
              onNext={onNext}
              onPrev={!isFirstStep ? onPrev : undefined}
              isNextDisabled={isNextDisabled}
              isPublicView={true}
              nextLabel={viewType === "mobile" ? "Continuar" : nextLabel}
              showNextButton={showNextButton}
              variant="default"
              gap={8}
            />
          </motion.div>
        </AnimatePresence>
      )}
    </main>
  );
} 