import { motion } from "framer-motion"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { IconCheck, IconCopy, IconExternalLink } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import type { Court } from "@/lib/data"
import type { TimeSlot, ClassPaymentConfig } from "../../types"
import { useClassLink } from "../../../../hooks/useClassLink"
import { useBranches } from "@/hooks/useBranches"

interface ClassConfirmationStepProps {
  selectedDate?: Date
  selectedCourts: string[]
  courts: Court[]
  className?: string
  visibility: 'public' | 'private'
  isCreated?: boolean
  classId?: string
  timeSlots?: TimeSlot[]
  paymentConfig?: ClassPaymentConfig
  error?: string
}

const paymentMethodLabels: Record<string, string> = {
  pay_at_club: 'Pagar en el club',
  full_payment: 'Pago Completo',
  partial_payment: 'Pago con Seña',
  guarantee: 'Garantía'
}

export function ClassConfirmationStep({
  selectedDate,
  selectedCourts,
  courts,
  className,
  visibility,
  isCreated = false,
  classId,
  timeSlots = [],
  paymentConfig,
  error
}: ClassConfirmationStepProps) {
  const { currentBranch } = useBranches()
  const { classLink, isLoading: isLoadingLink, copyToClipboard } = useClassLink({
    branchId: currentBranch?.id,
    classId
  })

  // Obtener todas las canchas únicas de todos los time slots
  const allCourtIds = Array.from(new Set(
    timeSlots.flatMap(slot => slot.courtIds || [])
  ))

  const renderTimeSlots = () => (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-gray-700">Horarios</h4>
      <div className="space-y-3">
        {timeSlots.map((slot, index) => (
          <div key={index} className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-900">
                Horario {index + 1}
              </span>
              <span className="text-sm text-gray-600">
                {slot.startTime} - {slot.endTime}
              </span>
            </div>
            
            {/* Capacidad */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Capacidad</span>
              <span className="text-sm text-gray-900">{slot.capacity} personas</span>
            </div>

            {/* Precio */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Precio</span>
              <span className="text-sm text-gray-900">${slot.price}</span>
            </div>

            {/* Pistas */}
            {slot.courtIds && slot.courtIds.length > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Pistas</span>
                <span className="text-sm text-gray-900">
                  {slot.courtIds.map((courtId, index) => {
                    const court = courts.find(c => c.id === courtId)
                    return court ? (
                      <span key={courtId}>
                        {court.name}
                        {index < slot.courtIds!.length - 1 ? ', ' : ''}
                      </span>
                    ) : null
                  })}
                </span>
              </div>
            )}

            {/* Profesores */}
            {slot.instructors && slot.instructors.length > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Profesores</span>
                <span className="text-sm text-gray-900">
                  {slot.instructors.join(', ')}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  const renderPaymentMethods = () => {
    if (!paymentConfig?.paymentMethods?.length) return null;

    return (
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700">Métodos de Pago Aceptados</h4>
        <div className="space-y-2">
          {paymentConfig.paymentMethods.map((method) => (
            <div key={method} className="flex items-center space-x-2">
              <IconCheck className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-600">
                {paymentMethodLabels[method] || method}
                {method === 'guarantee' && paymentConfig.guaranteePercentage && 
                  ` (${paymentConfig.guaranteePercentage}%)`
                }
                {method === 'partial_payment' && paymentConfig.partialPaymentPercentage && 
                  ` (${paymentConfig.partialPaymentPercentage}%)`
                }
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderClassDetails = () => (
    <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
      {className && (
        <div className="p-4 flex justify-between items-center">
          <span className="text-sm text-gray-600">Nombre</span>
          <span className="text-sm font-medium text-gray-900">{className}</span>
        </div>
      )}
      {selectedDate && (
        <div className="p-4 flex justify-between items-center">
          <span className="text-sm text-gray-600">Fecha de inicio</span>
          <span className="text-sm font-medium text-gray-900">
            {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
          </span>
        </div>
      )}
      <div className="p-4 flex justify-between items-center">
        <span className="text-sm text-gray-600">Visibilidad</span>
        <span className="text-sm font-medium text-gray-900">
          {visibility === 'public' ? 'Pública' : 'Privada'}
        </span>
      </div>
      {selectedCourts.length > 0 && (
        <div className="p-4 flex justify-between items-center">
          <span className="text-sm text-gray-600">Pistas</span>
          <span className="text-sm font-medium text-gray-900">
            {selectedCourts
              .map(id => courts.find(court => court.id === id)?.name)
              .filter(Boolean)
              .join(', ')}
          </span>
        </div>
      )}
    </div>
  )

  const renderClassLink = () => {
    if (!isCreated || !classLink) return null

    return (
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700">Link de la clase</h4>
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex-1 px-3 py-2",
            "bg-gray-50 rounded-lg",
            "text-sm text-gray-600 font-mono",
            "border border-transparent",
            "hover:border-gray-200 transition-colors duration-200",
            "overflow-x-auto whitespace-nowrap"
          )}>
            <span>{classLink}</span>
          </div>

          <button
            onClick={copyToClipboard}
            className={cn(
              "p-2 rounded-lg shrink-0",
              "bg-gray-50 hover:bg-gray-100",
              "text-gray-600 hover:text-gray-900",
              "transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-gray-200"
            )}
          >
            <IconCopy className="w-4 h-4" />
          </button>

          <a
            href={classLink}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "p-2 rounded-lg shrink-0",
              "bg-gray-50 hover:bg-gray-100",
              "text-gray-600 hover:text-gray-900",
              "transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-gray-200"
            )}
          >
            <IconExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn("space-y-6")}
    >
      {/* Mensaje de éxito */}
      {isCreated && !error && (
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Clase creada exitosamente
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  {classLink && 'Puedes compartir el link de abajo para que tus alumnos se inscriban directamente.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje de error */}
      {error && (
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error al crear la clase
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link de la clase */}
      {renderClassLink()}

      {/* Detalles de la clase */}
      {renderClassDetails()}

      {/* Time slots */}
      {timeSlots.length > 0 && renderTimeSlots()}

      {/* Métodos de pago */}
      {renderPaymentMethods()}
    </motion.div>
  )
} 