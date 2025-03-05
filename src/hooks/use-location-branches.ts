import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { Branch } from '@/types/branch'
import { LocationStepSettings } from '@/components/steps/location/types'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const BRANCHES_CACHE_KEY = 'public-form-branches'

export function useLocationBranches(
  settings: LocationStepSettings | undefined,
  empresaId: string | null
) {
  const supabase = createClientComponentClient()
  
  console.log('🔍 useLocationBranches iniciado con:', {
    empresaId,
    hasSettings: !!settings
  });
  
  // Consulta para obtener las sedes
  const { data: branches, isLoading, error } = useQuery({
    queryKey: [BRANCHES_CACHE_KEY, empresaId],
    queryFn: async () => {
      if (!empresaId) {
        console.error('❌ No se proporcionó el ID de la empresa');
        throw new Error('No se proporcionó el ID de la empresa');
      }

      console.log('📍 Consultando sedes para empresa:', empresaId);

      const { data, error } = await supabase
        .from('sedes')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('❌ Error al obtener sucursales:', error);
        throw error;
      }

      // Transformar los datos al formato esperado asegurando todos los campos requeridos
      const transformedData: Branch[] = data?.map(sede => ({
        id: sede.id,
        name: sede.name,
        address: sede.address || '',
        phone: sede.phone || '',
        manager_id: sede.manager_id || '',
        is_active: sede.is_active ?? true,
        opening_hours: sede.opening_hours || {},
        settings: sede.settings || {},
        empresa_id: sede.empresa_id,
        created_at: sede.created_at,
        updated_at: sede.updated_at
      })) || [];

      console.log('✅ Sucursales obtenidas:', {
        total: transformedData.length,
        empresaId,
        firstBranch: transformedData[0]?.name
      });
      
      return transformedData;
    },
    enabled: !!empresaId,
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
    retry: 1 // Solo intentar una vez más en caso de error
  })

  const [filteredBranches, setFilteredBranches] = useState<Branch[]>([])

  useEffect(() => {
    if (!branches || error) {
      console.log('ℹ️ No hay sucursales o hay error:', { 
        branchesLength: branches?.length || 0,
        error: error?.message,
        empresaId 
      });
      setFilteredBranches([]);
      return;
    }

    // Si settings es undefined o showBranches no está explícitamente en false,
    // mostramos todas las sucursales activas
    const shouldShowBranches = !settings || settings.showBranches !== false;
    const filtered = shouldShowBranches ? branches : [];

    console.log('📋 Filtrando sucursales:', {
      total: branches.length,
      filtered: filtered.length,
      shouldShowBranches,
      settings: settings ? 'definido' : 'indefinido',
      empresaId
    });

    setFilteredBranches(filtered);
  }, [branches, settings, error, empresaId])

  return {
    branches: filteredBranches,
    isLoading,
    error: error as Error | null,
    isEmpty: !isLoading && filteredBranches.length === 0
  }
} 