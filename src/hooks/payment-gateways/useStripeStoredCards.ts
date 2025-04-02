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
  const customerVerifiedRef = useRef(false);

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
      // Evitar logs excesivos en reintentos
      if (retryCountRef.current === 0) {
        console.log('[StripeStoredCards] 🔄 Iniciando carga de tarjetas:', {
          stripeAccountId,
          userId: user.id,
          refreshTrigger
        });
      }
      
      // Si ya tenemos un customer verificado, podemos ir directo a cargar las tarjetas
      if (!customerVerifiedRef.current || !customerId) {
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
        
        // Marcar que ya verificamos el customer para evitar llamadas repetidas
        customerVerifiedRef.current = true;
        
        // Guardar el customerId
        if (customerData.stripeCustomerId) {
          setCustomerId(customerData.stripeCustomerId);
        } else {
          console.warn('[StripeStoredCards] No se recibió un stripeCustomerId del servidor');
          // Solo reintentamos si parece ser un error de API
          if (retryCountRef.current < MAX_RETRIES) {
            retryCountRef.current += 1;
            setTimeout(loadCards, RETRY_DELAY);
            return;
          }
        }
      }

      // Luego, cargar las tarjetas
      const response = await fetch('/api/stripe/payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          stripeAccountId,
          userId: user.id,
          customerId: customerId || null // Usar el ID que ya teníamos
        })
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('[StripeStoredCards] ❌ Error en la respuesta:', {
          status: response.status,
          statusText: response.statusText,
          error: data
        });
        throw new Error(data.error || 'Error al cargar las tarjetas guardadas');
      }

      if (!mountedRef.current) return;

      const data = await response.json();

      // Verificar si la respuesta parece válida
      const isValidResponse = data && 
        (Array.isArray(data.paymentMethods) || Boolean(data.customerId));

      if (!isValidResponse) {
        console.warn('[StripeStoredCards] ⚠️ Respuesta inválida de la API:', data);
        
        // Solo reintentamos si la respuesta es inválida y no hemos excedido los reintentos
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current += 1;
          console.log('[StripeStoredCards] 🔄 Reintentando por respuesta inválida:', {
            attempt: retryCountRef.current,
            maxRetries: MAX_RETRIES
          });
          setTimeout(loadCards, RETRY_DELAY);
          return;
        }
      }

      console.log('[StripeStoredCards] ✅ Respuesta recibida:', {
        paymentMethods: data.paymentMethods,
        count: data.paymentMethods?.length || 0,
        customerId: data.customerId
      });

      const newCards = data.paymentMethods || [];
      
      // Actualizar el customerId de cualquier fuente disponible
      if (data.customerId) {
        setCustomerId(data.customerId);
      }
      
      // Añadir el customerId a cada tarjeta
      const effectiveCustomerId = data.customerId || customerId;
      const cardsWithCustomerId = newCards.map((card: StoredCard) => ({
        ...card,
        customerId: effectiveCustomerId
      }));
      
      // Un array vacío es un resultado válido - el usuario simplemente no tiene tarjetas
      // Eliminamos el reintento automático basado en longitud, y solo reintentamos en caso de errores
      
      setCards(cardsWithCustomerId);
      setIsLoading(false);

    } catch (err) {
      if (!mountedRef.current) return;
      
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('[StripeStoredCards] ❌ Error al cargar las tarjetas:', {
        message: errorMessage,
        stripeAccountId,
        userId: user.id,
        error: err
      });
      
      // Reintentamos solo en caso de errores reales
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current += 1;
        console.log('[StripeStoredCards] 🔄 Reintentando debido a error:', {
          attempt: retryCountRef.current,
          maxRetries: MAX_RETRIES
        });
        setTimeout(loadCards, RETRY_DELAY);
        return;
      }
      
      setError(err as Error);
      setIsLoading(false);
    }
  }, [stripeAccountId, isConnected, refreshTrigger, user, isStripeAvailable, customerId]);

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
