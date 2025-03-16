import { useState, useCallback, useRef } from 'react';
import { stockValidationService } from '../../../services/stockValidationService';
import type { ClassSession } from '../../../types/models';
import type { SessionAvailability, AvailabilityUpdateOptions } from '../utils/types';

/**
 * Hook para gestionar la disponibilidad de las sesiones con carga optimizada
 * Implementa la estrategia de mostrar las sesiones inmediatamente y verificar su disponibilidad después
 */
export function useSessionAvailability({
  selectedClass,
  currentPage,
  pageSize,
  dispatch
}: {
  selectedClass: any | null;
  currentPage: number;
  pageSize: number;
  dispatch: (action: any) => void;
}) {
  // Estados para controlar la verificación de disponibilidad
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [sessionAvailability, setSessionAvailability] = useState<SessionAvailability>({});
  
  // Referencia para controlar si es la primera vez que se monta
  const isInitialMount = useRef(true);

  /**
   * Actualiza la información de disponibilidad de las sesiones de manera optimizada
   * @param options Opciones para la actualización (forzar actualización, solo sesiones visibles)
   */
  const updateAvailabilityInfo = useCallback(async (options?: AvailabilityUpdateOptions) => {
    const { forceUpdate = false, visibleSessionsOnly = false } = options || {};
    
    // No hacer nada si no hay clase seleccionada
    if (!selectedClass) return;
    
    try {
      const startTime = performance.now();
      console.log(`🔄 Iniciando verificación de disponibilidad (forzada: ${forceUpdate}, solo visibles: ${visibleSessionsOnly})`);
      
      // Usar el servicio de validación para actualizar la disponibilidad
      const stockService = stockValidationService;
      
      // Obtener todas las sesiones disponibles
      let sessionsToCheck = selectedClass.sessions || [];
      
      // OPTIMIZACIÓN 1: Si se requiere verificar solo las sesiones visibles (primer lote)
      if (visibleSessionsOnly) {
        // Calcular cuántas sesiones son visibles actualmente (basado en la paginación)
        const visibleSessionsCount = Math.min(
          (currentPage + 1) * pageSize, // Número de sesiones mostradas según paginación
          sessionsToCheck.length // Limitado por el total de sesiones disponibles
        );
        
        // Tomar solo las sesiones visibles
        sessionsToCheck = sessionsToCheck.slice(0, visibleSessionsCount);
        console.log(`📊 Limitando verificación a las ${visibleSessionsCount} sesiones visibles de ${selectedClass.sessions.length} totales`);
      }
      
      // OPTIMIZACIÓN 2: Si no es actualización forzada, filtrar solo las que necesitan verificación
      if (!forceUpdate) {
        const originalCount = sessionsToCheck.length;
        sessionsToCheck = sessionsToCheck.filter((session: ClassSession) => 
          // Incluir sesión si no tiene spotsLeft definido o es null
          session.spotsLeft === undefined || session.spotsLeft === null
        );
        console.log(`📊 Filtro adicional: solo ${sessionsToCheck.length} de ${originalCount} sesiones necesitan verificación de disponibilidad`);
      }
      
      console.log(`📊 Verificando disponibilidad para ${sessionsToCheck.length} de ${selectedClass.sessions.length} sesiones totales`);
      
      // Si no hay sesiones que verificar, terminamos
      if (sessionsToCheck.length === 0) {
        console.log('✅ No hay sesiones que requieran verificación de disponibilidad');
        return;
      }
      
      // Creamos una versión de la clase que solo contiene las sesiones a verificar
      const classToUpdate = {
        ...selectedClass,
        sessions: sessionsToCheck
      };
      
      // Actualizar solo las sesiones que necesitan verificación
      const updatedClass = await stockService.updateSessionsAvailability(
        classToUpdate, 
        { forceUpdate }
      );
      
      // Combinar los resultados: mantenemos las sesiones existentes y actualizamos solo las verificadas
      if (updatedClass && updatedClass.sessions) {
        // Creamos un mapa para buscar eficientemente las sesiones actualizadas
        const updatedSessionsMap = new Map(
          updatedClass.sessions.map((session: ClassSession) => [session.id, session])
        );
        
        // Recorremos todas las sesiones originales y actualizamos las que tienen nuevos datos
        const mergedSessions = selectedClass.sessions.map((session: ClassSession) => {
          // Si esta sesión fue actualizada, usamos la versión actualizada
          const updatedSession = updatedSessionsMap.get(session.id);
          if (updatedSession) {
            return updatedSession;
          }
          // Si no, mantenemos la versión original
          return session;
        });
        
        // Actualizar el estado con las sesiones combinadas
        dispatch({
          type: 'SET_SELECTED_CLASS',
          payload: {
            ...selectedClass,
            sessions: mergedSessions
          }
        });
      }
      
      // Tiempo de ejecución para diagnóstico
      const execTime = performance.now() - startTime;
      console.log(`✅ Verificación de disponibilidad completada en ${execTime.toFixed(2)}ms`);
      
    } catch (error) {
      console.error('❌ Error al actualizar disponibilidad:', error);
    }
  }, [selectedClass, currentPage, pageSize, dispatch]);

  /**
   * Inicia la verificación de disponibilidad para las sesiones recién cargadas al cambiar de página
   */
  const checkAvailabilityForNewlyLoadedSessions = useCallback(async () => {
    // No verificar si no hay sesiones o si estamos en el proceso de carga
    if (!selectedClass || isLoadingAvailability) return;
    
    // Solo verificar si ya hemos montado la UI inicialmente y hemos cargado más sesiones
    if (currentPage <= 0) return;
    
    console.log('🔄 Verificando disponibilidad para el nuevo lote de sesiones:', {
      currentPage,
      previouslyVisible: currentPage * pageSize
    });
    
    setIsLoadingAvailability(true);
    
    try {
      await updateAvailabilityInfo({ forceUpdate: false });
    } catch (error) {
      console.error('Error al verificar disponibilidad para nuevas sesiones:', error);
    } finally {
      setIsLoadingAvailability(false);
    }
  }, [selectedClass, isLoadingAvailability, currentPage, pageSize, updateAvailabilityInfo]);

  return {
    isLoadingAvailability,
    sessionAvailability,
    updateAvailabilityInfo,
    checkAvailabilityForNewlyLoadedSessions,
    isInitialMount
  };
}
