"use client"

import { useState, useEffect, useMemo, useCallback } from 'react'
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

const SESSIONS_PER_PAGE = 4

export function SessionStep() {
  // 1. Estados locales
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [validBranchNames, setValidBranchNames] = useState<string[]>([])
  const [isPackageValidForClass, setIsPackageValidForClass] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [isInitializing, setIsInitializing] = useState(true)
  const [selectedSessionForMobile, setSelectedSessionForMobile] = useState<ClassSession | null>(null)

  // 2. Hooks y contexto
  const { state, selectSession, deselectSession, goToStep } = useClassRegistration()
  const { activePackage, isLoading: isLoadingPackage } = useUserPackages()
  const supabase = createClientComponentClient<Database>()

  // 3. Memos para datos derivados
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

  // 4. Funciones memorizadas
  const checkPackageValidity = useCallback(async () => {
    if (!activePackage || !state.selectedClass?.branchInfo?.id) {
      setIsPackageValidForClass(false)
      return
    }

    const branchIds = activePackage.package?.branch_ids || []
    
    try {
      const { data: branches } = await supabase
        .from('sedes')
        .select('name')
        .in('id', branchIds)

      if (branches) {
        setValidBranchNames(branches.map(branch => branch.name))
      }

      const isValid = branchIds.includes(state.selectedClass.branchInfo.id)
      setIsPackageValidForClass(isValid)
    } catch (error) {
      console.error('Error al verificar sedes válidas:', error)
      setIsPackageValidForClass(false)
    }
  }, [activePackage, state.selectedClass?.branchInfo?.id, supabase])

  // 5. Efecto principal
  useEffect(() => {
    const initializeStep = async () => {
      if (state.isGuest || isLoadingPackage) {
        setIsInitializing(false)
        return
      }

      await checkPackageValidity()
      setIsInitializing(false)
    }

    initializeStep()
  }, [state.isGuest, isLoadingPackage, checkPackageValidity])

  // 6. Funciones de manejo de eventos
  const handleSessionClick = useCallback((session: ClassSession) => {
    // En móvil, mostramos el drawer
    if (window.innerWidth < 640) {
      setSelectedSessionForMobile(session)
      return
    }

    // En desktop, solo seleccionamos la sesión
    if (state.selectedSessions.includes(session.id)) {
      deselectSession(session.id)
      return
    }

    if (state.selectedSessions.length > 0) {
      state.selectedSessions.forEach(id => deselectSession(id))
    }

    selectSession(session.id)
  }, [state.selectedSessions, selectSession, deselectSession])

  // Función para confirmar selección en móvil
  const handleConfirmMobileSelection = useCallback(() => {
    if (!selectedSessionForMobile) return

    if (state.selectedSessions.length > 0) {
      state.selectedSessions.forEach(id => deselectSession(id))
    }

    selectSession(selectedSessionForMobile.id)
    setSelectedSessionForMobile(null)
  }, [selectedSessionForMobile, state.selectedSessions, selectSession, deselectSession])

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
          {state.selectedClass.description && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                {displayDescription}
              </p>
              {isLongDescription && (
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="text-sm text-gray-600 hover:text-gray-700 transition-colors duration-200 flex items-center gap-1"
                >
                  {showFullDescription ? 'Ver menos' : 'Ver más'}
                  <IconChevronDown
                    size={16}
                    className={cn(
                      "transition-transform duration-200",
                      showFullDescription && "transform rotate-180"
                    )}
                  />
                </button>
              )}
            </div>
          )}

          {/* Información del paquete activo */}
          {activePackage && (
            <div className={cn(
              "rounded-xl p-4",
              isPackageValidForClass ? "bg-blue-50/80" : "bg-yellow-50/80",
              "space-y-2"
            )}>
              <div className="flex items-center justify-between">
                <h3 className={cn(
                  "text-sm font-medium",
                  isPackageValidForClass ? "text-blue-800" : "text-yellow-800"
                )}>
                  Paquete activo: {activePackage.package?.name}
                </h3>
                {isPackageValidForClass && (
                  <span className="text-sm text-blue-600">
                    {activePackage.sessions_left} {activePackage.sessions_left === 1 ? 'sesión' : 'sesiones'} disponibles
                  </span>
                )}
              </div>
              
              {isPackageValidForClass ? (
                <p className="text-xs text-blue-500">
                  Válido hasta {format(new Date(activePackage.expires_at), 'd MMMM yyyy', { locale: es })}
                </p>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm text-yellow-700">
                    Este paquete no es válido para esta clase ya que pertenece a otra sede.
                  </p>
                  <p className="text-xs text-yellow-600">
                    Sedes válidas: {validBranchNames.join(', ')}
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
                        <p className="text-xs text-gray-600">
                          ({session.spotsLeft} {session.spotsLeft === 1 ? 'cupo' : 'cupos'})
                        </p>
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
                    <p className="text-sm text-gray-600">
                      {selectedSessionForMobile.spotsLeft} {selectedSessionForMobile.spotsLeft === 1 ? 'cupo' : 'cupos'}
                    </p>
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
                onClick={handleConfirmMobileSelection}
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