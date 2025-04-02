'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { CardSetupForm } from '@/components/preview/steps/summary/components/CardSetupForm';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CardItem } from './shared/CardItem';
import { AddCardButton } from './shared/AddCardButton';
import { StripeCardListProps, StoredCard } from './shared/types';
import { useStripePromise, getDefaultStripeOptions } from '@/hooks/useStripePromise';

/**
 * Implementación de CardList específica para Stripe
 * Este componente maneja la lógica y UI de tarjetas de Stripe
 */
export function StripeCardList({
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
  stripeAccountId,
  viewType = 'desktop'
}: StripeCardListProps) {
  // Estado local para controlar la animación de expansión
  const [height, setHeight] = useState<number | 'auto'>(0);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Verificar si ya existe un contexto de Elements
  const existingElements = useElements();
  const existingStripe = useStripe();

  // Efecto para controlar la altura del contenedor para la animación
  useEffect(() => {
    if (contentRef.current && isExpanded) {
      setHeight(contentRef.current.scrollHeight);
    } else {
      setHeight(0);
    }
  }, [isExpanded, cards.length, showCardForm]);

  // Componente para el Stripe Card Setup Form con detección de contexto Elements
  const CardSetupWrapper = useCallback(({
    onSuccess,
    onError,
    onBack,
    stripeAccountId,
    theme = 'light',
    viewType = 'desktop'
  }: {
    onSuccess: (paymentMethodId: string) => void;
    onError: (error: any) => void;
    onBack: () => void;
    stripeAccountId?: string;
    theme?: 'light' | 'dark';
    viewType?: 'mobile' | 'desktop';
  }) => {
    // Si ya existe un contexto de Elements y Stripe (proporcionado por el padre)
    if (existingElements && existingStripe) {
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
            
            <CardSetupForm 
              onSuccess={onSuccess}
              onError={onError}
              onBack={onBack}
              theme={theme}
            />
            
            {/* El botón de "Volver" ya está incluido en el CardSetupForm */}
          </div>
        </motion.div>
      );
    }
    
    // Si no hay contexto de Elements (autónomo), inicializamos uno nuevo
    // Usar opciones optimizadas para evitar recargas del iframe
    const stripeOptions = getDefaultStripeOptions();
    const stripePromise = useStripePromise(stripeAccountId);

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
        <Elements stripe={stripePromise} options={stripeOptions}>
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
            
            <CardSetupForm 
              onSuccess={onSuccess}
              onError={onError}
              onBack={onBack}
              theme={theme}
            />
            
            {/* El botón de "Volver" ya está incluido en el CardSetupForm */}
          </div>
        </Elements>
      </motion.div>
    );
  }, [existingElements, existingStripe]);

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
            {/* Mostrar Stripe Card Setup Form cuando es necesario */}
            {showCardForm && onCardSetupSuccess && onCardSetupError && onCardSetupBack && (
              <CardSetupWrapper
                onSuccess={onCardSetupSuccess}
                onError={onCardSetupError}
                onBack={onCardSetupBack}
                stripeAccountId={stripeAccountId}
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
                
                {/* Mostrar mensaje si no hay tarjetas */}
                {cards.length === 0 && !isLoading && (
                  <div className={cn(
                    "text-sm py-3 px-4 rounded-lg",
                    theme === 'dark'
                      ? "bg-neutral-800 text-gray-300"
                      : "bg-gray-50 text-gray-500"
                  )}>
                    No tienes tarjetas guardadas
                  </div>
                )}
                
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
