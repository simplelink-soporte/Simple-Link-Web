import { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GuaranteeCardFormProps {
  stripeAccountId: string;
  onSuccess: (paymentMethodId: string) => void;
  onError: (error: Error) => void;
}

export function GuaranteeCardForm({
  stripeAccountId,
  onSuccess,
  onError
}: GuaranteeCardFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Crear Setup Intent
      const response = await fetch('/api/stripe/setup-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stripeAccountId })
      });

      if (!response.ok) {
        throw new Error('Error al crear el Setup Intent');
      }

      const { clientSecret } = await response.json();

      // 2. Confirmar Setup Intent
      const result = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        }
      });

      if (result.error) {
        setError(result.error.message || 'Error al procesar la tarjeta');
        onError(result.error);
      } else if (result.setupIntent?.payment_method) {
        onSuccess(result.setupIntent.payment_method as string);
      } else {
        throw new Error('No se pudo obtener el payment method');
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Error al procesar la tarjeta');
      onError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className={cn(
        "p-4 rounded-lg transition-all duration-200",
        "border border-gray-200 focus-within:border-gray-300",
        error ? "border-red-300 bg-red-50" : "bg-white"
      )}>
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#9e2146',
              },
            },
          }}
        />
      </div>
      
      {error && (
        <div className="text-sm text-red-600">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={!stripe || loading}
        className="w-full"
        variant={error ? "destructive" : "default"}
      >
        {loading ? 'Procesando...' : 'Guardar Tarjeta'}
      </Button>

      <p className="text-xs text-gray-500 text-center">
        Solo se realizará un cargo del 30% del valor de la reserva en caso de no presentarse
      </p>
    </form>
  );
} 