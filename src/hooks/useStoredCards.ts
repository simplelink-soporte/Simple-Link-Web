'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useStripe } from '@/contexts/StripeContext';
import { useAuth } from '@/contexts/AuthContext';

interface StoredCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export function useStoredCards(refreshTrigger = 0, options = { autoLoad: true }) {
  const [cards, setCards] = useState<StoredCard[]>([]);
  const [isLoading, setIsLoading] = useState(options.autoLoad);
  const [error, setError] = useState<Error | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const { user } = useAuth();
  let stripeContext;
  let isConnected = false;

  try {
    stripeContext = useStripe();
    isConnected = stripeContext?.isConnected || false;
  } catch (error) {
    console.error('[StoredCards] Error al obtener contexto de Stripe:', error);
    setError(error instanceof Error ? error : new Error('Error al obtener contexto de Stripe'));
    setIsLoading(false);
    return { cards: [], isLoading: false, error, deleteCard: async () => {} };
  }

  const { stripeAccountId } = stripeContext;
  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;

  const loadCards = useCallback(async () => {
    if (!stripeAccountId || !isConnected || !user) {
      console.log('[StoredCards] No se puede cargar tarjetas:', {
        stripeAccountId,
        isConnected,
        hasUser: Boolean(user)
      });
      setCards([]);
      setIsLoading(false);
      return;
    }

    try {
      console.log('[StoredCards] 🔄 Iniciando carga de tarjetas:', {
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
        console.error('[StoredCards] ❌ Error en la respuesta:', {
          status: response.status,
          statusText: response.statusText,
          error: data
        });
        throw new Error(data.error || 'Error al cargar las tarjetas guardadas');
      }

      if (!mountedRef.current) return;

      console.log('[StoredCards] ✅ Respuesta recibida:', {
        paymentMethods: data.paymentMethods,
        count: data.paymentMethods?.length || 0,
        customerData: customerData,
        customerId: data.customerId,
        currentStoredCustomerId: customerId
      });

      const newCards = data.paymentMethods || [];
      
      // Actualizar el customerId de cualquier fuente disponible
      if (data.customerId) {
        console.log('[StoredCards] Actualizando customerId desde payment-methods:', data.customerId);
        setCustomerId(data.customerId);
      } else if (customerData?.stripeCustomerId && !customerId) {
        console.log('[StoredCards] Usando customerData.stripeCustomerId como fallback:', customerData.stripeCustomerId);
        setCustomerId(customerData.stripeCustomerId);
      }
      
      // Solo reintentar si no hay tarjetas Y no hemos excedido los reintentos
      if (newCards.length === 0 && retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current += 1;
        console.log('[StoredCards] 🔄 Reintentando carga:', {
          attempt: retryCountRef.current,
          maxRetries: MAX_RETRIES
        });
        setTimeout(loadCards, RETRY_DELAY);
        return;
      }

      setCards(newCards);
      setIsLoading(false);

      console.log('[StoredCards] 💾 Estado actualizado:', {
        cardCount: newCards.length,
        lastUpdate: new Date().toISOString(),
        retryCount: retryCountRef.current
      });

    } catch (err) {
      if (!mountedRef.current) return;
      
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('[StoredCards] ❌ Error al cargar las tarjetas:', {
        message: errorMessage,
        stripeAccountId,
        userId: user.id,
        error: err
      });
      
      setError(err as Error);
      setIsLoading(false);
    }
  }, [stripeAccountId, isConnected, refreshTrigger, user]);

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

  const deleteCard = async (cardId: string) => {
    if (!stripeAccountId || !user) {
      console.error('[StoredCards] ❌ No se puede eliminar la tarjeta:', {
        hasStripeAccount: Boolean(stripeAccountId),
        hasUser: Boolean(user)
      });
      return;
    }

    try {
      console.log('[StoredCards] 🗑️ Eliminando tarjeta:', { 
        cardId, 
        stripeAccountId,
        userId: user.id
      });

      const response = await fetch(`/api/stripe/payment-methods/${cardId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          stripeAccountId,
          userId: user.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[StoredCards] ❌ Error al eliminar:', {
          status: response.status,
          statusText: response.statusText,
          error: data
        });
        throw new Error(data.error || 'Error al eliminar la tarjeta');
      }

      if (!mountedRef.current) return;

      console.log('[StoredCards] ✅ Tarjeta eliminada:', { cardId });
      setCards(prevCards => prevCards.filter(card => card.id !== cardId));
      
      console.log('[StoredCards] 💾 Estado actualizado después de eliminar');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('[StoredCards] ❌ Error al eliminar la tarjeta:', {
        message: errorMessage,
        cardId,
        stripeAccountId,
        userId: user?.id,
        error: err
      });
      throw err;
    }
  };

  return {
    cards,
    isLoading,
    error,
    deleteCard,
    customerInfo: {
      customerId,
      stripeCustomerId: customerId  // Para compatibilidad con diferentes formatos
    }
  };
} 