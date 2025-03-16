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
   * Carga más sesiones cuando se llega al final del scroll
   */
  const loadMoreSessions = useCallback(async () => {
    if (isLoadingMoreSessions || !hasMoreSessions || !selectedClass?.id) return;
    
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
              console.log(`🔄 Nueva sesión ${sessionId} con stock validado desde sistema central: ${validatedStock}`);
              receivedSession.spotsLeft = validatedStock;
              
              // CORRECCIÓN CRÍTICA: Asignar el estado de stock correcto según si está agotado o no
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
          newSession => !selectedClass.sessions.some(
            existingSession => existingSession.id === newSession.id
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

  // Método mejorado para combinar las nuevas sesiones recibidas con las anteriores
  // Garantizando la preservacion del estado de sesiones agotadas
  const mergeSessionsWithPrevious = useCallback((receivedSessions: ClassSession[]) => {
    if (!receivedSessions || receivedSessions.length === 0) return;
    if (!selectedClass || !selectedClass.sessions) return;
    if (!selectedClass.id) return;
    
    console.time('mergeSessionsTime');
    console.log(`🔄 Iniciando combinación de sesiones [${new Date().toLocaleTimeString()}]`);
    const classService = new ClassService();
    
    // OPTIMIZACIÓN: Crear mapas para acceso O(1) en lugar de iteraciones O(n)
    const receivedSessionsMap = new Map<string, ClassSession>();
    receivedSessions.forEach(session => {
      receivedSessionsMap.set(session.id, session);
    });

    const existingSessionsMap = new Map<string, ClassSession>();
    selectedClass.sessions.forEach((session: ClassSession) => {
      existingSessionsMap.set(session.id, session);
    });
    
    // Conjunto que registra las sesiones ya procesadas (para evitar duplicados)
    const processedIds = new Set<string>();
    
    // NUEVO: Aquí almacenaremos todas las sesiones combinadas
    const allSessionsList: ClassSession[] = [];

    // PASO CRUCIAL 1: Procesar primero las sesiones existentes para preservar estados verificados
    console.log(`📦 Preservando estado de ${selectedClass.sessions.length} sesiones existentes`); 
    selectedClass.sessions.forEach((existingSession: ClassSession) => {
      const sessionId = existingSession.id;
      
      // PRIORIDAD MÁXIMA: Verificar inmediatamente si la sesión estaba marcada como agotada
      const wasMarkedAsOutOfStock = existingSession.stockStatus === 'verified-out-of-stock';
      const hasZeroSpots = existingSession.spotsLeft === 0;
      
      // Si estaba agotada, garantizar que mantenga ese estado
      if (wasMarkedAsOutOfStock || hasZeroSpots) {
        // NORMALIZACIÓN CRUCIAL: Garantizar consistencia de estado y valor
        existingSession.spotsLeft = 0;
        existingSession.stockStatus = 'verified-out-of-stock';
        
        // Asegurar registro en sistema centralizado
        classService.registerValidatedSessionStock(selectedClass.id, sessionId, 0);
        console.log(`📦 🚀 MANTENIENDO sesión ${sessionId} como AGOTADA explícitamente`);
      }
      
      // CASO 1: La sesión sigue existiendo en el lote recibido del servidor
      if (receivedSessionsMap.has(sessionId)) {
        // PUNTO VITAL: Preservar el estado de stock para sesiones verificadas
        if (existingSession.stockStatus === 'verified' || existingSession.stockStatus === 'verified-out-of-stock') {
          // Mantenemos el valor y estado de stock existente
          console.log(`🔑 Sesión ${sessionId} con estado ${existingSession.stockStatus} y ${existingSession.spotsLeft} lugares preservada`);
          
          // Caso especial: Tratar con mayor prioridad las sesiones AGOTADAS
          if (existingSession.stockStatus === 'verified-out-of-stock') {
            console.log(`📦 🚀 MANTENIENDO sesión ${sessionId} como AGOTADA`); 
            
            // Asegurar que el stock sea explicitamente 0
            existingSession.spotsLeft = 0;
            
            // Asegurar que el sistema centralizado tenga este registro
            classService.registerValidatedSessionStock(selectedClass.id, sessionId, 0);
          }
        }
        // CASO 2: La sesión no estaba verificada o tenía estado 'verifying'
        else {
          // Comprobar el valor en el sistema centralizado
          const centralValue = classService.getValidatedSessionStock(selectedClass.id, sessionId);
          if (centralValue !== null) {
            console.log(`🔄 Sesión ${sessionId} actualizada desde sistema central: ${centralValue} lugares`);
            existingSession.spotsLeft = centralValue;
            
            // PUNTO VITAL: Asignar el estado correcto según el valor
            if (centralValue === 0) {
              existingSession.stockStatus = 'verified-out-of-stock';
              console.log(`📦 Sesión ${sessionId} marcada como AGOTADA desde central`);
            } else {
              existingSession.stockStatus = 'verified';
            }
          }
        }
        
        // PROTECCIÓN DE INTEGRIDAD: Verificación adicional para sesiones agotadas
        if (existingSession.spotsLeft === 0 && existingSession.stockStatus !== 'verified-out-of-stock') {
          console.log(`📦 CORRECCIÓN: Sesión ${sessionId} con 0 lugares pero estado incorrecto, normalizando a 'verified-out-of-stock'`);
          existingSession.stockStatus = 'verified-out-of-stock';
          // Actualizar sistema central
          classService.registerValidatedSessionStock(selectedClass.id, sessionId, 0);
        }
        
        // Agregar la sesion preservada a la lista combinada
        allSessionsList.push(existingSession);
        processedIds.add(sessionId);
      }
      // CASO 3: La sesion ya no existe en el lote recibido
      else {
        // Si tenia un estado verificado, podriamos mantenerla
        // pero solo si estaba siendo verificada o ya estaba verificada
        if (existingSession.stockStatus === 'verified' || 
            existingSession.stockStatus === 'verified-out-of-stock' || 
            existingSession.stockStatus === 'verifying') {
          allSessionsList.push(existingSession);
          processedIds.add(sessionId);
        }
      }
    });

    // PASO 2: AHORA procesar las NUEVAS sesiones recibidas que no existian antes
    console.log(`👁 Procesando ${receivedSessions.length} sesiones del servidor`);
    receivedSessions.forEach((receivedSession: ClassSession) => {
      const sessionId = receivedSession.id;
      if (!processedIds.has(sessionId)) {
        // Sesión nueva que no existía antes
        console.log(`👁 Nueva sesión detectada: ${sessionId}`);
        
        // PUNTO VITAL: Verificar si existe un valor validado en el sistema centralizado
        const validatedStock = classService.getValidatedSessionStock(selectedClass.id, sessionId);
        if (validatedStock !== null) {
          // Usar el valor validado del sistema centralizado
          console.log(`🔄 Nueva sesión ${sessionId} con stock validado desde central: ${validatedStock}`);
          receivedSession.spotsLeft = validatedStock;
          
          // CORRECCIÓN CRÍTICA: Asignar estado correcto según si está agotada o no
          if (validatedStock === 0) {
            receivedSession.stockStatus = 'verified-out-of-stock';
            console.log(`📦 Sesión ${sessionId} marcada explícitamente como AGOTADA desde el sistema central`);
          } else {
            receivedSession.stockStatus = 'verified';
          }
        } 
        // No hay valor validado, mantener como pendiente
        else {
          // Si spotsLeft ya tiene un valor (del servidor)
          if (receivedSession.spotsLeft !== undefined && receivedSession.spotsLeft !== null) {
            // CASO ESPECIAL: Si el servidor ya indica 0 lugares, marcar como agotada
            if (receivedSession.spotsLeft === 0) {
              receivedSession.stockStatus = 'verified-out-of-stock';
              console.log(`📦 Sesión ${sessionId} marcada como AGOTADA desde servidor (spotsLeft=0)`);
              // Registrar en el sistema central para futura referencia
              classService.registerValidatedSessionStock(selectedClass.id, sessionId, 0);
            }
            // Para otros valores, marcar como pendiente o verificado (dependiendo de confianza en origen)
            else {
              receivedSession.stockStatus = 'pending';
            }
          } 
          // Si no tiene valor, marcar como pendiente
          else {
            receivedSession.stockStatus = 'pending';
          }
        }
        
        // PUNTO DE ESCAPE: Segunda verificación crítica para sesiones con spots=0
        // Esta línea es crucial y asegura que CUALQUIER sesión con 0 spots sea marcada como 'verified-out-of-stock'
        if (receivedSession.spotsLeft === 0) {
          receivedSession.stockStatus = 'verified-out-of-stock';
          console.log(`📦 ⚠️ REPARACIÓN CRÍTICA: Sesión ${sessionId} con 0 lugares forzada a estado 'verified-out-of-stock'`);
          classService.registerValidatedSessionStock(selectedClass.id, sessionId, 0);
        }
        
        allSessionsList.push(receivedSession);
        processedIds.add(sessionId);
      }
    });
    
    // Ordenar sesiones por fecha y hora
    allSessionsList.sort((a: ClassSession, b: ClassSession) => {
      const dateComparison = a.date.localeCompare(b.date);
      if (dateComparison !== 0) return dateComparison;
      return a.startTime.localeCompare(b.startTime);
    });

    // Actualizar el estado con las sesiones combinadas
    dispatch({ 
      type: 'SET_SELECTED_CLASS', 
      payload: {
        ...selectedClass,
        sessions: allSessionsList
      }
    });

    // ESTADÍSTICAS Y LOGS
    console.log(`✅ Combinación completada: ${allSessionsList.length} sesiones totales`);
    const exhaustedSessions = allSessionsList.filter(s => s.stockStatus === 'verified-out-of-stock').length;
    console.log(`📦 Sesiones detectadas como AGOTADAS: ${exhaustedSessions}`);
    console.timeEnd('mergeSessionsTime');

    // DISPARO OPCIONAL: Avisar que se han cargado nuevas sesiones
    if (onNewSessionsLoaded) {
      onNewSessionsLoaded();
    }
  }, [selectedClass, dispatch, onNewSessionsLoaded]);

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
