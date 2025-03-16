"use client"

import React, { useMemo, useCallback, useEffect, useState, useRef } from 'react'
import { IconChevronRight, IconChevronDown } from '@tabler/icons-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useClassRegistration } from '../context/ClassRegistrationContext'
import { UserPackageService } from '../services'
import { StepContainer } from '../shared/StepContainer'
import { StepHeader, StepSection, StepGrid, StepActions } from '../shared/StepSection'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import { useUserPackages } from '../hooks/useUserPackages'
import type { Database } from '@/types/supabase'
import type { UserPackageFromDB, ClassSession } from '../types/models'
import Image from 'next/image'
import { MobileDrawer } from '../shared/MobileDrawer'
import { LoadingState } from '../shared/LoadingState'
import { toast } from '@/components/ui/use-toast'
import { ClassService } from '../services/classService'
import { useRouter } from 'next/navigation'
import throttle from 'lodash.throttle'
import debounce from 'lodash.debounce'
import { ActivePackageInfo } from '../shared/ActivePackageInfo'
import { stockValidationService } from '../services/stockValidationService'

const classService = new ClassService()

// Estado para controlar la disponibilidad de sesiones
interface SessionAvailability {
  [sessionId: string]: {
    isLoading: boolean;
    spotsLeft: number | null;
  }
}

// Función para comprobar si dos arreglos de sesiones tienen la misma disponibilidad
const haveSameAvailability = (oldSessions: ClassSession[] = [], newSessions: ClassSession[] = []) => {
  if (oldSessions.length !== newSessions.length) return false;
  
  for (let i = 0; i < oldSessions.length; i++) {
    const oldSession = oldSessions[i];
    const newSession = newSessions[i];
    
    if (
      oldSession.id !== newSession.id ||
      oldSession.spotsLeft !== newSession.spotsLeft ||
      oldSession.totalSpots !== newSession.totalSpots
    ) {
      return false;
    }
  }
  
  return true;
};

export function SessionStep() {
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
  
  // 1. Estados y variables
  const [isInitializing, setIsInitializing] = useState(true)
  const [filteredSessions, setFilteredSessions] = useState<ClassSession[]>([])
  const [sessionQuery, setSessionQuery] = useState('')
  const [selectedSessionForMobile, setSelectedSessionForMobile] = useState<ClassSession | null>(null)
  const [packagesAreValid, setPackagesAreValid] = useState<boolean | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showFullDescription, setShowFullDescription] = useState(false)
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false)
  const [sessionAvailability, setSessionAvailability] = useState<SessionAvailability>({})
  const isInitialMount = useRef(true)
  const [sessionsLoaded, setSessionsLoaded] = useState(false) // Estado para controlar si las sesiones se han cargado
  const sessionsMountedInUI = useRef(false)
  const mountTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Estados para lazy loading/infinite scroll
  const [currentPage, setCurrentPage] = useState(0) // Página actual para paginación
  const [hasMoreSessions, setHasMoreSessions] = useState(true) // Si hay más sesiones disponibles
  const [isLoadingMoreSessions, setIsLoadingMoreSessions] = useState(false) // Estado para indicar carga de más sesiones
  const sessionsContainerRef = useRef<HTMLDivElement | null>(null) // Referencia al contenedor de sesiones
  const pageSize = 10 // Número de sesiones por página

  // Variables para controlar el scroll infinito
  const [previousScrollPosition, setPreviousScrollPosition] = useState<number>(0);
  const [scrollStabilityCount, setScrollStabilityCount] = useState<number>(0);

  // 2. Hooks y contexto
  const { state, selectSession, deselectSession, goToStep, dispatch } = useClassRegistration()
  const { activePackage, isLoading: isLoadingPackage } = useUserPackages()
  const supabase = createClientComponentClient<Database>()

  // 3. Funciones de utilidad
  // Verificar validez de paquetes
  const checkPackageValidity = useCallback(async () => {
    if (!activePackage || !state.selectedClass?.branchInfo?.id) {
      setPackagesAreValid(false)
      return
    }

    const branchIds = activePackage.package?.branch_ids || []
    
    try {
      const { data: branches } = await supabase
        .from('sedes')
        .select('name')
        .in('id', branchIds)

      if (branches) {
        setPackagesAreValid(branchIds.includes(state.selectedClass.branchInfo.id))
      }
    } catch (error) {
      console.error('Error al verificar sedes válidas:', error)
      setPackagesAreValid(false)
    }
  }, [activePackage, state.selectedClass?.branchInfo?.id, supabase])

  // Función que actualiza la información de disponibilidad de manera optimizada
  const updateAvailabilityInfo = useCallback(async (forceUpdate: boolean = false, visibleSessionsOnly: boolean = false) => {
    if (!state.selectedClass) return
    
    try {
      const startTime = performance.now()
      console.log(`🔄 Iniciando verificación de disponibilidad (forzada: ${forceUpdate}, solo visibles: ${visibleSessionsOnly})`)
      
      // Usar el servicio de validación para actualizar la disponibilidad
      const stockService = stockValidationService
      
      // Obtener todas las sesiones disponibles
      let sessionsToCheck = state.selectedClass.sessions || []
      
      // OPTIMIZACIÓN 1: Si se requiere verificar solo las sesiones visibles (primer lote)
      if (visibleSessionsOnly) {
        // Calcular cuántas sesiones son visibles actualmente (basado en la paginación)
        const visibleSessionsCount = Math.min(
          (currentPage + 1) * pageSize, // Número de sesiones mostradas según paginación
          sessionsToCheck.length // Limitado por el total de sesiones disponibles
        )
        
        // Tomar solo las sesiones visibles
        sessionsToCheck = sessionsToCheck.slice(0, visibleSessionsCount)
        console.log(`📊 Limitando verificación a las ${visibleSessionsCount} sesiones visibles de ${state.selectedClass.sessions.length} totales`)
      }
      
      // OPTIMIZACIÓN 2: Si no es actualización forzada, filtrar solo las que necesitan verificación
      if (!forceUpdate) {
        const originalCount = sessionsToCheck.length
        sessionsToCheck = sessionsToCheck.filter(session => 
          // Incluir sesión si no tiene spotsLeft definido o es null
          session.spotsLeft === undefined || session.spotsLeft === null
        )
        console.log(`📊 Filtro adicional: solo ${sessionsToCheck.length} de ${originalCount} sesiones necesitan verificación de disponibilidad`)
      }
      
      console.log(`📊 Verificando disponibilidad para ${sessionsToCheck.length} de ${state.selectedClass.sessions.length} sesiones totales`)
      
      // Si no hay sesiones que verificar, terminamos
      if (sessionsToCheck.length === 0) {
        console.log('✅ No hay sesiones que requieran verificación de disponibilidad')
        return
      }
      
      // Creamos una versión de la clase que solo contiene las sesiones a verificar
      const classToUpdate = {
        ...state.selectedClass,
        sessions: sessionsToCheck
      }
      
      // Actualizar solo las sesiones que necesitan verificación
      const updatedClass = await stockService.updateSessionsAvailability(
        classToUpdate, 
        { forceUpdate }
      )
      
      // Combinar los resultados: mantenemos las sesiones existentes y actualizamos solo las verificadas
      if (updatedClass && updatedClass.sessions) {
        // Creamos un mapa para buscar eficientemente las sesiones actualizadas
        const updatedSessionsMap = new Map(
          updatedClass.sessions.map((session: ClassSession) => [session.id, session])
        )
        
        // Recorremos todas las sesiones originales y actualizamos las que tienen nuevos datos
        const mergedSessions = state.selectedClass.sessions.map(session => {
          // Si esta sesión fue actualizada, usamos la versión actualizada
          const updatedSession = updatedSessionsMap.get(session.id);
          if (updatedSession) {
            return updatedSession;
          }
          // Si no, mantenemos la versión original
          return session;
        })
        
        // Actualizar el estado con las sesiones combinadas
        dispatch({
          type: 'SET_SELECTED_CLASS',
          payload: {
            ...state.selectedClass,
            sessions: mergedSessions
          }
        })
      }
      
      // Tiempo de ejecución para diagnóstico
      const execTime = performance.now() - startTime
      console.log(`✅ Verificación de disponibilidad completada en ${execTime.toFixed(2)}ms`)
      
    } catch (error) {
      console.error('❌ Error al actualizar disponibilidad:', error)
    }
  }, [state.selectedClass, currentPage, pageSize, stockValidationService])

  // 4. Efectos
  // Efecto para inicializar una sola vez (dependencias estables)
  useEffect(() => {
    const initializeStep = async () => {
      if (state.isGuest || isLoadingPackage) {
        setIsInitializing(false)
        return
      }

      await checkPackageValidity()

      // Solo verificar disponibilidad durante la inicialización inicial
      if (isInitializing && state.selectedClass) {
        // Forzar actualización durante la inicialización, pero solo para sesiones visibles
        await updateAvailabilityInfo(true, true)
      }

      setIsInitializing(false)
    }
    initializeStep()
  }, [
    state.isGuest, 
    isLoadingPackage, 
    checkPackageValidity, 
    state.selectedClass, 
    isInitializing,
    updateAvailabilityInfo
  ])

  // Hook para capturar y redirigir todos los eventos de scroll
  useEffect(() => {
    // Referencia al contenedor de sesiones
    const getContainer = () => document.getElementById('sessions-container');
    
    // Manejador para el scroll
    const handleScrollToContainer = (e: WheelEvent) => {
      const container = getContainer();
      if (!container) return;
      
      // Determinar si el evento ocurrió dentro del contenedor de sesiones
      const rect = container.getBoundingClientRect();
      const isWithinContainer = e.clientY >= rect.top && e.clientY <= rect.bottom;
      
      // Determinar si es un campo de entrada
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      
      // Solo modificamos el comportamiento si estamos fuera del contenedor y no es input
      if (!isInputField && !isWithinContainer) {
        // Scroll factor
        const scrollFactor = 1.5;
        container.scrollBy({
          top: e.deltaY * scrollFactor,
          behavior: 'smooth'
        });
      }
    };
    
    // Añadir listener en modo pasivo (sin preventDefault)
    document.addEventListener('wheel', handleScrollToContainer, { passive: true });
    
    // Limpieza
    return () => {
      document.removeEventListener('wheel', handleScrollToContainer);
    };
  }, []);

  // Carga de sesiones cuando se ingresa al paso de sesiones
  useEffect(() => {
    // Si no hay clase seleccionada o aún estamos inicializando, no hacer nada
    if (!state.selectedClass || isInitializing) return;

    // Esta función carga las sesiones para la clase seleccionada
    // Solo se ejecuta cuando el usuario llega al paso de selección de sesión
    const loadSessionsForSelectedClass = async () => {
      try {
        setIsLoading(true);
        setSessionsLoaded(false); // Marcar sesiones como no cargadas mientras se actualiza
        console.log('🔄 Cargando sesiones para la clase seleccionada...');

        // Obtener la clase nuevamente pero solicitando explícitamente la generación de sesiones
        // ya que ahora sí las necesitamos. Importante: NO verificamos disponibilidad aquí
        if (state.selectedClass?.id) {
          const classWithSessions = await classService.getClassById(
            state.selectedClass.id, 
            { 
              generateSessions: true,
              checkAvailability: false // No verificar disponibilidad al cargar las sesiones
            }
          );

          if (classWithSessions) {
            // Actualizar la clase en el estado con las sesiones generadas
            dispatch({ type: 'SET_SELECTED_CLASS', payload: classWithSessions });
            console.log('✅ Sesiones cargadas correctamente:', classWithSessions.sessions?.length || 0);
            
            // Marcar sesiones como cargadas tan pronto como estén disponibles
            // sin esperar a la disponibilidad
            setSessionsLoaded(true);
          }
        }
      } catch (error) {
        console.error('❌ Error al cargar sesiones:', error);
        toast({
          title: "Error al cargar sesiones",
          description: "No pudimos cargar las sesiones disponibles. Intenta de nuevo.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Cargar sesiones cuando el componente se monta
    loadSessionsForSelectedClass();
  }, [state.selectedClass?.id, isInitializing, dispatch]);

  // Cargar disponibilidad de sesiones cuando las sesiones ya estén renderizadas en la UI
  useEffect(() => {
    // Verificar que state.selectedClass no sea null y que ya tengamos sesiones
    if (!state.selectedClass || !state.selectedClass.sessions.length) return
    
    // Solo actualizamos disponibilidad si las sesiones ya fueron cargadas
    if (!sessionsLoaded) return

    // Limpiar cualquier timeout anterior si existe
    if (mountTimeoutRef.current) {
      clearTimeout(mountTimeoutRef.current)
    }
    
    // Damos un pequeño tiempo para que las sesiones se monten en la UI
    // antes de verificar la disponibilidad
    mountTimeoutRef.current = setTimeout(() => {
      // Marcar que ahora estamos verificando la disponibilidad
      sessionsMountedInUI.current = true
      setIsLoadingAvailability(true)
      
      const fetchAvailability = async () => {
        try {
          // Comprobación de seguridad adicional
          if (!state.selectedClass) return
          
          // Usar la función del servicio para actualizar la disponibilidad
          const forceUpdate = isInitialMount.current ? true : false
          
          // Aquí usamos updateAvailabilityInfo en vez de acceder directamente al servicio
          await updateAvailabilityInfo(forceUpdate, true)
          
        } catch (error) {
          console.error('Error al cargar disponibilidad de sesiones:', error)
          toast({
            title: 'Error',
            description: 'No se pudo cargar la disponibilidad de las sesiones',
            variant: 'destructive'
          })
        } finally {
          setIsLoadingAvailability(false)
          if (isInitialMount.current) {
            isInitialMount.current = false
          }
        }
      }
      
      // Iniciamos verificación de disponibilidad solo para las sesiones visibles actuales
      console.log('🚀 Verificando disponibilidad para el primer lote de sesiones')
      fetchAvailability()
    }, 100) // 100ms es suficiente para que el DOM se actualice
    
    // Limpiar el timeout al desmontar
    return () => {
      if (mountTimeoutRef.current) {
        clearTimeout(mountTimeoutRef.current)
      }
    }
  }, [state.selectedClass, updateAvailabilityInfo, sessionsLoaded])

  // Hook específico para optimización de lazy loading
  useEffect(() => {
    // Esta función determina si hay que verificar disponibilidad para las nuevas sesiones cargadas
    const checkAvailabilityForNewlyLoadedSessions = async () => {
      // No verificar si no hay sesiones o si estamos en el proceso de carga
      if (!state.selectedClass || isLoadingAvailability) return
      
      // Solo verificar si ya hemos montado la UI inicialmente y hemos cargado más sesiones
      if (!sessionsMountedInUI.current || currentPage <= 0) return
      
      console.log('🔄 Verificando disponibilidad para el nuevo lote de sesiones:', {
        currentPage,
        previouslyVisible: currentPage * pageSize
      })
      
      try {
        setIsLoadingAvailability(true)
        
        // Calcular qué sesiones pertenecen al nuevo lote cargado
        if (state.selectedClass.sessions && state.selectedClass.sessions.length > 0) {
          // Determinar el índice de inicio del nuevo lote
          const startIndex = (currentPage - 1) * pageSize;
          // Con margen de seguridad en caso de que haya alguna inconsistencia en el tamaño
          const safeStartIndex = Math.max(0, Math.min(startIndex, state.selectedClass.sessions.length - 1));
          
          // Filtrar solo las sesiones del lote actual (las recién cargadas)
          const recentlyLoadedSessions = state.selectedClass.sessions.slice(safeStartIndex);
          
          // Si hay sesiones recién cargadas, verificamos su disponibilidad
          if (recentlyLoadedSessions.length > 0) {
            console.log(`📊 Verificando disponibilidad solo para las ${recentlyLoadedSessions.length} sesiones recién cargadas`);
            
            // Usar nuestra función optimizada que solo verifica las sesiones necesarias
            await updateAvailabilityInfo(false);
          }
        }
      } catch (error) {
        console.error('Error al verificar disponibilidad para nuevas sesiones:', error)
      } finally {
        setIsLoadingAvailability(false)
      }
    }
    
    // Ejecutar la verificación después de cargar más sesiones
    checkAvailabilityForNewlyLoadedSessions()
  }, [currentPage, updateAvailabilityInfo, state.selectedClass, isLoadingAvailability, pageSize])

  // Efectos adicionales para gestionar adecuadamente cuando no hay más sesiones
  useEffect(() => {
    // Si detectamos que no hay más sesiones disponibles, mostramos un indicador
    if (!hasMoreSessions && sessionsLoaded && !isLoading) {
      console.log('🏁 Establecido estado de final de lista definitivo');
      // Opcionalmente mostrar un toast informativo solo una vez cuando se llega al final
      // toast({
      //   title: "Todas las sesiones cargadas",
      //   description: "Has llegado al final de las sesiones disponibles",
      //   variant: "default",
      // });
    }
  }, [hasMoreSessions, sessionsLoaded, isLoading]);

  // 5. Calcular variables
  const allSessions = useMemo(() => {
    console.log('Sessions en state:', state.selectedClass?.sessions)
    if (!state.selectedClass?.sessions) return []
    return state.selectedClass.sessions
  }, [state.selectedClass?.sessions])
  
  // 6. Funciones de utilidad
  // Hook personalizado para detectar dispositivo móvil
  const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
      const checkIsMobile = () => {
        setIsMobile(window.innerWidth < 640)
      }

      // Verificar inicialmente
      checkIsMobile()

      // Agregar listener para cambios de tamaño
      window.addEventListener('resize', checkIsMobile)

      // Limpiar listener
      return () => window.removeEventListener('resize', checkIsMobile)
    }, [])

    return isMobile
  }

  // Usar el hook en el componente
  const isMobile = useIsMobile()

  // Modificar la función handleSessionClick para usar el nuevo hook y avanzar automáticamente
  const handleSessionClick = useCallback((session: ClassSession) => {
    if (isMobile) {
      // En móvil, abrimos el modal
      setSelectedSessionForMobile(session)
    } else {
      // En desktop, manejamos la selección/deselección
      if (state.selectedSessions.includes(session.id)) {
        deselectSession(session.id)
      } else {
        // Verificar disponibilidad primero
        if (session.spotsLeft <= 0) {
          toast({
            title: "Sesión no disponible",
            description: `Esta sesión está completa (0 plazas disponibles)`,
            variant: "destructive"
          })
          return
        }
        
        // Deseleccionar sesiones previas
        const currentlySelected = [...state.selectedSessions];
        currentlySelected.forEach(id => {
          if (id !== session.id) {
            deselectSession(id);
          }
        });
        
        // Seleccionar la nueva sesión
        selectSession(session.id)
        
        // Mostrar mensaje informativo
        toast({
          title: "Sesión seleccionada",
          description: `Plazas disponibles: ${session.spotsLeft}/${session.totalSpots}`,
        })
        
        // Avanzar al siguiente paso después de un breve retraso
        // Usar el siguiente paso según la configuración en StepNavigation.tsx
        setTimeout(() => {
          // Siguiendo STEP_CONFIG en StepNavigation.tsx, de 'session' vamos a 'summary'
          goToStep('summary')
        }, 300)
      }
    }
  }, [isMobile, state.selectedSessions, deselectSession, selectSession, toast, goToStep])

  // Función para confirmar selección en móvil
  const handleMobileConfirm = useCallback(() => {
    if (!selectedSessionForMobile) {
      return
    }

    if (state.selectedSessions.includes(selectedSessionForMobile.id)) {
      deselectSession(selectedSessionForMobile.id)
    } else {
      // Verificar disponibilidad primero
      if (selectedSessionForMobile.spotsLeft <= 0) {
        toast({
          title: "Sesión no disponible",
          description: `Esta sesión está completa (0 plazas disponibles)`,
          variant: "destructive"
        })
        setSelectedSessionForMobile(null)
        return
      }
      
      // Deseleccionar sesiones previas
      const currentlySelected = [...state.selectedSessions];
      currentlySelected.forEach(id => {
        if (id !== selectedSessionForMobile.id) {
          deselectSession(id);
        }
      });
      
      // Seleccionar la nueva sesión
      selectSession(selectedSessionForMobile.id)
      
      // Cerrar el modal
      setSelectedSessionForMobile(null)
      
      // Mostrar mensaje informativo
      toast({
        title: "Sesión seleccionada",
        description: `Plazas disponibles: ${selectedSessionForMobile.spotsLeft}/${selectedSessionForMobile.totalSpots}`,
      })
      
      // Avanzar al siguiente paso después de un breve retraso
      // Usar el siguiente paso según la configuración en StepNavigation.tsx
      setTimeout(() => {
        // Siguiendo STEP_CONFIG en StepNavigation.tsx, de 'session' vamos a 'summary'
        goToStep('summary')
      }, 300)
    }
  }, [selectedSessionForMobile, state.selectedSessions, deselectSession, selectSession, toast, goToStep])

  // Actualizar handleNext para incluir un indicador visual más claro durante la verificación
  const handleNext = useCallback(async () => {
    if (state.selectedSessions.length === 0) {
      toast({
        title: "Selección necesaria",
        description: "Por favor, selecciona al menos una sesión para continuar.",
        variant: "destructive",
      })
      return
    }
    
    // Verificación final de disponibilidad antes de continuar
    setIsLoading(true)
    
    // Mostrar un toast informativo durante la verificación
    const loadingToast = toast({
      title: "Verificando disponibilidad",
      description: "Comprobando que las sesiones seleccionadas siguen disponibles...",
      duration: 10000, // Duración larga para asegurar que se vea
    })
    
    try {
      // Actualizar la disponibilidad una última vez antes de continuar
      await updateAvailabilityInfo(true)
      
      // Verificar que todas las sesiones seleccionadas sigan disponibles
      if (state.selectedClass) {
        const selectedSessionsData = state.selectedClass.sessions.filter(
          session => state.selectedSessions.includes(session.id)
        )
        
        const unavailableSessions = selectedSessionsData.filter(
          session => session.spotsLeft <= 0
        )
        
        if (unavailableSessions.length > 0) {
          // Hay sesiones seleccionadas que ya no están disponibles
          toast({
            title: "Sesiones no disponibles",
            description: `Algunas sesiones seleccionadas ya no están disponibles. Por favor, revisa tu selección.`,
            variant: "destructive",
          })
          return
        }
      }
      
      // Todo está bien, continuar al siguiente paso
      // Usar el siguiente paso según la configuración en StepNavigation.tsx
      goToStep('summary')
    } catch (error) {
      console.error('❌ Error al verificar disponibilidad final:', error)
      toast({
        title: "Error de verificación",
        description: "No se pudo verificar la disponibilidad final. ¿Deseas continuar de todos modos?",
        variant: "destructive",
      })
    } finally {
      // Cerrar el toast de carga
      loadingToast?.dismiss?.()
      setIsLoading(false)
    }
  }, [goToStep, state.selectedSessions.length, state.selectedClass, state.selectedSessions, updateAvailabilityInfo, toast])

  // 7. Funciones de formato
  const formatSessionDate = useCallback((dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
    
    const dayName = format(date, 'EEEE', { locale: es })
    const dayNumber = format(date, 'd', { locale: es })
    const monthName = format(date, 'MMMM', { locale: es })
    
    return {
      dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
      dayNumber,
      month: monthName.charAt(0).toUpperCase() + monthName.slice(1)
    }
  }, [])

  // Renderización de disponibilidad de cupos - solo la función
  const renderAvailability = (session: ClassSession) => {
    // Si estamos cargando (tanto inicial como actualizaciones)
    if (isLoadingAvailability) {
      return (
        <span className="inline-flex items-center">
          <span className="w-3 h-3 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mr-1" />
          <span className="ml-1 text-xs text-gray-500">Verificando...</span>
        </span>
      )
    }
    
    // Mostrar la disponibilidad real
    const spotsLeft = session.spotsLeft;
    const isFewSpots = spotsLeft <= 3 && spotsLeft > 0;
    const isNoSpots = spotsLeft === 0;
    
    return (
      <span className={cn(
        "text-xs",
        isFewSpots ? "text-amber-600" : (isNoSpots ? "text-red-600" : "text-gray-600"),
        "font-medium"
      )}>
        ({spotsLeft} {spotsLeft === 1 ? 'cupo' : 'cupos'})
      </span>
    )
  }

  // Cargar más sesiones cuando se llega al final del scroll
  const loadMoreSessions = useCallback(async () => {
    if (isLoadingMoreSessions || !hasMoreSessions || !state.selectedClass?.id) return
    
    // Guardar la posición de scroll actual antes de cargar
    const container = sessionsContainerRef.current;
    const scrollPositionBeforeLoad = container?.scrollTop || 0;
    const scrollHeightBeforeLoad = container?.scrollHeight || 0;
    
    setIsLoadingMoreSessions(true)
    console.log('⬇️ Generando más sesiones, página:', currentPage + 1)
    
    try {
      // Usar el servicio de clases para cargar más sesiones
      const classService = new ClassService()
      
      // Cargar la siguiente página de sesiones
      const nextPage = currentPage + 1
      
      // Obtener la clase con las nuevas sesiones generadas
      const updatedClass = await classService.getClassById(
        state.selectedClass.id, 
        { 
          generateSessions: true, 
          checkAvailability: false,
          sessionPagination: {
            pageSize,
            pageNumber: nextPage
          }
        }
      )

      if (!updatedClass || !updatedClass.sessions || updatedClass.sessions.length === 0) {
        // No hay más sesiones para cargar
        setHasMoreSessions(false)
        console.log('🛑 No hay más sesiones disponibles')
        return
      }
      
      // Actualizar el estado combinando las sesiones existentes con las nuevas
      if (state.selectedClass) {
        const combinedSessions = [...state.selectedClass.sessions || [], ...updatedClass.sessions]
        
        // Eliminar duplicados basados en ID
        const uniqueSessions = Array.from(
          new Map(combinedSessions.map(session => [session.id, session])).values()
        )
        
        // Ordenar sesiones por fecha y hora
        uniqueSessions.sort((a, b) => {
          const dateComparison = a.date.localeCompare(b.date)
          if (dateComparison !== 0) return dateComparison
          return a.startTime.localeCompare(b.startTime)
        })
        
        // Actualizar el estado con las sesiones combinadas
        dispatch({ 
          type: 'SET_SELECTED_CLASS', 
          payload: {
            ...state.selectedClass,
            sessions: uniqueSessions
          }
        })
        
        console.log(`✅ Combinadas ${state.selectedClass.sessions?.length || 0} sesiones existentes con ${updatedClass.sessions.length} nuevas: total ${uniqueSessions.length}`)
      }
      
      // Actualizar la página actual
      setCurrentPage(nextPage)
      
      // Determinar si hay más sesiones
      if (updatedClass.sessions.length < pageSize) {
        setHasMoreSessions(false)
        console.log('🛑 No hay más sesiones disponibles, recibidas menos de las esperadas')
      }
      
      // Eliminamos el ajuste forzado de posición para evitar saltos en la UI
      // Solo verificamos si hay nuevas sesiones para actualizar disponibilidad
      if (updatedClass.sessions.length > 0) {
        // Actualizar disponibilidad solo para las nuevas sesiones cargadas
        setTimeout(() => {
          updateAvailabilityInfo(false);
        }, 100);
      }
      
    } catch (error) {
      console.error('Error al cargar más sesiones:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar más sesiones',
        variant: 'destructive'
      })
    } finally {
      setIsLoadingMoreSessions(false)
    }
  }, [
    currentPage, 
    isLoadingMoreSessions, 
    hasMoreSessions, 
    state.selectedClass, 
    pageSize, 
    dispatch,
    updateAvailabilityInfo
  ])

  // Función para obtener la clase inicialmente (modificada para usar paginación)
  const fetchClass = useCallback(async () => {
    if (!state.selectedClass?.id) {
      console.warn('No hay clase seleccionada')
      return
    }

    setIsLoading(true)

    try {
      console.log(`Obteniendo clase ${state.selectedClass.id}...`)
      const classService = new ClassService()
      
      // Cargar la clase con las primeras sesiones paginadas
      const classData = await classService.getClassById(
        state.selectedClass.id, 
        { 
          generateSessions: true, 
          checkAvailability: false,
          sessionPagination: {
            pageSize,
            pageNumber: 0 // Primera página
          }
        }
      )

      if (!classData) {
        console.error('Clase no encontrada')
        return
      }

      // Actualizar el estado con la clase obtenida
      dispatch({ type: 'SET_SELECTED_CLASS', payload: classData })
      
      // Si hay sesiones y son menos que el tamaño de página, no hay más para cargar
      if (classData.sessions && classData.sessions.length < pageSize) {
        setHasMoreSessions(false)
        console.log('🛑 No hay más sesiones disponibles, recibidas menos de las esperadas en carga inicial')
      }
      
      setSessionsLoaded(true)
    } catch (error) {
      console.error('Error al obtener la clase:', error)
    } finally {
      setIsLoading(false)
    }
  }, [dispatch, state.selectedClass?.id])

  // Efecto para obtener la clase al inicio
  useEffect(() => {
    if (state.selectedClass && !sessionsLoaded) {
      fetchClass()
    }
  }, [state.selectedClass, fetchClass, sessionsLoaded])

  // Función scroll actualizada para usar loadMoreSessions basado en generación bajo demanda
  const handleScroll = useCallback(throttle((e: Event) => {
    const container = e.target as HTMLDivElement
    
    // PREVENIR COMPLETAMENTE CUALQUIER ACCIÓN DE SCROLL SI:
    // 1. No hay más sesiones disponibles
    // 2. Estamos cargando más sesiones actualmente
    if (!hasMoreSessions || isLoadingMoreSessions) {
      // Evitamos completamente cualquier procesamiento adicional
      return;
    }
    
    // Cálculo avanzado para detectar si se aproxima al final del scroll
    // Cargamos cuando nos acercamos al 85% del scroll para una experiencia más fluida
    const scrollPosition = container.scrollTop + container.clientHeight
    const scrollThreshold = container.scrollHeight * 0.85
    
    const isApproachingBottom = scrollPosition >= scrollThreshold
    
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
    
    // Solo llegamos aquí si:
    // 1. No hemos retornado antes por las condiciones de seguridad
    // 2. Estamos aproximándonos al final
    // 3. Hay más sesiones disponibles
    // 4. No estamos cargando actualmente
    console.log('📜 Aproximándose al final del scroll, generando más sesiones...')
    
    // Métricas para diagnóstico
    console.log({
      scrollPosition,
      containerHeight: container.scrollHeight,
      threshold: scrollThreshold,
      currentPage,
      scrollDelta,
      scrollStability: scrollStabilityCount
    })
    
    loadMoreSessions()
  }, 300), [loadMoreSessions, isLoadingMoreSessions, hasMoreSessions, currentPage, previousScrollPosition, scrollStabilityCount])

  // Redirigir scroll al contenedor de sesiones y configurar event listener
  useEffect(() => {
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
  }, [handleScroll, hasMoreSessions, isLoadingMoreSessions]);

  // 8. Early returns
  if (isInitializing || isLoadingPackage) {
    return (
      <StepContainer stepId="session-loading" centered>
        <LoadingState 
          message="Cargando información de la sesión..." 
          fullScreen={false}
          className="py-8"
        />
      </StepContainer>
    )
  }

  if (!state.selectedClass) {
    return (
      <StepContainer stepId="no-class-selected" centered>
        <div className="pt-8 text-center space-y-4">
          <div className="bg-yellow-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">
              No hay clase seleccionada
            </h2>
            <p className="text-sm text-yellow-700">
              Por favor, selecciona una clase antes de continuar.
            </p>
          </div>
        </div>
      </StepContainer>
    )
  }

  // 9. Variables computadas
  const isLongDescription = (state.selectedClass?.description?.length ?? 0) > 150
  const displayDescription = showFullDescription 
    ? state.selectedClass?.description 
    : state.selectedClass?.description?.slice(0, 150) + '...'

  // 10. Render principal
  return (
    <StepContainer stepId="session-selection" centered={false} className="px-4 sm:px-[var(--padding-container-tablet)] lg:px-[var(--padding-container-desktop)]">
      <div className="w-full max-w-3xl mx-auto h-full flex flex-col overflow-hidden">
        <div className="space-y-6 flex-none">
          {/* Imagen decorativa */}
          <div className="flex justify-start">
            <div className="relative w-24 h-24">
              <Image
                src="/images/Miroodles - Sticker 5.png"
                alt="Decorative sticker"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Encabezado con Pack Activo alineado a la derecha en desktop */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold text-gray-900">
                Elige tus sesiones
              </h2>
              <p className="text-sm text-gray-500">
                Selecciona las sesiones a las que deseas asistir
                {isLoadingAvailability && sessionsMountedInUI.current && (
                  <span className="ml-2 text-xs italic flex items-center">
                    <div className="w-3 h-3 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mr-1" />
                    verificando disponibilidad...
                  </span>
                )}
              </p>
            </div>
            
            {/* Pack activo en desktop - Alineado en la misma fila que el subtítulo */}
            {!isMobile && activePackage && (
              <div className="flex ml-auto">
                <ActivePackageInfo 
                  activePackage={activePackage} 
                  packagesAreValid={packagesAreValid} 
                  branchName={state.selectedClass?.branchInfo?.name}
                  variant="desktop"
                />
              </div>
            )}
          </div>

          {/* Descripción de la clase con la información integrada - Solo en desktop */}
          {!isMobile && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                {displayDescription}
              </p>
              
              {/* Botón "Ver más" ahora arriba de los datos dinámicos */}
              {isLongDescription && (
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  {showFullDescription ? 'Ver menos' : 'Ver más'}
                </button>
              )}
              
              {/* Información simplificada de la clase */}
              <p className="text-xs text-gray-500 mt-2">
                {state.selectedClass.title} • {state.selectedClass.is_recurring ? 'Recurrente' : 'Única'}
                {state.selectedClass.branchInfo && ` • ${state.selectedClass.branchInfo.name}`}
              </p>
            </div>
          )}

          {/* Información paquete activo - Solo visible en móvil y alineado a la derecha */}
          {isMobile && activePackage && (
            <div className="flex mb-4 justify-end">
              <ActivePackageInfo 
                activePackage={activePackage} 
                packagesAreValid={packagesAreValid} 
                branchName={state.selectedClass?.branchInfo?.name}
                variant="mobile"
              />
            </div>
          )}

          {/* Grid de sesiones - Con scroll optimizado - estructura idéntica a ClassSelectionStep */}
          <div 
            className="space-y-4 overflow-y-auto pr-0 sm:pr-2 pb-12 relative flex-1" 
            id="sessions-container"
            ref={sessionsContainerRef}
            style={{
              height: 'auto',
              maxHeight: isMobile ? 'calc(100vh - 320px)' : '450px',
              minHeight: isMobile ? '450px' : '450px',
              overflowY: 'auto',
              scrollbarWidth: 'none', 
              msOverflowStyle: 'none', 
              marginBottom: isMobile ? '60px' : '20px'
            }}
          >
            {/* Degradado sutil en la parte superior del contenedor */}
            <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none"></div>
            
            {/* Estado de carga mientras se obtienen las sesiones */}
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center py-16">
                <LoadingSpinner message="Cargando sesiones disponibles..." />
              </div>
            ) : !sessionsLoaded || !state.selectedClass?.sessions?.length ? (
              <div className="h-full flex flex-col items-center justify-center py-16">
                <p className="text-sm text-gray-500">No hay sesiones disponibles</p>
              </div>
            ) : (
              <div className="space-y-4 pb-10">
                {/* Renderizar todas las sesiones disponibles */}
                {allSessions.map((session) => {
                  const { dayName, dayNumber, month } = formatSessionDate(session.date)
                  const isSelected = state.selectedSessions.includes(session.id)

                  return (
                    <button
                      key={session.id}
                      onClick={() => handleSessionClick(session)}
                      className={cn(
                        // Estilos base del contenedor
                        "w-full rounded-xl",
                        // Usar mismo grosor de borde para evitar movimiento al seleccionar
                        "border border-solid box-border",
                        isSelected 
                          ? "border-black" // Borde negro para elemento seleccionado
                          : "border-gray-100 hover:border-gray-200 bg-white",
                        // Quitar cualquier transición para evitar movimiento
                        "transition-none",
                        "relative overflow-hidden",
                        // Accesibilidad - quitar anillo azul al seleccionar
                        "focus:outline-none focus:ring-0"
                      )}
                      aria-pressed={isSelected}
                      title={isSelected ? "Sesión seleccionada" : "Seleccionar sesión"}
                    >
                      <div className="px-4 py-3 sm:p-4">
                        <div className="flex flex-row sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                          {/* Contenedor principal para móvil que agrupa fecha/hora y precio */}
                          <div className="flex flex-1 justify-between items-start sm:items-center gap-2">
                            {/* Fecha y hora - Visible en todos los dispositivos */}
                            <div className="min-w-0">
                              <div className="space-y-0.5">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {dayName}, {dayNumber} de {month}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {session.startTime} - {session.endTime}
                                </p>
                              </div>
                            </div>

                            {/* Precio en móvil */}
                            <div className="sm:hidden flex-shrink-0">
                              <p className="text-sm font-medium text-gray-900">
                                {typeof session.price === 'number' 
                                  ? session.price.toLocaleString('es-AR', {
                                      style: 'currency',
                                      currency: 'ARS',
                                    })
                                  : 'Precio no disponible'
                                }
                              </p>
                            </div>
                          </div>

                          {/* Instructor y cancha - Solo visible en desktop */}
                          <div className="hidden sm:block flex-shrink-0">
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                              {session.instructor && (
                                <p className="flex items-center gap-1">
                                  <span className="font-medium">Instructor:</span>
                                  <span className="truncate">{session.instructor}</span>
                                </p>
                              )}
                              {session.courts && session.courts.length > 0 && (
                                <>
                                  <span className="text-gray-300">•</span>
                                  <p className="flex items-center gap-1">
                                    <span className="font-medium">Cancha:</span>
                                    <span className="truncate">{session.courts[0].name}</span>
                                  </p>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Precio y cupos - Solo visible en desktop */}
                          <div className="hidden sm:flex flex-shrink-0 items-center gap-2">
                            <p className="text-sm font-medium text-gray-900">
                              {typeof session.price === 'number' 
                                ? session.price.toLocaleString('es-AR', {
                                    style: 'currency',
                                    currency: 'ARS',
                                  })
                                : 'Precio no disponible'
                              }
                            </p>
                            {renderAvailability(session)}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
                
                {/* Indicador de carga para más sesiones */}
                {isLoadingMoreSessions && (
                  <div className="w-full py-4 flex items-center justify-center text-sm text-gray-600">
                    <div className="w-4 h-4 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mr-2"></div>
                    <span>Cargando más sesiones...</span>
                  </div>
                )}
                
                {/* Botón explícito para cargar más (solo visible si hay más para cargar y no estamos ya cargando) */}
                {hasMoreSessions && !isLoadingMoreSessions && (
                  <button
                    onClick={loadMoreSessions}
                    className="w-full py-3 text-center text-sm font-medium rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Ver más sesiones
                  </button>
                )}
              </div>
            )}
          </div>
          
          {/* Degradado sutil en la parte inferior del contenedor - Fuera del contenedor con scroll */}
          <div className="absolute bottom-[80px] left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none"></div>

          {/* Mobile Drawer */}
          <MobileDrawer
            isOpen={!!selectedSessionForMobile}
            onClose={() => setSelectedSessionForMobile(null)}
            imageUrl="/images/Miroodles - Sticker 3.png"
            footer={
              selectedSessionForMobile && (
                <button
                  onClick={handleMobileConfirm}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl",
                    "bg-gray-900 text-white",
                    "text-sm font-medium",
                    "transition-all duration-200",
                    "hover:bg-gray-800",
                    "flex items-center justify-center gap-2"
                  )}
                >
                  <span>Seleccionar esta sesión</span>
                  <IconChevronRight size={16} className="text-white/70" />
                </button>
              )
            }
          >
            {selectedSessionForMobile && (
              <div className="space-y-4">
                {/* Información de la sesión */}
                <div className="space-y-4">
                  {/* Fecha y hora */}
                  <div>
                    {(() => {
                      const { dayName, dayNumber, month } = formatSessionDate(selectedSessionForMobile.date)
                      return (
                        <div className="space-y-1">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {dayName}, {dayNumber} de {month}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {selectedSessionForMobile.startTime} - {selectedSessionForMobile.endTime}
                          </p>
                        </div>
                      )
                    })()}
                  </div>

                  {/* Detalles adicionales */}
                  <div className="space-y-4">
                    {/* Instructor */}
                    {selectedSessionForMobile.instructor && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-1">
                          Instructor
                        </h4>
                        <p className="text-sm text-gray-600">
                          {selectedSessionForMobile.instructor}
                        </p>
                      </div>
                    )}

                    {/* Cancha */}
                    {selectedSessionForMobile.courts && selectedSessionForMobile.courts.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-1">
                          Cancha
                        </h4>
                        <p className="text-sm text-gray-600">
                          {selectedSessionForMobile.courts[0].name}
                        </p>
                      </div>
                    )}

                    {/* Cupos */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">
                        Cupos disponibles
                      </h4>
                      {isLoadingAvailability ? (
                        <div className="flex items-center">
                          <div className="w-3 h-3 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mr-2" />
                          <span className="text-sm text-gray-500">Verificando disponibilidad...</span>
                        </div>
                      ) : (
                        <p className={cn(
                          "text-sm",
                          selectedSessionForMobile.spotsLeft <= 3 && selectedSessionForMobile.spotsLeft > 0 
                            ? "text-amber-600" 
                            : (selectedSessionForMobile.spotsLeft === 0 ? "text-red-600" : "text-gray-600"),
                          selectedSessionForMobile.spotsLeft <= 3 ? "font-medium" : ""
                        )}>
                          {selectedSessionForMobile.spotsLeft} {selectedSessionForMobile.spotsLeft === 1 ? 'cupo' : 'cupos'}
                        </p>
                      )}
                    </div>

                    {/* Precio */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">
                        Precio
                      </h4>
                      <p className="text-base font-medium text-gray-900">
                        {typeof selectedSessionForMobile.price === 'number'
                          ? selectedSessionForMobile.price.toLocaleString('es-AR', {
                              style: 'currency',
                              currency: 'ARS',
                            })
                          : 'Precio no disponible'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </MobileDrawer>
        </div>
      </div>
    </StepContainer>
  )
}