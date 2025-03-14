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
    <div className="w-full py-8 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
            <IconCheck className="w-10 h-10 text-emerald-600" strokeWidth={2} />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold mb-2">¡Reserva completada!</h1>
        
        <p className="text-muted-foreground mb-8">
          {message}
        </p>
        
        {/* Detalles de la clase */}
        {state.selectedClass && (
          <div className="bg-card border border-border rounded-lg p-6 mb-6 text-left">
            <h2 className="text-lg font-semibold mb-4">{state.selectedClass.title}</h2>
            
            {/* Sesiones reservadas */}
            <div className="space-y-4 mb-6">
              {state.selectedClass.sessions
                .filter(session => state.selectedSessions.includes(session.id))
                .map(session => {
                  const { dayName, dayNumber, monthName } = formatSessionDate(session.date)
                  
                  return (
                    <div key={session.id} className="flex justify-between border-b border-border pb-3">
                      <div>
                        <p className="font-medium">{`${dayName} ${dayNumber} de ${monthName}`}</p>
                        <p className="text-sm text-muted-foreground">{`${session.startTime} - ${session.endTime}`}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{`$${session.price.toFixed(2)}`}</p>
                      </div>
                    </div>
                  )
                })}
            </div>
            
            {/* Info del método de pago */}
            <div className="bg-accent/30 p-4 rounded-md mb-4">
              <p className="font-medium">Método de pago: {paymentMethod}</p>
            </div>
            
            {/* IDs de reserva */}
            <div className="bg-accent/10 p-4 rounded-md mt-4">
              <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                <IconTicket size={16} />
                <span className="text-sm font-medium">IDs de reserva:</span>
              </div>
              <div className="space-y-1">
                {state.bookingIds.map((id, index) => (
                  <div key={id} className="text-xs font-mono bg-accent/20 p-2 rounded">
                    Reserva {index + 1}: {id}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Botones */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <motion.button
            onClick={() => goToStep('class')}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className={cn(
              "px-6 py-2.5 rounded-lg",
              "bg-accent/50 hover:bg-accent",
              "text-accent-foreground font-medium",
              "transition-colors"
            )}
          >
            Reservar más clases
          </motion.button>
        </div>
      </div>
    </div>
  )
} 