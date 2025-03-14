"use client"

import { useState, useEffect } from 'react'
import { IconChevronDown } from '@tabler/icons-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { cn } from '@/lib/utils'
import { useClassRegistration } from '../context/ClassRegistrationContext'
import { UserPackageService } from '../services'
import { StepContainer } from '../shared/StepContainer'
import { StepHeader } from '../shared/StepSection'
import type { Database } from '@/types/supabase'
import type { UserPackageFromDB, ClassSession } from '../types/models'

export function SummaryStep() {
  const { state } = useClassRegistration()
  const [activePackage, setActivePackage] = useState<UserPackageFromDB | null>(null)
  const [isPackageValidForClass, setIsPackageValidForClass] = useState(false)
  const userPackageService = new UserPackageService()
  const supabase = createClientComponentClient<Database>()

  // Verificar si el usuario tiene paquetes activos y si son válidos para la clase
  useEffect(() => {
    const checkActivePackages = async () => {
      if (state.isGuest) return

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user?.id) return

        const activePackages = await userPackageService.getUserActivePackages(session.user.id)
        if (activePackages.length > 0) {
          const pkg = activePackages[0]
          // Asegurarnos de que el estado coincida con nuestro tipo
          setActivePackage({
            ...pkg,
            status: pkg.status === 'cancelled' ? 'inactive' : pkg.status
          } as UserPackageFromDB)

          // Verificar si el paquete es válido para la sede de la clase
          if (pkg?.package?.branch_ids && state.selectedClass?.branchInfo?.id) {
            const isValid = pkg.package.branch_ids.includes(state.selectedClass.branchInfo.id)
            setIsPackageValidForClass(isValid)
          }
        }
      } catch (error) {
        console.error('❌ Error al verificar paquetes activos:', error)
      }
    }

    checkActivePackages()
  }, [state.selectedClass])

  // Formatear fecha
  const formatSessionDate = (dateStr: string) => {
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
  }

  // Encontrar la sesión seleccionada
  const selectedSession = state.selectedClass?.sessions.find(
    (session: ClassSession) => session.id === state.selectedSessions[0]
  )

  if (!selectedSession || !state.selectedClass) {
    return (
      <StepContainer stepId="summary-error">
        <div className="text-center space-y-4">
          <div className="bg-yellow-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">
              No hay sesión seleccionada
            </h2>
            <p className="text-sm text-yellow-700">
              Por favor, selecciona una sesión antes de continuar.
            </p>
          </div>
        </div>
      </StepContainer>
    )
  }

  const { dayName, dayNumber, month } = formatSessionDate(selectedSession.date)
  const timeSlot = state.selectedClass.schedule.timeSlots[0]

  return (
    <StepContainer stepId="summary" centered={false}>
      <div className="w-full max-w-3xl mx-auto">
        <div className="space-y-6">
          {/* Encabezado */}
          <div className="text-center space-y-1.5">
            <h2 className="text-xl font-semibold text-gray-900">
              Resumen de reserva
            </h2>
            <p className="text-sm text-gray-600">
              Revisa los detalles de tu reserva antes de continuar con el pago
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-6">
            {/* Detalles de la clase */}
            <div className={cn(
              "w-full rounded-xl",
              "border border-gray-200",
              "bg-gray-50/50",
              "overflow-hidden"
            )}>
              {/* Encabezado con título y descripción */}
              <div className="p-6 border-b border-gray-200 bg-white">
                <h3 className="text-lg font-semibold text-gray-900">
                  {state.selectedClass.title}
                </h3>
                {state.selectedClass.description && (
                  <p className="mt-2 text-sm text-gray-600">
                    {state.selectedClass.description}
                  </p>
                )}
              </div>

              {/* Detalles de la sesión */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Columna izquierda */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">
                        Fecha y horario
                      </h4>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600">
                          {dayName}, {dayNumber} de {month}
                        </p>
                        <p className="text-sm text-gray-600">
                          {selectedSession.startTime} - {selectedSession.endTime}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">
                        Instructor y ubicación
                      </h4>
                      <div className="space-y-1">
                        {selectedSession.instructor && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Instructor:</span>{' '}
                            {selectedSession.instructor}
                          </p>
                        )}
                        {state.selectedClass.branchInfo && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Sede:</span>{' '}
                            {state.selectedClass.branchInfo.name}
                          </p>
                        )}
                        {selectedSession.courts && selectedSession.courts.length > 0 && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Cancha:</span>{' '}
                            {selectedSession.courts[0].name}
                            {selectedSession.courts[0].description && (
                              <span className="text-gray-500 text-xs ml-1">
                                ({selectedSession.courts[0].description})
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Columna derecha */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">
                        Detalles de la clase
                      </h4>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Tipo:</span>{' '}
                          {state.selectedClass.is_recurring ? 'Clase recurrente' : 'Clase única'}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Cupos disponibles:</span>{' '}
                          {selectedSession.spotsLeft} de {selectedSession.totalSpots}
                        </p>
                      </div>
                    </div>

                    {/* Información del paquete o precio */}
                    <div className="pt-4 border-t border-gray-200">
                      {activePackage && activePackage.sessions_left > 0 && isPackageValidForClass ? (
                        <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                          <h4 className="text-sm font-medium text-blue-800">
                            Paquete: {activePackage.package?.name}
                          </h4>
                          <p className="text-sm text-blue-600">
                            Se descontará 1 sesión de tu paquete
                          </p>
                          <p className="text-xs text-blue-500">
                            Te quedarán {activePackage.sessions_left - 1} {activePackage.sessions_left - 1 === 1 ? 'sesión' : 'sesiones'} disponibles
                          </p>
                          <p className="text-xs text-blue-500">
                            Válido hasta {format(new Date(activePackage.expires_at), 'd MMMM yyyy', { locale: es })}
                          </p>
                        </div>
                      ) : (
                        <div className="bg-white rounded-lg p-4 space-y-2">
                          <h4 className="text-sm font-medium text-gray-900">
                            Precio de la sesión
                          </h4>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Total a pagar</span>
                            <span className="text-lg font-semibold text-gray-900">
                              {selectedSession.price.toLocaleString('es-AR', {
                                style: 'currency',
                                currency: 'ARS'
                              })}
                            </span>
                          </div>
                          {activePackage && !isPackageValidForClass && (
                            <p className="text-xs text-yellow-600">
                              Tu paquete activo no es válido para esta sede
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StepContainer>
  )
} 