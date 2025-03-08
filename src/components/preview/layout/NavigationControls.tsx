import React from 'react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Fragment } from "react";

interface NavigationControlsProps {
  /** Tema de color */
  theme: 'light' | 'dark';
  /** Tipo de vista */
  viewType: "mobile" | "desktop";
  /** Función para avanzar al siguiente paso */
  onNext: () => void;
  /** Función para retroceder al paso anterior */
  onPrev?: () => void;
  /** Si el botón "siguiente" debe estar deshabilitado */
  isNextDisabled?: boolean;
  /** Si es vista pública */
  isPublicView?: boolean;
  /** Clases adicionales para los contenedores */
  className?: string;
  /** Texto para el botón "siguiente" */
  nextLabel?: string;
  /** Texto para el botón "anterior" */
  prevLabel?: string;
  /** Si debe mostrar el botón "siguiente" */
  showNextButton?: boolean;
  /** Variante de estilo para móvil */
  variant?: 'shifts' | 'default';
  /** Separación entre botones (en pixels) */
  gap?: number;
}

/**
 * Componente unificado para los controles de navegación
 */
export function NavigationControls({
  theme,
  viewType,
  onNext,
  onPrev,
  isNextDisabled = false,
  isPublicView = false,
  className,
  nextLabel = 'Siguiente',
  prevLabel = 'Anterior',
  showNextButton = true,
  variant = 'default',
  gap = 8
}: NavigationControlsProps) {
  /**
   * Maneja la lógica de renderizado para la vista móvil o escritorio
   * Para móvil: Renderizamos botones específicos móviles
   * Para escritorio: Renderizamos botones estándar
   */
  
  // Determinar si es la primera vez (no hay botón anterior)
  const isFirstStep = !onPrev;
  
  // Vista móvil
  if (viewType === "mobile") {
    return (
      <Fragment>
        {/* Botón Anterior para móvil */}
        {!isFirstStep && isPublicView && (
          <div className="absolute top-6 left-6 z-50">
            <button
              onClick={onPrev}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                theme === 'dark'
                  ? "text-white hover:bg-white/10"
                  : "text-black hover:bg-black/10"
              )}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5M5 12L12 19M5 12L12 5" />
              </svg>
            </button>
          </div>
        )}
        
        {/* Botón Siguiente para móvil */}
        {showNextButton && isPublicView && (
          <div 
            className={cn(
              "fixed bottom-0 left-0 right-0 z-[9999]",
              variant === 'shifts' 
                ? "bg-gradient-to-t from-white to-transparent pb-6 pt-4"
                : "pb-6 pt-4",
              theme === 'dark' && variant !== 'shifts' && "from-black/20",
            )}
            style={{
              willChange: 'transform',
              transform: 'translate3d(0, 0, 0)'
            }}
          >
            <div className="px-6 mx-auto w-full max-w-[430px]">
              <div
                style={{
                  willChange: 'opacity',
                  backfaceVisibility: 'hidden',
                  opacity: 1
                }}
              >
                <Button
                  onClick={onNext}
                  disabled={isNextDisabled}
                  className={cn(
                    "w-full rounded-lg py-6 text-base font-normal",
                    "shadow-lg backdrop-blur-sm",
                    theme === 'dark' 
                      ? isNextDisabled
                        ? "!bg-neutral-900/90 !text-neutral-400 cursor-not-allowed hover:!bg-neutral-900/90"
                        : "!bg-white/90 !text-black hover:!bg-white/80"
                      : isNextDisabled
                        ? "!bg-[#A7A4A7] !text-[#dcdcdc] cursor-not-allowed hover:!bg-[#A6A3A6]"
                        : "!bg-black/90 !text-white hover:!bg-black/80",
                    "disabled:opacity-100"
                  )}
                  style={{
                    transform: 'translate3d(0, 0, 0)',
                    willChange: 'transform',
                    opacity: 1
                  }}
                >
                  Continuar
                </Button>
              </div>
            </div>
          </div>
        )}
      </Fragment>
    );
  }
  
  // Estilos para vista desktop
  return (
    <div className={cn(
      "fixed bottom-6 left-0 right-0 z-50 px-6 mx-auto w-full max-w-[960px]",
      "flex items-center justify-center",
      className
    )}>
      {/* Contenedor para centrar los botones */}
      <div className="flex items-center gap-x-2">
        {/* Botón anterior */}
        {!isFirstStep && (
          <Button
            onClick={onPrev}
            variant="outline"
            className={cn(
              "flex items-center justify-center px-6 py-3",
              "min-w-[180px] text-base",
              theme === 'dark'
                ? "border-white/20 text-white hover:bg-white/10 hover:border-white/30"
                : "border-black/20 text-black hover:bg-black/5 hover:border-black/30"
            )}
            style={{ marginRight: `${gap}px` }}
          >
            <span>{prevLabel}</span>
          </Button>
        )}
        
        {/* Botón siguiente */}
        {showNextButton && (
          <Button
            onClick={onNext}
            disabled={isNextDisabled}
            className={cn(
              "flex items-center justify-center px-8 py-3",
              "min-w-[220px] text-base",
              // Si es el primer paso, hacemos el botón significativamente más ancho
              isFirstStep && "min-w-[320px]",
              theme === 'dark' 
                ? isNextDisabled
                  ? "bg-neutral-800 text-neutral-400 cursor-not-allowed"
                  : "bg-white text-black hover:bg-white/90"
                : isNextDisabled
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-black text-white hover:bg-black/90"
            )}
          >
            <span>{nextLabel}</span>
          </Button>
        )}
      </div>
    </div>
  );
} 