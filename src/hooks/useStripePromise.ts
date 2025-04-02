import { useMemo } from 'react';
import { loadStripe } from '@stripe/stripe-js';

// Clave pública de Stripe
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string;

// Cache de promesas para evitar reinicializaciones
const stripePromiseCache: Record<string, Promise<any>> = {};

/**
 * Hook para obtener una instancia de Stripe de forma memoizada y optimizada
 * 
 * @param accountId - ID de la cuenta de Stripe Connect (opcional)
 * @returns Una promesa memoizada que resuelve a una instancia de Stripe
 */
export function useStripePromise(accountId?: string) {
  return useMemo(() => {
    const cacheKey = accountId || 'default';
    
    // Si ya existe en caché, retornar la instancia existente
    if (Object.prototype.hasOwnProperty.call(stripePromiseCache, cacheKey)) {
      return stripePromiseCache[cacheKey];
    }
    
    // Crear una nueva instancia y guardarla en caché
    const stripePromise = accountId
      ? loadStripe(stripeKey, { stripeAccount: accountId })
      : loadStripe(stripeKey);
    
    stripePromiseCache[cacheKey] = stripePromise;
    return stripePromise;
  }, [accountId]);
}

/**
 * Opciones recomendadas para Stripe Elements
 * que previenen recargas y advertencias innecesarias
 */
export const getDefaultStripeOptions = () => ({
  fonts: [{ cssSrc: 'https://fonts.googleapis.com/css?family=Inter:400,500,600&display=swap' }],
  loader: 'auto' as const,
  locale: 'es' as const,
  appearance: {
    theme: 'flat' as const,
    variables: {
      colorPrimary: '#0066cc',
    }
  }
});
