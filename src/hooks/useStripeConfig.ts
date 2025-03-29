'use client';

import { useState, useEffect } from 'react';
import { stripeConnectionService, StripeConnection } from '@/services/stripeConnectionService';

interface StripeConfig {
  stripeAccountId: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;
  charges_enabled: boolean;
  is_active: boolean;
  isArgentina?: boolean;
  requiresStripeVerification?: boolean;
  countryCode?: string | null;
}

export function useStripeConfig(empresaId: string | null) {
  const [config, setConfig] = useState<StripeConfig>({
    stripeAccountId: null,
    isConnected: false,
    isLoading: true,
    error: null,
    charges_enabled: false,
    is_active: false,
    isArgentina: false,
    requiresStripeVerification: true,
    countryCode: null
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
        console.log('[StripeConfig] Iniciando verificación con servicio centralizado:', { empresaId });
        
        // Usamos el servicio centralizado para obtener la conexión
        // Este servicio verifica primero el país y sólo consulta Stripe si no es Argentina
        const connection = await stripeConnectionService.getConnection(empresaId);
        
        if (!connection) {
          throw new Error('No se encontró conexión Stripe activa');
        }
        
        // Si es Argentina, el servicio devuelve un objeto especial con valores predeterminados
        if (connection.isArgentina) {
          console.log('[StripeConfig] Empresa argentina confirmada, no se requiere Stripe:', { empresaId });
          
          if (mounted) {
            setConfig({
              stripeAccountId: null,
              isConnected: false,
              isLoading: false,
              error: null,
              charges_enabled: false,
              is_active: false,
              isArgentina: true,
              requiresStripeVerification: false,
              countryCode: connection.country || null
            });
          }
          return;
        }
        
        // Para empresas no-argentinas, configuramos Stripe normalmente
        console.log('[StripeConfig] Configuración de Stripe encontrada para empresa no-argentina:', {
          empresaId,
          stripeAccountId: connection.stripe_account_id,
          status: connection.account_status,
          charges_enabled: connection.charges_enabled,
          is_active: connection.account_status === 'active'
        });

        if (mounted) {
          setConfig({
            stripeAccountId: connection.stripe_account_id,
            isConnected: true,
            isLoading: false,
            error: null,
            charges_enabled: connection.charges_enabled,
            is_active: connection.account_status === 'active',
            isArgentina: false,
            requiresStripeVerification: true,
            countryCode: connection.country || null
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
  }, [empresaId]);

  return config;
}