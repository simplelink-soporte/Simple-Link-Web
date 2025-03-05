import { cn } from "@/lib/utils";
import { NavigationButtons } from "@/components/preview/layout/NavigationButtons";
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
  showNextButton = true
}: FormContainerProps) {
  // Determinar si debemos mostrar la navegación
  const shouldShowNavigation = !hideNavigation && showNextButton;

  return (
    <main className={cn(
      "w-full min-h-[100dvh] flex flex-col",
      theme === 'dark' ? "bg-black" : "bg-white"
    )}>
      <div className={cn(
        "flex-1 w-full mx-auto",
        viewType === "mobile"
          ? "px-4 pt-6 w-[95%] sm:w-[90%] md:w-[85%] lg:w-[80%] xl:w-[75%] max-w-5xl"
          : "px-6 pt-8 w-[95%] sm:w-[90%] md:w-[85%] lg:w-[80%] xl:w-[75%] max-w-5xl",
        shouldShowNavigation && "pb-24"
      )}>
        <div className="h-full">
          {children}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {shouldShowNavigation && (
          <motion.div
            key={`nav-${currentStep}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 0.4,
              ease: [0.22, 1, 0.36, 1]
            }}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50",
              "bg-gradient-to-t from-white dark:from-black to-transparent",
              "pt-4 pb-3"
            )}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 0.3,
                ease: "easeOut",
                delay: 0.1
              }}
              className={cn(
                "mx-auto",
                viewType === "mobile"
                  ? "px-4 max-w-[320px]"
                  : "px-6 max-w-[480px]"
              )}
            >
              <NavigationButtons
                onNext={onNext}
                onPrev={onPrev}
                isFirstStep={isFirstStep}
                isLastStep={isLastStep}
                theme={theme}
                viewType={viewType}
                isNextDisabled={isNextDisabled}
                nextLabel={nextLabel}
                hidePrevButton={viewType === "mobile"}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
} 