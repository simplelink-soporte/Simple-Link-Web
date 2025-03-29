'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CardItem } from './shared/CardItem';
import { AddCardButton } from './shared/AddCardButton';
import { MercadoPagoCardListProps, StoredCard } from './shared/types';
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';
import { useAuth } from '@/contexts/AuthContext';

// Clave pública de MercadoPago
const mpPublicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY as string;

/**
 * Implementación de CardList específica para MercadoPago
 * Este componente maneja la lógica y UI de tarjetas de MercadoPago
 */
export function MercadoPagoCardList({
  cards = [],
  selectedCardId,
  onSelect,
  onAddCard,
  onDeleteCard,
  isExpanded = false,
  isLoading = false,
  showCardForm = false,
  onCardSetupSuccess,
  onCardSetupError,
  onCardSetupBack,
  theme = 'light',
  mercadoPagoUserId,
  empresaId,
  viewType = 'desktop'
}: MercadoPagoCardListProps) {
  // Estado local para controlar la animación de expansión
  const [height, setHeight] = useState<number | 'auto'>(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Efecto para controlar la altura del contenedor para la animación
  useEffect(() => {
    if (contentRef.current && isExpanded) {
      setHeight(contentRef.current.scrollHeight);
    } else {
      setHeight(0);
    }
  }, [isExpanded, cards.length, showCardForm]);

  // Componente para el MercadoPago Card Setup Form
  function MercadoPagoCardSetupWrapper({
    onSuccess,
    onError,
    onBack,
    mercadoPagoUserId,
    empresaId,
    theme = 'light',
    viewType = 'desktop'
  }: {
    onSuccess: (paymentMethodId: string) => void;
    onError: (error: any) => void;
    onBack: () => void;
    mercadoPagoUserId?: string;
    empresaId?: string;
    theme?: 'light' | 'dark';
    viewType?: 'mobile' | 'desktop';
  }) {
    const [customerId, setCustomerId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Inicializar MercadoPago SDK
    useEffect(() => {
      initMercadoPago(mpPublicKey);
    }, []);

    // Obtener o crear el customer_id si es necesario
    useEffect(() => {
      const getCustomerId = async () => {
        if (!user?.id || !empresaId) return;
        
        try {
          setIsLoading(true);
          setErrorMsg(null);
          
          // Llamada al endpoint de customer
          const response = await fetch('/api/mercadopago/customer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              userId: user.id,
              empresaId
            })
          });
          
          // Verificar si la respuesta es JSON antes de intentar parsearla
          const contentType = response.headers.get('content-type');
          if (!response.ok) {
            let errorMessage = `Error HTTP: ${response.status}`;
            
            // Solo intentar parsear como JSON si el tipo de contenido es JSON
            if (contentType && contentType.includes('application/json')) {
              try {
                const error = await response.json();
                errorMessage = error.error || errorMessage;
              } catch (parseError) {
                console.error('Error al parsear error JSON:', parseError);
                // Usar el texto plano como mensaje de error
                errorMessage = await response.text();
              }
            } else {
              // Si no es JSON, obtener el texto del error
              errorMessage = await response.text();
              // Truncar mensajes largos para no sobrecargar los logs
              if (errorMessage.length > 150) {
                errorMessage = errorMessage.substring(0, 150) + '... [truncado]';
              }
            }
            
            throw new Error(errorMessage);
          }
          
          // Verificar el tipo de contenido para la respuesta exitosa
          if (!contentType || !contentType.includes('application/json')) {
            throw new Error(`Respuesta no válida: El servidor no devolvió JSON (${contentType})`);
          }
          
          const data = await response.json();
          setCustomerId(data.mercadoPagoCustomerId);
          
        } catch (error: any) {
          console.error('Error al obtener customer_id de MercadoPago:', error);
          setErrorMsg(error.message || 'Error al procesar la solicitud');
          onError(error);
        } finally {
          setIsLoading(false);
        }
      };
      
      getCustomerId();
    }, [user?.id, empresaId, onError]);

    // Configuración para Card Payment Brick
    const initialization = {
      amount: 0, // No cargar nada, solo tokenizar
    };

    // Manejar la respuesta del formulario
    const onFormSubmit = async (formData: any) => {
      if (!customerId || !user?.id || !empresaId) {
        onError(new Error('Faltan datos necesarios para guardar la tarjeta'));
        return;
      }
      
      try {
        setIsLoading(true);
        
        // Asociar el token de tarjeta con el cliente
        const response = await fetch('/api/mercadopago/cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: formData.token,
            mercadoPagoCustomerId: customerId,
            userId: user.id,
            empresaId
          })
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Error al guardar la tarjeta');
        }
        
        const result = await response.json();
        
        if (result.success) {
          onSuccess(result.paymentMethodId);
        } else {
          throw new Error(result.error || 'Error desconocido al guardar la tarjeta');
        }
        
      } catch (error: any) {
        console.error('Error al guardar tarjeta:', error);
        setErrorMsg(error.message || 'Error al guardar la tarjeta');
        onError(error);
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          "p-4 rounded-lg border",
          viewType === 'mobile' ? "w-full" : "",
          theme === 'dark'
            ? "bg-neutral-900 border-neutral-800"
            : "bg-white border-gray-200"
        )}
      >
        <div className="space-y-4">
          <div className="flex flex-col space-y-1">
            <h3 className={cn(
              "text-base font-medium",
              theme === 'dark' ? "text-gray-200" : "text-gray-700"
            )}>
              Agregar Nueva Tarjeta
            </h3>
            <p className={cn(
              "text-xs",
              theme === 'dark' ? "text-gray-400" : "text-gray-500"
            )}>
              Completa los datos de tu tarjeta para guardarla de forma segura
            </p>
          </div>
          
          {isLoading && !customerId ? (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="ml-2 text-sm text-gray-500">Preparando formulario...</span>
            </div>
          ) : errorMsg ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errorMsg}</p>
              <Button 
                onClick={onBack}
                size="sm" 
                variant="outline" 
                className="mt-2"
              >
                Volver e intentar nuevamente
              </Button>
            </div>
          ) : customerId ? (
            <div className="card-form-container">
              <CardPayment
                initialization={initialization}
                onSubmit={onFormSubmit}
                onReady={() => console.log('Card form ready')}
                onError={(error) => {
                  console.error('Card form error:', error);
                  setErrorMsg('Error en el formulario de tarjeta');
                }}
              />
            </div>
          ) : null}
          
          <Button
            onClick={onBack}
            size="sm"
            variant="ghost"
            className="mt-2 text-xs"
            disabled={isLoading}
          >
            <ArrowLeft className="h-3 w-3 mr-1" />
            Volver
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="relative w-full">
      {/* Lista de tarjetas */}
      <motion.div
        className="overflow-hidden"
        style={{ height: isExpanded ? 'auto' : '0px' }}
      >
        <AnimatePresence>
          <motion.div
            ref={contentRef}
            initial={false}
            className="space-y-1"
          >
            {/* Mostrar MercadoPago Card Setup Form cuando es necesario */}
            {showCardForm && onCardSetupSuccess && onCardSetupError && onCardSetupBack && (
              <MercadoPagoCardSetupWrapper
                onSuccess={onCardSetupSuccess}
                onError={onCardSetupError}
                onBack={onCardSetupBack}
                mercadoPagoUserId={mercadoPagoUserId}
                empresaId={empresaId}
                theme={theme}
                viewType={viewType}
              />
            )}
            
            {/* Mostrar tarjetas guardadas */}
            {!showCardForm && (
              <>
                {cards.map((card) => (
                  <CardItem
                    key={card.id}
                    card={card}
                    isSelected={card.id === selectedCardId}
                    onClick={() => onSelect(card)}
                    onDelete={onDeleteCard ? () => onDeleteCard(card.id) : undefined}
                    theme={theme}
                    viewType={viewType}
                  />
                ))}
                
                {/* Botón para agregar tarjeta */}
                <AddCardButton
                  onClick={onAddCard}
                  theme={theme}
                  viewType={viewType}
                />
              </>
            )}
            
            {/* Estado de carga */}
            {isLoading && (
              <div className="flex justify-center items-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="ml-2 text-sm text-gray-500">Cargando tarjetas...</span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
