import { ReactNode, useEffect, useState } from 'react';
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface DesktopSummaryLayoutProps {
  /**
   * Contenido para la columna izquierda (configuración de pago)
   */
  leftContent: ReactNode;
  
  /**
   * Contenido para la columna derecha (detalles y total)
   */
  rightContent: ReactNode;
  
  /**
   * Tema visual
   */
  theme: 'light' | 'dark';
}

/**
 * Layout especializado de dos columnas para el paso Summary en vista desktop
 * Aprovecha el espacio horizontal disponible sin restricciones innecesarias
 * Utiliza un contenedor central para alojar ambas columnas
 * Implementa animación de fade in suave sin movimiento ni parpadeos
 * Usa técnicas avanzadas de precarga y optimización de renderizado
 */
export function DesktopSummaryLayout({
  leftContent,
  rightContent,
  theme
}: DesktopSummaryLayoutProps) {
  // Estado para controlar la visibilidad del contenido
  const [isContentVisible, setIsContentVisible] = useState(false);
  
  // Retrasamos un poco la renderización para asegurar que todo esté listo
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsContentVisible(true);
    }, 50); // pequeño retraso para asegurar que el DOM esté listo
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={cn(
      "flex flex-col items-center justify-center w-full h-full min-h-screen py-10",
      theme === 'dark' ? "bg-neutral-900 text-white" : "bg-white text-black"
    )}>
      {/* Contenedor que precarga el contenido pero mantiene opacity 0 */}
      <div 
        className="w-full max-w-6xl mx-auto"
        style={{ 
          opacity: 0,
          position: 'absolute',
          visibility: 'hidden',
          pointerEvents: 'none'
        }}
      >
        <div className="flex flex-row w-full h-full">
          <div className="w-1/2">
            <div className="w-full max-w-lg mx-auto">
              {leftContent}
            </div>
          </div>
          <div className="w-1/2">
            <div className="w-full max-w-lg mx-auto">
              {rightContent}
            </div>
          </div>
        </div>
      </div>
      
      {/* Contenedor visible con animación optimizada */}
      <AnimatePresence>
        {isContentVisible && (
          <motion.div 
            key="summary-layout"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 0.7, // duración más larga para una transición más suave
              ease: "easeOut" 
            }}
            className="w-full max-w-6xl mx-auto rounded-xl overflow-hidden shadow-lg"
            style={{
              willChange: 'opacity',
              backfaceVisibility: 'hidden',
              transform: 'translateZ(0)',
              WebkitFontSmoothing: 'subpixel-antialiased'
            }}
          >
            <div className="flex flex-row w-full h-full">
              {/* Columna izquierda: Configuración de pago */}
              <div className="w-1/2 py-8 px-6 overflow-y-auto bg-white dark:bg-neutral-800">
                <div className="w-full max-w-lg mx-auto">
                  {leftContent}
                </div>
              </div>
              
              {/* Columna derecha: Detalles y total */}
              <div className="w-1/2 py-8 px-6 overflow-y-auto bg-gray-50 dark:bg-neutral-900">
                <div className="w-full max-w-lg mx-auto">
                  {rightContent}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 