'use client';

import { useStripeConfig } from '@/contexts/StripeConfigContext';

interface StripeConnectionState {
  stripeAccountId: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;
  charges_enabled: boolean;
}

export function useStripeConnection(empresaId: string | null) {
  const config = useStripeConfig();

  return {
    stripeAccountId: config.stripeAccountId,
    isConnected: config.isConnected,
    isLoading: config.isLoading,
    error: config.error,
    charges_enabled: config.charges_enabled
  };
} 