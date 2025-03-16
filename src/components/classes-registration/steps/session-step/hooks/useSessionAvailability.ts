"use client"

import { useState, useCallback, useRef, useEffect } from 'react';
import { useClassesRegistrationStore } from '@/components/classes-registration/providers/ClassesRegistrationProvider';
import { stockValidationService } from '../../../services/stockValidationService';
import { ClassService } from '../../../services/classService';
import type { ClassSession } from '../../../types/models';
import type { SessionAvailability } from '../utils/types';

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
  
  // Referencia para evitar verificaciones redundantes
  const lastVerifiedClassIdRef = useRef<string | null>(null);
  const isUpdatingRef = useRef<boolean>(false);

  /**
   * Actualiza la información de disponibilidad (spotsLeft) para las sesiones actuales
   *
   * @param forceUpdate Si es true, verifica todas las sesiones incluso si ya tienen spotsLeft
   */
  const updateAvailabilityInfo = useCallback(async (forceUpdate = false) => {
    // Validaciones para evitar operaciones innecesarias
    if (!selectedClass?.id || !selectedClass.sessions || selectedClass.sessions.length === 0) {
      console.log('🔍 No hay sesiones para verificar disponibilidad');
      return;
    }
    
    // Evitar actualizaciones simultáneas
    if (isUpdatingRef.current) {
      console.log('🔄 Ya se está ejecutando una actualización de disponibilidad, saltando esta llamada');
      return;
    }
    
    // Marcar como actualizando
    isUpdatingRef.current = true;
    setIsLoadingAvailability(true);
    
    try {
      // Seleccionar qué sesiones necesitan verificación
      // Si forceUpdate es true, verificamos todas; de lo contrario, solo las que no tienen spotsLeft
      const sessionsToCheck = forceUpdate
        ? selectedClass.sessions
        : selectedClass.sessions.filter(
            (session: ClassSession) => session.spotsLeft === undefined || session.spotsLeft === null
          );
      
      // Si no hay sesiones que verificar, terminamos temprano
      if (sessionsToCheck.length === 0) {
        console.log('🔍 No hay sesiones que requieran verificación de disponibilidad');
        setIsLoadingAvailability(false);
        isUpdatingRef.current = false;
        return;
      }
      
      console.log(`🔄 Verificando disponibilidad para ${sessionsToCheck.length} ${forceUpdate ? 'sesiones (forzado)' : 'sesiones sin información de disponibilidad'}`);
      
      // IMPORTANTE: Marcar inmediatamente todas las sesiones a verificar con el estado de carga (null)
      // para que el usuario vea el indicador 'Verificando...' mientras esperamos los resultados
      if (sessionsToCheck.length > 0) {
        // Crear un mapa para identificar rápidamente las sesiones a verificar
        const sessionsToCheckMap = new Map<string, boolean>(
          sessionsToCheck.map((session: ClassSession) => [session.id, true])
        );
        
        // Actualizar todas las sesiones que necesiten verificación con spotsLeft = null
        const sessionsWithLoadingState = selectedClass.sessions.map((session: ClassSession) => {
          if (sessionsToCheckMap.has(session.id)) {
            // Esta sesión necesita verificación, mostrar estado de carga
            return {
              ...session,
              spotsLeft: null as unknown as number // Aplicar estado de carga
            };
          }
          return session; // Mantener sesiones que no necesitan verificación
        });
        
        // Actualizar el estado para mostrar inmediatamente los indicadores de carga
        dispatch({
          type: 'SET_SELECTED_CLASS',
          payload: {
            ...selectedClass,
            sessions: sessionsWithLoadingState
          }
        });
        
        console.log('🔄 Sesiones marcadas con estado de carga mientras se verifica disponibilidad');
      }
      
      // Obtener servicio
      const classService = new ClassService();
      
      // IMPORTANTE: Crear un mapa de todas las sesiones que YA tienen un valor de stock VERIFICADO
      // para evitar que sean sobrescritas durante la actualización
      const verifiedSessions = new Map<string, number>();
      (selectedClass.sessions || []).forEach((session: ClassSession) => {
        // Si la sesión tiene un valor de spotsLeft que NO es null ni undefined,
        // lo consideramos verificado y lo protegemos
        if (session.id && session.spotsLeft !== undefined && session.spotsLeft !== null) {
          verifiedSessions.set(session.id, session.spotsLeft);
        }
      });
      
      console.log(`🔒 Mapa de protección: ${verifiedSessions.size} sesiones con stock verificado serán protegidas`);
      
      // OPTIMIZACIÓN: Verificar disponibilidad en lotes para reducir la carga en el servidor
      // y mejorar la experiencia de usuario con actualizaciones más frecuentes
      const BATCH_SIZE = 10; // Número máximo de sesiones a verificar a la vez
      
      // Dividir las sesiones en lotes para verificar
      for (let i = 0; i < sessionsToCheck.length; i += BATCH_SIZE) {
        // Tomar el siguiente lote de sesiones
        const batch = sessionsToCheck.slice(i, i + BATCH_SIZE);
        console.log(`📊 Procesando lote ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(sessionsToCheck.length/BATCH_SIZE)} (${batch.length} sesiones)`);
        
        // Verificar disponibilidad para este lote
        const availabilityResults = await classService.checkMultipleSessionsAvailability(
          selectedClass.id,
          batch
        );
        
        // Si no tenemos resultados, continuamos con el siguiente lote
        if (!availabilityResults || availabilityResults.size === 0) {
          console.warn('⚠️ No se obtuvieron resultados de disponibilidad para este lote');
          continue;
        }
        
        // Actualizar las sesiones con la nueva información de disponibilidad
        const updatedSessions = selectedClass.sessions.map((session: ClassSession) => {
          // PROTECCIÓN DE STOCK: Si la sesión ya tenía un valor verificado y NO está en el lote actual de verificación,
          // mantener su valor original para evitar sobrescribirlo con valores por defecto
          if (verifiedSessions.has(session.id) && !batch.some((s: ClassSession) => s.id === session.id)) {
            // Esta es una sesión ya verificada anteriormente y que NO estamos verificando en este lote
            // Mantener su valor verificado actual
            return {
              ...session,
              spotsLeft: verifiedSessions.get(session.id)
            };
          }
          
          // Si esta sesión está en los resultados de disponibilidad, actualizar su información
          const availabilityResult = availabilityResults.get(session.id);
          
          if (availabilityResult) {
            // Solo actualizamos si:
            // 1. La sesión no tenía un valor verificado anteriormente, o
            // 2. Está específicamente en el lote actual que estamos verificando
            return {
              ...session,
              spotsLeft: availabilityResult.availableSpots
            };
          }
          
          // Si la sesión no está en los resultados, mantener su información actual
          return session;
        });
        
        // Actualizar el estado con las sesiones actualizadas
        dispatch({
          type: 'SET_SELECTED_CLASS',
          payload: {
            ...selectedClass,
            sessions: updatedSessions
          }
        });
        
        // Breve pausa para permitir que la UI se actualice entre lotes y evitar bloquear el hilo principal
        if (i + BATCH_SIZE < sessionsToCheck.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      console.log('✔️ Actualización de disponibilidad completada con éxito');
      
    } catch (error) {
      console.error('❌ Error al actualizar disponibilidad:', error);
    } finally {
      // Independientemente del resultado, marcar que ya no estamos actualizando
      isUpdatingRef.current = false;
      setIsLoadingAvailability(false);
    }
  }, [selectedClass, dispatch]);

  /**
   * Inicia la verificación de disponibilidad para las sesiones recién cargadas al cambiar de página
   * 
   * Optimizada para evitar verificaciones innecesarias y duplicadas
   */
  const checkAvailabilityForNewlyLoadedSessions = useCallback(async () => {
    // No verificar si no hay sesiones o si estamos en el proceso de carga
    if (!selectedClass || isUpdatingRef.current) {
      console.log('⏳ Omitiendo verificación porque ya hay otra en curso o no hay clase seleccionada');
      return;
    }
    
    // Validación adicional para evitar trabajo innecesario
    if (!selectedClass.sessions || selectedClass.sessions.length === 0) {
      console.log('🔍 No hay sesiones que verificar');
      return;
    }
    
    console.log('🔄 Verificando disponibilidad para el nuevo lote de sesiones:', {
      currentPage,
      previouslyVisible: currentPage * pageSize,
      totalSessions: selectedClass.sessions.length
    });
    
    // IMPORTANTE: Asegurar que solo verificamos las sesiones que realmente lo necesitan
    // (las que tienen spotsLeft undefined o null)
    const sessionsNeedingVerification = selectedClass.sessions.filter(
      (session: ClassSession) => session.spotsLeft === undefined || session.spotsLeft === null
    );
    
    // Si no hay sesiones que necesiten verificación, terminamos temprano
    if (sessionsNeedingVerification.length === 0) {
      console.log('✔️ No hay sesiones que requieran verificación');
      return;
    }
    
    console.log(`📊 Encontradas ${sessionsNeedingVerification.length} sesiones que necesitan verificación de stock`);
    
    // Marcar que estamos actualizando para evitar verificaciones simultáneas
    isUpdatingRef.current = true;
    setIsLoadingAvailability(true);
    
    try {
      // IMPORTANTE: Solo verificamos las sesiones que realmente lo necesitan
      // para minimizar carga y evitar sobrescribir valores ya verificados
      // por eso pasamos solo el subconjunto de sesiones que necesitan verificación
      const classService = new ClassService();
      
      // IMPORTANTE: Crear un mapa de las sesiones verificadas para proteger sus valores
      const verifiedSessions = new Map<string, number>();
      (selectedClass.sessions || []).forEach((session: ClassSession) => {
        if (session.id && session.spotsLeft !== undefined && session.spotsLeft !== null) {
          verifiedSessions.set(session.id, session.spotsLeft);
        }
      });
      
      console.log(`🔒 Protegiendo ${verifiedSessions.size} sesiones con stock validado`);
      
      // Verificar disponibilidad SOLO para las sesiones que lo necesitan
      const availabilityResults = await classService.checkMultipleSessionsAvailability(
        selectedClass.id,
        sessionsNeedingVerification
      );
      
      // Si no tenemos resultados, finalizamos
      if (!availabilityResults || availabilityResults.size === 0) {
        console.log('⚠️ No se obtuvieron resultados de disponibilidad');
        return;
      }
      
      // Actualizar las sesiones protegiendo los valores ya verificados
      const updatedSessions = selectedClass.sessions.map((session: ClassSession) => {
        // PUNTO CLAVE 1: Si la sesión ya tenía un valor verificado y NO está en el conjunto que necesitaba verificación,
        // mantener su valor original
        if (verifiedSessions.has(session.id) && 
            !sessionsNeedingVerification.some((s: ClassSession) => s.id === session.id)) {
          return session; // Mantener la sesión sin cambios
        }
        
        // PUNTO CLAVE 2: Si esta sesión está en los resultados de disponibilidad actuales, actualizarla
        const availabilityResult = availabilityResults.get(session.id);
        if (availabilityResult) {
          // CORRECCIÓN: Actualizar también el estado del stock según si está agotado o no
          const spotCount = availabilityResult.availableSpots;
          const newStatus = spotCount === 0 ? 'verified-out-of-stock' : 'verified';
          
          if (spotCount === 0) {
            console.log(`🚫 Sesión ${session.id} marcada como AGOTADA (availableSpots=0)`);
          }
          
          return {
            ...session,
            spotsLeft: spotCount,
            stockStatus: newStatus
          };
        }
        
        // Si no está en los resultados actuales, mantener su información sin cambios
        return session;
      });
      
      // Actualizar el estado con las sesiones protegidas
      dispatch({
        type: 'SET_SELECTED_CLASS',
        payload: {
          ...selectedClass,
          sessions: updatedSessions
        }
      });
      
      console.log('✔️ Verificación de disponibilidad completada con éxito y valores protegidos');
      
      // Registrar en el sistema centralizado de protección
      const verifiedSessionsThisRound = new Set<string>();
      availabilityResults.forEach((result, sessionId) => {
        if (result.availableSpots !== undefined && result.availableSpots !== null) {
          verifiedSessions.set(sessionId, result.availableSpots); // Usar set en lugar de add
          verifiedSessionsThisRound.add(sessionId);
          
          // CORRECCIÓN: Usar classService en lugar de service
          classService.registerValidatedSessionStock(
            selectedClass.id, 
            sessionId, 
            result.availableSpots
          );
        }
      });
    } catch (error) {
      console.error('❌ Error al verificar disponibilidad para nuevas sesiones:', error);
    } finally {
      setIsLoadingAvailability(false);
      isUpdatingRef.current = false;
    }
  }, [selectedClass, currentPage, pageSize, updateAvailabilityInfo]);

  return {
    isLoadingAvailability,
    setIsLoadingAvailability,
    sessionAvailability,
    updateAvailabilityInfo,
    checkAvailabilityForNewlyLoadedSessions,
    isInitialMount
  };
}
