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
  // Inicializamos como true para evitar mensajes de error temporales mientras carga
  const [packagesAreValid, setPackagesAreValid] = useState<boolean | null>(true);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient<Database>();

  /**
   * Verifica si el paquete activo es válido para la sede de la clase seleccionada
   */
  const checkPackageValidity = useCallback(async () => {
    // Si no hay paquete activo o sede seleccionada, no cambiamos el estado hasta que tengamos datos completos
    if (!activePackage || !selectedClassBranchId) {
      // Solo establecemos inválido si realmente sabemos que hay datos pero son inválidos
      if (activePackage === null && selectedClassBranchId) {
        setPackagesAreValid(false);
      }
      setIsLoading(false);
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
      // No cambiamos el estado a false inmediatamente si hay un error de red
      // Solo lo hacemos si estamos seguros que el paquete es inválido
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
