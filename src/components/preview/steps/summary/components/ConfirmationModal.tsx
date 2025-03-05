import React, { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel?: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  theme: 'light' | 'dark';
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  title,
  description,
  children,
  confirmLabel = "Aceptar",
  cancelLabel = "No, gracias",
  theme = 'light'
}: ConfirmationModalProps) {
  // Estado para controlar el montaje del portal
  const [mounted, setMounted] = useState(false);

  // Efecto para manejar el montaje/desmontaje del portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Si el modal no está abierto o no está montado, no renderizamos nada
  if (!isOpen || !mounted) {
    return null;
  }

  // Manejador para el botón de cancelación
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };

  // Variantes para la animación del overlay
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  // Variantes para la animación del contenido
  const contentVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0 }
  };

  // Contenido del modal para renderizar en el portal
  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center">
          {/* Overlay */}
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={overlayVariants}
            transition={{ duration: 0.2 }}
            className={cn(
              "fixed inset-0 backdrop-blur-sm",
              theme === 'dark' ? "bg-black/40" : "bg-white/40"
            )}
            onClick={onClose}
          />

          {/* Modal content */}
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={contentVariants}
            transition={{ duration: 0.3, type: "spring", stiffness: 500, damping: 30 }}
            className={cn(
              "relative z-10 w-full max-w-md rounded-xl p-6 shadow-lg",
              "mx-4 overflow-hidden",
              theme === 'dark' 
                ? "bg-neutral-900 text-white" 
                : "bg-white text-gray-900"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Título */}
            <h3 className={cn(
              "text-lg font-semibold mb-2",
              theme === 'dark' ? "text-white" : "text-gray-900"
            )}>
              {title}
            </h3>

            {/* Descripción (opcional) */}
            {description && (
              <p className={cn(
                "mb-4 text-sm",
                theme === 'dark' ? "text-gray-300" : "text-gray-600"
              )}>
                {description}
              </p>
            )}

            {/* Contenido personalizado */}
            {children && (
              <div className="mb-6">
                {children}
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex justify-end gap-3 mt-6">
              {/* Botón de cancelación */}
              <button
                onClick={handleCancel}
                className={cn(
                  "px-4 py-2 text-sm rounded-md transition-colors",
                  theme === 'dark' 
                    ? "bg-neutral-800 hover:bg-neutral-700 text-white" 
                    : "bg-gray-100 hover:bg-gray-200 text-gray-800"
                )}
              >
                {cancelLabel}
              </button>

              {/* Botón de confirmación */}
              <button
                onClick={onConfirm}
                className={cn(
                  "px-4 py-2 text-sm rounded-md transition-colors",
                  theme === 'dark' 
                    ? "bg-neutral-700 hover:bg-neutral-600 text-white"
                    : "bg-gray-800 hover:bg-gray-700 text-white"
                )}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  // Renderizar el contenido del modal directamente en el document.body
  return createPortal(modalContent, document.body);
} 