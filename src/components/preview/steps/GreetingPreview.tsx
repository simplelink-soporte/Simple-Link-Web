import { FormStepField } from "@/types/form-steps";
import { PreviewContainer } from "../layout/PreviewContainer";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import Image from "next/image";

interface GreetingPreviewProps {
  field: FormStepField;
  theme: 'light' | 'dark';
  viewType: "mobile" | "desktop";
  onNext: () => void;
  onPrev: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export function GreetingPreview({ 
  field, 
  theme, 
  viewType,
  onNext
}: GreetingPreviewProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const fadeOutTimer = setTimeout(() => {
      setIsVisible(false);
    }, 2000);

    const nextTimer = setTimeout(() => {
      onNext();
    }, 2000);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(nextTimer);
    };
  }, [onNext]);

  // Configuración de animación unificada
  const containerVariants = {
    initial: { 
      opacity: 0, 
      scale: 0.97,
      y: 10 
    },
    animate: { 
      opacity: 1,
      scale: 1,
      y: 0, 
      transition: {
        type: "spring", 
        damping: 15,
        stiffness: 120,
        delayChildren: 0.1,
        staggerChildren: 0.05
      }
    },
    exit: { 
      opacity: 0,
      scale: 0.95, 
      y: 10, 
      transition: {
        duration: 0.3,
        ease: "easeInOut",
        staggerChildren: 0.05,
        staggerDirection: -1
      }
    }
  };

  // Variantes para elementos hijos
  const childVariants = {
    initial: { 
      opacity: 0, 
      scale: 0.95 
    },
    animate: { 
      opacity: 1, 
      scale: 1,
      transition: {
        type: "spring",
        damping: 15,
        stiffness: 120
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95,
      transition: {
        duration: 0.3,
        ease: "easeInOut"
      }
    }
  };

  return (
    <PreviewContainer viewType={viewType} theme={theme}>
      <div className="min-h-full flex flex-col items-center justify-center p-6">
        <AnimatePresence mode="wait">
          {isVisible && (
            <motion.div
              variants={containerVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className={cn(
                "flex flex-col items-center space-y-5 w-full max-w-md px-5 py-6 rounded-3xl border",
                theme === 'dark' 
                  ? "bg-neutral-900/50 backdrop-blur-sm border-neutral-800/30" 
                  : "bg-white/60 backdrop-blur-sm border-gray-200/50"
              )}
            >
              {/* Título y subtítulo */}
              <motion.div 
                variants={childVariants}
                className="w-full text-center space-y-1.5"
              >
                <h1 className={cn(
                  "font-medium tracking-tight",
                  viewType === "mobile" ? "text-2xl" : "text-3xl",
                  theme === 'dark' ? "text-gray-100" : "text-gray-800"
                )}>
                  {field.settings.title || "Garden Arena"}
                </h1>
                <p className={cn(
                  "text-sm font-normal",
                  theme === 'dark' ? "text-gray-400" : "text-gray-500"
                )}>
                  {field.settings.subtitle || "Reserva tu cancha de pádel en simples pasos"}
                </p>
              </motion.div>

              {/* Logo */}
              <motion.div
                variants={childVariants}
                className="relative w-40 h-20"
              >
                <Image
                  src={theme === 'dark' ? "/images/Logo Black.png" : "/images/Logo White.png"}
                  alt="The Padel Masters Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </motion.div>

              {/* Powered by */}
              <motion.div
                variants={childVariants}
                className="flex items-center space-x-1.5 opacity-60"
              >
                <span className={cn(
                  "text-xs font-light tracking-wide",
                  theme === 'dark' ? "text-gray-500" : "text-gray-400"
                )}>
                  Impulsado por
                </span>
                <span className={cn(
                  "text-xs font-medium",
                  theme === 'dark' ? "text-gray-300" : "text-gray-600"
                )}>
                  SimplePoint
                </span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PreviewContainer>
  );
}