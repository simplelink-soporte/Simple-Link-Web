import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Clock, Sun, Loader2 } from 'lucide-react';
import { AvailabilitySlot } from '@/types/availability';
import { getCourtTypeLabel } from '../../utils/courtTypeUtils';

interface ShiftsListProps {
  slots: AvailabilitySlot[];
  selectedShift: string | null;
  onShiftSelect: (slot: AvailabilitySlot) => void;
  theme: 'light' | 'dark';
  viewType: 'mobile' | 'desktop';
  loading?: boolean;
  error?: string;
}

const ShiftCard = memo(({ 
  slot, 
  isSelected, 
  onSelect, 
  theme 
}: { 
  slot: AvailabilitySlot;
  isSelected: boolean;
  onSelect: () => void;
  theme: 'light' | 'dark';
}) => (
  <button
    onClick={onSelect}
    className={cn(
      "relative w-full px-3 py-2 text-left transition-colors duration-200 rounded-lg",
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
    {isSelected && (
      <div
        className={cn(
          "absolute inset-0 z-0 rounded-lg",
          theme === 'dark' 
            ? "bg-zinc-800/70"
            : "bg-gray-200/70"
        )}
      />
    )}

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
          {`${slot.startTime} - ${slot.endTime}`}
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
          ${slot.price?.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
          {slot.courtName} • {getCourtTypeLabel(slot.courtType)}
        </p>
      </div>
    </div>
  </button>
));

export function ShiftsList({ 
  slots, 
  selectedShift, 
  onShiftSelect, 
  theme,
  viewType,
  loading,
  error 
}: ShiftsListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
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
      </div>
    );
  }

  if (!slots.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-2">
        <p className={cn(
          "text-sm text-center",
          theme === 'dark' ? "text-gray-400" : "text-gray-500"
        )}>
          No hay turnos disponibles para los filtros seleccionados
        </p>
      </div>
    );
  }

  return (
    <div className="px-6">
      <div className={cn(
        "space-y-3 h-[calc(100vh-460px)] overflow-y-auto",
        "scrollbar-none"
      )}>
        {slots.map((slot) => {
          const isSelected = selectedShift === slot.id;
          
          return (
            <button
              key={`${slot.id}-${slot.startTime}-${slot.courtId}`}
              onClick={() => onShiftSelect(slot)}
              className={cn(
                "relative w-full px-4 py-3 text-left rounded-lg",
                "transition-colors duration-200",
                isSelected
                  ? theme === 'dark'
                      ? "bg-[#000000E6]"
                      : "bg-[#000000E6]"
                  : theme === 'dark'
                      ? "border border-zinc-700/25 hover:border-zinc-600/40"
                      : "border border-gray-200/60 hover:border-gray-300/70",
                !isSelected && "border-[0.5px]"
              )}
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-1">
                  <p
                    className={cn(
                      "font-medium text-sm",
                      isSelected
                        ? "text-white"
                        : theme === 'dark'
                          ? "text-gray-200"
                          : "text-gray-900"
                    )}
                  >
                    {`${slot.startTime} - ${slot.endTime}`}
                  </p>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      isSelected
                        ? "text-gray-300"
                        : theme === 'dark'
                          ? "text-gray-400"
                          : "text-gray-700"
                    )}
                  >
                    ${slot.price?.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <p
                    className={cn(
                      "text-[11px]",
                      isSelected
                        ? "text-gray-300"
                        : theme === 'dark'
                          ? "text-gray-400"
                          : "text-gray-600"
                    )}
                  >
                    {slot.courtName} • {getCourtTypeLabel(slot.courtType)}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
} 