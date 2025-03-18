import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Interfaz para el tipo de sucursal
export interface Branch {
  id: string;
  name: string;
  address?: string;
  opening_hours?: string | Record<string, any>;
  coordinates?: {
    lat: number;
    lng: number;
  };
  is_active?: boolean;
}

const BRANCHES_CACHE_KEY = 'shift-registration-branches';

/**
 * Hook para obtener las sucursales disponibles para una empresa
 * 
 * @param organizationId - ID de la organización/empresa
 * @returns Objeto con las sucursales, estado de carga y error
 */
export function useShiftLocationBranches(organizationId?: string | null) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchBranches = async () => {
      // Si no hay ID de organización, no podemos cargar las sucursales
      if (!organizationId) {
        console.log('[useShiftLocationBranches] No hay ID de organización');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('[useShiftLocationBranches] Cargando sucursales para:', organizationId);
        
        // Crear cliente de Supabase
        const supabase = createClientComponentClient();
        
        // Consultar las sucursales activas de la organización
        const { data, error } = await supabase
          .from('sedes')
          .select('*')
          .eq('empresa_id', organizationId)
          .eq('is_active', true)
          .order('name');
        
        if (error) {
          console.error('[useShiftLocationBranches] Error al obtener sucursales:', error);
          throw error;
        }
        
        // Transformar los datos al formato esperado
        const transformedData: Branch[] = data?.map(sede => ({
          id: sede.id,
          name: sede.name,
          address: sede.address || '',
          opening_hours: sede.opening_hours || '',
          coordinates: sede.coordinates || { lat: 0, lng: 0 },
          is_active: sede.is_active
        })) || [];
        
        console.log('[useShiftLocationBranches] Sucursales obtenidas:', transformedData.length);
        setBranches(transformedData);
        setLoading(false);
      } catch (err) {
        console.error('[useShiftLocationBranches] Error:', err);
        setError(err instanceof Error ? err : new Error('Error desconocido'));
        setLoading(false);
        
        // En caso de error, cargamos datos de demostración para desarrollo
        if (process.env.NODE_ENV === 'development') {
          console.log('[useShiftLocationBranches] Cargando datos de demostración');
          const demoData: Branch[] = [
            {
              id: 'branch-1',
              name: 'Sede Central',
              address: 'Av. Principal 123, Ciudad',
              opening_hours: '9:00-18:00',
              coordinates: {
                lat: -34.603722,
                lng: -58.381592
              }
            },
            {
              id: 'branch-2',
              name: 'Sucursal Norte',
              address: 'Calle Norte 456, Barrio Norte',
              opening_hours: '8:30-17:30',
              coordinates: {
                lat: -34.583722,
                lng: -58.391592
              }
            },
            {
              id: 'branch-3',
              name: 'Sucursal Sur',
              address: 'Avenida Sur 789, Zona Sur',
              opening_hours: '9:00-19:00',
              coordinates: {
                lat: -34.623722,
                lng: -58.371592
              }
            }
          ];
          setBranches(demoData);
          setLoading(false);
        }
      }
    };

    fetchBranches();
  }, [organizationId]);

  return { branches, loading, error };
}
