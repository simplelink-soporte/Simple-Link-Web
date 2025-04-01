'use client';

import { usePaymentGatewayByCountry } from './usePaymentGatewayByCountry';
import { useStripeStoredCards } from './payment-gateways/useStripeStoredCards';
import { useMercadoPagoStoredCards } from './payment-gateways/useMercadoPagoStoredCards';
import { StoredCard } from '@/components/shifts-registration/components/card-list/shared/types';
import { useCallback, useState } from 'react';

/**
 * Hook unificado para gestionar tarjetas almacenadas
 * Este hook determina dinámicamente qué pasarela de pago utilizar
 * basándose en el país de la empresa y delega en la implementación
 * específica correspondiente.
 * 
 * @param empresaId - ID de la empresa para determinar la pasarela a usar
 * @param refreshTrigger - Trigger para forzar la recarga de tarjetas
 * @param options - Opciones de configuración
 * @returns Objeto con tarjetas, estado de carga, error y función para eliminar tarjetas
 */
export function useStoredCards(
  empresaId: string | null,
  refreshTrigger = 0, 
  options = { autoLoad: true }
) {
  // Usar el hook para determinar la pasarela de pago según el país
  const { 
    activeGateway, 
    isLoading: isLoadingGateway,
    stripeAccountId, 
    stripeConnected,
    mercadoPagoUserId,
    mercadoPagoConnected
  } = usePaymentGatewayByCountry(empresaId);

  // Estados propios del hook para manejar errores de gateway
  const [gatewayError, setGatewayError] = useState<Error | null>(null);

  // Hooks específicos para cada pasarela
  const stripeCards = useStripeStoredCards(refreshTrigger, {
    ...options,
    // Sólo cargar automáticamente si es la pasarela activa y no está cargando
    autoLoad: options.autoLoad && activeGateway === 'stripe' && !isLoadingGateway
  });

  const mercadoPagoCards = useMercadoPagoStoredCards(
    {
      mercadoPagoUserId: mercadoPagoUserId,
      isConnected: mercadoPagoConnected
    },
    refreshTrigger,
    {
      ...options,
      // Sólo cargar automáticamente si es la pasarela activa y no está cargando
      autoLoad: options.autoLoad && activeGateway === 'mercadopago' && !isLoadingGateway
    }
  );

  // Combinamos los estados basados en la pasarela activa
  const cards: StoredCard[] = (() => {
    if (isLoadingGateway) return [];
    if (activeGateway === 'stripe') return stripeCards.cards;
    if (activeGateway === 'mercadopago') return mercadoPagoCards.cards;
    return [];
  })();

  const isLoading = isLoadingGateway || 
    (activeGateway === 'stripe' && stripeCards.isLoading) || 
    (activeGateway === 'mercadopago' && mercadoPagoCards.isLoading);

  const error = gatewayError || 
    (activeGateway === 'stripe' ? stripeCards.error : null) || 
    (activeGateway === 'mercadopago' ? mercadoPagoCards.error : null);

  // Función unificada para eliminar tarjetas
  const deleteCard = useCallback(async (cardId: string) => {
    if (isLoadingGateway) {
      console.warn('[StoredCards] No se puede eliminar tarjeta mientras se verifica la pasarela');
      return;
    }

    if (activeGateway === 'stripe' && stripeCards.deleteCard) {
      return stripeCards.deleteCard(cardId);
    } else if (activeGateway === 'mercadopago' && mercadoPagoCards.deleteCard) {
      return mercadoPagoCards.deleteCard(cardId);
    } else {
      console.warn('[StoredCards] No hay pasarela activa para eliminar tarjeta');
    }
  }, [isLoadingGateway, activeGateway, stripeCards, mercadoPagoCards]);

  // Función unificada para cargar tarjetas
  const loadCards = useCallback(async () => {
    if (isLoadingGateway) {
      console.warn('[StoredCards] No se pueden cargar tarjetas mientras se verifica la pasarela');
      return;
    }

    if (activeGateway === 'stripe' && stripeCards.loadCards) {
      return stripeCards.loadCards();
    } else if (activeGateway === 'mercadopago' && mercadoPagoCards.loadCards) {
      return mercadoPagoCards.loadCards();
    } else {
      console.warn('[StoredCards] No hay pasarela activa para cargar tarjetas');
    }
  }, [isLoadingGateway, activeGateway, stripeCards, mercadoPagoCards]);

  // Información de diagnóstico de la pasarela
  const gatewayInfo = {
    activeGateway,
    stripeConnected,
    mercadoPagoConnected,
    isLoadingGateway
  };

  return { 
    cards, 
    isLoading, 
    error, 
    deleteCard, 
    loadCards,
    gatewayInfo  // Incluimos esta información para facilitar el debugging
  };
}