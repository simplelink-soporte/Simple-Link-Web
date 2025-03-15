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
   * ESTRATEGIA DE VERIFICACIÓN DE DISPONIBILIDAD OPTIMIZADA
   * ------------------------------------------------------
   * Para maximizar el rendimiento y la experiencia de usuario, verificamos
   * la disponibilidad de sesiones únicamente en dos momentos estratégicos:
   * 
   * 1. Al cargar inicialmente el componente (verificación inicial)
   *    - Muestra la disponibilidad real al usuario desde el inicio
   *    - Se ejecuta solo una vez por carga de página
   * 
   * 2. Justo antes de confirmar la selección (verificación final)
   *    - Garantiza que las sesiones seleccionadas siguen disponibles
   *    - Evita problemas de concurrencia en reservas
   * 
   * Hemos eliminado las verificaciones periódicas y en cada selección
   * para optimizar el rendimiento, especialmente en sesiones largas.
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
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(true)
  const [sessionAvailability, setSessionAvailability] = useState<SessionAvailability>({})
  const isInitialMount = useRef(true)

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

  // Actualizar información de disponibilidad (con optimización)
  const updateAvailabilityInfo = useCallback(async (forceUpdate = false) => {
    if (!state.selectedClass) return
    
    // Registrar cuándo y por qué se está actualizando la disponibilidad
    console.log(`📊 Actualizando disponibilidad ${forceUpdate ? '(forzado)' : '(normal)'} - ${new Date().toLocaleTimeString()}`)
    
    try {
      // Usar las opciones de optimización que agregamos al servicio
      const updatedClassWithAvailability = await classService.updateSessionsAvailability(
        state.selectedClass,
        { 
          forceUpdate, 
          // Ya no necesitamos throttleThreshold para actualizaciones regulares
          // ya que solo actualizamos en momentos específicos
          throttleThreshold: 0
        }
      )
      
      // El servicio ya se encarga de verificar si hay cambios y si debe actualizar
      // Solo actualizamos el estado si el servicio devuelve un objeto distinto
      if (updatedClassWithAvailability !== state.selectedClass) {
        dispatch({ 
          type: 'SET_SELECTED_CLASS', 
          payload: updatedClassWithAvailability 
        })
        
        // Registrar que se actualizó la disponibilidad
        console.log(`✅ Disponibilidad actualizada con éxito - ${new Date().toLocaleTimeString()}`)
      } else {
        console.log(`ℹ️ No hay cambios en disponibilidad - ${new Date().toLocaleTimeString()}`)
      }
    } catch (error) {
      console.error('❌ Error al actualizar información de disponibilidad:', error)
    }
  }, [state.selectedClass, dispatch])

  // Función para inicializar el componente
  const initializeStep = useCallback(async () => {
    if (state.isGuest || isLoadingPackage) {
      setIsInitializing(false)
      return
    }

    await checkPackageValidity()

    // Solo verificar disponibilidad durante la inicialización inicial
    if (isInitializing && state.selectedClass) {
      // Forzar actualización durante la inicialización
      await updateAvailabilityInfo(true)
    }

    setIsInitializing(false)
  }, [
    state.isGuest, 
    isLoadingPackage, 
    checkPackageValidity, 
    state.selectedClass, 
    isInitializing,
    updateAvailabilityInfo
  ])

  // 4. Efectos
  // Efecto para inicializar una sola vez (dependencias estables)
  useEffect(() => {
    initializeStep()
  }, [
    state.selectedClass?.id // Solo reinicializar si cambia la clase seleccionada
  ])

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
        <div className="inline-flex items-center">
          <div className="w-3 h-3 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mr-1" />
          <span className="ml-1 text-xs text-gray-500">Verificando...</span>
        </div>
      )
    }
    
    // Mostrar la disponibilidad real
    const spotsLeft = session.spotsLeft;
    const isFewSpots = spotsLeft <= 3 && spotsLeft > 0;
    const isNoSpots = spotsLeft === 0;
    
    return (
      <p className={cn(
        "text-xs",
        isFewSpots ? "text-amber-600" : (isNoSpots ? "text-red-600" : "text-gray-600"),
        "font-medium"
      )}>
        ({spotsLeft} {spotsLeft === 1 ? 'cupo' : 'cupos'})
      </p>
    )
  }

  // Cargar disponibilidad de sesiones
  useEffect(() => {
    // Verificar que state.selectedClass no sea null
    if (!state.selectedClass || !state.selectedClass.sessions.length) return
    
    setIsLoadingAvailability(true)
    
    const fetchAvailability = async () => {
      try {
        // Comprobación de seguridad adicional
        if (!state.selectedClass) return
        
        // Usar la función del servicio para actualizar la disponibilidad
        const forceUpdate = isInitialMount.current ? true : false
        
        // Aquí usamos updateAvailabilityInfo en vez de acceder directamente al servicio
        // Esta función ya la definimos antes y funciona correctamente
        await updateAvailabilityInfo(forceUpdate)
        
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
    
    fetchAvailability()
  }, [state.selectedClass, updateAvailabilityInfo])

  // Redirigir scroll al contenedor de sesiones
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
      
      const handleWheel = (e: WheelEvent) => {
        const container = getContainer();
        if (container && container.contains(e.target as Node)) {
          // Permitimos que el navegador maneje el scroll naturalmente
        }
      };
      
      window.addEventListener('wheel', handleWheel, { 
        passive: true
      });
      
      return () => {
        window.removeEventListener('wheel', handleWheel);
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
      };
    }, 100);
  }, []);

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

          {/* Encabezado */}
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold text-gray-900">
              Elige tus sesiones
            </h2>
            <p className="text-sm text-gray-500">
              Selecciona las sesiones a las que deseas asistir
            </p>
          </div>

          {/* Información de la clase - Visible solo en desktop */}
          {!isMobile && (
            <>
              <div className="space-y-1 text-gray-500/80">
                <p className="text-sm font-medium">
                  {state.selectedClass.title}
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <span>{state.selectedClass.is_recurring ? 'Clase recurrente' : 'Clase única'}</span>
                  {state.selectedClass.branchInfo && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span>Sede: {state.selectedClass.branchInfo.name}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Descripción de la clase */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  {displayDescription}
                </p>
                {isLongDescription && (
                  <button
                    onClick={() => setShowFullDescription(!showFullDescription)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    {showFullDescription ? 'Ver menos' : 'Ver más'}
                  </button>
                )}
              </div>
            </>
          )}

          {/* Información del paquete activo */}
          {activePackage && (
            <div className={cn(
              "rounded-xl p-4",
              packagesAreValid ? "bg-blue-50/80" : "bg-yellow-50/80",
              "space-y-2"
            )}>
              <div className="flex items-center justify-between">
                <h3 className={cn(
                  "text-sm font-medium",
                  packagesAreValid ? "text-blue-800" : "text-yellow-800"
                )}>
                  Paquete activo: {activePackage.package?.name}
                </h3>
                {packagesAreValid && (
                  <span className="text-sm text-blue-600">
                    Válido hasta {format(new Date(activePackage.expires_at), 'd MMMM yyyy', { locale: es })}
                  </span>
                )}
              </div>
              
              {packagesAreValid ? (
                <p className="text-xs text-blue-500">
                  Válido hasta {format(new Date(activePackage.expires_at), 'd MMMM yyyy', { locale: es })}
                </p>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm text-yellow-700">
                    Este paquete no es válido para esta clase ya que pertenece a otra sede.
                  </p>
                  <p className="text-xs text-yellow-600">
                    Sedes válidas: {state.selectedClass?.branchInfo?.name}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Grid de sesiones - Con scroll optimizado - estructura idéntica a ClassSelectionStep */}
          <div 
            className="space-y-4 overflow-y-auto pr-0 sm:pr-2 pb-12 relative flex-1" 
            id="sessions-container"
            style={{
              height: '60vh',
              maxHeight: 'calc(80vh - 80px)',
              minHeight: '400px',
              overflowY: 'auto',
              scrollbarWidth: 'none', 
              msOverflowStyle: 'none', 
              marginBottom: '60px'
            }}
          >
            {/* Degradado sutil en la parte superior del contenedor */}
            <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none"></div>
            
            {/* Degradado sutil en la parte inferior del contenedor */}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none"></div>
            
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
          </div>

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