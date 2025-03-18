import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Sun, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface ShiftFiltersProps {
  theme: 'light' | 'dark';
  viewType: 'mobile' | 'desktop';
  duration: number[];
  onDurationChange: (value: number[]) => void;
  selectedTime: 'morning' | 'afternoon' | 'night' | null;
  onTimeChange: (value: 'morning' | 'afternoon' | 'night' | null) => void;
  courtFilter: 'all' | 'indoor' | 'outdoor' | 'covered';
  onCourtFilterChange: (value: 'all' | 'indoor' | 'outdoor' | 'covered') => void;
}

const TIME_RANGES = {
  morning: { label: 'Mañana', range: { start: '07:00', end: '12:00' } },
  afternoon: { label: 'Tarde', range: { start: '12:00', end: '18:00' } },
  night: { label: 'Noche', range: { start: '18:00', end: '23:00' } }
};

const COURT_TYPES = {
  all: 'Todas',
  indoor: 'Interior',
  outdoor: 'Exterior',
  covered: 'Cubierta'
};

export function ShiftFilters({
  theme,
  viewType,
  duration,
  onDurationChange,
  selectedTime,
  onTimeChange,
  courtFilter,
  onCourtFilterChange
}: ShiftFiltersProps) {
  const [showTimePopup, setShowTimePopup] = useState(false);
  const [showCourtPopup, setShowCourtPopup] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (showTimePopup || showCourtPopup) {
        const target = event.target as HTMLElement;
        if (!target.closest('[data-popup="time"]') && !target.closest('[data-popup="court"]')) {
          setShowTimePopup(false);
          setShowCourtPopup(false);
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTimePopup, showCourtPopup]);

  const timeOptions = [
    { id: 'morning' as const, label: 'Mañana' },
    { id: 'afternoon' as const, label: 'Tarde' },
    { id: 'night' as const, label: 'Noche' }
  ];

  const courtOptions = [
    { id: 'all' as const, label: 'Todas' },
    { id: 'indoor' as const, label: 'Interior' },
    { id: 'outdoor' as const, label: 'Exterior' },
    { id: 'covered' as const, label: 'Cubierta' }
  ];

  return (
    <div className={cn(
      "w-full p-4"
    )}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-[200px] pl-3">
          <div className="space-y-1.5">
            <Label className={cn(
              "text-xs font-medium",
              theme === 'dark' ? "text-gray-400" : "text-gray-500"
            )}>
              Duración
            </Label>
            <div>
              <Slider
                defaultValue={duration}
                value={duration}
                onValueChange={onDurationChange}
                min={1}
                max={3}
                step={0.5}
                className={cn(
                  "mb-1.5",
                  "[&_[role=slider]]:h-4 [&_[role=slider]]:w-4",
                  "[&_.relative]:h-2",
                  theme === 'dark'
                    ? "[&_.absolute]:bg-neutral-800 [&_[role=slider]]:border-neutral-600 [&_[role=slider]]:bg-neutral-900"
                    : "[&_.absolute]:bg-gray-300/90 [&_[role=slider]]:border-gray-400",
                  "[&_[role=slider]]:border-2",
                  "[&_[role=slider]]:transition-colors"
                )}
              />
              <span
                className={cn(
                  "flex w-full items-center justify-between gap-1 px-2",
                  "text-[10px] font-medium",
                  theme === 'dark' ? "text-neutral-500" : "text-gray-400"
                )}
                aria-hidden="true"
              >
                {[...Array(5)].map((_, i) => (
                  <span 
                    key={i} 
                    className="flex w-0 flex-col items-center justify-center gap-0.5"
                  >
                    <span
                      className={cn(
                        "h-0.5 w-px",
                        theme === 'dark' 
                          ? "bg-neutral-700" 
                          : "bg-gray-400",
                        i % 2 !== 0 && "h-[1px]"
                      )}
                    />
                    <span className={cn(i % 2 !== 0 && "opacity-0")}>
                      {1 + i/2}h
                    </span>
                  </span>
                ))}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative" data-popup="time">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTimePopup(!showTimePopup)}
              className={cn(
                "h-7 rounded-lg gap-2",
                "transition-all duration-200 ease-in-out",
                theme === 'dark' 
                  ? [
                      "bg-zinc-800/20 hover:bg-zinc-800/30 text-neutral-300 hover:text-neutral-100",
                      selectedTime === 'morning' && "bg-zinc-800/30 text-neutral-100"
                    ]
                  : [
                      "bg-gray-100/60 hover:bg-gray-200/60 text-gray-700 hover:text-gray-900",
                      selectedTime === 'morning' && "bg-gray-200/60 text-gray-900"
                    ]
              )}
            >
              <Sun className="h-3.5 w-3.5" />
              <span className={cn(
                "text-xs",
                viewType === "mobile" && "hidden"
              )}>
                {selectedTime ? TIME_RANGES[selectedTime].label : "Horario"}
              </span>
            </Button>

            <AnimatePresence>
              {showTimePopup && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={cn(
                    "absolute right-0 top-10 z-50",
                    "w-[140px] rounded-xl p-2",
                    "shadow-lg",
                    theme === 'dark'
                      ? "bg-neutral-900 border border-neutral-800"
                      : "bg-white border border-gray-200"
                  )}
                >
                  <p className={cn(
                    "text-[10px] font-medium text-center pb-2",
                    theme === 'dark' ? "text-gray-400" : "text-gray-500"
                  )}>
                    Momento del día
                  </p>
                  <div className="space-y-1">
                    {timeOptions.map(({ id, label }) => (
                      <button
                        key={id}
                        onClick={() => {
                          onTimeChange(selectedTime === id ? null : id as any);
                          setShowTimePopup(false);
                        }}
                        className={cn(
                          "w-full text-xs font-medium rounded-lg px-3 py-1.5",
                          "transition-all duration-200 ease-in-out",
                          "relative",
                          selectedTime === id
                            ? theme === 'dark'
                              ? "bg-neutral-800 text-neutral-200"
                              : "bg-gray-100 text-gray-900"
                            : theme === 'dark'
                              ? "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
                              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/50"
                        )}
                      >
                        <span className="flex items-center justify-between">
                          {label}
                          {selectedTime === id && (
                            <X 
                              className={cn(
                                "h-3 w-3 ml-2",
                                theme === 'dark' ? "text-neutral-400" : "text-gray-500"
                              )} 
                            />
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative" data-popup="court">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCourtPopup(!showCourtPopup)}
              className={cn(
                "h-7 rounded-lg gap-2",
                "transition-all duration-200 ease-in-out",
                theme === 'dark' 
                  ? [
                      "bg-zinc-800/20 hover:bg-zinc-800/30 text-neutral-300 hover:text-neutral-100",
                      courtFilter !== 'all' && "bg-zinc-800/30 text-neutral-100"
                    ]
                  : [
                      "bg-gray-100/60 hover:bg-gray-200/60 text-gray-700 hover:text-gray-900",
                      courtFilter !== 'all' && "bg-gray-200/60 text-gray-900"
                    ]
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              <span className={cn(
                "text-xs",
                viewType === "mobile" && "hidden"
              )}>
                {courtFilter === 'all' ? 'Canchas' : courtOptions.find(opt => opt.id === courtFilter)?.label}
              </span>
            </Button>

            <AnimatePresence>
              {showCourtPopup && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={cn(
                    "absolute right-0 top-10 z-50",
                    "w-[140px] rounded-xl p-2",
                    "shadow-lg",
                    theme === 'dark'
                      ? "bg-neutral-900 border border-neutral-800"
                      : "bg-white border border-gray-200"
                  )}
                >
                  <p className={cn(
                    "text-[10px] font-medium text-center pb-2",
                    theme === 'dark' ? "text-neutral-400" : "text-gray-500"
                  )}>
                    Tipo de cancha
                  </p>
                  <div className="space-y-1">
                    {courtOptions.map(({ id, label }) => (
                      <button
                        key={id}
                        onClick={() => {
                          onCourtFilterChange(courtFilter === id ? 'all' : id as any);
                          setShowCourtPopup(false);
                        }}
                        className={cn(
                          "w-full text-xs font-medium rounded-lg px-3 py-1.5",
                          "transition-all duration-200 ease-in-out",
                          "relative",
                          courtFilter === id
                            ? theme === 'dark'
                              ? "bg-neutral-800 text-neutral-200"
                              : "bg-gray-100 text-gray-900"
                            : theme === 'dark'
                              ? "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
                              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/50"
                        )}
                      >
                        <span className="flex items-center justify-between">
                          {label}
                          {courtFilter === id && (
                            <X 
                              className={cn(
                                "h-3 w-3 ml-2",
                                theme === 'dark' ? "text-neutral-400" : "text-gray-500"
                              )} 
                            />
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {viewType === "mobile" && (selectedTime || courtFilter !== 'all') && (
        <div className={cn(
          "mt-4 flex gap-2 flex-wrap",
          theme === 'dark' 
            ? "border-neutral-800" 
            : "border-gray-200/50"
        )}>
          {selectedTime && (
            <div className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium",
              theme === 'dark' 
                ? "bg-zinc-800 text-neutral-300"
                : "bg-gray-200 text-gray-700"
            )}>
              {TIME_RANGES[selectedTime].label}
              <button
                onClick={() => onTimeChange(null)}
                className={cn(
                  "p-0.5 rounded-full",
                  theme === 'dark'
                    ? "hover:bg-zinc-700"
                    : "hover:bg-black/10",
                  "transition-colors duration-200"
                )}
              >
                <X className={cn(
                  "h-3 w-3",
                  theme === 'dark' ? "text-neutral-400" : "text-gray-500"
                )} />
              </button>
            </div>
          )}

          {courtFilter !== 'all' && (
            <div className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium",
              theme === 'dark' 
                ? "bg-zinc-800 text-neutral-300"
                : "bg-gray-200 text-gray-700"
            )}>
              {COURT_TYPES[courtFilter]}
              <button
                onClick={() => onCourtFilterChange('all')}
                className={cn(
                  "p-0.5 rounded-full",
                  theme === 'dark'
                    ? "hover:bg-zinc-700"
                    : "hover:bg-black/10",
                  "transition-colors duration-200"
                )}
              >
                <X className={cn(
                  "h-3 w-3",
                  theme === 'dark' ? "text-neutral-400" : "text-gray-500"
                )} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

ShiftFilters.displayName = 'ShiftFilters';
