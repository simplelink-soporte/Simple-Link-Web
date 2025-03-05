import { useState, useCallback } from 'react';
import { ShiftsPreviewProps } from '../types';
import { withResponsiveView } from '../hoc/withResponsiveView';
import { useResponsiveStyles } from '../hooks/useResponsiveStyles';
import { cn } from '@/lib/utils';
import { useForm } from '@/contexts/FormContext';
import { MobileNavigation } from '@/components/preview/layout/MobileNavigation';
import { MobileNextButton } from '@/components/preview/layout/MobileNextButton';
import { startOfDay, parseISO } from 'date-fns';
import { useAvailability } from '@/hooks/useAvailability';
import { DateSelector } from '../components/DateSelector';
import { ShiftsList } from '../components/ShiftsList';
import { ShiftFilters } from '../components/ShiftFilters';
import { PageHeader } from '../components/PageHeader';
import { AvailabilitySlot } from '@/types/availability';

function MobileShiftsPreviewBase({ theme, viewType, onNext, onPrev, isFirstStep, isLastStep, isPublicView, field }: ShiftsPreviewProps) {
  const { getStyle } = useResponsiveStyles('mobile');
  const { state, setShift } = useForm();
  
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
  const [selectedShift, setSelectedShift] = useState<string | null>(null);

  // Obtener el branchId del contexto
  const { location } = state;
  const branchId = location.branchId;

  // Obtener los slots disponibles usando el hook useAvailability
  const {
    slots = [],
    loading: loadingSlots,
    error,
    holdSlot,
    releaseHold
  } = useAvailability({
    date: selectedDate,
    duration: duration[0],
    courtType: courtFilter === 'all' ? undefined : courtFilter,
    timeOfDay: selectedTime || undefined,
    branchId: branchId || ''
  });

  // Manejadores de eventos
  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    setSelectedShift(null);
    
    setShift({
      ...state.shift,
      date: date.toISOString().split('T')[0],
      startTime: null,
      endTime: null,
      courtId: null,
      courtName: null
    });
  }, [state.shift, setShift]);

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
    <div className={getStyle('container')}> 
      {/* Botones de navegación */} 
      <MobileNavigation 
        theme={theme} 
        onPrev={onPrev} 
        isPublicView={isPublicView} 
      /> 
      <MobileNextButton 
        theme={theme} 
        onNext={onNext} 
        isDisabled={!selectedShift} 
        isPublicView={isPublicView}
        viewType={viewType}
        variant="shifts"
      /> 

      <div className="flex flex-col min-h-screen overflow-hidden">
        {/* Título y descripción */} 
        <div className="pt-24 px-6 pb-6"> 
          <PageHeader 
            theme={theme} 
            title="Agenda tu reserva"
            description="Selecciona el día y horario para tu próxima partida"
          />
        </div> 

        {/* Contenido principal */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Selector de fecha */}
          <div className="px-6 mb-3">
            <DateSelector
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              theme={theme}
              viewType={viewType}
            />
          </div>

          <div className={cn(
            "w-full flex-1 flex flex-col pb-20",
            "transition-all duration-200 ease-in-out"
          )}>
            {/* Filtros */}
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
                  startTime: undefined,
                  endTime: undefined,
                  courtId: undefined,
                  courtName: undefined
                });
              }}
              selectedTime={selectedTime}
              onTimeChange={setSelectedTime}
              courtFilter={courtFilter}
              onCourtFilterChange={setCourtFilter}
            />

            {/* Lista de turnos */}
            <div className="flex-1">
              <ShiftsList
                slots={slots}
                selectedShift={selectedShift}
                onShiftSelect={handleShiftSelect}
                theme={theme}
                viewType={viewType}
                loading={loadingSlots}
                error={error ? error.message : undefined}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  ); 
}

// Aplicar el HOC con opciones específicas para la vista móvil
export const MobileShiftsPreview = withResponsiveView(MobileShiftsPreviewBase, {
  styleKey: 'container',
  fullWidth: true,
  disableWrapper: true
}); 