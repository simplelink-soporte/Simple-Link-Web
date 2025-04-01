'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface CountryVerificationResult {
  isArgentina: boolean;
  requiresStripeVerification: boolean;
  isLoading: boolean;
  error: Error | null;
  country: string | null;
}

/**
 * Hook personalizado para verificar el país de una empresa y determinar
 * si se requiere verificación de Stripe según el país
 * @param empresaId ID de la empresa a verificar
 * @returns Objeto con información de verificación del país
 */
export function useCountryVerification(empresaId: string | null): CountryVerificationResult {
  const supabase = createClientComponentClient();
  const [result, setResult] = useState<CountryVerificationResult>({
    isArgentina: false,
    requiresStripeVerification: true,
    isLoading: true,
    error: null,
    country: null
  });

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    async function checkCompanyCountry() {
      if (!empresaId) {
        console.log('[CountryVerification] No se proporcionó ID de empresa');
        if (mounted) {
          setResult(prev => ({
            ...prev,
            isLoading: false,
            error: new Error('No se proporcionó ID de empresa')
          }));
        }
        return;
      }

      try {
        console.log('[CountryVerification] Verificando país de la empresa:', { empresaId });

        // Consultar la tabla empresas para obtener el país
        const { data, error } = await supabase
          .from('empresas')
          .select('country')
          .eq('id', empresaId)
          .single();

        if (error) throw error;

        if (!data) {
          throw new Error('No se encontró la empresa');
        }

        const country = data.country || null;
        const isArgentina = country?.toLowerCase() === 'argentina';
        
        console.log('[CountryVerification] País detectado:', {
          empresaId,
          country,
          isArgentina
        });

        if (mounted) {
          setResult({
            isArgentina,
            // Solo se requiere verificación de Stripe si NO es Argentina
            requiresStripeVerification: !isArgentina,
            isLoading: false,
            error: null,
            country
          });
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        console.error('[CountryVerification] Error:', {
          message: errorMessage,
          empresaId
        });

        if (mounted) {
          setResult(prev => ({
            ...prev,
            isLoading: false,
            error: error instanceof Error ? error : new Error(errorMessage)
          }));
        }
      }
    }

    timeoutId = setTimeout(checkCompanyCountry, 100);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [empresaId, supabase]);

  return result;
}
