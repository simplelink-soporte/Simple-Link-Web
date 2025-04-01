'use client';

import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { ReactNode, useEffect, useState } from 'react';
import { StripeProvider as CustomStripeProvider, StripeContextType } from '@/contexts/StripeContext';
import { useCountryAwareStripe } from '@/hooks/useCountryAwareStripe';

interface StripeProviderProps {
  children: ReactNode;
  empresaId: string;
}

// Tipo de props que acepta nuestro CustomStripeProvider importado
interface CustomStripeProviderProps {
  children: ReactNode;
  empresaId: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;
  charges_enabled: boolean;
  isArgentina?: boolean;
}

export function StripeProvider({ children, empresaId }: StripeProviderProps) {
  const [stripePromise, setStripePromise] = useState<any>(null);
  
  // Usar nuestro hook mejorado que verifica el país antes de consultar Stripe
  const {
    stripeAccountId,
    isConnected,
    isLoading,
    error,
    charges_enabled,
    isArgentina,
    requiresStripeVerification
  } = useCountryAwareStripe(empresaId);

  useEffect(() => {
    const initStripe = async () => {
      try {
        // Si es Argentina, no inicializamos Stripe en absoluto
        if (isArgentina) {
          console.log('🇦🇷 Empresa argentina detectada, omitiendo inicialización de Stripe');
          return;
        }

        const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
        if (!publishableKey) {
          console.error('❌ No se encontró la clave pública de Stripe');
          return;
        }

        // Inicializar Stripe con la cuenta conectada
        const stripeInstance = await loadStripe(publishableKey, {
          stripeAccount: stripeAccountId || undefined
        });

        setStripePromise(stripeInstance);
        console.log('✅ Stripe inicializado correctamente para empresa no-argentina');
      } catch (error) {
        console.error('❌ Error al inicializar Stripe:', error);
      }
    };

    // Solo inicializar Stripe si:
    // 1. No es una empresa argentina
    // 2. Tenemos un ID de cuenta de Stripe
    if (requiresStripeVerification && stripeAccountId) {
      initStripe();
    }
  }, [stripeAccountId, isArgentina, requiresStripeVerification]);

  // Configuración del proveedor para empresa argentina (sin Stripe)
  const argentineProviderProps: CustomStripeProviderProps = {
    children,
    empresaId: null,
    isConnected: false,
    isLoading: false,
    error: null,
    charges_enabled: false,
    isArgentina: true
  };

  // Configuración del proveedor cuando no hay Stripe disponible
  const noStripeProviderProps: CustomStripeProviderProps = {
    children,
    empresaId: null,
    isConnected: false,
    isLoading: isLoading,
    error: error,
    charges_enabled: false,
    isArgentina: false
  };

  // Configuración del proveedor cuando Stripe está disponible
  const activeStripeProviderProps: CustomStripeProviderProps = {
    children,
    empresaId: stripeAccountId,
    isConnected: isConnected,
    isLoading: isLoading,
    error: error,
    charges_enabled: charges_enabled,
    isArgentina: false
  };

  // Si es una empresa argentina, usar un provider simplificado sin Stripe
  if (isArgentina) {
    return <CustomStripeProvider {...argentineProviderProps} />;
  }

  // Renderizar provider estándar para empresas no-argentinas sin Stripe inicializado
  if (!stripePromise || !stripeAccountId) {
    return <CustomStripeProvider {...noStripeProviderProps} />;
  }

  // Renderizar provider completo con Stripe inicializado
  return (
    <Elements stripe={stripePromise}>
      <CustomStripeProvider {...activeStripeProviderProps} />
    </Elements>
  );
}