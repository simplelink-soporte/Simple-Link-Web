'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface MercadoPagoConfig {
  mercadoPagoUserId: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;
  account_status: string | null;
  is_active: boolean;
  countryCode: string | null;
  isArgentina: boolean;
  requiresMercadoPagoVerification: boolean;
}

/**
 * Hook personalizado que combina la verificación del país y la configuración de MercadoPago
 * Solo verifica MercadoPago si la empresa es de Argentina
 * 
 * @param empresaId ID de la empresa a verificar
 */
export function useCountryAwareMercadoPago(empresaId: string | null) {
  const supabase = createClientComponentClient();
  const [config, setConfig] = useState<MercadoPagoConfig>({
    mercadoPagoUserId: null,
    isConnected: false,
    isLoading: true,
    error: null,
    account_status: null,
    is_active: false,
    countryCode: null,
    isArgentina: false,
    requiresMercadoPagoVerification: false
  });

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    async function loadConfigWithCountryCheck() {
      if (!empresaId) {
        console.log('[CountryAwareMercadoPago] No se proporcionó ID de empresa');
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
        const requiresMercadoPagoVerification = isArgentina;

        console.log('[CountryAwareMercadoPago] Verificación de país:', {
          empresaId,
          countryCode,
          isArgentina,
          requiresMercadoPagoVerification
        });

        // Si NO es Argentina, no necesitamos consultar MercadoPago
        if (!isArgentina) {
          if (mounted) {
            setConfig({
              mercadoPagoUserId: null,
              isConnected: false, // No importa si no es Argentina
              isLoading: false,
              error: null,
              account_status: null,
              is_active: false, // No importa si no es Argentina
              countryCode,
              isArgentina: false,
              requiresMercadoPagoVerification: false
            });
          }
          return;
        }

        // Paso 2: Solo para Argentina, consultar configuración de MercadoPago
        console.log('[CountryAwareMercadoPago] Consultando MercadoPago para empresa de Argentina:', { empresaId });
        
        // Consultar la configuración de MercadoPago desde la tabla correspondiente
        const { data: mpData, error: mpError } = await supabase
          .from('mercadopago_connections')
          .select('*')
          .eq('empresa_id', empresaId)
          .single();

        if (mpError && mpError.code !== 'PGRST116') { // Ignoramos el error "no se encontró registro único"
          throw mpError;
        }

        if (!mpData) {
          console.warn('[CountryAwareMercadoPago] No se encontró configuración de MercadoPago para la empresa:', empresaId);
          
          if (mounted) {
            setConfig({
              mercadoPagoUserId: null,
              isConnected: false,
              isLoading: false,
              error: new Error('No se encontró configuración de MercadoPago'),
              account_status: null,
              is_active: false,
              countryCode,
              isArgentina: true,
              requiresMercadoPagoVerification: true
            });
          }
          return;
        }

        console.log('[CountryAwareMercadoPago] Configuración de MercadoPago encontrada:', {
          empresaId,
          mercadoPagoUserId: mpData.mercadopago_user_id,
          status: mpData.account_status,
          is_active: mpData.is_active
        });

        if (mounted) {
          setConfig({
            mercadoPagoUserId: mpData.mercadopago_user_id,
            isConnected: !!mpData.mercadopago_user_id && mpData.account_status === 'active',
            isLoading: false,
            error: null,
            account_status: mpData.account_status,
            is_active: mpData.is_active,
            countryCode,
            isArgentina: true,
            requiresMercadoPagoVerification: true
          });
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        console.error('[CountryAwareMercadoPago] Error:', {
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
