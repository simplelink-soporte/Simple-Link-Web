"use client"

import { motion } from 'framer-motion'
import { IconCheck, IconTicket } from '@tabler/icons-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useClassRegistration } from '../context/ClassRegistrationContext'
import type { ClassSession } from '../types/models'
import { useEffect } from 'react'

export function ConfirmationStep() {
  const { state, goToStep } = useClassRegistration()

  // Verificar que hemos llegado aquí después de crear reservas
  useEffect(() => {
    // Si no hay IDs de reserva o el estado no es success, redirigir al paso de resumen
    if (state.bookingIds.length === 0 || state.bookingStatus !== 'success') {
      console.log('No hay reservas confirmadas, redirigiendo a resumen')
      goToStep('summary')
    } else {
      console.log('Reservas confirmadas:', state.bookingIds)
    }
  }, [state.bookingIds, state.bookingStatus, goToStep])

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
      monthName: monthName.charAt(0).toUpperCase() + monthName.slice(1)
    }
  }
  
  // Mensaje según si se usó paquete o no
  const message = state.selectedPackage
    ? `Has reservado tus sesiones usando tu paquete ${state.selectedPackage.title}`
    : 'Has reservado tus sesiones correctamente'

  // Método de pago utilizado
  const paymentMethod = state.selectedPayment ? {
    cash: 'Efectivo',
    card: 'Tarjeta',
    transfer: 'Transferencia'
  }[state.selectedPayment] : 'No especificado'

  return (
    <div className="w-full py-6 px-4">
      <div className="max-w-xl mx-auto">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
            <IconCheck className="w-6 h-6 text-gray-800" strokeWidth={2} />
          </div>
        </div>
        
        <h1 className="text-xl font-semibold mb-2 text-center">¡Reserva completada!</h1>
        
        <p className="text-sm text-muted-foreground mb-5 text-center">
          {message}
        </p>
        
        {/* Detalles de la clase */}
        {state.selectedClass && (
          <div className="bg-card border border-border rounded-lg p-4 mb-4">
            <h2 className="text-md font-medium mb-3">{state.selectedClass.title}</h2>
            
            {/* Sesiones reservadas */}
            <div className="space-y-2 mb-4">
              {state.selectedClass.sessions
                .filter(session => state.selectedSessions.includes(session.id))
                .map(session => {
                  const { dayName, dayNumber, monthName } = formatSessionDate(session.date)
                  
                  return (
                    <div key={session.id} className="flex justify-between border-b border-border pb-2">
                      <div>
                        <p className="text-sm font-medium">{`${dayName} ${dayNumber} de ${monthName}`}</p>
                        <p className="text-xs text-muted-foreground">{`${session.startTime} - ${session.endTime}`}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{`$${session.price.toFixed(2)}`}</p>
                      </div>
                    </div>
                  )
                })}
            </div>
            
            {/* Info del método de pago */}
            <div className="bg-accent/20 p-3 rounded-md mb-3">
              <p className="text-sm">Método de pago: <span className="font-medium">{paymentMethod}</span></p>
            </div>
            
            {/* IDs de reserva */}
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="flex items-center gap-1 mb-1 text-gray-700">
                <IconTicket size={14} />
                <span className="text-xs font-medium">IDs de reserva:</span>
              </div>
              <div className="space-y-1">
                {state.bookingIds.map((id, index) => (
                  <div key={id} className="text-xs font-mono bg-gray-100 p-1.5 rounded">
                    {id}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}