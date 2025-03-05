import { useState, useCallback } from 'react';
import { StripeCustomerCache } from '@/types/stripe';

interface UseStripeCustomerProps {
  stripeAccountId: string;
  userId: string;
}

interface UseStripeCustomerReturn {
  customer: StripeCustomerCache | null;
  isLoading: boolean;
  error: Error | null;
  getOrCreateCustomer: () => Promise<StripeCustomerCache>;
}

export function useStripeCustomer({ stripeAccountId, userId }: UseStripeCustomerProps): UseStripeCustomerReturn {
  const [customer, setCustomer] = useState<StripeCustomerCache | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getOrCreateCustomer = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/stripe/customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stripeAccountId,
          userId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al obtener el cliente');
      }

      const data = await response.json();
      setCustomer(data);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error desconocido');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [stripeAccountId, userId]);

  return {
    customer,
    isLoading,
    error,
    getOrCreateCustomer,
  };
} 