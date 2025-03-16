import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import throttle from 'lodash.throttle';
import debounce from 'lodash.debounce';
import { ClassService } from '../../../services/classService';
import type { ClassSession } from '../../../types/models';

/**
 * Hook personalizado para manejar la paginación y carga bajo demanda de sesiones
 * Implementa la estrategia de optimización donde se muestran las sesiones inmediatamente
 * sin esperar a verificar su disponibilidad
 */
export function useSessionPagination({
  selectedClass,
  pageSize = 10,
  dispatch,
  onNewSessionsLoaded
}: {
  selectedClass: any | null;
  pageSize?: number;
  dispatch: (action: any) => void;
  onNewSessionsLoaded?: () => void;
}) {
  // Estados para controlar la paginación
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMoreSessions, setHasMoreSessions] = useState(true);
  const [isLoadingMoreSessions, setIsLoadingMoreSessions] = useState(false);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Referencias para el scroll infinito
  const sessionsContainerRef = useRef<HTMLDivElement | null>(null);
  const [previousScrollPosition, setPreviousScrollPosition] = useState<number>(0);
  const [scrollStabilityCount, setScrollStabilityCount] = useState<number>(0);

  /**
   * Carga más sesiones cuando el usuario hace scroll
   * Implementa la estrategia de cargar primero y verificar disponibilidad después
   */
  const loadMoreSessions = useCallback(async () => {
    if (!selectedClass?.id || isLoadingMoreSessions || !hasMoreSessions) {
      return;
    }
    
    // Guardar la posición de scroll actual antes de cargar
    const container = sessionsContainerRef.current;
    const scrollPositionBeforeLoad = container?.scrollTop || 0;
    const scrollHeightBeforeLoad = container?.scrollHeight || 0;
    
    setIsLoadingMoreSessions(true);
    console.log('⬇️ Generando más sesiones, página:', currentPage + 1);
    
    try {
      // Usar el servicio de clases para cargar más sesiones
      const classService = new ClassService();
      
      // Cargar la siguiente página de sesiones
      const nextPage = currentPage + 1;
      
      // Obtener la clase con las nuevas sesiones generadas
      // IMPORTANTE: No verificamos disponibilidad en este punto para mostrar las sesiones rápidamente
      const updatedClass = await classService.getClassById(
        selectedClass.id, 
        { 
          generateSessions: true, 
          checkAvailability: false, // No verificar disponibilidad al cargar para optimizar
          sessionPagination: {
            pageSize,
            pageNumber: nextPage
          }
        }
      );

      if (!updatedClass || !updatedClass.sessions || updatedClass.sessions.length === 0) {
        // No hay más sesiones para cargar
        setHasMoreSessions(false);
        console.log('🛑 No hay más sesiones disponibles');
        return;
      }
      
      // Actualizar el estado combinando las sesiones existentes con las nuevas
      if (selectedClass) {
        const combinedSessions = [...selectedClass.sessions || [], ...updatedClass.sessions];
        
        // Eliminar duplicados basados en ID
        const uniqueSessions = Array.from(
          new Map(combinedSessions.map((session: ClassSession) => [session.id, session])).values()
        );
        
        // Ordenar sesiones por fecha y hora
        uniqueSessions.sort((a: ClassSession, b: ClassSession) => {
          const dateComparison = a.date.localeCompare(b.date);
          if (dateComparison !== 0) return dateComparison;
          return a.startTime.localeCompare(b.startTime);
        });
        
        // Actualizar el estado con las sesiones combinadas
        dispatch({ 
          type: 'SET_SELECTED_CLASS', 
          payload: {
            ...selectedClass,
            sessions: uniqueSessions
          }
        });
        
        console.log(`✅ Combinadas ${selectedClass.sessions?.length || 0} sesiones existentes con ${updatedClass.sessions.length} nuevas: total ${uniqueSessions.length}`);
      }
      
      // Actualizar la página actual
      setCurrentPage(nextPage);
      
      // Determinar si hay más sesiones
      if (updatedClass.sessions.length < pageSize) {
        setHasMoreSessions(false);
        console.log('🛑 No hay más sesiones disponibles, recibidas menos de las esperadas');
      }
      
      // Notificar que se han cargado nuevas sesiones para verificar disponibilidad después
      if (updatedClass.sessions.length > 0 && onNewSessionsLoaded) {
        setTimeout(() => {
          onNewSessionsLoaded();
        }, 100);
      }
      
    } catch (error) {
      console.error('Error al cargar más sesiones:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar más sesiones',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingMoreSessions(false);
    }
  }, [
    currentPage, 
    isLoadingMoreSessions, 
    hasMoreSessions, 
    selectedClass, 
    pageSize, 
    dispatch,
    onNewSessionsLoaded
  ]);

  /**
   * Carga inicial de la clase con las primeras sesiones
   */
  const fetchInitialSessions = useCallback(async () => {
    if (!selectedClass?.id) {
      console.warn('No hay clase seleccionada');
      return;
    }

    setIsLoading(true);

    try {
      console.log(`Obteniendo clase ${selectedClass.id}...`);
      const classService = new ClassService();
      
      // Cargar la clase con las primeras sesiones paginadas
      // IMPORTANTE: No verificamos disponibilidad en este punto para mostrar las sesiones rápidamente
      const classData = await classService.getClassById(
        selectedClass.id, 
        { 
          generateSessions: true, 
          checkAvailability: false,  // No verificar disponibilidad al cargar para optimizar
          sessionPagination: {
            pageSize,
            pageNumber: 0 // Primera página
          }
        }
      );

      if (!classData) {
        console.error('Clase no encontrada');
        return;
      }

      // Actualizar el estado con la clase obtenida
      dispatch({ type: 'SET_SELECTED_CLASS', payload: classData });
      
      // Si hay sesiones y son menos que el tamaño de página, no hay más para cargar
      if (classData.sessions && classData.sessions.length < pageSize) {
        setHasMoreSessions(false);
        console.log('🛑 No hay más sesiones disponibles, recibidas menos de las esperadas en carga inicial');
      }
      
      setSessionsLoaded(true);
    } catch (error) {
      console.error('Error al obtener la clase:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, selectedClass?.id, pageSize]);

  /**
   * Maneja el evento de scroll para cargar más sesiones cuando se acerca al final
   */
  const handleScroll = useCallback(throttle((e: Event) => {
    const container = e.target as HTMLDivElement;
    
    // PREVENIR COMPLETAMENTE CUALQUIER ACCIÓN DE SCROLL SI:
    // 1. No hay más sesiones disponibles
    // 2. Estamos cargando más sesiones actualmente
    if (!hasMoreSessions || isLoadingMoreSessions) {
      return;
    }
    
    // Cálculo avanzado para detectar si se aproxima al final del scroll
    // Cargamos cuando nos acercamos al 85% del scroll para una experiencia más fluida
    const scrollPosition = container.scrollTop + container.clientHeight;
    const scrollThreshold = container.scrollHeight * 0.85;
    
    const isApproachingBottom = scrollPosition >= scrollThreshold;
    
    // MEJORA: Detección de bucle infinito
    // Comparamos con la posición anterior y verificamos si el scroll está "estancado"
    const scrollDelta = Math.abs(scrollPosition - previousScrollPosition);
    
    // Si la posición de scroll apenas ha cambiado desde la última vez
    if (scrollDelta < 5) {
      // Incrementamos contador de estabilidad
      setScrollStabilityCount(prev => prev + 1);
    } else {
      // Reiniciamos contador si hubo un scroll significativo
      setScrollStabilityCount(0);
    }
    
    // Guardar la posición actual para la próxima comparación
    setPreviousScrollPosition(scrollPosition);
    
    // Si el scroll está "estancado" por varios eventos consecutivos en el mismo punto,
    // cancelamos cualquier intento de carga para evitar bucles
    if (scrollStabilityCount > 3) {
      console.log('⚠️ Detectada posible condición de bucle en scroll. Cancelando procesamiento...');
      setScrollStabilityCount(0);
      return;
    }
    
    // Si no estamos cerca del final, no hacemos nada más
    if (!isApproachingBottom) {
      return;
    }
    
    // Solo llegamos aquí si cumplimos todas las condiciones para cargar más sesiones
    console.log('📜 Aproximándose al final del scroll, generando más sesiones...');
    
    // Métricas para diagnóstico
    console.log({
      scrollPosition,
      containerHeight: container.scrollHeight,
      threshold: scrollThreshold,
      currentPage,
      scrollDelta,
      scrollStability: scrollStabilityCount
    });
    
    loadMoreSessions();
  }, 300), [loadMoreSessions, isLoadingMoreSessions, hasMoreSessions, currentPage, previousScrollPosition, scrollStabilityCount]);

  /**
   * Configura los event listeners para el scroll
   */
  useEffect(() => {
    const setupScrollListeners = () => {
      const getContainer = () => document.getElementById('sessions-container');
      
      setTimeout(() => {
        const container = getContainer();
        if (!container) return;
        
        // Ocultamos la barra pero mantenemos el scroll funcional
        container.style.cssText += '; scrollbar-width: none; -ms-overflow-style: none;';
        container.style.cssText += '; -webkit-overflow-scrolling: touch;';
        
        // Ocultar la barra de scroll completamente
        const style = document.createElement('style');
        style.textContent = `
          #sessions-container::-webkit-scrollbar {
            width: 0px;
            display: none;
            background: transparent;
          }
        `;
        document.head.appendChild(style);
        
        // Registrar el contenedor para la referencia del scrolling
        sessionsContainerRef.current = container as HTMLDivElement;
        
        // Verificación para evitar múltiples listeners
        if (container.getAttribute('scroll-listener-attached') === 'true') {
          return;
        }
        
        // Marcamos que ya tiene un listener para evitar duplicados
        container.setAttribute('scroll-listener-attached', 'true');
        
        // Implementamos una solución resiliente contra rebotes
        const debouncedHandleScroll = debounce((e: Event) => {
          // Solo procesamos el evento si tenemos más sesiones y no estamos cargando actualmente
          if (hasMoreSessions && !isLoadingMoreSessions) {
            handleScroll(e);
          }
        }, 150);
        
        // Añadir event listener con el debounce para mayor control
        container.addEventListener('scroll', debouncedHandleScroll);
        
        return () => {
          // Limpieza adecuada
          container.removeEventListener('scroll', debouncedHandleScroll);
          container.removeAttribute('scroll-listener-attached');
        };
      }, 100);
    };

    if (selectedClass && sessionsLoaded) {
      setupScrollListeners();
    }
  }, [handleScroll, hasMoreSessions, isLoadingMoreSessions, selectedClass, sessionsLoaded]);

  return {
    currentPage,
    hasMoreSessions,
    isLoadingMoreSessions,
    isLoading,
    sessionsLoaded,
    loadMoreSessions,
    fetchInitialSessions,
    sessionsContainerRef,
    setSessionsLoaded
  };
}
