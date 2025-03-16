# Análisis del Sistema de Disponibilidad en SessionStep Original

Este documento presenta un análisis detallado del funcionamiento del sistema de verificación de disponibilidad en el componente `SessionStep.backup.tsx`. El análisis se realiza mediante un razonamiento en cadena para comprender todos los aspectos del sistema.

## 1. Flujo General del Sistema

El sistema de disponibilidad sigue este flujo general:

1. Se cargan las sesiones sin información de disponibilidad
2. Se muestran inmediatamente en la UI con un estado neutro (sin verificar)
3. Se inicia un proceso asíncrono para verificar la disponibilidad
4. Durante la verificación, las sesiones se marcan con `spotsLeft=null`
5. Al completar la verificación, se actualiza cada sesión con su disponibilidad real

## 2. Estados de Carga y Disponibilidad

### 2.1 Estados Principales

El componente `SessionStep` gestiona varios estados críticos:

- `isLoading`: Indica si se están cargando las sesiones de la clase seleccionada
- `sessionsLoaded`: Indica si las sesiones ya se cargaron inicialmente (independientemente de su disponibilidad)
- `isLoadingAvailability`: Indica específicamente si se está verificando la disponibilidad

### 2.2 Referencias Importantes

Además, utiliza referencias (`useRef`) para manejar el ciclo de vida:

- `mountTimeoutRef`: Timeout para dar tiempo a que las sesiones se monten en la UI
- `sessionsMountedInUI`: Indica si las sesiones ya se han renderizado en la UI
- `isInitialMount`: Controla si es la primera vez que se está montando el componente

## 3. Proceso de Carga de Sesiones

### 3.1 Carga Inicial de Sesiones

```typescript
// Hook para cargar las sesiones cuando se selecciona una clase
useEffect(() => {
  // No hacer nada si no hay clase seleccionada
  if (!state.selectedClass || isInitializing) return;

  const loadSessionsForSelectedClass = async () => {
    try {
      setIsLoading(true);
      setSessionsLoaded(false);
      
      // Obtener la clase con sesiones, pero sin verificar disponibilidad
      if (state.selectedClass?.id) {
        const classWithSessions = await classService.getClassById(
          state.selectedClass.id, 
          { 
            generateSessions: true,
            checkAvailability: false // ¡IMPORTANTE! No verificamos disponibilidad aquí
          }
        );

        if (classWithSessions) {
          dispatch({ type: 'SET_SELECTED_CLASS', payload: classWithSessions });
          setSessionsLoaded(true); // Marcamos que las sesiones están cargadas
        }
      }
    } catch (error) {
      console.error('Error al cargar sesiones:', error);
      // ... manejo de errores ...
    } finally {
      setIsLoading(false);
    }
  };

  loadSessionsForSelectedClass();
}, [state.selectedClass?.id, isInitializing, dispatch]);
```

**Comportamiento clave**: Las sesiones se cargan inicialmente **sin verificar su disponibilidad** para mostrarlas rápidamente en la UI.

### 3.2 Verificación de Disponibilidad

Una vez cargadas las sesiones, se inicia la verificación de disponibilidad:

```typescript
// Verificar disponibilidad después de que las sesiones estén cargadas
useEffect(() => {
  // Verificaciones preliminares
  if (!state.selectedClass || !state.selectedClass.sessions?.length) return;
  if (!sessionsLoaded) return;

  // Limpiar timeout previo
  if (mountTimeoutRef.current) {
    clearTimeout(mountTimeoutRef.current);
  }
  
  // Dar tiempo para que las sesiones se monten en la UI
  mountTimeoutRef.current = setTimeout(() => {
    sessionsMountedInUI.current = true;
    setIsLoadingAvailability(true); // IMPORTANTE: Aquí se activa el estado de carga
    
    const fetchAvailability = async () => {
      try {
        if (!state.selectedClass) return;
        
        const forceUpdate = isInitialMount.current ? true : false;
        await updateAvailabilityInfo(forceUpdate, true);
        
      } catch (error) {
        console.error('Error al cargar disponibilidad:', error);
        // ... manejo de errores ...
      } finally {
        setIsLoadingAvailability(false); // IMPORTANTE: Desactivar estado de carga
        if (isInitialMount.current) {
          isInitialMount.current = false;
        }
      }
    };
    
    fetchAvailability();
  }, 100); // 100ms para permitir el montaje de la UI
  
  return () => {
    if (mountTimeoutRef.current) {
      clearTimeout(mountTimeoutRef.current);
    }
  };
}, [state.selectedClass, updateAvailabilityInfo, sessionsLoaded]);
```

**Comportamiento clave**: 
- Se espera 100ms para que la UI se actualice antes de verificar disponibilidad
- Se establece `isLoadingAvailability = true` **antes** de llamar a `updateAvailabilityInfo`
- Se establece `isLoadingAvailability = false` **después** de completar la verificación

## 4. Función updateAvailabilityInfo

La función central del sistema es `updateAvailabilityInfo`:

```typescript
const updateAvailabilityInfo = useCallback(async (forceUpdate: boolean = false, visibleSessionsOnly: boolean = false) => {
  if (!state.selectedClass) return;
  
  try {
    const startTime = performance.now();
    console.log(`Iniciando verificación de disponibilidad (forzada: ${forceUpdate}, solo visibles: ${visibleSessionsOnly})`);
    
    // Usar el servicio de validación para actualizar la disponibilidad
    const stockService = stockValidationService;
    
    // Obtener todas las sesiones disponibles
    let sessionsToCheck = state.selectedClass.sessions || [];
    
    // OPTIMIZACIÓN 1: Si se requiere verificar solo las sesiones visibles
    if (visibleSessionsOnly) {
      const visibleSessionsCount = Math.min(
        (currentPage + 1) * pageSize,
        sessionsToCheck.length
      );
      
      sessionsToCheck = sessionsToCheck.slice(0, visibleSessionsCount);
    }
    
    // OPTIMIZACIÓN 2: Si no es actualización forzada, solo verificar las que necesitan actualización
    if (!forceUpdate) {
      sessionsToCheck = sessionsToCheck.filter(session => 
        session.spotsLeft === undefined || session.spotsLeft === null
      );
    }
    
    // Si no hay sesiones que verificar, terminamos
    if (sessionsToCheck.length === 0) {
      return;
    }
    
    // Crear versión de la clase solo con las sesiones a verificar
    const classToUpdate = {
      ...state.selectedClass,
      sessions: sessionsToCheck
    };
    
    // Actualizar solo las sesiones que necesitan verificación
    const updatedClass = await stockService.updateSessionsAvailability(
      classToUpdate, 
      { forceUpdate }
    );
    
    // Combinar los resultados
    if (updatedClass && updatedClass.sessions) {
      const updatedSessionsMap = new Map(
        updatedClass.sessions.map((session: ClassSession) => [session.id, session])
      );
      
      const mergedSessions = state.selectedClass.sessions.map(session => {
        const updatedSession = updatedSessionsMap.get(session.id);
        if (updatedSession) {
          return updatedSession;
        }
        return session;
      });
      
      // Actualizar el estado con las sesiones combinadas
      dispatch({
        type: 'SET_SELECTED_CLASS',
        payload: {
          ...state.selectedClass,
          sessions: mergedSessions
        }
      });
    }
    
  } catch (error) {
    console.error('Error al actualizar disponibilidad:', error);
  }
}, [state.selectedClass, currentPage, pageSize, dispatch]);
```

**Aspectos clave de esta función**:
1. **No gestiona el estado de carga**: No modifica `isLoadingAvailability`, eso se maneja en el componente principal
2. **Optimiza qué sesiones verificar**:
   - Solo verifica sesiones visibles si `visibleSessionsOnly=true`
   - Solo verifica las que tienen `spotsLeft=null/undefined` si no es forzado
3. **Actualización parcial**: Solo envía al servicio las sesiones que necesitan actualización
4. **Combinación inteligente**: Fusiona los resultados actualizados con las sesiones existentes

## 5. Manejo de Paginación y Lazy Loading

El sistema también verifica la disponibilidad al cargar nuevas sesiones mediante scroll:

```typescript
// Hook específico para optimización de lazy loading
useEffect(() => {
  const checkAvailabilityForNewlyLoadedSessions = async () => {
    // Verificaciones preliminares
    if (!state.selectedClass || isLoadingAvailability) return;
    if (!sessionsMountedInUI.current || currentPage <= 0) return;
    
    try {
      setIsLoadingAvailability(true);
      
      // Determinar las sesiones recién cargadas
      if (state.selectedClass.sessions && state.selectedClass.sessions.length > 0) {
        const startIndex = (currentPage - 1) * pageSize;
        const safeStartIndex = Math.max(0, Math.min(startIndex, state.selectedClass.sessions.length - 1));
        
        const recentlyLoadedSessions = state.selectedClass.sessions.slice(safeStartIndex);
        
        if (recentlyLoadedSessions.length > 0) {
          await updateAvailabilityInfo(false);
        }
      }
    } catch (error) {
      console.error('Error al verificar disponibilidad para nuevas sesiones:', error);
    } finally {
      setIsLoadingAvailability(false);
    }
  };
  
  checkAvailabilityForNewlyLoadedSessions();
}, [currentPage, updateAvailabilityInfo, state.selectedClass, isLoadingAvailability, pageSize]);
```

**Comportamiento clave**:
- Se activa cuando cambia la página (scroll)
- Verifica solo las sesiones recién cargadas
- Maneja el estado de carga al principio y al final

## 6. Servicio de Validación de Stock

El servicio `stockValidationService` es responsable de la verificación real de la disponibilidad:

### 6.1 Método Principal

```typescript
// En stockValidationService.ts
async updateSessionsAvailability(
  classData: PublicClass, 
  options: SessionAvailabilityOptions = {}
): Promise<PublicClass> {
  try {
    // Verificaciones preliminares
    if (!classData.sessions || classData.sessions.length === 0) {
      return classData;
    }

    // Filtrar solo sesiones futuras
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const futureSessions = classData.sessions.filter(session => {
      const sessionDate = new Date(session.date);
      return sessionDate >= today;
    });
    
    if (futureSessions.length === 0) {
      return classData;
    }

    // Crear copias para no modificar el objeto original
    const updatedClass = { ...classData };
    const updatedSessions = [...updatedClass.sessions];

    // Verificar cada sesión
    for (let i = 0; i < updatedSessions.length; i++) {
      const session = updatedSessions[i];
      
      // Solo verificar sesiones futuras
      const sessionDate = new Date(session.date);
      
      if (sessionDate >= today) {
        // Obtener disponibilidad real
        const availability = await this.checkSessionAvailability(
          classData.id,
          session.date,
          session.startTime,
          session.endTime,
          options
        );
        
        // Actualizar información de disponibilidad
        updatedSessions[i] = {
          ...session,
          spotsLeft: availability.availableSpots,
          totalSpots: availability.totalCapacity
        };
      }
    }
    
    // Actualizar el objeto de clase
    updatedClass.sessions = updatedSessions;
    
    return updatedClass;
  } catch (error) {
    console.error('Error al actualizar disponibilidad de sesiones:', error);
    return classData; // En caso de error, devolver la clase sin cambios
  }
}
```

**Comportamiento clave**:
- Verifica la disponibilidad real consultando reservas en la base de datos
- Actualiza `spotsLeft` con la cantidad real de plazas disponibles
- Maneja conversiones de zona horaria para consultas precisas

### 6.2 Verificación de Disponibilidad

El método `checkSessionAvailability` consulta las reservas existentes:

1. Obtiene la información de la clase
2. Convierte horarios a UTC según zona horaria de la sede
3. Consulta reservas con horarios en UTC
4. Calcula plazas disponibles (capacidad total - reservas existentes)

## 7. Comportamiento Visual Durante la Verificación

Durante el proceso de verificación:

1. Las sesiones inicialmente se muestran con un estado neutro
2. Al iniciar la verificación, `isLoadingAvailability = true`
3. Durante la verificación, las sesiones con `spotsLeft = null` muestran un indicador "Verificando..."
4. Al completar la verificación, cada sesión muestra sus plazas disponibles reales

## 8. Optimizaciones Clave

El sistema implementa varias optimizaciones importantes:

1. **Mostrar antes de verificar**: Muestra sesiones inmediatamente, verifica disponibilidad después
2. **Verificación selectiva**: Solo verifica las sesiones visibles y/o no verificadas
3. **Verificación progresiva**: Verifica nuevos lotes de sesiones al hacer scroll
4. **Caché de disponibilidad**: El servicio implementa un sistema de caché para reducir consultas
5. **Actualización diferencial**: Solo actualiza las sesiones que cambiaron, no todas

## 9. Puntos Críticos del Sistema

Los aspectos más delicados del sistema son:

1. **Separación de responsabilidades**:
   - El componente gestiona el estado de carga (`isLoadingAvailability`)
   - La función `updateAvailabilityInfo` no modifica este estado
   - El servicio solo modifica `spotsLeft`, no los estados de carga

2. **Sincronización de estados**:
   - Se marca `setIsLoadingAvailability(true)` antes de iniciar la verificación
   - Se garantiza `setIsLoadingAvailability(false)` después de completar la verificación (incluso con errores)

3. **Indicación visual correcta**:
   - Durante la verificación, las sesiones deben mostrar un estado visual de "Verificando..."
   - Esto se logra cuando tienen `spotsLeft = null`

## 10. Conclusión

El sistema de disponibilidad del componente `SessionStep` original implementa un patrón de "mostrar primero, verificar después" que optimiza la experiencia del usuario. Este enfoque permite:

- Mostrar la UI rápidamente sin esperar verificaciones lentas
- Indicar claramente qué sesiones están siendo verificadas
- Optimizar el rendimiento verificando solo lo necesario
- Mantener un estado de carga coherente durante todo el proceso

La clave del funcionamiento correcto radica en la gestión adecuada del estado `isLoadingAvailability` y en garantizar que las sesiones en verificación tengan `spotsLeft = null` para mostrar el indicador visual apropiado.
