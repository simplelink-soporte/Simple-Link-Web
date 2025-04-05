import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { IconLoader } from '@tabler/icons-react';

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
  return (
    <div className="flex gap-3">
      <Button
        onClick={onCancel}
        variant="outline"
        disabled={isProcessing}
        className={cn(
          "flex-1 border-gray-200",
          shouldCharge 
            ? "hover:border-yellow-200 hover:text-yellow-600 hover:bg-yellow-50"
            : "hover:border-red-100 hover:text-red-600 hover:bg-red-50",
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
          shouldCharge ? 'Cancelar y Aplicar Cargo' : 'Cancelar Reserva'
        )}
      </Button>
      <Button
        onClick={onClose}
        variant="outline"
        disabled={isProcessing}
        className="flex-1 border-gray-200 bg-white hover:bg-gray-50/80 transition-colors duration-200"
      >
        Cerrar
      </Button>
    </div>
  );
}
