import { useEffect, useState, useMemo, useCallback } from 'react'
import type { PaymentDetails } from '@/types/bookings'
import { Button } from '@/components/ui/button'
import { IconClock, IconCreditCard, IconAlertCircle } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { useCourts } from '@/hooks/useCourts'
import { useItems } from '@/hooks/useItems'
import { useBranchContext } from '@/contexts/BranchContext'
import { timeToMinutes } from '@/lib/time-utils'
import type { Court } from '@/types/court'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRentalContext } from '@/contexts/RentalContext'
import { PaymentMethodEnum, PaymentStatusEnum, PaymentTypeEnum } from '@/types/bookings'
import type { RentalSelection } from '@/types/items'

interface PaymentStepProps {
  selectedCourts: string[]
  startTime: string
  endTime: string
  onPaymentChange: (details: PaymentDetails) => void
  onNext: () => void
  onBack: () => void
}

export function PaymentStep({ 
  selectedCourts,
  startTime,
  endTime,
  onPaymentChange,
  onNext,
  onBack
}: PaymentStepProps) {
  const { currentBranch } = useBranchContext()
  const { rentals, totalPrice: rentalsPriceTotal } = useRentalContext()
  const { data: courts = [] } = useCourts({ branchId: currentBranch?.id })
  const { data: items = [] } = useItems(currentBranch?.id)
  const [manualPrice, setManualPrice] = useState<number | null>(null)
  const [showCustomPriceInput, setShowCustomPriceInput] = useState(false)
  const [paymentState, setPaymentState] = useState<PaymentDetails>(() => ({
    totalAmount: 0,
    deposit: 0,
    paymentStatus: 'completed',
    paymentMethod: 'cash',
    isPaid: false
  }))
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodEnum>('cash')

  // Calcular la duración de la reserva en minutos con validación
  const reservationDuration = useMemo(() => {
    if (!startTime || !endTime) return 0
    try {
      const startMinutes = timeToMinutes(startTime)
      const endMinutes = timeToMinutes(endTime)
      return endMinutes - startMinutes
    } catch (error) {
      console.error('Error calculando la duración:', error)
      return 0
    }
  }, [startTime, endTime])

  // Calcular el precio total de las canchas
  const courtsPriceTotal = useMemo(() => {
    if (!courts || selectedCourts.length === 0) return 0
    const durationInMinutes = reservationDuration

    return selectedCourts.reduce((total, courtId) => {
      const court = courts.find((court: Court) => court.id === courtId)
      if (!court) return total

      // Si hay un precio manual y no hay precio configurado, usar el manual
      if (manualPrice !== null && !court.duration_pricing?.[durationInMinutes.toString()]) {
        return total + manualPrice
      }

      // Si hay precio configurado, usarlo
      const configuredPrice = court.duration_pricing?.[durationInMinutes.toString()]
      if (configuredPrice !== undefined) {
        return total + configuredPrice
      }

      return total
    }, 0)
  }, [courts, selectedCourts, reservationDuration, manualPrice])

  // Verificar si la duración tiene precio configurado
  useEffect(() => {
    const hasPriceConfigured = selectedCourts.every(courtId => {
      const court = courts.find((court: Court) => court.id === courtId)
      if (!court?.duration_pricing) return false
      return court.duration_pricing[reservationDuration.toString()] !== undefined
    })

    setShowCustomPriceInput(!hasPriceConfigured)
    if (hasPriceConfigured) {
      setManualPrice(null)
    }
  }, [courts, selectedCourts, reservationDuration])

  // Manejar cambio de precio manual
  const handleManualPriceChange = useCallback((value: number | null) => {
    setManualPrice(value)
    
    // Calcular el nuevo total incluyendo rentals
    const newTotal = (value || 0) + rentalsPriceTotal
    
    // Mantener el depósito actual si es válido
    let newDeposit = paymentState.deposit
    
    // Ajustar el depósito solo si es necesario
    if (paymentState.paymentStatus === 'completed') {
      newDeposit = newTotal
    } else if (paymentState.paymentStatus === 'partial') {
      if (newDeposit === 0 || newDeposit > newTotal) {
        newDeposit = Math.ceil(newTotal * 0.3)
      } else {
        // Mantener la proporción actual del depósito
        const ratio = paymentState.deposit / paymentState.totalAmount
        newDeposit = Math.min(Math.round(newTotal * ratio * 100) / 100, newTotal)
      }
    }

    const newState: PaymentDetails = {
      ...paymentState,
      totalAmount: newTotal,
      deposit: newDeposit,
      manualPrice: value || undefined,
      courtPrice: value || 0
    }

    console.log('Actualizando estado con precio manual:', {
      manualPrice: value,
      newTotal,
      currentDeposit: paymentState.deposit,
      newDeposit,
      newState
    })

    setPaymentState(newState)
    onPaymentChange(newState)
  }, [rentalsPriceTotal, paymentState, onPaymentChange])

  // Efecto para actualizar el estado cuando cambian los montos o el precio manual
  useEffect(() => {
    const effectiveCourtPrice = manualPrice !== null ? manualPrice : courtsPriceTotal
    const newTotal = effectiveCourtPrice + rentalsPriceTotal

    console.log('Calculando nuevo total en PaymentStep:', {
      effectiveCourtPrice,
      rentalsPriceTotal,
      newTotal,
      manualPrice,
      currentTotal: paymentState.totalAmount,
      currentDeposit: paymentState.deposit,
      currentStatus: paymentState.paymentStatus,
      rentals
    })

    if (newTotal > 0 && Math.abs(newTotal - paymentState.totalAmount) > 0.01) {
      let newDeposit = paymentState.deposit
      const depositRatio = paymentState.deposit / paymentState.totalAmount

      if (paymentState.paymentStatus === 'completed') {
        newDeposit = newTotal
      } else if (paymentState.deposit === 0) {
        newDeposit = paymentState.paymentStatus === 'partial' ? Math.ceil(newTotal * 0.3) : 0
      } else if (depositRatio > 0) {
        newDeposit = Math.min(Math.round(newTotal * depositRatio * 100) / 100, newTotal)
      }

      const newState = {
        ...paymentState,
        totalAmount: newTotal,
        deposit: newDeposit,
        manualPrice: manualPrice !== null ? manualPrice : undefined,
        courtPrice: effectiveCourtPrice,
        rentalItemsPrice: rentalsPriceTotal
      }
      
      setPaymentState(newState)
      onPaymentChange(newState)
    }
  }, [courtsPriceTotal, rentalsPriceTotal, manualPrice, rentals])

  // Mover el renderCustomPriceInput después del método de pago y aplicar los estilos necesarios
  const renderCustomPriceInput = () => {
    // No mostrar el campo si es una reserva simple o si hay precio configurado
    if (!showCustomPriceInput || paymentState.paymentStatus === 'pending') return null;

    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        className="space-y-4"
      >
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-gray-900">
            Precio personalizado
          </h3>
          <p className="text-xs text-gray-500">
            Ingresa el precio para una reserva de {reservationDuration} minutos
          </p>
        </div>

        <div className="bg-amber-50/30 border border-amber-200/50 rounded-lg p-2.5 mb-4 flex items-center gap-2">
          <IconAlertCircle className="h-4 w-4 text-amber-500/70" stroke={1.5} />
          <p className="text-sm text-amber-600/80 font-light tracking-wide">
            Ingresa un precio para la reserva
          </p>
        </div>

        <input
          type="number"
          min="0"
          step="0.01"
          value={manualPrice || ''}
          onChange={(e) => {
            const value = parseFloat(e.target.value);
            handleManualPriceChange(isNaN(value) ? null : value);
          }}
          placeholder="Ingrese el precio"
          className={cn(
            "w-full px-3 py-1.5",
            "text-sm text-gray-900 placeholder:text-gray-400",
            "bg-transparent",
            "rounded-lg",
            "border border-gray-200/75",
            "focus:outline-none focus:border-gray-300",
            "transition-all duration-200"
          )}
        />
      </motion.div>
    );
  };

  // Función para actualizar el estado de pago
  const handlePaymentTypeChange = (type: 'completed' | 'partial' | 'pending') => {
    const total = calculateTotalAmount()
    let newDeposit = 0

    // Si cambiamos a reserva simple, resetear el precio manual
    if (type === 'pending') {
      setManualPrice(null)
    }

    if (type === 'completed') {
      newDeposit = total
    } else if (type === 'partial') {
      // Si ya hay un depósito válido, mantenerlo
      if (paymentState.deposit > 0 && paymentState.deposit < total) {
        newDeposit = paymentState.deposit
      } else {
        newDeposit = Math.ceil(total * 0.3)
      }
    }

    const newState: PaymentDetails = {
      ...paymentState,
      totalAmount: total,
      paymentStatus: type,
      deposit: newDeposit,
      isPaid: false,
      // Resetear el precio manual si es reserva simple
      manualPrice: type === 'pending' ? undefined : (manualPrice || undefined),
      courtPrice: type === 'pending' ? courtsPriceTotal : (manualPrice || courtsPriceTotal)
    }

    console.log('Actualizando tipo de pago:', {
      type,
      total,
      newDeposit,
      manualPrice,
      newState
    })

    setPaymentState(newState)
    onPaymentChange(newState)
  }

  // Manejador para cambio de depósito
  const handleDepositChange = (value: number) => {
    const total = calculateTotalAmount()
    
    // Permitir cualquier valor, solo limitado por el total
    const newDeposit = Math.min(value, total)
    
    // Determinar el estado de pago basado en el depósito
    let newPaymentStatus = paymentState.paymentStatus
    if (Math.abs(newDeposit - total) < 0.01) {
      newPaymentStatus = 'completed'
    } else if (newDeposit > 0) {
      newPaymentStatus = 'partial'
    } else {
      newPaymentStatus = 'pending'
    }
    
    const newState: PaymentDetails = {
      ...paymentState,
      totalAmount: total,
      deposit: newDeposit,
      paymentStatus: newPaymentStatus,
      isPaid: false,
      manualPrice: manualPrice || undefined,
      courtPrice: manualPrice || courtsPriceTotal
    }

    console.log('Actualizando depósito manualmente:', {
      value,
      newDeposit,
      total,
      manualPrice,
      oldState: paymentState,
      newState
    })

    setPaymentState(newState)
    onPaymentChange(newState)
  }

  const calculateTotalAmount = useCallback(() => {
    // Si hay un precio manual, usarlo directamente
    if (manualPrice !== null) {
      return manualPrice + rentalsPriceTotal
    }

    // Si no hay precio manual, calcular basado en la duración
    try {
      if (!selectedCourts.length) return 0;

      // Calcular duración en minutos
      const startMinutes = timeToMinutes(startTime)
      const endMinutes = timeToMinutes(endTime)
      const duration = endMinutes - startMinutes

      // Calcular precio de las canchas
      const courtPrice = selectedCourts.reduce((total, courtId) => {
        const court = courts.find((court: Court) => court.id === courtId)
        if (!court?.duration_pricing) return total

        const durationKey = duration.toString()
        const price = Number(court.duration_pricing[durationKey] || 0)
        return total + price
      }, 0)

      return courtPrice + rentalsPriceTotal
    } catch (error) {
      console.error('Error al calcular total:', error)
      return 0
    }
  }, [selectedCourts, courts, startTime, endTime, manualPrice, rentalsPriceTotal])

  // Efecto para mantener sincronizado el estado con el total calculado
  useEffect(() => {
    const total = calculateTotalAmount()
    if (total > 0 && total !== paymentState.totalAmount) {
      const newState = {
        ...paymentState,
        totalAmount: total,
        // Mantener el depósito actual si existe, sino usar el total para completed
        deposit: paymentState.paymentStatus === 'completed' ? total : 
                paymentState.deposit || 0
      }
      
      console.log('Sincronizando estado con nuevo total:', {
        total,
        oldState: paymentState,
        newState
      })

      setPaymentState(newState)
      onPaymentChange(newState)
    }
  }, [calculateTotalAmount, paymentState.paymentStatus])

  useEffect(() => {
    // Determinar el tipo de pago basado en el estado
    const paymentType = paymentState.paymentStatus === 'completed' ? 'booking' :
                       paymentState.paymentStatus === 'partial' ? 'deposit' :
                       'booking';

    onPaymentChange({
      totalAmount: calculateTotalAmount(),
      deposit: calculateDeposit(),
      paymentStatus: paymentState.paymentStatus,
      paymentMethod: paymentState.paymentMethod,
      paymentType,
      isPaid: paymentState.paymentStatus === 'completed',
      manualPrice: manualPrice || undefined
    })
  }, [paymentState.paymentStatus, paymentState.paymentMethod, manualPrice])

  const calculateDeposit = () => {
    const total = calculateTotalAmount()
    return paymentState.paymentStatus === 'completed' ? total :
           paymentState.paymentStatus === 'partial' ? total * 0.3 :
           0
  }

  return (
    <div className="space-y-6">
      {/* Opciones de Pago */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-gray-900">
            Tipo de pago
          </h3>
          <p className="text-xs text-gray-500">
            Selecciona el tipo de pago para esta reserva
          </p>
        </div>

        <div className="grid gap-2">
          {[
            {
              id: 'pending' as const,
              title: 'Reserva Simple',
              description: 'Sin registro de pago o seña',
              icon: <IconClock className="h-4 w-4 text-gray-600/80" strokeWidth={1.5} />
            },
            {
              id: 'partial' as const,
              title: 'Seña / Anticipo',
              description: 'Registrar pago parcial',
              icon: <IconCreditCard className="h-4 w-4 text-amber-600/80" strokeWidth={1.5} />
            },
            {
              id: 'completed' as const,
              title: 'Pago Completo',
              description: 'Registrar pago total',
              icon: <IconCreditCard className="h-4 w-4 text-green-600/80" strokeWidth={1.5} />
            }
          ].map((option, index) => (
            <motion.button
              key={option.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: 1, 
                y: 0,
                transition: {
                  duration: 0.4,
                  delay: index * 0.1,
                  ease: [0.21, 0.68, 0.47, 0.98]
                }
              }}
              onClick={() => handlePaymentTypeChange(option.id)}
              className={cn(
                "relative flex items-center gap-3 p-3 w-full",
                "rounded-lg border text-left transition-all duration-200",
                paymentState.paymentStatus === option.id
                  ? [
                      "border-gray-300 bg-gray-50",
                      "hover:bg-gray-50/80"
                    ]
                  : [
                      "border-gray-200/75 bg-transparent",
                      "hover:border-gray-300",
                      "hover:bg-gray-50/50"
                    ]
              )}
            >
              {option.icon}
              <div className="flex-1">
                <p className={cn(
                  "text-sm font-medium",
                  paymentState.paymentStatus === option.id
                    ? "text-gray-900"
                    : "text-gray-700"
                )}>
                  {option.title}
                </p>
                <p className={cn(
                  "text-xs",
                  paymentState.paymentStatus === option.id
                    ? "text-gray-600"
                    : "text-gray-500"
                )}>
                  {option.description}
                </p>
              </div>
            </motion.button>
          ))}
        </div>

        {paymentState.paymentStatus === 'partial' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-2"
          >
            <label className="text-sm font-medium text-gray-700">
              Monto de la Seña
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={paymentState.deposit || ''}
              onChange={(e) => {
                const value = e.target.value === '' ? 0 : Number(e.target.value);
                if (!isNaN(value)) {
                  handleDepositChange(value);
                }
              }}
              className={cn(
                "w-full px-3 py-2",
                "rounded-lg",
                "border border-gray-200",
                "focus:outline-none focus:ring-2 focus:ring-gray-200",
                "transition-all duration-200",
                "text-sm",
                "[appearance:textfield]",
                "[&::-webkit-outer-spin-button]:appearance-none",
                "[&::-webkit-inner-spin-button]:appearance-none"
              )}
              placeholder="Ingrese el monto de la seña"
            />
          </motion.div>
        )}

        {/* Método de Pago si no es reserva simple */}
        {paymentState.paymentStatus !== 'pending' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4"
          >
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-gray-900">
                Método de pago
              </h3>
              <p className="text-xs text-gray-500">
                Selecciona el método de pago para esta reserva
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'cash' as const, label: 'Efectivo' },
                { id: 'card' as const, label: 'Stripe' },
                { id: 'transfer' as const, label: 'Transferencia' }
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => {
                    setPaymentMethod(id)
                    const newState: PaymentDetails = {
                      ...paymentState,
                      paymentMethod: id === 'card' ? 'stripe' : id as 'cash' | 'transfer' | 'stripe',
                      isPaid: false
                    }
                    setPaymentState(newState)
                    onPaymentChange(newState)
                  }}
                  className={cn(
                    "relative h-9 rounded-lg text-sm transition-all duration-200",
                    "border",
                    "w-full px-2",
                    paymentMethod === id
                      ? [
                          "border-gray-300 bg-gray-50",
                          "text-gray-900 font-medium"
                        ]
                      : [
                          "border-gray-200/75 bg-transparent",
                          "text-gray-600 hover:text-gray-900",
                          "hover:border-gray-300 hover:bg-gray-50/50"
                        ]
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {renderCustomPriceInput()}
      </div>

      {/* Resumen de pago */}
      {paymentState.paymentStatus !== 'pending' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-6 space-y-4"
        >
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-gray-900">
              Resumen de pago
            </h3>
            <p className="text-xs text-gray-500">
              Detalles del costo de la reserva
            </p>
          </div>

          {/* Resumen de costos */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Cancha</span>
              <span className="text-sm text-gray-900">{courtsPriceTotal}€</span>
            </div>
            {rentals.length > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Equipamiento</span>
                <span className="text-sm text-gray-900">{rentalsPriceTotal}€</span>
              </div>
            )}
            <div className="pt-2.5 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-900">Total</span>
                <span className="text-sm font-medium text-gray-900">{calculateTotalAmount()}€</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
} 