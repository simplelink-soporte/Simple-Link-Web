'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Tipos de pasarelas de pago soportadas
export type PaymentGateway = 'stripe' | 'mercadopago' | 'none' | 'loading';

// Configuración de pasarela de pago
export interface PaymentGatewayConfig {
  activeGateway: PaymentGateway;
  isLoading: boolean;
  error: Error | null;
  country: string | null;
  isArgentina: boolean;
  
  // Datos de Stripe
  stripeAccountId: string | null;
  stripeConnected: boolean;
  
  // Datos de MercadoPago
  mercadoPagoUserId: string | null;
  mercadoPagoConnected: boolean;
}

// Contexto para la pasarela de pago
interface PaymentGatewayContextType {
  config: PaymentGatewayConfig;
  empresaId: string | null;
  setEmpresaId: (id: string | null) => void;
  setCountry: (country: string | null) => void;
  refreshGateway: () => void;
}

// Valores por defecto para el contexto
const defaultConfig: PaymentGatewayConfig = {
  activeGateway: 'loading',
  isLoading: true,
  error: null,
  country: null,
  isArgentina: false,
  stripeAccountId: null,
  stripeConnected: false,
  mercadoPagoUserId: null,
  mercadoPagoConnected: false
};

// Crear el contexto
const PaymentGatewayContext = createContext<PaymentGatewayContextType>({
  config: defaultConfig,
  empresaId: null,
  setEmpresaId: () => {},
  setCountry: () => {},
  refreshGateway: () => {}
});

// Hook personalizado para usar el contexto de pasarela de pago
export function usePaymentGateway() {
  const context = useContext(PaymentGatewayContext);
  
  if (!context) {
    throw new Error('usePaymentGateway debe usarse dentro de un PaymentGatewayProvider');
  }
  
  return context;
}

// Propiedades para el proveedor
interface PaymentGatewayProviderProps {
  children: React.ReactNode;
  initialEmpresaId?: string | null;
}

// Proveedor del contexto
export function PaymentGatewayProvider({ 
  children, 
  initialEmpresaId = null 
}: PaymentGatewayProviderProps) {
  const [config, setConfig] = useState<PaymentGatewayConfig>(defaultConfig);
  const [empresaId, setEmpresaId] = useState<string | null>(initialEmpresaId);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const supabase = createClientComponentClient();

  // Función para forzar una actualización del estado
  const refreshGateway = () => setRefreshCounter(prev => prev + 1);

  // Efecto para verificar el país y pasarelas de pago
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    async function checkGatewayByCountry() {
      if (!empresaId) {
        console.log('[PaymentGatewayContext] No se proporcionó ID de empresa');
        if (mounted) {
          setConfig(prev => ({
            ...prev,
            activeGateway: 'none',
            isLoading: false,
            error: new Error('No se proporcionó ID de empresa')
          }));
        }
        return;
      }

      // Función para verificar la configuración de MercadoPago
      async function checkMercadoPago(empresaId: string, country: string | null, mounted: boolean): Promise<boolean> {
        console.log('[PaymentGatewayContext] Consultando MercadoPago para empresa de Argentina:', { empresaId });
        
        const { data: mpData, error: mpError } = await supabase
          .from('mercadopago_connections')
          .select('*')
          .eq('empresa_id', empresaId)
          .single();

        if (mpError && mpError.code !== 'PGRST116') { // Ignoramos el error "no se encontró registro único"
          throw mpError;
        }

        if (!mpData) {
          console.warn('[PaymentGatewayContext] No se encontró configuración de MercadoPago:', { empresaId });
          
          if (mounted) {
            setConfig({
              activeGateway: 'none',
              isLoading: false,
              error: new Error('No se encontró configuración de MercadoPago'),
              country,
              isArgentina: true,
              stripeAccountId: null,
              stripeConnected: false,
              mercadoPagoUserId: null,
              mercadoPagoConnected: false
            });
          }
          return false;
        }

        console.log('[PaymentGatewayContext] Configuración de MercadoPago encontrada:', {
          empresaId,
          mercadoPagoUserId: mpData.mercadopago_user_id,
          status: mpData.account_status
        });

        if (mounted) {
          setConfig({
            activeGateway: 'mercadopago',
            isLoading: false,
            error: null,
            country,
            isArgentina: true,
            stripeAccountId: null,
            stripeConnected: false,
            mercadoPagoUserId: mpData.mercadopago_user_id,
            mercadoPagoConnected: !!mpData.mercadopago_user_id && mpData.account_status === 'active'
          });
        }
        return true;
      }

      // Función para verificar la configuración de Stripe
      async function checkStripe(empresaId: string, country: string | null, mounted: boolean): Promise<boolean> {
        console.log('[PaymentGatewayContext] Consultando Stripe para empresa:', { empresaId });
        
        const { data: stripeData, error: stripeError } = await supabase
          .rpc('get_public_stripe_connection', {
            p_empresa_id: empresaId
          });

        if (stripeError) throw stripeError;

        if (!stripeData || stripeData.error) {
          console.warn('[PaymentGatewayContext] No se encontró configuración de Stripe:', { 
            empresaId,
            error: stripeData?.error || 'Desconocido' 
          });
          return false;
        }

        console.log('[PaymentGatewayContext] Configuración de Stripe encontrada:', {
          empresaId,
          stripeAccountId: stripeData.stripe_account_id,
          status: stripeData.account_status
        });

        if (mounted) {
          setConfig({
            activeGateway: 'stripe',
            isLoading: false,
            error: null,
            country,
            isArgentina: false,
            stripeAccountId: stripeData.stripe_account_id,
            stripeConnected: !!stripeData.stripe_account_id && stripeData.charges_enabled,
            mercadoPagoUserId: null,
            mercadoPagoConnected: false
          });
        }
        return true;
      }

      try {
        console.log('[PaymentGatewayContext] Verificando país y pasarela para empresa:', { empresaId });

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

        const country = empresaData.country || null;
        const isArgentina = country?.toLowerCase() === 'argentina';
        
        console.log('[PaymentGatewayContext] País detectado:', {
          empresaId,
          country,
          isArgentina
        });
        
        // Actualizar parcialmente el estado con la información del país
        if (mounted) {
          setConfig(prev => ({
            ...prev,
            country,
            isArgentina
          }));
        }

        // MODIFICACIÓN: Verificar primero Stripe para todos los países excepto Argentina
        // Para Argentina, verificar solo MercadoPago
        if (isArgentina) {
          // Lógica exclusiva para Argentina: verificar MercadoPago
          await checkMercadoPago(empresaId, country, mounted);
        } else {
          // Para todos los demás países (incluyendo México), intentar primero con Stripe
          // Si Stripe falla o no está configurado, no caemos back a MercadoPago
          const stripeResult = await checkStripe(empresaId, country, mounted);
          
          // Si no se encontró configuración de Stripe, mostrar error específico
          if (!stripeResult) {
            console.warn('[PaymentGatewayContext] No se encontró configuración de Stripe:', { empresaId });
            
            if (mounted) {
              setConfig({
                activeGateway: 'none',
                isLoading: false,
                error: new Error('No se encontró configuración de Stripe para este país'),
                country,
                isArgentina: false,
                stripeAccountId: null,
                stripeConnected: false,
                mercadoPagoUserId: null,
                mercadoPagoConnected: false
              });
            }
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        console.error('[PaymentGatewayContext] Error al verificar pasarela:', {
          message: errorMessage,
          empresaId,
          details: error instanceof Error ? error.stack : undefined
        });

        if (mounted) {
          setConfig({
            activeGateway: 'none',
            isLoading: false,
            error: error instanceof Error ? error : new Error(errorMessage),
            country: null,
            isArgentina: false,
            stripeAccountId: null,
            stripeConnected: false,
            mercadoPagoUserId: null,
            mercadoPagoConnected: false
          });
        }
      }
    }

    // Iniciar la verificación con un pequeño retraso
    timeoutId = setTimeout(checkGatewayByCountry, 100);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [empresaId, supabase, refreshCounter]);

  const value = {
    config,
    empresaId,
    setEmpresaId,
    setCountry: (country: string | null) => setConfig(prev => ({ ...prev, country })),
    refreshGateway
  };

  return (
    <PaymentGatewayContext.Provider value={value}>
      {children}
    </PaymentGatewayContext.Provider>
  );
}
