import { useState, useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PaymentType } from '../types';

interface PaymentTypeCarouselProps {
  paymentTypes: PaymentType[];
  onSelect: (type: PaymentType) => void;
  theme: 'light' | 'dark';
  selectedTypeId?: string;
  isLoading?: boolean;
}

export function PaymentTypeCarousel({ 
  paymentTypes, 
  onSelect, 
  theme, 
  selectedTypeId,
  isLoading 
}: PaymentTypeCarouselProps) {
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

  const onScroll = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  // Suscribirse a eventos del carrusel
  useEffect(() => {
    if (!emblaApi) return;
    
    onScroll();
    emblaApi.on('select', onScroll);
    emblaApi.on('reInit', onScroll);

    return () => {
      emblaApi.off('select', onScroll);
      emblaApi.off('reInit', onScroll);
    };
  }, [emblaApi, onScroll]);

  const handleTypeClick = (type: PaymentType) => {
    if (!isLoading) {
      onSelect(type);
    }
  };

  return (
    <div className="relative">
      {/* Contenedor del carrusel */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4 py-2">
          {/* Tipos de pago */}
          {paymentTypes.map((type) => (
            <motion.div
              key={type.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleTypeClick(type)}
              className={cn(
                "flex-[0_0_280px] min-w-0",
                "p-6 rounded-xl cursor-pointer relative",
                "transition-all duration-200",
                theme === 'dark'
                  ? "bg-neutral-800 hover:bg-neutral-700"
                  : "bg-white hover:bg-gray-50",
                "border-2",
                type.id === selectedTypeId
                  ? theme === 'dark'
                    ? "border-blue-500"
                    : "border-blue-600"
                  : theme === 'dark'
                    ? "border-neutral-700"
                    : "border-gray-200",
                "shadow-sm h-[160px]",
                isLoading && type.id === 'guarantee' && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  {type.id === selectedTypeId && (
                    <div className={cn(
                      "px-2 py-1 rounded-full text-xs",
                      theme === 'dark'
                        ? "bg-blue-500/20 text-blue-300"
                        : "bg-blue-100 text-blue-700"
                    )}>
                      Seleccionado
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className={cn(
                    "text-lg font-medium",
                    theme === 'dark' ? "text-white" : "text-gray-900"
                  )}>
                    {type.name}
                  </h4>
                  <p className={cn(
                    "text-sm",
                    theme === 'dark' ? "text-gray-400" : "text-gray-500"
                  )}>
                    {type.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Botones de navegación */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 pointer-events-none">
        <div className="relative container mx-auto px-4">
          {canScrollPrev && (
            <button
              onClick={scrollPrev}
              className={cn(
                "absolute left-0 pointer-events-auto",
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
          
          {canScrollNext && (
            <button
              onClick={scrollNext}
              className={cn(
                "absolute right-0 pointer-events-auto",
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
      </div>
    </div>
  );
} 