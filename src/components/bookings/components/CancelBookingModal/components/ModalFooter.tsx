import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { IconLoader } from '@tabler/icons-react';
import { useState } from 'react';

interface ModalFooterProps {
  onCancel: () => void;
  onClose: () => void;
  isProcessing: boolean;
  shouldCharge: boolean;
}

export function ModalFooter({
  onCancel,
  onClose,
  isProcessing,
  shouldCharge
}: ModalFooterProps) {
  // Estado para controlar la confirmación de cancelación
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  
  // Maneja el clic en el botón de cancelar/confirmar
  const handleCancelClick = () => {
    if (confirmingCancel) {
      // Si ya estamos en modo confirmación, ejecutar la acción real
      onCancel();
    } else {
      // Si es el primer clic, cambiar al modo de confirmación
      setConfirmingCancel(true);
    }
  };

  // Maneja el clic en Cerrar, restableciendo el estado de confirmación
  const handleCloseClick = () => {
    setConfirmingCancel(false);
    onClose();
  };

  return (
    <div className="flex gap-3">
      <Button
        onClick={handleCancelClick}
        variant={confirmingCancel ? "destructive" : "outline"}
        disabled={isProcessing}
        className={cn(
          "flex-1",
          confirmingCancel 
            ? "bg-red-600 text-white hover:bg-red-700" 
            : cn(
                "border-gray-200",
                shouldCharge 
                  ? "hover:border-yellow-200 hover:text-yellow-600"
                  : "hover:border-red-100 hover:text-red-600"
              ),
          "transition-colors duration-200",
          isProcessing && "opacity-50 cursor-not-allowed"
        )}
      >
        {isProcessing ? (
          <span className="flex items-center gap-2">
            <IconLoader className="animate-spin" />
            Procesando...
          </span>
        ) : (
          confirmingCancel 
            ? "Confirmar" 
            : (shouldCharge ? 'Cancelar y Aplicar Cargo' : 'Cancelar Reserva')
        )}
      </Button>
      <Button
        onClick={handleCloseClick}
        variant="outline"
        disabled={isProcessing}
        className="flex-1 border-gray-200 bg-white hover:bg-gray-50/80 transition-colors duration-200"
      >
        {confirmingCancel ? "Cancelar" : "Cerrar"}
      </Button>
    </div>
  );
}
