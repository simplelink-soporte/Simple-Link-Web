'use client';

import { useState, useEffect, useRef } from 'react';
import { usePaymentGatewayByCountry } from '@/hooks/usePaymentGatewayByCountry';
import { useOrganization } from '@/contexts/OrganizationContext';
import { StripeCardList } from './StripeCardList';
import { MercadoPagoCardList } from './MercadoPagoCardList';
import { CardListProps, StoredCard } from './shared/types';
import { Loader2 } from 'lucide-react';

/**
 * Componente CardList que actúa como wrapper para mostrar la implementación correcta
 * según la pasarela de pago activa (Stripe o MercadoPago)
 */
export function CardList(props: CardListProps) {
  const { organization } = useOrganization();
  const empresaId = props.empresaId || (organization ? organization.id : null);

  const { 
    activeGateway, 
    isLoading: isLoadingGateway,
    stripeAccountId, 
    mercadoPagoUserId,
    stripeConnected,
    mercadoPagoConnected
  } = usePaymentGatewayByCountry(empresaId);

  // Estado local para verificar conectividad de pasarela
  const [hasPendingCheck, setHasPendingCheck] = useState(true);
  
  // Usamos una referencia para evitar actualizaciones en ciclo
  const effectRunRef = useRef(false);

  // Efecto para logging y sincronización del estado - optimizado para evitar bucles
  useEffect(() => {
    // Solo ejecutamos este efecto una vez cuando isLoadingGateway cambie a false
    if (!isLoadingGateway && hasPendingCheck && !effectRunRef.current) {
      console.log('[CardList] Pasarela de pago verificada:', {
        activeGateway,
        stripeAccountId,
        mercadoPagoUserId,
        empresaId,
        stripeConnected,
        mercadoPagoConnected
      });

      // Marcamos que ya se ejecutó este efecto para esta sesión
      effectRunRef.current = true;
      
      // Marcar que ya no hay verificaciones pendientes
      setHasPendingCheck(false);
    }
  }, [isLoadingGateway, hasPendingCheck, activeGateway, stripeAccountId, mercadoPagoUserId, empresaId, stripeConnected, mercadoPagoConnected]);

  // Si está cargando la información de la pasarela, mostrar un loading
  if (isLoadingGateway || hasPendingCheck) {
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
      // Solo renderizar si tenemos una conexión válida a Stripe
      if (stripeConnected && stripeAccountId) {
        return (
          <StripeCardList
            {...props}
            stripeAccountId={stripeAccountId || props.stripeAccountId}
          />
        );
      }
      break;
    case 'mercadopago':
      // Validamos que tengamos empresaId antes de renderizar el componente
      if (!empresaId) {
        console.error('Error: Se requiere empresaId para usar MercadoPago');
        return (
          <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-800">
            <p className="text-sm">
              Error de configuración: Falta el ID de empresa para MercadoPago.
              Por favor, contacta al administrador.
            </p>
          </div>
        );
      }
      
      // Solo renderizar si hay una conexión válida a MercadoPago
      if (mercadoPagoConnected && mercadoPagoUserId) {
        // Si hay un monto definido, registrarlo para debug
        if (props.amount && props.amount > 1) {
          console.log('[CardList] Pasando monto para validación de MercadoPago:', props.amount);
        }
        
        return (
          <MercadoPagoCardList
            {...props}
            mercadoPagoUserId={mercadoPagoUserId || props.mercadoPagoUserId}
            empresaId={empresaId}
            amount={props.amount || 1}
          />
        );
      }
      break;
  }

  // Fallback cuando no hay pasarela configurada o hay un error
  return (
    <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-800">
      <p className="text-sm">
        No hay una pasarela de pago configurada para esta empresa o la conexión no está activa.
        Por favor, contacta al administrador.
      </p>
    </div>
  );
}
