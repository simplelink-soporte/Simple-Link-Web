import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { RefundOptions } from '../RefundOptions';

interface RefundSectionProps {
  shouldProcessRefund: boolean;
  setShouldProcessRefund: (value: boolean) => void;
  showRefundOptions: boolean;
  setShowRefundOptions: (value: boolean) => void;
  refundType: 'full' | 'percentage';
  setRefundType: (value: 'full' | 'percentage') => void;
  refundPercentage: number;
  setRefundPercentage: (value: number) => void;
  refundMethod: 'stripe' | 'external';
  setRefundMethod: (value: 'stripe' | 'external') => void;
  totalAmount: number;
  country?: string;
}

export function RefundSection({
  shouldProcessRefund,
  setShouldProcessRefund,
  showRefundOptions,
  setShowRefundOptions,
  refundType,
  setRefundType,
  refundPercentage,
  setRefundPercentage,
  refundMethod,
  setRefundMethod,
  totalAmount,
  country
}: RefundSectionProps) {
  return (
    <div className="space-y-4 mb-4">
      <div className="border rounded-lg p-4 bg-white">
        {/* Estado 1: Selección inicial, solo si no estamos mostrando las opciones de reembolso */}
        {!showRefundOptions && (
          <div className="animate-in fade-in duration-300">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              ¿Cómo deseas procesar esta cancelación?
            </label>
            <RadioGroup
              value={shouldProcessRefund ? 'with-refund' : 'without-refund'}
              onValueChange={(value) => {
                const willProcessRefund = value === 'with-refund';
                setShouldProcessRefund(willProcessRefund);
                if (willProcessRefund) {
                  setShowRefundOptions(true);
                }
              }}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="without-refund" id="without-refund" />
                <Label htmlFor="without-refund">Cancelar sin reembolso</Label>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <RadioGroupItem value="with-refund" id="with-refund" />
                <Label htmlFor="with-refund">Cancelar con reembolso</Label>
              </div>
            </RadioGroup>
          </div>
        )}

        {/* Estado 2: Mostrar componente de opciones de reembolso */}
        {showRefundOptions && (
          <RefundOptions
            totalAmount={totalAmount}
            country={country}
            initialValues={{
              refundType,
              percentage: refundPercentage,
              processMethod: refundMethod
            }}
            onBack={() => {
              setShowRefundOptions(false);
              setShouldProcessRefund(false); // Al volver, seleccionar "sin reembolso"
            }}
            onOptionsSelected={(options) => {
              // Guardar las opciones seleccionadas
              setRefundType(options.refundType);
              if (options.percentage) {
                setRefundPercentage(options.percentage);
              }
              setRefundMethod(options.processMethod);
              
              // Cerrar el panel de opciones y mantener "con reembolso"
              setShowRefundOptions(false);
              setShouldProcessRefund(true);
            }}
          />
        )}
      </div>
    </div>
  );
}
