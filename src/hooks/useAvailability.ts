import { useState, useEffect, useCallback, useMemo } from 'react';
import { AvailabilitySlot, AvailabilityParams, TimeRange } from '@/types/availability';
import availabilityService from '@/services/availability';
import { DURATIONS, COURT_TYPES } from '@/config/availability';

export interface UseAvailabilityReturn {
  slots: AvailabilitySlot[];
  loading: boolean;
  error: Error | null;
  holdSlot: (slot: AvailabilitySlot) => Promise<boolean>;
  releaseHold: (slotId: string) => void;
  durations: typeof DURATIONS;
  courtTypes: typeof COURT_TYPES;
}

export function useAvailability(params: AvailabilityParams): UseAvailabilityReturn {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const memoizedParams = useMemo(() => ({
    date: params.date,
    duration: params.duration,
    courtType: params.courtType,
    timeOfDay: params.timeOfDay,
    branchId: params.branchId
  }), [
    params.date,
    params.duration,
    params.courtType,
    params.timeOfDay,
    params.branchId
  ]);

  const fetchSlots = useCallback(async () => {
    if (!memoizedParams.branchId) {
      console.log('useAvailability - No hay branchId seleccionado');
      setLoading(false);
      setSlots([]);
      return;
    }

    try {
      console.log('useAvailability - Iniciando fetchSlots:', memoizedParams);
      setLoading(true);
      setError(null);
      
      const availableSlots = await availabilityService.findAvailableSlots(memoizedParams);
      
      console.log('useAvailability - Slots obtenidos:', {
        cantidad: availableSlots.length,
        params: memoizedParams,
        primerSlot: availableSlots[0]
      });
      
      setSlots(availableSlots);
    } catch (err) {
      console.error('useAvailability - Error:', err);
      setError(err instanceof Error ? err : new Error('Error al obtener los turnos disponibles'));
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [memoizedParams]);

  const holdSlot = async (slot: AvailabilitySlot): Promise<boolean> => {
    console.log('useAvailability - Intentando hold en slot:', slot);
    const timeRange: TimeRange = {
      start: slot.startTime,
      end: slot.endTime
    };

    const success = await availabilityService.holdSlot(
      slot.id,
      slot.courtId,
      params.date,
      timeRange
    );

    console.log('useAvailability - Resultado hold:', success);
    if (success) {
      setSlots(currentSlots => 
        currentSlots.filter(s => s.id !== slot.id)
      );
    }

    return success;
  };

  const releaseHold = (slotId: string) => {
    availabilityService.releaseHold(slotId);
    fetchSlots();
  };

  useEffect(() => {
    if (memoizedParams.branchId) {
      fetchSlots();
    }
  }, [fetchSlots, memoizedParams.branchId]);

  return {
    slots,
    loading,
    error,
    holdSlot,
    releaseHold,
    durations: DURATIONS,
    courtTypes: COURT_TYPES
  };
} 