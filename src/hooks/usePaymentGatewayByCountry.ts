'use client';

import { useEffect, useMemo } from 'react';
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
 * @param empresaId ID de la empresa a verificar. Si es null, solo se usará el país predefinido sin cargar datos de pasarela.
 * @param predefinedCountry País predefinido para evitar consultas adicionales (opcional)
 * @returns Configuración de la pasarela de pago activa
 */
export function usePaymentGatewayByCountry(
  empresaId: string | null,
  predefinedCountry?: string | null
): PaymentGatewayConfig {
  // Utilizamos el contexto compartido de pasarelas de pago que implementa caching
  const { config, setEmpresaId, setCountry } = usePaymentGateway();
  
  // Si no hay ID de empresa o es null, devolver un objeto con valores por defecto
  // pero manteniendo el país proporcionado
  const noEmpresaConfig = useMemo(() => {
    const isArgentina = predefinedCountry?.toLowerCase() === 'argentina';
    return {
      activeGateway: 'none' as PaymentGateway,
      isLoading: false,
      error: null,
      country: predefinedCountry || null,
      isArgentina,
      stripeAccountId: null,
      stripeConnected: false,
      mercadoPagoUserId: null,
      mercadoPagoConnected: false
    };
  }, [predefinedCountry]);
  
  // Actualizamos el ID de empresa en el contexto si cambia y existe
  useEffect(() => {
    if (empresaId) {
      setEmpresaId(empresaId);
    }
  }, [empresaId, setEmpresaId]);
  
  // Si se proporciona un país predefinido, lo configuramos en el contexto
  useEffect(() => {
    if (predefinedCountry && predefinedCountry !== config.country) {
      console.log('🌎 [usePaymentGatewayByCountry] Usando país predefinido:', predefinedCountry);
      setCountry(predefinedCountry);
    }
  }, [predefinedCountry, setCountry, config.country]);
  
  // Si no tenemos empresaId, devolvemos el objeto con valores por defecto
  if (!empresaId) {
    return noEmpresaConfig;
  }
  
  // Simplemente devolvemos la configuración desde el contexto para casos con empresaId válido
  return config;
}
