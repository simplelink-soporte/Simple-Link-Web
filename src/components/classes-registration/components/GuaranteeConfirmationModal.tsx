import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface GuaranteeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel?: () => void;
  guaranteePercentage?: number;
  onPercentageChange?: (percentage: number) => void; 
}

export function GuaranteeConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  guaranteePercentage = 30,
  onPercentageChange
}: GuaranteeConfirmationModalProps) {
  
  // Manejador para el botón de cancelación
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white/50 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Popup Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "relative w-full max-w-md",
              "bg-white rounded-xl p-5",
              "shadow-xl",
              "flex flex-col",
              "mx-auto"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Encabezado */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Confirmación de Garantía
              </h3>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            {/* Contenido */}
            <div className="space-y-4">
              {/* Explicación principal */}
              <div className="p-4 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-700">
                  Al seleccionar la opción de <span className="font-medium">Garantía</span>, la tarjeta proporcionada 
                  será utilizada únicamente como garantía para la reserva.
                </p>
                <p className="text-sm mt-2 text-gray-600">
                  No se realizará ningún cargo inmediato a la tarjeta.
                </p>
              </div>

              {/* Nota importante con porcentaje */}
              <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-amber-500" />
                <div>
                  <p className="text-sm font-medium text-amber-700">
                    Importante
                  </p>
                  <p className="text-xs mt-1 text-amber-600">
                    En caso de no presentarse a la reserva o cancelarla, se realizará un cargo 
                    del <span className="font-semibold">{guaranteePercentage}%</span> del valor total de la reserva en su tarjeta como penalización.
                  </p>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm rounded-md transition-colors bg-gray-100 hover:bg-gray-200 text-gray-800"
              >
                No, gracias
              </button>

              <button
                onClick={onConfirm}
                className="px-4 py-2 text-sm rounded-md transition-colors bg-gray-800 hover:bg-gray-700 text-white"
              >
                Acepto
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
