'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useStripe } from '@/contexts/StripeContext';
import { useAuth } from '@/contexts/AuthContext';
import { StoredCard } from '@/components/shifts-registration/components/card-list/shared/types';

/**
 * Hook para gestionar tarjetas almacenadas en Stripe
 * 
 * @param refreshTrigger - Trigger para forzar la recarga de tarjetas
 * @param options - Opciones de configuración
 * @returns Objeto con tarjetas, estado de carga, error y función para eliminar tarjetas
 */
export function useStripeStoredCards(refreshTrigger = 0, options = { autoLoad: true }) {
  const [cards, setCards] = useState<StoredCard[]>([]);
  const [isLoading, setIsLoading] = useState(options.autoLoad);
  const [error, setError] = useState<Error | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [isStripeAvailable, setIsStripeAvailable] = useState(true);
  const { user } = useAuth();
  
  // Manejar el acceso a Stripe con protección contra errores
  let stripeContext;
  let isConnected = false;
  let stripeAccountId = null;

  try {
    stripeContext = useStripe();
    isConnected = stripeContext?.isConnected || false;
    stripeAccountId = stripeContext?.stripeAccountId || null;
  } catch (error) {
    console.error('[StripeStoredCards] Error al obtener contexto de Stripe:', error);
    setIsStripeAvailable(false);
    setError(error instanceof Error ? error : new Error('Error al obtener contexto de Stripe'));
    setIsLoading(false);
  }

  // Si Stripe no está disponible, devolver valores por defecto inmediatamente
  if (!isStripeAvailable) {
    return {
      cards: [],
      isLoading: false,
      error: error || new Error('Stripe no está disponible'),
      deleteCard: async () => { console.log('Stripe no disponible, no se puede eliminar tarjeta') }
    };
  }

  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;

  const loadCards = useCallback(async () => {
    if (!stripeAccountId || !isConnected || !user || !isStripeAvailable) {
      console.log('[StripeStoredCards] No se puede cargar tarjetas:', {
        stripeAccountId,
        isConnected,
        hasUser: Boolean(user),
        isStripeAvailable
      });
      setCards([]);
      setIsLoading(false);
      return;
    }

    try {
      console.log('[StripeStoredCards] 🔄 Iniciando carga de tarjetas:', {
        stripeAccountId,
        userId: user.id,
        refreshTrigger,
        retryCount: retryCountRef.current
      });
      
      // Primero, asegurarnos de que existe el customer
      const customerResponse = await fetch('/api/stripe/customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          stripeAccountId,
          userId: user.id,
          email: user.email,
          metadata: {
            name: user.metadata?.name,
            empresa_id: user.metadata?.empresa_id
          }
        })
      });

      if (!customerResponse.ok) {
        throw new Error('Error al obtener/crear el customer de Stripe');
      }

      const customerData = await customerResponse.json();
      
      // Guardar el customerId - corregir para usar stripeCustomerId
      setCustomerId(customerData.stripeCustomerId);
      
      // Luego, cargar las tarjetas
      const response = await fetch('/api/stripe/payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          stripeAccountId,
          userId: user.id,
          customerId: customerData.stripeCustomerId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[StripeStoredCards] ❌ Error en la respuesta:', {
          status: response.status,
          statusText: response.statusText,
          error: data
        });
        throw new Error(data.error || 'Error al cargar las tarjetas guardadas');
      }

      if (!mountedRef.current) return;

      console.log('[StripeStoredCards] ✅ Respuesta recibida:', {
        paymentMethods: data.paymentMethods,
        count: data.paymentMethods?.length || 0,
        customerData: customerData,
        customerId: data.customerId,
        currentStoredCustomerId: customerId
      });

      const newCards = data.paymentMethods || [];
      
      // Actualizar el customerId de cualquier fuente disponible
      if (data.customerId) {
        console.log('[StripeStoredCards] Actualizando customerId desde payment-methods:', data.customerId);
        setCustomerId(data.customerId);
      } else if (customerData?.stripeCustomerId && !customerId) {
        console.log('[StripeStoredCards] Usando customerData.stripeCustomerId como fallback:', customerData.stripeCustomerId);
        setCustomerId(customerData.stripeCustomerId);
      }
      
      // Añadir el customerId a cada tarjeta
      const effectiveCustomerId = data.customerId || customerData?.stripeCustomerId || customerId;
      const cardsWithCustomerId = newCards.map((card: StoredCard) => ({
        ...card,
        customerId: effectiveCustomerId
      }));
      
      console.log('[StripeStoredCards] 🔄 Tarjetas con customerId:', {
        count: cardsWithCustomerId.length,
        customerId: effectiveCustomerId
      });
      
      // Solo reintentar si no hay tarjetas Y no hemos excedido los reintentos
      if (cardsWithCustomerId.length === 0 && retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current += 1;
        console.log('[StripeStoredCards] 🔄 Reintentando carga:', {
          attempt: retryCountRef.current,
          maxRetries: MAX_RETRIES
        });
        setTimeout(loadCards, RETRY_DELAY);
        return;
      }

      setCards(cardsWithCustomerId);
      setIsLoading(false);

      console.log('[StripeStoredCards] 💾 Estado actualizado:', {
        cardCount: cardsWithCustomerId.length,
        lastUpdate: new Date().toISOString(),
        retryCount: retryCountRef.current
      });

    } catch (err) {
      if (!mountedRef.current) return;
      
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('[StripeStoredCards] ❌ Error al cargar las tarjetas:', {
        message: errorMessage,
        stripeAccountId,
        userId: user.id,
        error: err
      });
      
      setError(err as Error);
      setIsLoading(false);
    }
  }, [stripeAccountId, isConnected, refreshTrigger, user, isStripeAvailable]);

  useEffect(() => {
    mountedRef.current = true;
    retryCountRef.current = 0;
    
    if (options.autoLoad) {
      setIsLoading(true);
      loadCards();
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, [loadCards, options.autoLoad]);

  const deleteCard = useCallback(async (cardId: string) => {
    if (!stripeAccountId || !isConnected || !user || !customerId) {
      console.error('[StripeStoredCards] ❌ No se puede eliminar la tarjeta:', {
        stripeAccountId,
        isConnected,
        hasUser: Boolean(user),
        hasCustomerId: Boolean(customerId)
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('[StripeStoredCards] 🗑️ Eliminando tarjeta:', {
        cardId,
        stripeAccountId,
        customerId
      });

      const response = await fetch('/api/stripe/delete-payment-method', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          stripeAccountId,
          userId: user.id,
          paymentMethodId: cardId
        })
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('[StripeStoredCards] ❌ Error al eliminar tarjeta:', data);
        throw new Error(data.error || 'Error al eliminar la tarjeta');
      }
      
      console.log('[StripeStoredCards] ✅ Tarjeta eliminada:', cardId);

      // Actualizar la lista de tarjetas
      setCards(prevCards => prevCards.filter(card => card.id !== cardId));
      
    } catch (err) {
      console.error('[StripeStoredCards] ❌ Error al eliminar la tarjeta:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [stripeAccountId, isConnected, user, customerId]);

  return { cards, isLoading, error, deleteCard, loadCards };
}
