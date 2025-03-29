'use client';

import { useState, useEffect } from 'react';
import { usePaymentGatewayByCountry } from '@/hooks/usePaymentGatewayByCountry';
import { StripeCardList } from './StripeCardList';
import { MercadoPagoCardList } from './MercadoPagoCardList';
import { CardListProps, StoredCard } from './shared/types';
import { Loader2 } from 'lucide-react';

/**
 * Componente CardList que actúa como wrapper para mostrar la implementación correcta
 * según la pasarela de pago activa (Stripe o MercadoPago)
 */
export function CardList(props: CardListProps) {
  const { 
    activeGateway, 
    isLoading: isLoadingGateway,
    stripeAccountId, 
    mercadoPagoUserId
  } = usePaymentGatewayByCountry(props.empresaId || null);

  // Efecto para logging (opcional, solo para desarrollo)
  useEffect(() => {
    console.log('[CardList] Pasarela de pago activa:', {
      activeGateway,
      stripeAccountId,
      mercadoPagoUserId,
      empresaId: props.empresaId
    });
  }, [activeGateway, stripeAccountId, mercadoPagoUserId, props.empresaId]);

  // Si está cargando la información de la pasarela, mostrar un loading
  if (isLoadingGateway) {
    return (
      <div className="flex justify-center items-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="ml-2 text-sm text-gray-500">Verificando pasarela de pago...</span>
      </div>
    );
  }

  // Renderizar el componente específico según la pasarela activa
  switch (activeGateway) {
    case 'stripe':
      return (
        <StripeCardList
          {...props}
          stripeAccountId={stripeAccountId || props.stripeAccountId}
        />
      );
    case 'mercadopago':
      return (
        <MercadoPagoCardList
          {...props}
          mercadoPagoUserId={mercadoPagoUserId || props.mercadoPagoUserId}
        />
      );
    case 'none':
    default:
      // Fallback cuando no hay pasarela configurada
      return (
        <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-800">
          <p className="text-sm">
            No hay una pasarela de pago configurada para esta empresa. 
            Por favor, contacta al administrador.
          </p>
        </div>
      );
  }
}
