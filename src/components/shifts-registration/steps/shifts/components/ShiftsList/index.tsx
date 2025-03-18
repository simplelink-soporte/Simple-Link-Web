import { memo, useRef, forwardRef, RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Tipos para los turnos
type ShiftStatus = 'available' | 'popular' | 'lastCall';

interface Shift {
  id: string;
  time: string;
  endTime: string;
  type: string;
  courtNumber: string;
  courtType: string;
  basePrice: number;
  status: ShiftStatus;
}

interface ShiftsListProps {
  shifts: Shift[];
  selectedShift: string | null;
  onShiftSelect: (shift: Shift) => void;
  theme: 'light' | 'dark';
  viewType: 'mobile' | 'desktop';
  loading: boolean;
  error?: string;
  containerRef?: RefObject<HTMLDivElement>;
}

// Función para obtener el color según el estado del turno
const getStatusColor = (status: ShiftStatus, theme: 'light' | 'dark', isSelected: boolean): string => {
  if (isSelected) {
    return theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white';
  }

  switch (status) {
    case 'popular':
      return theme === 'dark' ? 'text-amber-400' : 'text-amber-600';
    case 'lastCall':
      return theme === 'dark' ? 'text-red-400' : 'text-red-600';
    case 'available':
    default:
      return theme === 'dark' ? 'text-gray-400' : 'text-gray-600';
  }
};

// Función para obtener una etiqueta según el estado del turno
const getStatusLabel = (status: ShiftStatus): string => {
  // Retornamos string vacío para eliminar la palabra "Disponible"
  return '';
};

// Función para traducir el tipo de cancha al español
const translateCourtType = (courtType: string): string => {
  const lowerType = courtType.toLowerCase();
  
  if (lowerType.includes('indoor')) return 'Interior';
  if (lowerType.includes('outdoor')) return 'Exterior';
  if (lowerType.includes('covered')) return 'Cubierta';
  
  return courtType;
};

// Componente para renderizar un turno individual
const ShiftCard = memo(({ 
  shift, 
  isSelected, 
  onSelect, 
  theme
}: { 
  shift: Shift;
  isSelected: boolean;
  onSelect: () => void;
  theme: 'light' | 'dark';
}) => (
  <button
    onClick={onSelect}
    className={cn(
      "relative w-full px-3 py-3 text-left transition-colors duration-200 rounded-lg",
      theme === 'dark'
        ? "hover:bg-zinc-800/30"
        : "hover:bg-gray-100",
      isSelected && (
        theme === 'dark'
          ? "bg-zinc-800/70"
          : "bg-gray-100/70"
      )
    )}
  >
    <div className="relative z-10 flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <p className={cn(
          "font-medium text-sm",
          isSelected 
            ? theme === 'dark'
              ? "text-white"
              : "text-gray-900"
            : theme === 'dark'
              ? "text-white"
              : "text-gray-900"
        )}>
          {`${shift.time} - ${shift.endTime || '??:??'}`}
        </p>
        <span className={cn(
          "text-xs font-medium",
          isSelected 
            ? theme === 'dark'
              ? "text-gray-300"
              : "text-gray-700"
            : theme === 'dark'
              ? "text-gray-400"
              : "text-gray-700"
        )}>
          ${shift.basePrice?.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </span>
      </div>
      <div className="space-y-0.5">
        <p className={cn(
          "text-[11px]",
          isSelected 
            ? theme === 'dark'
              ? "text-gray-300"
              : "text-gray-600"
            : theme === 'dark'
              ? "text-gray-400"
              : "text-gray-600"
        )}>
          {shift.courtNumber} • {translateCourtType(shift.courtType)}
        </p>
        
        <div className="flex justify-between items-center">
          {/* Solo mostramos el estado si no está vacío */}
          {getStatusLabel(shift.status) && (
            <p className={cn(
              "text-[11px]",
              getStatusColor(shift.status, theme, isSelected)
            )}>
              {getStatusLabel(shift.status)}
            </p>
          )}
          
          {isSelected && (
            <div className={cn(
              "flex items-center gap-1 text-[10px] font-medium",
              theme === 'dark' ? "text-gray-400" : "text-gray-500"
            )}>
              <span>Seleccionado</span>
            </div>
          )}
        </div>
      </div>
    </div>
  </button>
));

ShiftCard.displayName = 'ShiftCard';

// Componente principal para la lista de turnos
export function ShiftsList({ 
  shifts, 
  selectedShift, 
  onShiftSelect, 
  theme,
  viewType,
  loading,
  error,
  containerRef
}: ShiftsListProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  
  // Usar la referencia proporcionada o la interna
  const actualRef = containerRef || innerRef;
  
  if (loading) {
    return (
      <div className={cn(
        "flex items-center justify-center py-8",
        "animate-pulse"
      )}>
        <Loader2 className={cn(
          "w-6 h-6 animate-spin",
          theme === 'dark' ? "text-gray-400" : "text-gray-500"
        )} />
        <p className={cn(
          "text-sm ml-2",
          theme === 'dark' ? "text-gray-400" : "text-gray-500"
        )}>
          Cargando turnos disponibles...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-2">
        <p className={cn(
          "text-sm text-center",
          theme === 'dark' ? "text-red-400" : "text-red-500"
        )}>
          {error}
        </p>
        <Button 
          variant="outline"
          size="sm"
          className={cn(
            "mt-2",
            theme === 'dark' ? "border-neutral-800 hover:bg-neutral-800 text-neutral-200" : ""
          )}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  if (!shifts.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-2">
        <p className={cn(
          "text-sm text-center",
          theme === 'dark' ? "text-gray-400" : "text-gray-500"
        )}>
          No hay turnos disponibles para los filtros seleccionados
        </p>
        <Button 
          variant="outline"
          size="sm"
          className={cn(
            "mt-2",
            theme === 'dark' ? "border-neutral-800 hover:bg-neutral-800 text-neutral-200" : ""
          )}
        >
          Limpiar filtros
        </Button>
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div className={cn(
        "relative",
        viewType === 'desktop' && "overflow-hidden"
      )}>
        {/* Efectos de desvanecimiento en los bordes (solo desktop) */}
        {viewType === 'desktop' && (
          <>
            <div className={cn(
              "absolute top-0 left-0 right-0 h-8 z-[5] pointer-events-none",
              "bg-gradient-to-b opacity-75",
              theme === 'dark' 
                ? "from-[#121212] to-transparent" 
                : "from-white to-transparent"
            )} />
            <div className={cn(
              "absolute bottom-0 left-0 right-0 h-8 z-[5] pointer-events-none",
              "bg-gradient-to-t opacity-75",
              theme === 'dark' 
                ? "from-[#121212] to-transparent" 
                : "from-white to-transparent"
            )} />
          </>
        )}
        
        <div 
          ref={actualRef}
          className={cn(
            "space-y-2 overflow-y-auto px-4",
            viewType === 'desktop' 
              ? "max-h-[calc(100vh-460px)] min-h-[300px] relative py-4" 
              : "max-h-[calc(100vh-460px)] min-h-[300px]",
            "scrollbar-none"
          )}
          style={{
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key="shifts-list"
              initial={{ opacity: 0.8 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="space-y-2"
            >
              {shifts.map((shift) => (
                <motion.div
                  key={shift.id}
                  layout
                  layoutId={shift.id}
                  initial={{ opacity: 0.8, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ShiftCard
                    shift={shift}
                    isSelected={selectedShift === shift.id}
                    onSelect={() => onShiftSelect(shift)}
                    theme={theme}
                  />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

ShiftsList.displayName = 'ShiftsList';
