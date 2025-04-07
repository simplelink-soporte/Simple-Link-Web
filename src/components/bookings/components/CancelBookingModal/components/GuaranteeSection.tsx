import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatCurrencyByCountry } from '@/lib/currency-utils';
import { IconLoader } from '@tabler/icons-react';

interface GuaranteeSectionProps {
  totalAmount: number;
  guaranteePercentage: number;
  country?: string;
  shouldCharge: boolean;
  setShouldCharge: (value: boolean) => void;
  isProcessing: boolean;
  isLoading?: boolean;
  stripeEnabled?: boolean;
}

export function GuaranteeSection({
  totalAmount,
  guaranteePercentage,
  country,
  shouldCharge,
  setShouldCharge,
  isProcessing,
  isLoading = false,
  stripeEnabled = false
}: GuaranteeSectionProps) {
  // Calcular el cargo por cancelación
  const cancellationFee = (totalAmount * guaranteePercentage) / 100;
  
  // Log de prop stripeEnabled
  console.log('🟢 GuaranteeSection - stripeEnabled:', stripeEnabled);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-center p-4">
          <IconLoader className="animate-spin text-gray-400" size={24} />
          <span className="ml-2 text-sm text-gray-600">Cargando datos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4 bg-white">
        {stripeEnabled === true ? (
          <div>
            <div className="flex items-start mb-3">
              <Checkbox
                id="charge-guarantee"
                className="mt-1"
                checked={shouldCharge}
                onCheckedChange={(checked) => setShouldCharge(!!checked)}
                disabled={isProcessing}
              />
              <div className="ml-3">
                <label
                  htmlFor="charge-guarantee"
                  className={cn(
                    "text-sm font-medium cursor-pointer block mb-1",
                    shouldCharge ? "text-yellow-700" : "text-gray-700"
                  )}
                >
                  Aplicar cargo de cancelación
                </label>
                <p className="text-sm text-gray-500">
                  {formatCurrencyByCountry(cancellationFee, country || 'MX')} ({guaranteePercentage}% del total)
                </p>
              </div>
            </div>
            
            {shouldCharge && (
              <Alert variant="default" className="bg-white border-yellow-200">
                <AlertDescription className="text-sm">
                  El cargo se realizará automáticamente a la tarjeta registrada como garantía.
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div>
            <p className="text-sm text-red-600 mb-2">
              No se puede aplicar el cargo porque la conexión con Stripe no está activa.
            </p>
            <p className="text-xs text-gray-500">
              Verifique que la cuenta de Stripe esté correctamente configurada y que haya un método de pago válido asignado a esta reserva.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
