import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import type { UserPackageFromDB } from '../../../types/models';

/**
 * Custom hook para validar si un paquete es válido para una sede específica
 */
export function usePackageValidation({
  activePackage,
  selectedClassBranchId
}: {
  activePackage: UserPackageFromDB | null;
  selectedClassBranchId: string | undefined;
}) {
  const [packagesAreValid, setPackagesAreValid] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClientComponentClient<Database>();

  /**
   * Verifica si el paquete activo es válido para la sede de la clase seleccionada
   */
  const checkPackageValidity = useCallback(async () => {
    // Si no hay paquete activo o sede seleccionada, el paquete no es válido
    if (!activePackage || !selectedClassBranchId) {
      setPackagesAreValid(false);
      return;
    }

    setIsLoading(true);

    try {
      // Obtenemos los IDs de las sedes válidas para el paquete
      const branchIds = activePackage.package?.branch_ids || [];
      
      // Consultamos la información de las sedes
      const { data: branches } = await supabase
        .from('sedes')
        .select('name')
        .in('id', branchIds);

      // Verificamos si la sede de la clase está incluida en las sedes del paquete
      if (branches) {
        setPackagesAreValid(branchIds.includes(selectedClassBranchId));
      }
    } catch (error) {
      console.error('Error al verificar sedes válidas:', error);
      setPackagesAreValid(false);
    } finally {
      setIsLoading(false);
    }
  }, [activePackage, selectedClassBranchId, supabase]);

  // Ejecutar la validación cuando cambie el paquete activo o la sede seleccionada
  useEffect(() => {
    checkPackageValidity();
  }, [checkPackageValidity]);

  return { 
    packagesAreValid, 
    isValidating: isLoading, 
    checkPackageValidity 
  };
}
