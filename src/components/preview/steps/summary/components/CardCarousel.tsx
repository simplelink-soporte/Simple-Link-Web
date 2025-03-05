import { useState, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { CardBrandIcon } from './CardBrandIcon';
import { PaymentMethod } from '../types';

interface StoredCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

interface CardCarouselProps {
  cards: StoredCard[];
  onSelect: (card: StoredCard) => void;
  theme: 'light' | 'dark';
  selectedCardId?: string;
  onAddCard: () => void;
}

export function CardCarousel({ cards, onSelect, theme, selectedCardId, onAddCard }: CardCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'center',
    skipSnaps: false,
    dragFree: false,
    containScroll: 'trimSnaps'
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onScroll = useCallback((emblaApi: any) => {
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, []);

  const handleCardClick = (card: StoredCard) => {
    onSelect(card);
  };

  return (
    <div className="relative">
      {/* Botones de navegación */}
      {canScrollPrev && (
        <button
          onClick={scrollPrev}
          className={cn(
            "absolute left-2 top-1/2 -translate-y-1/2 z-10",
            "w-8 h-8 rounded-full flex items-center justify-center",
            theme === 'dark' 
              ? "bg-neutral-800 text-white hover:bg-neutral-700"
              : "bg-white text-gray-800 hover:bg-gray-100",
            "shadow-lg transition-all"
          )}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      
      {/* Contenedor del carrusel */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4 p-4">
          {/* Tarjetas guardadas */}
          {cards.map((card) => (
            <motion.div
              key={card.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleCardClick(card)}
              className={cn(
                "flex-[0_0_280px] min-w-0",
                "p-4 rounded-xl cursor-pointer relative",
                "transition-all duration-200",
                theme === 'dark'
                  ? "bg-neutral-800 hover:bg-neutral-700"
                  : "bg-white hover:bg-gray-50",
                "border-2",
                card.id === selectedCardId
                  ? theme === 'dark'
                    ? "border-blue-500"
                    : "border-blue-600"
                  : theme === 'dark'
                    ? "border-neutral-700"
                    : "border-gray-200",
                "shadow-sm h-[140px]"
              )}
            >
              {/* Logo de la marca */}
              <div className="absolute top-3 left-3">
                <CardBrandIcon 
                  brand={card.brand} 
                  theme={theme}
                  className={cn(
                    theme === 'dark' 
                      ? "text-white bg-neutral-700"
                      : "text-gray-700 bg-gray-100"
                  )}
                />
              </div>

              <div className="flex items-center justify-end mb-4">
                {card.id === selectedCardId && (
                  <div className={cn(
                    "px-2 py-1 rounded-full text-xs",
                    theme === 'dark'
                      ? "bg-blue-500/20 text-blue-300"
                      : "bg-blue-100 text-blue-700"
                  )}>
                    Seleccionada
                  </div>
                )}
              </div>
              
              <div className="space-y-2 mt-8">
                <div className={cn(
                  "text-lg font-mono",
                  theme === 'dark' ? "text-gray-300" : "text-gray-700"
                )}>
                  •••• {card.last4}
                </div>
                <div className={cn(
                  "text-xs",
                  theme === 'dark' ? "text-gray-400" : "text-gray-500"
                )}>
                  Expira: {card.expMonth.toString().padStart(2, '0')}/{card.expYear}
                </div>
              </div>
            </motion.div>
          ))}

          {/* Tarjeta para agregar nueva */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onAddCard}
            className={cn(
              "flex-[0_0_280px] min-w-0",
              "p-4 rounded-xl cursor-pointer",
              "transition-all duration-200",
              "flex flex-col items-center justify-center gap-4",
              theme === 'dark'
                ? "bg-neutral-800 hover:bg-neutral-700"
                : "bg-white hover:bg-gray-50",
              "border-2 border-dashed",
              theme === 'dark'
                ? "border-neutral-700"
                : "border-gray-200",
              "shadow-sm h-[140px]"
            )}
          >
            <Plus className={cn(
              "h-8 w-8",
              theme === 'dark' ? "text-gray-400" : "text-gray-600"
            )} />
            <span className={cn(
              "text-sm",
              theme === 'dark' ? "text-gray-400" : "text-gray-600"
            )}>
              Agregar Nueva Tarjeta
            </span>
          </motion.div>
        </div>
      </div>

      {/* Botón siguiente */}
      {canScrollNext && (
        <button
          onClick={scrollNext}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 z-10",
            "w-8 h-8 rounded-full flex items-center justify-center",
            theme === 'dark' 
              ? "bg-neutral-800 text-white hover:bg-neutral-700"
              : "bg-white text-gray-800 hover:bg-gray-100",
            "shadow-lg transition-all"
          )}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
} 