import { cn } from '@/lib/utils';

interface CancellationReasonFieldProps {
  reason: string;
  setReason: (value: string) => void;
  isProcessing: boolean;
}

export function CancellationReasonField({
  reason,
  setReason,
  isProcessing
}: CancellationReasonFieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">
        Motivo de la cancelación
      </label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        disabled={isProcessing}
        placeholder="Escribe el motivo de la cancelación (opcional)"
        className={cn(
          "w-full px-3 py-2 rounded-lg",
          "border border-gray-200 bg-white",
          "focus:outline-none focus:border-gray-300",
          "transition-colors duration-200",
          "placeholder:text-gray-400",
          "text-sm",
          "h-24 resize-none",
          isProcessing && "opacity-50 cursor-not-allowed"
        )}
      />
    </div>
  );
}
