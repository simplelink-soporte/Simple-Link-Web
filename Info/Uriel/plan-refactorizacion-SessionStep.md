# Plan de Refactorización del Componente SessionStep

## Análisis de la Situación Actual

El componente `SessionStep.tsx` actualmente contiene 1367 líneas de código, lo cual presenta varios problemas:

- **Mantenibilidad reducida**: Es difícil entender y modificar un archivo tan extenso
- **Alto acoplamiento**: Múltiples responsabilidades mezcladas en un solo componente
- **Rendimiento sub-óptimo**: Demasiados estados y efectos provocan re-renderizados innecesarios
- **Dificultad para testing**: Componentes grandes son difíciles de probar unitariamente

## Estrategia de Refactorización

### 1. Estructura de Carpetas

Crearemos la siguiente estructura dentro de `src/components/classes-registration/steps/session-step`:

```
session-step/
├── components/                  # Componentes UI específicos
│   ├── SessionCard.tsx          # Tarjeta individual de sesión
│   ├── SessionList.tsx          # Lista de sesiones con scroll infinito
│   ├── SessionMobileDrawer.tsx  # Drawer para vista móvil
│   ├── EmptySessionState.tsx    # Estado cuando no hay sesiones
│   ├── SessionLoadingState.tsx  # Estado de carga
│   └── SessionHeader.tsx        # Encabezado con descripción y controles
├── hooks/                       # Custom hooks 
│   ├── useSessionAvailability.ts # Lógica de disponibilidad
│   ├── useSessionFiltering.ts   # Filtrado y búsqueda
│   ├── useSessionPagination.ts  # Paginación e infinite scroll
│   ├── usePackageValidation.ts  # Validación de paquetes
│   └── useDeviceDetection.ts    # Detección de dispositivo
├── utils/                       # Utilidades
│   ├── types.ts                 # Tipos e interfaces
│   └── helpers.ts               # Funciones auxiliares 
└── index.tsx                    # Punto de entrada (exporta el componente principal)
```

### 2. Paso a Paso de la Refactorización

#### Paso 1: Extraer Tipos y Utilidades

1. Crear el archivo `utils/types.ts`:
   - Mover la interfaz `SessionAvailability`
   - Definir tipos específicos de este módulo

2. Crear el archivo `utils/helpers.ts`:
   - Extraer la función `haveSameAvailability`
   - Extraer la función `formatSessionDate` (usada para formatear fechas en las tarjetas)

#### Paso 2: Implementar Custom Hooks

1. `hooks/useSessionAvailability.ts`:
   ```typescript
   export function useSessionAvailability({
     selectedClass,
     currentPage,
     pageSize
   }) {
     const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
     const [sessionAvailability, setSessionAvailability] = useState<SessionAvailability>({});
     
     // Extraer la lógica relacionada con la verificación de disponibilidad
     // Implementar updateAvailabilityInfo como una función dentro del hook
     
     return {
       isLoadingAvailability,
       updateAvailabilityInfo,
       // Otras variables y funciones relacionadas
     };
   }
   ```

2. `hooks/useSessionPagination.ts`:
   ```typescript
   export function useSessionPagination({
     selectedClass,
     pageSize = 10
   }) {
     const [currentPage, setCurrentPage] = useState(0);
     const [hasMoreSessions, setHasMoreSessions] = useState(true);
     const [isLoadingMoreSessions, setIsLoadingMoreSessions] = useState(false);
     const sessionsContainerRef = useRef<HTMLDivElement | null>(null);
     
     // Extraer la lógica de paginación y lazy loading
     // Implementar loadMoreSessions y handleScroll
     
     return {
       currentPage,
       hasMoreSessions,
       isLoadingMoreSessions,
       loadMoreSessions,
       handleScroll,
       sessionsContainerRef,
       // Otras variables y funciones relacionadas
     };
   }
   ```

3. `hooks/usePackageValidation.ts`:
   ```typescript
   export function usePackageValidation({
     activePackage,
     selectedClass
   }) {
     const [packagesAreValid, setPackagesAreValid] = useState<boolean | null>(null);
     const supabase = createClientComponentClient<Database>();
     
     // Extraer checkPackageValidity
     
     useEffect(() => {
       // Implementar lógica de validación de paquetes
     }, [activePackage, selectedClass?.branchInfo?.id]);
     
     return { packagesAreValid };
   }
   ```

4. `hooks/useDeviceDetection.ts`:
   ```typescript
   export function useDeviceDetection() {
     const [isMobile, setIsMobile] = useState(false);
     
     useEffect(() => {
       const checkIsMobile = () => {
         setIsMobile(window.innerWidth < 640);
       };
       
       checkIsMobile();
       window.addEventListener('resize', checkIsMobile);
       return () => window.removeEventListener('resize', checkIsMobile);
     }, []);
     
     return isMobile;
   }
   ```

#### Paso 3: Implementar Componentes UI

1. `components/SessionCard.tsx`:
   ```tsx
   interface SessionCardProps {
     session: ClassSession;
     isSelected: boolean;
     onSelect: (session: ClassSession) => void;
     isMobile: boolean;
   }
   
   export function SessionCard({ session, isSelected, onSelect, isMobile }: SessionCardProps) {
     // Extraer la lógica de renderizado de tarjetas de sesión
     // Mantener el formato y estilos exactos
     
     return (
       <button
         onClick={() => onSelect(session)}
         className={cn(
           // Mismos estilos que en el componente original
         )}
       >
         {/* Contenido de la tarjeta */}
       </button>
     );
   }
   ```

2. `components/SessionList.tsx`:
   ```tsx
   interface SessionListProps {
     sessions: ClassSession[];
     selectedSessions: string[];
     onSessionClick: (session: ClassSession) => void;
     isLoading: boolean;
     isLoadingMore: boolean;
     hasMore: boolean;
     containerRef: React.RefObject<HTMLDivElement>;
     isMobile: boolean;
   }
   
   export function SessionList({ 
     sessions,
     selectedSessions,
     onSessionClick,
     isLoading,
     isLoadingMore,
     hasMore,
     containerRef,
     isMobile
   }: SessionListProps) {
     // Implementar el contenedor con scroll y las tarjetas de sesión
     
     return (
       <div 
         className="space-y-4 overflow-y-auto pr-0 sm:pr-2 pb-12 relative flex-1" 
         id="sessions-container"
         ref={containerRef}
         style={{
           // Mismos estilos que en el componente original
         }}
       >
         {/* Gradiente y contenido */}
         {isLoading ? (
           <SessionLoadingState />
         ) : !sessions.length ? (
           <EmptySessionState />
         ) : (
           <div className="space-y-4 pb-10">
             {sessions.map(session => (
               <SessionCard
                 key={session.id}
                 session={session}
                 isSelected={selectedSessions.includes(session.id)}
                 onSelect={onSessionClick}
                 isMobile={isMobile}
               />
             ))}
             {isLoadingMore && <div className="py-4"><LoadingSpinner size="sm" message="Cargando más sesiones..." /></div>}
             {!hasMore && sessions.length > 0 && (
               <p className="text-center text-sm text-gray-500 py-2">No hay más sesiones disponibles</p>
             )}
           </div>
         )}
       </div>
     );
   }
   ```

3. `components/SessionMobileDrawer.tsx`:
   ```tsx
   interface SessionMobileDrawerProps {
     selectedSession: ClassSession | null;
     onClose: () => void;
     onConfirm: () => void;
   }
   
   export function SessionMobileDrawer({ 
     selectedSession,
     onClose,
     onConfirm
   }: SessionMobileDrawerProps) {
     // Extraer la lógica del drawer móvil
     
     return (
       <MobileDrawer
         isOpen={!!selectedSession}
         onClose={onClose}
         title="Detalles de la sesión"
       >
         {/* Contenido del drawer */}
       </MobileDrawer>
     );
   }
   ```

4. Implementar los otros componentes UI pequeños siguiendo el mismo patrón

#### Paso 4: Implementar el Componente Principal Refactorizado

`index.tsx`:
```tsx
import React from 'react';
import { StepContainer } from '../../shared/StepContainer';
import { useClassRegistration } from '../../context/ClassRegistrationContext';
import { useUserPackages } from '../../hooks/useUserPackages';
import { toast } from '@/components/ui/use-toast';
import { ClassService } from '../../services/classService';

// Importar componentes refactorizados
import { SessionHeader } from './components/SessionHeader';
import { SessionList } from './components/SessionList';
import { SessionMobileDrawer } from './components/SessionMobileDrawer';
import { SessionLoadingState } from './components/SessionLoadingState';

// Importar custom hooks
import { useSessionAvailability } from './hooks/useSessionAvailability';
import { useSessionPagination } from './hooks/useSessionPagination';
import { usePackageValidation } from './hooks/usePackageValidation';
import { useDeviceDetection } from './hooks/useDeviceDetection';

const classService = new ClassService();

export function SessionStep() {
  // Estado básico
  const [isInitializing, setIsInitializing] = useState(true);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSessionForMobile, setSelectedSessionForMobile] = useState<ClassSession | null>(null);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Contexto y servicios
  const { state, selectSession, deselectSession, goToStep, dispatch } = useClassRegistration();
  const { activePackage, isLoading: isLoadingPackage } = useUserPackages();
  
  // Custom hooks
  const isMobile = useDeviceDetection();
  const { packagesAreValid } = usePackageValidation({ activePackage, selectedClass: state.selectedClass });
  
  const { 
    currentPage,
    hasMoreSessions,
    isLoadingMoreSessions,
    loadMoreSessions,
    handleScroll,
    sessionsContainerRef 
  } = useSessionPagination({ 
    selectedClass: state.selectedClass,
    pageSize: 10
  });
  
  const {
    isLoadingAvailability,
    updateAvailabilityInfo
  } = useSessionAvailability({
    selectedClass: state.selectedClass,
    currentPage,
    pageSize: 10
  });

  // Efectos esenciales
  useEffect(() => {
    // Inicialización del componente
    // ...
  }, []);

  // Funciones de manejo de sesiones
  const handleSessionClick = useCallback((session: ClassSession) => {
    // Lógica de selección de sesión (mantener igual)
  }, [/* dependencias */]);

  const handleMobileConfirm = useCallback(() => {
    // Lógica de confirmación móvil (mantener igual)
  }, [/* dependencias */]);

  // Renderizado condicional
  if (isInitializing || isLoadingPackage) {
    return <SessionLoadingState message="Cargando información de la sesión..." />;
  }

  if (!state.selectedClass) {
    return (
      <StepContainer stepId="no-class-selected" centered>
        {/* Estado sin clase seleccionada */}
      </StepContainer>
    );
  }

  // Renderizado principal
  return (
    <StepContainer stepId="session-selection" centered={false} className="px-4 sm:px-[var(--padding-container-tablet)] lg:px-[var(--padding-container-desktop)]">
      <div className="w-full max-w-3xl mx-auto h-full flex flex-col overflow-hidden">
        {/* Header con título y descripción */}
        <SessionHeader 
          selectedClass={state.selectedClass}
          activePackage={activePackage}
          packagesAreValid={packagesAreValid}
          isLoadingAvailability={isLoadingAvailability}
          showFullDescription={showFullDescription}
          onToggleDescription={() => setShowFullDescription(!showFullDescription)}
          isMobile={isMobile}
        />
        
        {/* Lista de sesiones */}
        <SessionList 
          sessions={state.selectedClass.sessions}
          selectedSessions={state.selectedSessions}
          onSessionClick={handleSessionClick}
          isLoading={isLoading}
          isLoadingMore={isLoadingMoreSessions}
          hasMore={hasMoreSessions}
          containerRef={sessionsContainerRef}
          isMobile={isMobile}
        />
        
        {/* Modal móvil */}
        <SessionMobileDrawer 
          selectedSession={selectedSessionForMobile}
          onClose={() => setSelectedSessionForMobile(null)}
          onConfirm={handleMobileConfirm}
        />
      </div>
    </StepContainer>
  );
}
```

### 3. Pruebas y Validación

Para cada componente extraído, debemos validar que:

1. Recibe las props correctas
2. Mantiene la misma apariencia visual 
3. Preserva todas las funcionalidades originales
4. No introduce nuevos bugs

### 4. Implementación Incremental

Para minimizar riesgos, recomiendo implementar la refactorización de manera incremental:

1. Crear la estructura de carpetas y archivos
2. Extraer primero las utilidades y tipos (cambios de bajo riesgo)
3. Implementar los custom hooks uno por uno, validando cada paso
4. Extraer componentes pequeños mientras se mantiene el componente principal
5. Refactorizar gradualmente el componente principal para usar los nuevos módulos
6. Realizar pruebas integrales después de cada fase

## Beneficios Específicos de la Refactorización

### Mejora de Rendimiento
- Reducción de re-renderizados innecesarios al aislar estados en componentes más pequeños
- Mejor manejo del ciclo de vida con hooks específicos

### Mejor Mantenibilidad
- Código más modular y fácil de entender
- Separación clara de responsabilidades
- Componentes más pequeños con propósitos bien definidos

### Mayor Reusabilidad
- Hooks personalizados que pueden reutilizarse en otros componentes
- Componentes de UI aislados que pueden reutilizarse

### Facilidad para Testing
- Unidades más pequeñas que pueden probarse de forma aislada
- Mocks más sencillos al tener interfaces claras entre componentes

## Consideraciones Especiales

### Preservar la Optimización de Carga de Sesiones
Se debe mantener la estrategia de optimización comentada en el código original:
```
/**
 * ESTRATEGIA DE OPTIMIZACIÓN DE CARGA DE SESIONES
 * ------------------------------------------------------
 * Para maximizar el rendimiento y la experiencia de usuario, implementamos:
 * 
 * 1. Generación paginada de sesiones:
 *    - Inicialmente generamos solo las primeras 10 sesiones
 *    - Al hacer scroll, se generan las siguientes 10 sesiones bajo demanda
 * 
 * 2. Verificación de disponibilidad optimizada:
 *    - Verificamos disponibilidad solo cuando es necesario
 *    - Primero mostramos las sesiones y luego verificamos su disponibilidad
 */
```

### Mantener la Funcionalidad de Scroll
La funcionalidad de scroll infinito y la redirección del scroll al contenedor son críticas y deben preservarse durante la refactorización.

## Conclusión

La refactorización propuesta mejorará significativamente la calidad del código sin afectar la funcionalidad actual. Al dividir un componente monolítico en unidades más pequeñas y cohesivas, se facilitará el mantenimiento futuro y se mejorará el rendimiento general.

Esta estrategia de refactorización sigue las mejores prácticas de React:
- Composición sobre herencia
- Principio de responsabilidad única
- Elevación del estado cuando sea necesario
- Uso de custom hooks para lógica reutilizable
- Separación clara entre lógica y presentación
