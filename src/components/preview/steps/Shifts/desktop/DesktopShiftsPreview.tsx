import { useState, useCallback, useRef } from 'react';
import { ShiftsPreviewProps } from '../types';
import { withResponsiveView } from '../hoc/withResponsiveView';
import { useResponsiveStyles } from '../hooks/useResponsiveStyles';
import { useGlobalScroll } from '../hooks/useGlobalScroll';
import { cn } from '@/lib/utils';
import { useForm } from '@/contexts/FormContext';
import { startOfDay, parseISO } from 'date-fns';
import { useAvailability } from '@/hooks/useAvailability';
import { DateSelector } from '../components/DateSelector';
import { ShiftsList } from '../components/ShiftsList';
import { ShiftFilters } from '../components/ShiftFilters';
import { PageHeader } from '../components/PageHeader';
import { AvailabilitySlot } from '@/types/availability';

function DesktopShiftsPreviewBase({ theme, viewType, onNext, onPrev, isFirstStep, isLastStep, isPublicView, field }: ShiftsPreviewProps) {
  const { getStyle } = useResponsiveStyles('desktop');
  const { state, setShift } = useForm();
  
  // Referencia al contenedor de turnos para el scroll global
  const shiftsContainerRef = useRef<HTMLDivElement>(null);
  
  // Aplicar scroll global solo en vista desktop con ajustes
  useGlobalScroll(shiftsContainerRef as React.RefObject<HTMLDivElement>, {
    enabled: viewType === 'desktop',
    scrollSpeed: 1,     // Velocidad estándar para un comportamiento natural
    initialPadding: 30  // Padding inicial para evitar elementos en los bordes
  });
  
  // Estados locales
  const [selectedDate, setSelectedDate] = useState(() => {
    if (state.shift.date) {
      return startOfDay(parseISO(state.shift.date));
    }
    return startOfDay(new Date());
  });
  const [duration, setDuration] = useState<number[]>([state.shift.duration || 1]);
  const [selectedTime, setSelectedTime] = useState<'morning' | 'afternoon' | 'night' | null>(null);
  const [courtFilter, setCourtFilter] = useState<'all' | 'indoor' | 'outdoor' | 'covered'>('all');
  const [selectedShift, setSelectedShift] = useState<string | null>(state.shift.courtId || null);
  
  // Obtener el branchId del contexto
  const { location } = state;
  const branchId = location.branchId;
  
  // Obtener disponibilidad de turnos
  const { 
    slots = [], 
    loading, 
    error,
    holdSlot,
    releaseHold
  } = useAvailability({
    date: selectedDate,
    duration: duration[0],
    timeOfDay: selectedTime || undefined,
    courtType: courtFilter === 'all' ? undefined : courtFilter,
    branchId: branchId || ''
  });

  // Manejar la selección de fecha
  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    setSelectedShift(null);
    
    setShift({
      ...state.shift,
      date: date.toISOString().split('T')[0],
      startTime: '',
      endTime: '',
      courtId: '',
      courtName: ''
    });
  }, [state.shift, setShift]);

  // Manejar selección de turno
  const handleShiftSelect = useCallback((slot: AvailabilitySlot) => {
    setSelectedShift(slot.id);
    
    setShift({
      date: selectedDate.toISOString().split('T')[0],
      startTime: slot.startTime,
      endTime: slot.endTime,
      duration: duration[0],
      courtId: slot.courtId,
      courtName: slot.courtName,
      price: slot.price || 0
    });
  }, [selectedDate, duration, setShift]);

  return (
    <div className={cn(getStyle('container'))}>
      {/* Encabezado */}
      <PageHeader 
        theme={theme} 
        title="Selecciona un turno"
        description="Elige el horario que mejor se adapte a tus necesidades" 
      />
      
      {/* Selector de fecha */}
      <div className="mt-6">
        <DateSelector
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          theme={theme}
          viewType={viewType}
        />
      </div>
      
      {/* Filtros de turno */}
      <div className="mt-6">
        <ShiftFilters
          theme={theme}
          viewType={viewType}
          duration={duration}
          onDurationChange={(newDuration) => {
            setDuration(newDuration);
            setSelectedShift(null);
            setShift({
              ...state.shift,
              duration: newDuration[0],
              startTime: '',
              endTime: '',
              courtId: '',
              courtName: ''
            });
          }}
          selectedTime={selectedTime}
          onTimeChange={setSelectedTime}
          courtFilter={courtFilter}
          onCourtFilterChange={setCourtFilter}
        />
      </div>
      
      {/* Lista de turnos */}
      <div className="mt-6 pb-20">
        <ShiftsList
          slots={slots}
          selectedShift={selectedShift}
          onShiftSelect={handleShiftSelect}
          theme={theme}
          viewType={viewType}
          loading={loading}
          error={error ? error.message : undefined}
          containerRef={shiftsContainerRef as React.RefObject<HTMLDivElement>}
        />
      </div>
    </div>
  );
}

export const DesktopShiftsPreview = withResponsiveView(DesktopShiftsPreviewBase, {
  styleKey: 'container',
}); 