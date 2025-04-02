import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Court } from '@/types/court'
import type { PaymentDetails, TimeSelection } from '@/types/bookings'
import type { Item, RentalSelection } from '@/types/items'
import type { Participant } from '@/types/participant'
import { getCurrencySymbol } from '@/lib/currency-utils'
import { cn } from '@/lib/utils'

interface ConfirmationStepProps {
  selectedDate: Date
  selectedCourts: string[]
  courts: Court[]
  timeSelection?: TimeSelection
  participants?: Participant[]
  rentals: RentalSelection[]
  items: Item[]
  paymentDetails?: PaymentDetails
  country?: string | null
}

export function ConfirmationStep({
  selectedDate,
  selectedCourts,
  courts,
  timeSelection,
  participants,
  rentals,
  paymentDetails,
  items,
  country
}: ConfirmationStepProps) {
  const selectedCourtsInfo = courts.filter(court => selectedCourts.includes(court.id))

  // Función para obtener el nombre del item
  const getItemName = (itemId: string) => {
    const item = items.find(item => item.id === itemId)
    return item?.name || 'Item no encontrado'
  }

  const getCourtPrice = (courtId: string) => {
    const court = courts.find(c => c.id === courtId)
    if (!court) return 0

    // Si hay un precio manual en paymentDetails, lo usamos
    if (paymentDetails?.manualPrice) {
      return paymentDetails.manualPrice
    }

    // Si no hay precio manual, usamos el precio configurado para la duración
    const duration = timeSelection?.duration || 0
    const durationKey = duration.toString()
    const price = court.duration_pricing?.[durationKey]

    return price || 0
  }

  // Calcular el total incluyendo el precio manual si existe
  const calculateTotal = () => {
    const courtPrice = getCourtPrice(selectedCourts[0])
    const rentalsTotal = rentals.reduce((total, rental) => 
      total + (rental.pricePerUnit * rental.quantity), 0
    )
    return courtPrice + rentalsTotal
  }

  return (
    <div className="space-y-6 px-6 py-2">
      {/* Detalles de la reserva */}
      <div>
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-gray-900">
            Detalles de la Reserva
          </h3>
          <p className="text-xs text-gray-500">
            Fecha y horario de la reserva
          </p>
        </div>
        <div className="space-y-3 mt-4">
          {/* Fecha y Hora */}
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-gray-500">Fecha</span>
            <span className="text-xs font-medium text-gray-700">
              {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-gray-500">Horario</span>
            <span className="text-xs font-medium text-gray-700">
              {timeSelection.startTime} - {timeSelection.endTime}
            </span>
          </div>
        </div>
      </div>

      {/* Línea divisora */}
      <div className="flex justify-center">
        <div className="w-16 h-px bg-gray-200/75" />
      </div>

      {/* Canchas */}
      <div>
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-gray-900">
            Canchas Seleccionadas
          </h3>
          <p className="text-xs text-gray-500">
            Canchas reservadas y sus precios
          </p>
        </div>
        <div className="space-y-2 mt-4">
          {selectedCourtsInfo.map(court => (
            <div key={court.id} className="flex justify-between items-center">
              <span className="text-xs text-gray-600">{court.name}</span>
              <span className="text-xs font-medium text-gray-900">
                {getCourtPrice(court.id)}{getCurrencySymbol(country)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Línea divisora */}
      <div className="flex justify-center">
        <div className="w-16 h-px bg-gray-200/75" />
      </div>

      {/* Participantes */}
      {participants && participants.length > 0 && (
        <div>
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-gray-900">
              Participantes
            </h3>
            <p className="text-xs text-gray-500">
              Jugadores registrados en la reserva
            </p>
          </div>
          <div className="space-y-2 mt-4">
            {participants.map(participant => (
              <div key={participant.id} className="flex justify-between items-center">
                <span className="text-xs text-gray-600">
                  {participant.fullName || `${participant.name} ${participant.lastName || ''}`}
                </span>
                <span className="text-xs text-gray-500 capitalize">{participant.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Línea divisora */}
      {rentals.length > 0 && (
        <div className="flex justify-center">
          <div className="w-16 h-px bg-gray-200/75" />
        </div>
      )}

      {/* Rentals */}
      {rentals.length > 0 && (
        <div>
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-gray-900">
              Equipamiento
            </h3>
            <p className="text-xs text-gray-500">
              Artículos adicionales reservados
            </p>
          </div>
          <div className="space-y-2 mt-4">
            {rentals.map(rental => (
              <div key={rental.itemId} className="flex justify-between items-center">
                <span className="text-xs text-gray-600">
                  {getItemName(rental.itemId)} x{rental.quantity}
                </span>
                <span className="text-xs font-medium text-gray-900">
                  {(rental.pricePerUnit * rental.quantity).toFixed(2)}{getCurrencySymbol(country)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Línea divisora */}
      <div className="flex justify-center">
        <div className="w-16 h-px bg-gray-200/75" />
      </div>

      {/* Detalles de Pago */}
      <div>
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-gray-900">
            Detalles de Pago
          </h3>
          <p className="text-xs text-gray-500">
            Resumen de costos y estado del pago
          </p>
        </div>
        <div className="space-y-3 mt-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">Estado</span>
            <div className="text-right">
              <p className="text-xs font-medium text-gray-900">
                {paymentDetails?.paymentStatus === 'completed' ? 'Pago Completo' :
                 paymentDetails?.paymentStatus === 'partial' ? 'Seña / Anticipo' :
                 'Reserva Simple'}
              </p>
              {paymentDetails?.paymentStatus !== 'pending' && (
                <p className="text-xs text-gray-500 capitalize">
                  {paymentDetails?.paymentMethod}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Cancha</span>
              <span className="text-xs font-medium">{paymentDetails?.courtPrice}{getCurrencySymbol(country)}</span>
            </div>
            {rentals.length > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Equipamiento</span>
                <span className="text-xs font-medium">{paymentDetails?.rentalItemsPrice}{getCurrencySymbol(country)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-900">Total</span>
                <span className="text-xs font-medium text-gray-900">{calculateTotal()}{getCurrencySymbol(country)}</span>
              </div>
              {paymentDetails?.paymentStatus === 'partial' && (
                <>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-600">Seña</span>
                    <span className="text-xs font-medium">{paymentDetails?.deposit}{getCurrencySymbol(country)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Pendiente</span>
                    <span className="text-xs font-medium text-amber-600">
                      {calculateTotal() - (paymentDetails?.deposit || 0)}{getCurrencySymbol(country)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 