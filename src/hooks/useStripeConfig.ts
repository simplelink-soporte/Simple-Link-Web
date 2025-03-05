'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface StripeConfig {
  stripeAccountId: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;
  charges_enabled: boolean;
  is_active: boolean;
}

interface StripeConnectionResponse {
  id?: string;
  stripe_account_id?: string;
  charges_enabled?: boolean;
  account_status?: string;
  is_active?: boolean;
}

export function useStripeConfig(empresaId: string | null) {
  const supabase = createClientComponentClient();
  const [config, setConfig] = useState<StripeConfig>({
    stripeAccountId: null,
    isConnected: false,
    isLoading: true,
    error: null,
    charges_enabled: false,
    is_active: false
  });

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    async function loadStripeConfig() {
      if (!empresaId) {
        console.log('[StripeConfig] No se proporcionó ID de empresa');
        if (mounted) {
          setConfig(prev => ({
            ...prev,
            isLoading: false,
            error: new Error('No se proporcionó ID de empresa')
          }));
        }
        return;
      }

      try {
        console.log('[StripeConfig] Iniciando búsqueda de configuración:', { empresaId });

        // Usar la función RPC pública
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
          setConfig({
            stripeAccountId: data.stripe_account_id,
            isConnected: true,
            isLoading: false,
            error: null,
            charges_enabled: data.charges_enabled,
            is_active: data.is_active
          });
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        console.error('[StripeConfig] Error:', {
          message: errorMessage,
          empresaId,
          details: error instanceof Error ? error.stack : undefined
        });

        if (mounted) {
          setConfig(prev => ({
            ...prev,
            isLoading: false,
            error: error instanceof Error ? error : new Error(errorMessage)
          }));
        }
      }
    }

    timeoutId = setTimeout(loadStripeConfig, 100);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [empresaId, supabase]);

  return config;
} 