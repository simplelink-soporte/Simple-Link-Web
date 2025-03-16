import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import throttle from 'lodash.throttle';
import debounce from 'lodash.debounce';
import { ClassService } from '../../../services/classService';
import { stockValidationService } from '../../../services/stockValidationService';
import type { ClassSession } from '@/components/classes-registration/types/models';

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
   * Detecta si estamos en un dispositivo móvil
   */
  const isMobileDevice = useCallback(() => {
    return window.innerWidth < 768;
  }, []);

  /**
   * Carga más sesiones cuando se llega al final del scroll
   */
  const loadMoreSessions = useCallback(async () => {
    if (isLoadingMoreSessions || !hasMoreSessions || !selectedClass?.id) return;
    
    // Si estamos en móvil, no cargamos más sesiones (ya se cargan todas de una vez)
    if (isMobileDevice()) {
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
      
      // OPTIMIZACIÓN: Comprobar si ya tenemos suficientes sesiones localmente
      // para evitar solicitarlas al servidor innecesariamente
      const existingSessions = selectedClass.sessions || [];
      const currentSessionCount = existingSessions.length;
      const expectedNewSessionsCount = (nextPage + 1) * pageSize;
      
      console.log(`📊 Sesiones actuales: ${currentSessionCount}, esperadas después de cargar: ${expectedNewSessionsCount}`);
      
      // Si ya tenemos suficientes sesiones localmente, no necesitamos cargar más
      if (currentSessionCount >= expectedNewSessionsCount) {
        console.log('⚡ Optimización: Ya tenemos suficientes sesiones cargadas localmente, evitando llamada al servidor');
        
        // Simular una carga exitosa actualizando solo la página
        setCurrentPage(nextPage);
        setIsLoadingMoreSessions(false);
        return;
      }
      
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
        console.log('🧩 Combinando sesiones existentes con nuevas sesiones cargadas');
        
        // Crear un mapa de las sesiones existentes para preservar sus propiedades
        // Incluimos TODAS las sesiones que hemos cargado hasta ahora, no solo las visibles actualmente
        const existingSessionsMap = new Map<string, ClassSession>(
          (selectedClass.sessions || []).map((session: ClassSession) => [session.id, session])
        );
        
        // Crear un mapa de todas las sesiones recibidas actualmente del servidor
        const receivedSessionsMap = new Map<string, ClassSession>(
          (updatedClass.sessions || []).map((session: ClassSession) => [session.id, session])
        );
        
        // IMPORTANTE: Nuevo conjunto para rastrear qué valores de stock ya se han verificado
        // y NO deben ser reemplazados por valores por defecto
        const verifiedStockSessions = new Set<string>(
          (selectedClass.sessions || [])
            .filter((session: ClassSession) => {
              // Solo incluir sesiones con un valor de stock real (no nulo, no indefinido)
              return session.id && 
                     session.spotsLeft !== undefined && 
                     session.spotsLeft !== null;
            })
            .map((session: ClassSession) => session.id)
            // Filtrar posibles valores null/undefined para garantizar seguridad de tipos
            .filter((id: string | undefined): id is string => id !== undefined && id !== null)
        );
        
        console.log(`📊 Detectadas ${verifiedStockSessions.size} sesiones con stock ya verificado que deben preservarse`);
        
        // CORRECCIÓN: Crear estas estructuras de datos ANTES de usarlas
        // Crear una lista unificada combinando ambas fuentes, preservando datos de disponibilidad
        const allSessionsList: ClassSession[] = [];
        
        // Conjunto para rastrear IDs ya procesados y evitar duplicados
        const processedIds = new Set<string>();

        // PROTECCIÓN PRINCIPAL: En primer lugar, procesamos y preservamos las sesiones existentes
        // para conservar sus valores verificados de stock
        console.log(`📦 Detectadas ${existingSessionsMap.size} sesiones con stock ya verificado que deben preservarse`);
        
        // Primero identificamos sesiones con stock validado para preservarlas
        existingSessionsMap.forEach((existingSession: ClassSession, sessionId: string) => {
          // CORRECCIÓN CRÍTICA: Comprobar stock central como fuente principal de verdad
          const validatedStock = classService.getValidatedSessionStock(selectedClass.id, sessionId);
          
          // Esta comprobación doble es crucial para asegurar que tengamos el valor correcto siempre
          // 1. Priorizar el valor del almacen centralizado si existe
          if (validatedStock !== null) {
            // Distinguir explicitamente el caso de stock cero (agotado)
            if (validatedStock === 0) {
              console.log(`📦 Preservando sesión ${sessionId} como AGOTADA (stock=0)`);
              existingSession.spotsLeft = 0;
              existingSession.stockStatus = 'verified-out-of-stock';
            } else {
              console.log(`📦 Preservando stock verificado para sesión ${sessionId}: ${validatedStock} lugares`);
              existingSession.spotsLeft = validatedStock;
              existingSession.stockStatus = 'verified';
            }
          } 
          // 2. Si el stock centralizado no tiene el valor pero la sesión sí, guardarlo en central
          else if (existingSession.stockStatus === 'verified' && existingSession.spotsLeft !== null && existingSession.spotsLeft !== undefined) {
            // Distinguir explicitamente el caso de stock cero (agotado)
            if (existingSession.spotsLeft === 0) {
              console.log(`📦 Registrando sesión ${sessionId} como AGOTADA en sistema central`);
              existingSession.stockStatus = 'verified-out-of-stock';
            } else {
              console.log(`📦 Registrando stock de sesión local en sistema central ${sessionId}: ${existingSession.spotsLeft} lugares`);
              existingSession.stockStatus = 'verified';
            }
            classService.registerValidatedSessionStock(
              selectedClass.id,
              sessionId,
              existingSession.spotsLeft
            );
          }
          // Caso especial: Si ya estaba marcada como agotada, mantenemos ese estado
          else if (existingSession.stockStatus === 'verified-out-of-stock') {
            console.log(`📦 Manteniendo sesión ${sessionId} como AGOTADA`);
            existingSession.spotsLeft = 0;
            // Aseguramos que el sistema centralizado también tenga este valor
            classService.registerValidatedSessionStock(selectedClass.id, sessionId, 0);
          }
          allSessionsList.push(existingSession);
          // Marcar como procesada para evitar duplicados
          processedIds.add(sessionId);
        });
        
        // PASO 2: Añadir SOLAMENTE las sesiones del servidor que no teníamos previamente
        receivedSessionsMap.forEach((receivedSession: ClassSession, sessionId: string) => {
          if (!processedIds.has(sessionId)) {
            // Esta es una sesión nueva que no existía antes
            // PUNTO CRÍTICO: Comprobar si tiene stock validado en el sistema centralizado
            const validatedStock = classService.getValidatedSessionStock(selectedClass.id, sessionId);
            if (validatedStock !== null) {
              // Si tiene un valor validado en el sistema centralizado, usarlo
              receivedSession.spotsLeft = validatedStock;
              if (validatedStock === 0) {
                receivedSession.stockStatus = 'verified-out-of-stock';
                console.log(`📦 Sesión ${sessionId} marcada explícitamente como AGOTADA desde el sistema central`);
              } else {
                receivedSession.stockStatus = 'verified';
              }
            } else {
              // Si no tiene un valor validado, mantenerlo pendiente de verificación
              receivedSession.stockStatus = 'pending';
            }
            
            allSessionsList.push(receivedSession);
            processedIds.add(sessionId);
          }
        });
        
        // Calcular cuántas sesiones son realmente nuevas
        const trulyNewSessionsCount = allSessionsList.length - existingSessionsMap.size;
        
        console.log(`📊 Procesamiento de sesiones: ${existingSessionsMap.size} existentes, ${trulyNewSessionsCount} nuevas, total ${allSessionsList.length}`);
        
        // Ordenar sesiones por fecha y hora
        allSessionsList.sort((a: ClassSession, b: ClassSession) => {
          const dateComparison = a.date.localeCompare(b.date);
          if (dateComparison !== 0) return dateComparison;
          return a.startTime.localeCompare(b.startTime);
        });
        
        // Actualizar el estado con todas las sesiones combinadas
        dispatch({ 
          type: 'SET_SELECTED_CLASS', 
          payload: {
            ...selectedClass,
            sessions: allSessionsList
          }
        });
        
        console.log(`✅ Combinación completada: ${existingSessionsMap.size} sesiones existentes con ${trulyNewSessionsCount} nuevas (total: ${allSessionsList.length})`);
        
        // CORRECCIÓN: Mejorar la lógica para determinar si hay más sesiones
        // Verificamos con más precisión comparando la cantidad recibida con el pageSize
        // Y también confirmar que se recibieron sesiones nuevas
        // Actualizar la página actual
        setCurrentPage(nextPage);
        
        // Determinar si hay más sesiones con mejor lógica
        const newSessionsCount = updatedClass.sessions.filter(
          (newSession: ClassSession) => !selectedClass.sessions.some(
            (existingSession: ClassSession) => existingSession.id === newSession.id
          )
        ).length;
        
        console.log(`📊 Análisis de sesiones: ${updatedClass.sessions.length} recibidas, ${newSessionsCount} nuevas, pageSize=${pageSize}`);
        
        // Si no recibimos sesiones nuevas O recibimos menos del tamaño de página, no hay más
        if (newSessionsCount === 0 || updatedClass.sessions.length < pageSize) {
          setHasMoreSessions(false);
          console.log('🛑 No hay más sesiones disponibles, criterio: ' + 
                      (newSessionsCount === 0 ? 'no se recibieron sesiones nuevas' : 'recibidas menos de las esperadas'));
        } else {
          console.log('✅ Todavía hay más sesiones disponibles para cargar en páginas siguientes');
        }
        
        // IMPORTANTE: Activar la verificación de disponibilidad SOLO si hay sesiones nuevas
        if (trulyNewSessionsCount > 0 && onNewSessionsLoaded) {
          // Usamos setTimeout para asegurar que el estado se actualice primero
          setTimeout(() => {
            console.log(`🔄 Notificando que hay ${trulyNewSessionsCount} nuevas sesiones para verificar disponibilidad`);
            onNewSessionsLoaded();
          }, 100);
        } else {
          console.log('🙅‍♂️ No se necesita verificar disponibilidad: todas las sesiones ya estaban cargadas');
        }
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
    onNewSessionsLoaded,
    isMobileDevice
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
      
      // Detectar si estamos en móvil para cambiar el comportamiento de carga
      const mobile = isMobileDevice();
      
      // En móvil, cargamos todas las sesiones posibles (30 días) de una vez
      // En desktop, mantenemos la paginación para optimizar rendimiento
      const sessionPaginationOptions = mobile 
        ? { limit: 100 } // Un valor alto para cargar todas (hasta 30 días, que es el límite en classService)
        : { 
            pageSize,
            pageNumber: 0 // Primera página
          };
      
      console.log(`Estrategia de carga: ${mobile ? 'MÓVIL - Todas las sesiones a la vez' : 'DESKTOP - Paginado'}`);
      
      // Cargar la clase con las sesiones según la estrategia definida
      // IMPORTANTE: No verificamos disponibilidad en este punto para mostrar las sesiones rápidamente
      const classData = await classService.getClassById(
        selectedClass.id, 
        { 
          generateSessions: true, 
          checkAvailability: false,  // No verificar disponibilidad al cargar para optimizar
          sessionPagination: sessionPaginationOptions
        }
      );

      if (!classData) {
        console.error('Clase no encontrada');
        return;
      }

      // Actualizar el estado con la clase obtenida
      dispatch({ type: 'SET_SELECTED_CLASS', payload: classData });
      
      // Si estamos en móvil, marcamos que no hay más sesiones para desactivar el scroll infinito
      // En el caso de móvil, ya cargamos todas las sesiones posibles
      if (mobile) {
        setHasMoreSessions(false);
        console.log('📱 Versión móvil: carga completa de sesiones, desactivando scroll infinito');
      } 
      // En desktop, verificamos si hay más sesiones basándonos en la cantidad recibida
      else if (classData.sessions && classData.sessions.length < pageSize) {
        setHasMoreSessions(false);
        console.log('🛑 No hay más sesiones disponibles, recibidas menos de las esperadas en carga inicial');
      }
      
      setSessionsLoaded(true);
    } catch (error) {
      console.error('Error al obtener la clase:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, selectedClass?.id, pageSize, isMobileDevice]);

  /**
   * Maneja el evento de scroll para cargar más sesiones cuando se acerca al final
   */
  const handleScroll = useCallback(throttle((e: Event) => {
    const container = e.target as HTMLDivElement;
    
    // Detectar si estamos en móvil para cambiar el comportamiento de carga
    if (isMobileDevice()) {
      return; // En móvil, desactivar completamente el scroll infinito
    }
    
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
      hasMoreSessions
    });
    
    // Cargar más sesiones
    loadMoreSessions();
  }, 250), [loadMoreSessions, hasMoreSessions, isLoadingMoreSessions, previousScrollPosition, isMobileDevice]);

  /**
   * Efecto para configurar el evento de scroll
   */
  useEffect(() => {
    const container = sessionsContainerRef.current;
    
    // Detección rápida de si estamos en móvil
    const mobile = isMobileDevice();
    
    // Solo configuramos el evento de scroll en versión desktop, en móvil no es necesario
    if (container && !mobile) {
      container.addEventListener('scroll', handleScroll);
      
      return () => {
        container.removeEventListener('scroll', handleScroll);
      };
    }
    
    return undefined;
  }, [handleScroll, isMobileDevice]);

  /**
   * Efecto para cargar las sesiones iniciales cuando cambia la clase seleccionada
   */
  useEffect(() => {
    if (selectedClass?.id) {
      // Reiniciar el estado de la paginación
      setCurrentPage(0);
      setHasMoreSessions(true);
      setSessionsLoaded(false);
      
      // Cargar las sesiones iniciales
      fetchInitialSessions();
    }
  }, [selectedClass?.id, fetchInitialSessions]);

  /**
   * Método para probar manualmente el loadMoreSessions,
   * útil para depuración o para implementar un botón de "Cargar más"
   */
  const manualLoadMore = useCallback(() => {
    if (!isLoadingMoreSessions && hasMoreSessions) {
      loadMoreSessions();
    }
  }, [loadMoreSessions, isLoadingMoreSessions, hasMoreSessions]);

  return {
    isLoading,
    isLoadingMoreSessions,
    hasMoreSessions,
    sessionsLoaded,
    loadMoreSessions,
    sessionsContainerRef,
    manualLoadMore,
    fetchInitialSessions,
    currentPage,
    setSessionsLoaded
  };
}
