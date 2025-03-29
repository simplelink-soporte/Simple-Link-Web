'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { StoredCard } from '@/components/shifts-registration/components/card-list/shared/types';

interface MercadoPagoConfig {
  mercadoPagoUserId: string | null;
  isConnected: boolean;
}

/**
 * Hook para gestionar tarjetas almacenadas en MercadoPago
 * 
 * NOTA: Este es un esqueleto inicial que se completará con la implementación
 * real cuando se desarrolle la integración completa con MercadoPago.
 * 
 * @param mercadoPagoConfig - Configuración de MercadoPago
 * @param refreshTrigger - Trigger para forzar la recarga de tarjetas
 * @param options - Opciones de configuración
 * @returns Objeto con tarjetas, estado de carga, error y función para eliminar tarjetas
 */
export function useMercadoPagoStoredCards(
  mercadoPagoConfig: MercadoPagoConfig, 
  refreshTrigger = 0, 
  options = { autoLoad: true }
) {
  const [cards, setCards] = useState<StoredCard[]>([]);
  const [isLoading, setIsLoading] = useState(options.autoLoad);
  const [error, setError] = useState<Error | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const { user } = useAuth();
  
  const { mercadoPagoUserId, isConnected } = mercadoPagoConfig;
  
  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;

  const loadCards = useCallback(async () => {
    if (!mercadoPagoUserId || !isConnected || !user) {
      console.log('[MercadoPagoStoredCards] No se puede cargar tarjetas:', {
        mercadoPagoUserId,
        isConnected,
        hasUser: Boolean(user)
      });
      setCards([]);
      setIsLoading(false);
      return;
    }

    try {
      console.log('[MercadoPagoStoredCards] 🔄 Iniciando carga de tarjetas:', {
        mercadoPagoUserId,
        userId: user.id,
        refreshTrigger,
        retryCount: retryCountRef.current
      });
      
      // IMPORTANTE: Primero obtenemos/creamos el customer ID
      // al igual que en el flujo de Stripe
      let empresaId = user.metadata?.empresa_id;
      
      if (!empresaId) {
        console.error('[MercadoPagoStoredCards] ❌ No se encontró empresa_id en user.metadata');
        setError(new Error('No se encontró la información de empresa requerida'));
        setIsLoading(false);
        return;
      }
      
      console.log('[MercadoPagoStoredCards] 📋 Obteniendo customer ID de MercadoPago');
      
      // 1. Primero, asegurarnos de que existe el customer
      const customerResponse = await fetch('/api/mercadopago/customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: user.id,
          empresaId,
          email: user.email, // Añadimos el email directamente desde el frontend
          metadata: {        // Incluimos metadata relevante 
            user_metadata: user.metadata || {},
            empresa_id: empresaId
          }
        })
      });

      if (!customerResponse.ok) {
        const errorText = await customerResponse.text();
        console.error('[MercadoPagoStoredCards] ❌ Error al obtener/crear customer:', {
          status: customerResponse.status,
          statusText: customerResponse.statusText,
          body: errorText
        });
        
        throw new Error(`Error al obtener/crear el cliente en MercadoPago: ${customerResponse.status} ${customerResponse.statusText}`);
      }

      try {
        const customerData = await customerResponse.json();
        
        // 2. Guardar el customerId para uso posterior
        setCustomerId(customerData.mercadoPagoCustomerId);
        console.log('[MercadoPagoStoredCards] ✅ Customer ID obtenido:', customerData.mercadoPagoCustomerId);
        
        // 3. Luego, cargar las tarjetas usando el endpoint correspondiente
        const cardsResponse = await fetch('/api/mercadopago/cards', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            userId: user.id,
            empresaId,
            customerId: customerData.mercadoPagoCustomerId
          })
        });

        if (!cardsResponse.ok) {
          const errorText = await cardsResponse.text();
          console.error('[MercadoPagoStoredCards] ❌ Error al obtener tarjetas:', {
            status: cardsResponse.status,
            statusText: cardsResponse.statusText,
            body: errorText
          });
          
          throw new Error(`Error al obtener tarjetas de MercadoPago: ${cardsResponse.status} ${cardsResponse.statusText}`);
        }

        const cardsData = await cardsResponse.json();
        
        // Transformar los datos de tarjetas a nuestro formato
        const formattedCards: StoredCard[] = Array.isArray(cardsData.cards) 
          ? cardsData.cards.map((card: any) => ({
            id: card.id,
            brand: card.card_type?.toLowerCase() || 'desconocido',
            last4: card.last_four_digits || '****',
            expMonth: parseInt(card.expiration_month || '12', 10),
            expYear: parseInt(card.expiration_year || '2030', 10),
            customerId: customerData.mercadoPagoCustomerId
          }))
          : [];
        
        setCards(formattedCards);
        setIsLoading(false);
        
        console.log('[MercadoPagoStoredCards] 💾 Estado actualizado:', {
          cardCount: formattedCards.length,
          customerId: customerData.mercadoPagoCustomerId,
          lastUpdate: new Date().toISOString()
        });
      } catch (jsonError) {
        console.error('[MercadoPagoStoredCards] ❌ Error al procesar respuesta JSON:', jsonError);
        throw new Error('Error al procesar la respuesta del servidor');
      }

    } catch (err) {
      if (!mountedRef.current) return;
      
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('[MercadoPagoStoredCards] ❌ Error al cargar las tarjetas:', {
        message: errorMessage,
        mercadoPagoUserId,
        userId: user.id,
        retryCount: retryCountRef.current
      });
      
      // Si hay errores y no hemos superado el número máximo de reintentos, lo intentamos de nuevo
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current += 1;
        const delay = RETRY_DELAY * retryCountRef.current;
        
        console.log(`[MercadoPagoStoredCards] 🔄 Reintentando en ${delay}ms (intento ${retryCountRef.current}/${MAX_RETRIES})`);
        
        setTimeout(() => {
          if (mountedRef.current) {
            loadCards();
          }
        }, delay);
        
        return;
      }
      
      // Si agotamos los reintentos, establecemos el error
      setError(err instanceof Error ? err : new Error(errorMessage));
      setIsLoading(false);
    }
  }, [mercadoPagoUserId, isConnected, refreshTrigger, user]);

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
    if (!mercadoPagoUserId || !isConnected || !user) {
      console.error('[MercadoPagoStoredCards] ❌ No se puede eliminar la tarjeta:', {
        mercadoPagoUserId,
        isConnected,
        hasUser: Boolean(user)
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('[MercadoPagoStoredCards] 🗑️ Eliminando tarjeta (MOCK):', {
        cardId,
        mercadoPagoUserId
      });

      // Simulación temporal - se reemplazará con la implementación real
      // const response = await fetch('/api/mercadopago/delete-card', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ 
      //     mercadoPagoUserId,
      //     userId: user.id,
      //     cardId
      //   })
      // });
      
      // Simulación de eliminación exitosa
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Actualizar la lista de tarjetas (eliminarla localmente)
      setCards(prevCards => prevCards.filter(card => card.id !== cardId));
      
      console.log('[MercadoPagoStoredCards] ✅ Tarjeta eliminada (MOCK):', cardId);
      
    } catch (err) {
      console.error('[MercadoPagoStoredCards] ❌ Error al eliminar la tarjeta:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [mercadoPagoUserId, isConnected, user]);

  return { cards, isLoading, error, deleteCard, loadCards };
}
