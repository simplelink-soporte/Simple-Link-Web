'use client';

import { usePaymentGateway } from '@/contexts/PaymentGatewayContext';
import type { PaymentGateway } from '@/contexts/PaymentGatewayContext';

interface PaymentGatewayConfig {
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

/**
 * Hook personalizado que determina qué pasarela de pago debe usarse según el país
 * y verifica su configuración. Elimina las consultas redundantes utilizando Context API.
 * 
 * @param empresaId ID de la empresa a verificar (solo por compatibilidad con la API anterior)
 * @returns Configuración de la pasarela de pago activa
 */
export function usePaymentGatewayByCountry(empresaId: string | null): PaymentGatewayConfig {
  // Utilizamos el contexto compartido de pasarelas de pago que implementa caching
  const { config } = usePaymentGateway();
  
  // Simplemente devolvemos la configuración desde el contexto, evitando consultas repetidas
  return config;
}
