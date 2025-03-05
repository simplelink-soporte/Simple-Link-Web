import React from 'react';
import { ConfirmationModal, ConfirmationModalProps } from './ConfirmationModal';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

// Extendemos las props del ConfirmationModal omitiendo algunas que serán predefinidas
type GuaranteeConfirmationModalProps = Omit<
  ConfirmationModalProps, 
  'title' | 'description' | 'children' | 'confirmLabel' | 'cancelLabel'
>;

export function GuaranteeConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  theme
}: GuaranteeConfirmationModalProps) {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      onCancel={onCancel}
      title="Confirmación de Garantía"
      confirmLabel="Acepto"
      cancelLabel="No, gracias"
      theme={theme}
    >
      <div className="space-y-4">
        {/* Explicación principal sin icono */}
        <div className={cn(
          "p-4 rounded-lg",
          theme === 'dark' ? "bg-neutral-800" : "bg-gray-50"
        )}>
          <p className={cn(
            "text-sm",
            theme === 'dark' ? "text-gray-200" : "text-gray-700"
          )}>
            Al seleccionar la opción de <span className="font-medium">Garantía</span>, la tarjeta proporcionada 
            será utilizada únicamente como garantía para la reserva.
          </p>
          <p className={cn(
            "text-sm mt-2",
            theme === 'dark' ? "text-gray-300" : "text-gray-600"
          )}>
            No se realizará ningún cargo inmediato a la tarjeta.
          </p>
        </div>

        {/* Nota importante */}
        <div className={cn(
          "flex items-start gap-3 p-3 rounded-lg border",
          theme === 'dark' 
            ? "border-amber-800/30 bg-amber-900/10" 
            : "border-amber-200 bg-amber-50"
        )}>
          <AlertCircle className={cn(
            "h-5 w-5 flex-shrink-0 mt-0.5",
            theme === 'dark' ? "text-amber-400" : "text-amber-500"
          )} />
          <div>
            <p className={cn(
              "text-sm font-medium",
              theme === 'dark' ? "text-amber-400" : "text-amber-700"
            )}>
              Importante
            </p>
            <p className={cn(
              "text-xs mt-1",
              theme === 'dark' ? "text-amber-300" : "text-amber-600"
            )}>
              En caso de no presentarse a la reserva o cancelarla, se realizará un cargo 
              del 30% del valor total de la reserva en su tarjeta como penalización.
            </p>
          </div>
        </div>
      </div>
    </ConfirmationModal>
  );
} 