'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface StripeConfigState {
  stripeAccountId: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;
  charges_enabled: boolean;
  is_active: boolean;
}

const StripeConfigContext = createContext<StripeConfigState | undefined>(undefined);

interface StripeConfigProviderProps {
  children: ReactNode;
  empresaId: string | null;
}

export function StripeConfigProvider({ children, empresaId }: StripeConfigProviderProps) {
  const supabase = createClientComponentClient();
  const [state, setState] = useState<StripeConfigState>({
    stripeAccountId: null,
    isConnected: false,
    isLoading: true,
    error: null,
    charges_enabled: false,
    is_active: false
  });

  useEffect(() => {
    const mounted = true;
    let timeoutId: NodeJS.Timeout;

    async function loadStripeConfig() {
      if (!empresaId || empresaId === '') {
        console.log('[StripeConfig] No se proporcionó ID de empresa válido:', { empresaId });
        if (mounted) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: new Error('No se proporcionó ID de empresa válido')
          }));
        }
        return;
      }

      try {
        console.log('[StripeConfig] Iniciando búsqueda de configuración:', { empresaId });

        const { data, error } = await supabase
          .rpc('get_public_stripe_connection', {
            p_empresa_id: empresaId
          });

        if (error) throw error;

        if (!data || data.error) {
          throw new Error(data?.error || 'No se encontró configuración de Stripe');
        }

        console.log('[StripeConfig] Configuración encontrada:', {
          empresaId,
          stripeAccountId: data.stripe_account_id,
          status: data.account_status,
          charges_enabled: data.charges_enabled,
          is_active: data.is_active
        });

        if (mounted) {
          setState({
            stripeAccountId: data.stripe_account_id,
            isConnected: data.is_active,
            isLoading: false,
            error: null,
            charges_enabled: data.charges_enabled,
            is_active: data.is_active
          });
        }

      } catch (error) {
        console.error('[StripeConfig] Error en la verificación:', {
          error,
          empresaId
        });

        if (mounted) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: error instanceof Error ? error : new Error('Error desconocido')
          }));
        }
      }
    }

    timeoutId = setTimeout(loadStripeConfig, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [empresaId, supabase]);

  return (
    <StripeConfigContext.Provider value={state}>
      {children}
    </StripeConfigContext.Provider>
  );
}

export function useStripeConfig() {
  const context = useContext(StripeConfigContext);
  if (context === undefined) {
    throw new Error('useStripeConfig debe usarse dentro de un StripeConfigProvider');
  }
  return context;
} 