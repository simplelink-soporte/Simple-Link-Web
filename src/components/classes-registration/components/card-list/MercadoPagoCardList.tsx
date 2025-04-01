'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CardItem } from './shared/CardItem';
import { AddCardButton } from './shared/AddCardButton';
import { MercadoPagoCardListProps } from './shared/types';

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
  amount = 1,
  viewType = 'desktop'
}: MercadoPagoCardListProps) {
  // Estado local para controlar la animación de expansión
  const [height, setHeight] = useState<number | 'auto'>(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const [mercadoPagoSdkLoaded, setMercadoPagoSdkLoaded] = useState(false);
  const [isCardFormLoading, setIsCardFormLoading] = useState(false);

  // Efecto para controlar la altura del contenedor para la animación
  useEffect(() => {
    if (contentRef.current && isExpanded) {
      setHeight(contentRef.current.scrollHeight);
    } else {
      setHeight(0);
    }
  }, [isExpanded, cards.length, showCardForm]);

  // Cargar SDK de MercadoPago
  useEffect(() => {
    if (showCardForm && !mercadoPagoSdkLoaded) {
      const script = document.createElement('script');
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.async = true;
      script.onload = () => {
        console.log('[MercadoPagoCardList] SDK de MercadoPago cargado');
        setMercadoPagoSdkLoaded(true);
      };
      document.body.appendChild(script);
      
      return () => {
        document.body.removeChild(script);
      };
    }
  }, [showCardForm, mercadoPagoSdkLoaded]);

  // Componente para el MercadoPago Card Setup Form
  function CardSetupWrapper({
    onSuccess,
    onError,
    onBack,
    mercadoPagoUserId,
    empresaId,
    amount = 1,
    theme = 'light',
    viewType = 'desktop'
  }: {
    onSuccess: (paymentMethodId: string) => void;
    onError: (error: any) => void;
    onBack: () => void;
    mercadoPagoUserId?: string;
    empresaId: string;
    amount?: number;
    theme?: 'light' | 'dark';
    viewType?: 'mobile' | 'desktop';
  }) {
    const [cardNumber, setCardNumber] = useState('');
    const [cardHolder, setCardHolder] = useState('');
    const [expirationDate, setExpirationDate] = useState('');
    const [cvv, setCvv] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
      if (mercadoPagoSdkLoaded) {
        console.log('[MercadoPagoCardList] Inicializando formulario de tarjeta');
        try {
          // Inicializar MercadoPago
          // En una implementación real, se conectaría con el SDK
          console.log('MP configurado con:', {
            mercadoPagoUserId,
            empresaId,
            amount
          });
        } catch (error) {
          console.error('[MercadoPagoCardList] Error al inicializar MercadoPago:', error);
          onError(error);
        }
      }
    }, [mercadoPagoSdkLoaded]);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsProcessing(true);
      setErrorMessage('');
      
      try {
        // En una implementación real, aquí se conectaría con el API
        console.log('[MercadoPagoCardList] Procesando tarjeta:', {
          cardNumber: cardNumber.replace(/\s/g, ''),
          cardHolder,
          expirationDate
        });
        
        // Simulamos una respuesta exitosa
        setTimeout(() => {
          const mockCardId = `mp_${Date.now()}`;
          console.log('[MercadoPagoCardList] Tarjeta guardada con ID:', mockCardId);
          setIsProcessing(false);
          onSuccess(mockCardId);
        }, 1500);
      } catch (error: any) {
        console.error('[MercadoPagoCardList] Error al guardar tarjeta:', error);
        setErrorMessage(error.message || 'Error al procesar la tarjeta');
        setIsProcessing(false);
        onError(error);
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
              Agregar Nueva Tarjeta (MercadoPago)
            </h3>
            <p className={cn(
              "text-xs",
              theme === 'dark' ? "text-gray-400" : "text-gray-500"
            )}>
              Completa los datos de tu tarjeta para guardarla de forma segura
            </p>
          </div>

          {/* Formulario básico para MercadoPago */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <label className={cn(
                "block text-sm font-medium",
                theme === 'dark' ? "text-gray-300" : "text-gray-700"
              )}>
                Número de Tarjeta
              </label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="1234 5678 9012 3456"
                className={cn(
                  "w-full p-2 rounded-md border",
                  theme === 'dark' 
                    ? "bg-neutral-800 border-neutral-700 text-white" 
                    : "bg-white border-gray-300 text-gray-900"
                )}
                required
              />
            </div>

            <div className="space-y-2">
              <label className={cn(
                "block text-sm font-medium",
                theme === 'dark' ? "text-gray-300" : "text-gray-700"
              )}>
                Titular de la Tarjeta
              </label>
              <input
                type="text"
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
                placeholder="Como aparece en la tarjeta"
                className={cn(
                  "w-full p-2 rounded-md border",
                  theme === 'dark' 
                    ? "bg-neutral-800 border-neutral-700 text-white" 
                    : "bg-white border-gray-300 text-gray-900"
                )}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <label className={cn(
                  "block text-sm font-medium",
                  theme === 'dark' ? "text-gray-300" : "text-gray-700"
                )}>
                  Fecha de Vencimiento
                </label>
                <input
                  type="text"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  placeholder="MM/AA"
                  className={cn(
                    "w-full p-2 rounded-md border",
                    theme === 'dark' 
                      ? "bg-neutral-800 border-neutral-700 text-white" 
                      : "bg-white border-gray-300 text-gray-900"
                  )}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className={cn(
                  "block text-sm font-medium",
                  theme === 'dark' ? "text-gray-300" : "text-gray-700"
                )}>
                  Código de Seguridad
                </label>
                <input
                  type="text"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                  placeholder="123"
                  className={cn(
                    "w-full p-2 rounded-md border",
                    theme === 'dark' 
                      ? "bg-neutral-800 border-neutral-700 text-white" 
                      : "bg-white border-gray-300 text-gray-900"
                  )}
                  required
                />
              </div>
            </div>

            {errorMessage && (
              <div className="text-red-500 text-sm mt-2">
                {errorMessage}
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <Button
                type="button"
                onClick={onBack}
                size="sm"
                variant="ghost"
                className="text-xs"
                disabled={isProcessing}
              >
                <ArrowLeft className="h-3 w-3 mr-1" />
                Volver
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isProcessing}
                className="text-xs"
              >
                {isProcessing && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                Guardar Tarjeta
              </Button>
            </div>
          </form>
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
              <CardSetupWrapper
                onSuccess={onCardSetupSuccess}
                onError={onCardSetupError}
                onBack={onCardSetupBack}
                mercadoPagoUserId={mercadoPagoUserId}
                empresaId={empresaId}
                amount={amount}
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
