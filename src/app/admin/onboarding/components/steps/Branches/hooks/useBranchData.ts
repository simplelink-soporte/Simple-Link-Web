import { useState, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import { onboardingBranchService } from '@/services/onboardingBranchService';
import { BranchFormData, ScheduleData, CourtData } from '../types';

/**
 * Hook para gestionar la carga de datos de una sede
 */
export function useBranchData(branchId: string | undefined, initialSchedule: ScheduleData) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [branchData, setBranchData] = useState<BranchFormData | null>(null);
  const [isBranchSaved, setIsBranchSaved] = useState(false);

  useEffect(() => {
    async function loadBranchData() {
      if (!branchId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Usar el servicio para cargar los datos de la sede
        const { data, error } = await onboardingBranchService.getBranchById(branchId);
        
        if (error) throw error;
        if (!data) throw new Error('No se encontraron datos de la sede');

        // Transformar los datos recibidos al formato interno
        const formattedData: BranchFormData = {
          name: data.name || '',
          address: data.address || '',
          phone: data.phone || '',
          manager: data.manager_id || '',
          isActive: data.is_active ?? true,
          timezone: data.timezone || 'Europe/Madrid',
          schedule: data.opening_hours || initialSchedule,
          courts: (data.data?.courts || []).map((court: any) => {
            // Mapeo seguro de court
            return {
              id: court.id || '',
              name: court.name || '',
              sports: Array.isArray(court.sports) ? court.sports : [],
              type: court.type || '',
              characteristics: Array.isArray(court.characteristics) ? court.characteristics : [],
              available_durations: Array.isArray(court.durations) 
                ? court.durations.map((d: any) => Number(d)) 
                : [],
              duration_pricing: Array.isArray(court.prices) 
                ? court.prices.reduce((acc: Record<string, number>, price: any) => {
                    if (price && price.duration && price.price) {
                      acc[price.duration] = Number(price.price);
                    }
                    return acc;
                  }, {}) 
                : {},
              custom_pricing: Array.isArray(court.prices) 
                ? court.prices.reduce((acc: Record<string, any>, price: any) => {
                    if (price && price.timeRanges && Array.isArray(price.timeRanges) && price.timeRanges.length > 0) {
                      price.timeRanges.forEach((range: any) => {
                        if (range && range.day) {
                          if (!acc[range.day]) {
                            acc[range.day] = {
                              isSelected: true,
                              timeRanges: []
                            };
                          }
                          
                          if (range.start && range.end && range.percentage) {
                            acc[range.day].timeRanges.push({
                              startTime: range.start,
                              endTime: range.end,
                              percentage: Number(range.percentage)
                            });
                          }
                        }
                      });
                    }
                    return acc;
                  }, {}) 
                : {},
              is_active: court.is_active !== false
            };
          })
        };

        setBranchData(formattedData);
        setIsBranchSaved(true);
        
      } catch (err: any) {
        console.error('❌ Error al cargar los datos de la sede:', err);
        setError(err instanceof Error ? err : new Error(err?.message || 'Error desconocido'));
        
        toast({
          title: "Error",
          description: err?.message || "No se pudieron cargar los datos de la sede",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    loadBranchData();
  }, [branchId, initialSchedule]);

  return {
    loading,
    error,
    branchData,
    isBranchSaved,
    setIsBranchSaved
  };
} 