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

const SESSIONS_PER_PAGE = 4

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
  const [currentPage, setCurrentPage] = useState(1)
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

  // Modificar la función de selección de sesión para eliminar la verificación adicional
  const handleSessionSelect = useCallback(async (sessionId: string) => {
    // Buscar la sesión en el estado actual
    if (state.selectedClass) {
      const session = state.selectedClass.sessions.find(s => s.id === sessionId)
      
      if (session) {
        // Verificar la disponibilidad utilizando los datos ya cargados
        if (session.spotsLeft <= 0) {
          // Mostrar mensaje si no hay disponibilidad según datos ya cargados
          toast({
            title: "Sesión no disponible",
            description: `Esta sesión está completa (0 plazas disponibles)`,
            variant: "destructive"
          })
          return
        }
        
        // Si hay disponibilidad según los datos cargados, continuar con la selección
        selectSession(sessionId)
        
        // Opcional: mostrar mensaje informativo
        toast({
          title: "Sesión seleccionada",
          description: `Plazas disponibles: ${session.spotsLeft}/${session.totalSpots}`,
        })
      }
    }
  }, [state.selectedClass, selectSession, toast])

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
      goToStep('payment')
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

  // 5. Calcular variables
  const currentSessions = useMemo(() => {
    console.log('Sessions en state:', state.selectedClass?.sessions)
    if (!state.selectedClass?.sessions) return []
    const startIndex = (currentPage - 1) * SESSIONS_PER_PAGE
    const endIndex = startIndex + SESSIONS_PER_PAGE
    const sessions = state.selectedClass.sessions.slice(startIndex, endIndex)
    console.log('Sessions procesadas:', sessions)
    return sessions
  }, [state.selectedClass?.sessions, currentPage])

  const totalPages = useMemo(() => {
    if (!state.selectedClass?.sessions) return 0
    return Math.ceil(state.selectedClass.sessions.length / SESSIONS_PER_PAGE)
  }, [state.selectedClass?.sessions])

  // 6. Funciones de manejo de eventos
  const handleSessionClick = useCallback((session: ClassSession) => {
    if (state.selectedSessions.includes(session.id)) {
      deselectSession(session.id)
    } else {
      handleSessionSelect(session.id)
    }
  }, [state.selectedSessions, deselectSession, handleSessionSelect])

  // Función para confirmar selección en móvil
  const handleMobileConfirm = useCallback(() => {
    if (!selectedSessionForMobile) {
      return
    }

    if (state.selectedSessions.includes(selectedSessionForMobile.id)) {
      deselectSession(selectedSessionForMobile.id)
    } else {
      handleSessionSelect(selectedSessionForMobile.id)
    }
    setSelectedSessionForMobile(null)
  }, [selectedSessionForMobile, state.selectedSessions, deselectSession, handleSessionSelect])

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
    <StepContainer stepId="session-selection" centered={false}>
      <div className="w-full max-w-3xl mx-auto px-5 sm:px-6 lg:px-0">
        <div className="pt-8 space-y-8">
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
            <h2 className="text-xl font-semibold text-gray-900">
              Elige tus sesiones
            </h2>
            <p className="text-sm text-gray-600">
              Selecciona las sesiones a las que deseas asistir
            </p>
          </div>

          {/* Información de la clase */}
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

          {/* Grid de sesiones */}
          <div className="space-y-4">
            {currentSessions.map((session) => {
              const { dayName, dayNumber, month } = formatSessionDate(session.date)
              const isSelected = state.selectedSessions.includes(session.id)

              return (
                <button
                  key={session.id}
                  onClick={() => handleSessionClick(session)}
                  className={cn(
                    // Estilos base del contenedor
                    "w-full rounded-xl",
                    "border",
                    isSelected 
                      ? "border-gray-300 bg-gray-50/80 ring-1 ring-gray-200"
                      : "border-gray-100 hover:border-gray-200 bg-white",
                    "transition-all duration-200",
                    "relative overflow-hidden",
                    // Accesibilidad
                    "focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={cn(
                    "w-8 h-8 rounded-lg text-sm font-medium",
                    "transition-colors duration-200",
                    currentPage === i + 1
                      ? "bg-gray-100 text-gray-700"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-600"
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mobile Drawer */}
        <MobileDrawer
          isOpen={!!selectedSessionForMobile}
          onClose={() => setSelectedSessionForMobile(null)}
          imageUrl="/images/Miroodles - Sticker 3.png"
        >
          {selectedSessionForMobile && (
            <div className="space-y-6">
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
                <div className="pt-4 border-t border-gray-100 space-y-4">
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

              {/* Botón de confirmación */}
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
            </div>
          )}
        </MobileDrawer>
      </div>
    </StepContainer>
  )
}