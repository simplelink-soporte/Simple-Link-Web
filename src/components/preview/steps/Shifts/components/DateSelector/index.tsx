import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DateSelectorProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  theme: 'light' | 'dark';
  viewType: 'mobile' | 'desktop';
}

export function DateSelector({ selectedDate, onDateSelect, theme, viewType }: DateSelectorProps) {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(selectedDate));
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);
  const isChangingMonth = useRef(false);

  // Generar días del mes actual y días adyacentes
  const allDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    // Agregar 3 días del mes anterior
    const prevDays = Array.from({ length: 3 }, (_, i) => 
      subDays(monthStart, 3 - i)
    );
    
    // Días del mes actual
    const currentDays = eachDayOfInterval({
      start: monthStart,
      end: monthEnd
    });
    
    // Agregar 3 días del mes siguiente
    const nextDays = Array.from({ length: 3 }, (_, i) => 
      addDays(monthEnd, i + 1)
    );
    
    return [...prevDays, ...currentDays, ...nextDays];
  }, [currentMonth]);

  // Función para scroll a una fecha específica
  const scrollToDate = useCallback((date: Date) => {
    if (!containerRef.current) return;

    // Reset scroll position first
    if (isChangingMonth.current) {
      containerRef.current.scrollLeft = 0;
      isChangingMonth.current = false;
    }

    requestAnimationFrame(() => {
      if (!containerRef.current) return;
      
      const element = document.getElementById(`date-${date.toISOString()}`);
      if (!element) return;

      const container = containerRef.current;
      const scrollLeft = element.offsetLeft - (container.offsetWidth / 2) + (element.offsetWidth / 2);
      
      container.scrollTo({
        left: scrollLeft,
        behavior: 'auto'
      });
    });
  }, []);

  // Manejar cambio de mes y selección de fecha
  const handleDateSelect = useCallback((date: Date) => {
    const isNewMonth = !isSameMonth(date, currentMonth);
    
    if (isNewMonth) {
      isChangingMonth.current = true;
      setCurrentMonth(startOfMonth(date));
      
      // Asegurarnos de que el scroll se ejecute después del cambio de mes
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToDate(date);
        });
      });
    } else {
      scrollToDate(date);
    }
    
    onDateSelect(date);
  }, [currentMonth, onDateSelect, scrollToDate]);

  // Efecto para el scroll inicial
  useEffect(() => {
    if (isInitialMount.current) {
      scrollToDate(selectedDate);
      isInitialMount.current = false;
    }
  }, [scrollToDate, selectedDate]);

  // Efecto para manejar cambios de mes
  useEffect(() => {
    if (!isInitialMount.current && isChangingMonth.current) {
      scrollToDate(selectedDate);
    }
  }, [currentMonth, selectedDate, scrollToDate]);

  return (
    <div className="w-full space-y-3">
      <div className="relative">
        <div className="flex justify-center overflow-hidden">
          <div 
            ref={containerRef}
            className="flex gap-6 overflow-x-auto scrollbar-hide"
            style={{ scrollBehavior: 'auto' }}
          >
            {allDays.map((date) => {
              const isSelected = isSameDay(date, selectedDate);
              const isCurrentMonth = isSameMonth(date, currentMonth);
              
              return (
                <button
                  id={`date-${date.toISOString()}`}
                  key={date.toISOString()}
                  onClick={() => handleDateSelect(date)}
                  className={cn(
                    "flex flex-col items-center px-4 py-2 rounded-lg",
                    "transition-colors duration-200",
                    !isCurrentMonth && "opacity-50 hover:opacity-100",
                    theme === 'dark'
                      ? [
                          "bg-zinc-800/30",
                          isSelected && "bg-black text-white"
                        ]
                      : [
                          "bg-gray-100",
                          isSelected && "bg-gray-900 text-white"
                        ]
                  )}
                >
                  <span className={cn(
                    "text-xs font-medium mb-1.5 transition-colors capitalize",
                    theme === 'dark' ? "text-gray-400" : "text-gray-600",
                    !isCurrentMonth && "opacity-70",
                    isSelected && "text-gray-300"
                  )}>
                    {format(date, "EEE", { locale: es })}
                  </span>
                  <span className={cn(
                    "text-base transition-colors font-medium",
                    isSelected 
                      ? "text-white"
                      : theme === 'dark' 
                        ? "text-gray-300" 
                        : "text-gray-700",
                    !isCurrentMonth && "opacity-70"
                  )}>
                    {format(date, "d")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Indicador del mes actual */}
      <div className="flex justify-end">
        <AnimatePresence mode="wait">
          <motion.p
            key={currentMonth.toISOString()}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "text-xs font-medium capitalize transition-colors pr-2",
              theme === 'dark' ? "text-gray-300" : "text-gray-600"
            )}
          >
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
} 