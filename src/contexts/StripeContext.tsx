'use client';

import { createContext, useContext, ReactNode } from 'react';

export interface StripeContextType {
  stripeAccountId: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;
  charges_enabled: boolean;
}

const StripeContext = createContext<StripeContextType | undefined>(undefined);

interface StripeProviderProps {
  children: ReactNode;
  empresaId: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;
  charges_enabled: boolean;
}

export function StripeProvider({ 
  children,
  empresaId,
  isConnected,
  isLoading,
  error,
  charges_enabled
}: StripeProviderProps) {
  const value: StripeContextType = {
    stripeAccountId: empresaId,
    isConnected,
    isLoading,
    error,
    charges_enabled
  };

  return (
    <StripeContext.Provider value={value}>
      {children}
    </StripeContext.Provider>
  );
}

export function useStripe() {
  const context = useContext(StripeContext);
  if (context === undefined) {
    throw new Error('useStripe debe usarse dentro de un StripeProvider');
  }
  return context;
} 