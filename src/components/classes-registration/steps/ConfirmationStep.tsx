"use client"

import { motion } from 'framer-motion'
import { IconCheck } from '@tabler/icons-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useClassRegistration } from '../context/ClassRegistrationContext'
import type { ClassSession } from '../types/models'

export function ConfirmationStep() {
  const { state } = useClassRegistration()

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
    return null
  }

  const { dayName, dayNumber, month } = formatSessionDate(selectedSession.date)
  const timeSlot = state.selectedClass.schedule.timeSlots[0]
  const usedPackage = state.step === 'confirmation' && !state.selectedPayment

  return (
    <motion.div
      key="confirmation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.75 }}
      className="w-full max-w-[680px] mx-auto px-6 md:px-8"
    >
      <div className="space-y-6">
        {/* Ícono y título */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <IconCheck className="w-6 h-6 text-green-600" strokeWidth={2.5} />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">
              {usedPackage ? '¡Reserva confirmada!' : '¡Pago confirmado!'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {usedPackage 
                ? 'Tu sesión ha sido reservada exitosamente usando tu paquete activo'
                : 'Tu pago ha sido procesado y tu sesión ha sido reservada exitosamente'
              }
            </p>
          </div>
        </div>

        {/* Detalles de la clase */}
        <div className="bg-gray-50 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {state.selectedClass.title}
          </h3>
          
          {/* Instructor */}
          {state.selectedClass.instructor && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">Profesor:</span>
              <span>{state.selectedClass.instructor}</span>
            </div>
          )}

          {/* Fecha y hora */}
          <div className="space-y-2">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Fecha:</span>{' '}
              <span>{dayName} {dayNumber} de {month}</span>
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Horario:</span>{' '}
              <span>{selectedSession.startTime} - {selectedSession.endTime}</span>
            </div>
          </div>

          {/* Método de pago o paquete usado */}
          <div className="pt-4 border-t border-gray-200">
            {usedPackage ? (
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  Se ha descontado 1 sesión de tu paquete activo
                </p>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900">Método de pago</p>
                  <p className="text-sm text-gray-600">
                    {state.selectedPayment === 'cash' && 'Efectivo'}
                    {state.selectedPayment === 'card' && 'Tarjeta'}
                    {state.selectedPayment === 'transfer' && 'Transferencia'}
                  </p>
                </div>
                <span className="text-lg font-semibold text-gray-900">
                  ${timeSlot.price.toLocaleString('es-AR')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Instrucciones adicionales */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Próximos pasos
          </h4>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• Recibirás un correo electrónico con los detalles de tu reserva</li>
            <li>• Llega 10 minutos antes de la clase</li>
            {state.selectedPayment === 'cash' && (
              <li>• Recuerda traer el pago en efectivo</li>
            )}
            {state.selectedPayment === 'transfer' && (
              <li>• Recibirás los datos bancarios por correo electrónico</li>
            )}
          </ul>
        </div>
      </div>
    </motion.div>
  )
} 