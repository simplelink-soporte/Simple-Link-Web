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
  countryCode: string | null;
  isArgentina: boolean;
  requiresStripeVerification: boolean;
}

/**
 * Hook personalizado que combina la verificación del país y la configuración de Stripe
 * Evita completamente la consulta de Stripe si la empresa es de Argentina
 * 
 * @param empresaId ID de la empresa a verificar
 */
export function useCountryAwareStripe(empresaId: string | null) {
  const supabase = createClientComponentClient();
  const [config, setConfig] = useState<StripeConfig>({
    stripeAccountId: null,
    isConnected: false,
    isLoading: true,
    error: null,
    charges_enabled: false,
    is_active: false,
    countryCode: null,
    isArgentina: false,
    requiresStripeVerification: true
  });

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    async function loadConfigWithCountryCheck() {
      if (!empresaId) {
        console.log('[CountryAwareStripe] No se proporcionó ID de empresa');
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
        // Paso 1: Consultar el país de la empresa
        const { data: empresaData, error: empresaError } = await supabase
          .from('empresas')
          .select('country')
          .eq('id', empresaId)
          .single();

        if (empresaError) throw empresaError;

        if (!empresaData) {
          throw new Error('No se encontró la empresa');
        }

        const countryCode = empresaData.country || null;
        const isArgentina = countryCode?.toLowerCase() === 'argentina';
        const requiresStripeVerification = !isArgentina;

        console.log('[CountryAwareStripe] Verificación de país:', {
          empresaId,
          countryCode,
          isArgentina,
          requiresStripeVerification
        });

        // Si es Argentina, no necesitamos consultar Stripe
        if (isArgentina) {
          if (mounted) {
            setConfig({
              stripeAccountId: null,
              isConnected: false, // No importa para Argentina
              isLoading: false,
              error: null,
              charges_enabled: false, // No importa para Argentina
              is_active: false, // No importa para Argentina
              countryCode,
              isArgentina: true,
              requiresStripeVerification: false
            });
          }
          return;
        }

        // Paso 2: Solo para no-Argentina, consultar configuración de Stripe
        console.log('[CountryAwareStripe] Consultando Stripe para empresa no-Argentina:', { empresaId });
        
        const { data: stripeData, error: stripeError } = await supabase
          .rpc('get_public_stripe_connection', {
            p_empresa_id: empresaId
          });

        if (stripeError) throw stripeError;

        if (!stripeData || stripeData.error) {
          throw new Error(stripeData?.error || 'No se encontró configuración de Stripe');
        }

        console.log('[CountryAwareStripe] Configuración de Stripe encontrada:', {
          empresaId,
          stripeAccountId: stripeData.stripe_account_id,
          status: stripeData.account_status,
          charges_enabled: stripeData.charges_enabled,
          is_active: stripeData.is_active
        });

        if (mounted) {
          setConfig({
            stripeAccountId: stripeData.stripe_account_id,
            isConnected: true,
            isLoading: false,
            error: null,
            charges_enabled: stripeData.charges_enabled,
            is_active: stripeData.is_active,
            countryCode,
            isArgentina: false,
            requiresStripeVerification: true
          });
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        console.error('[CountryAwareStripe] Error:', {
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

    timeoutId = setTimeout(loadConfigWithCountryCheck, 100);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [empresaId, supabase]);

  return config;
}
