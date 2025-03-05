import { IconX, IconUsers, IconTrash, IconCreditCard } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface GuestInfo {
  fullName: string
  dni: string
  email?: string
}

interface PaymentDetails {
  paymentStatus: 'completed' | 'partial' | 'pending'
  paymentMethod: 'cash' | 'card' | 'transfer'
  totalAmount: number
  deposit?: number
}

interface ClassDescriptionModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
  guests?: GuestInfo[]
  type: 'class' | 'shift'
  onCancelBooking?: () => void
  payment?: PaymentDetails
  onUpdatePayment?: (payment: PaymentDetails) => void
}

export function ClassDescriptionModal({
  isOpen,
  onClose,
  title,
  description,
  guests,
  type,
  onCancelBooking,
  payment,
  onUpdatePayment
}: ClassDescriptionModalProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 10000 }}
      onClick={onClose}
    >
      <div 
        className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
        aria-hidden="true"
      />
      
      <div
        className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 animate-in fade-in zoom-in-95 duration-200"
        style={{
          position: 'relative',
          maxHeight: 'calc(100vh - 2rem)',
          overflow: 'auto'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>
        
        {showCancelConfirm ? (
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-50 rounded-full">
                <IconTrash className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">
                  ¿Confirmar cancelación?
                </h4>
                <p className="mt-1 text-sm text-gray-500">
                  Esta acción cancelará {type === 'class' ? 'la clase' : 'el turno'} y notificará a todos los participantes.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                Volver
              </button>
              <button
                onClick={() => {
                  onCancelBooking?.()
                  onClose()
                }}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Confirmar Cancelación
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="p-6 space-y-6">
              {payment && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <IconCreditCard className="w-4 h-4 text-gray-500" />
                      <h4 className="text-sm font-medium text-gray-900">Resumen de Pago</h4>
                    </div>
                    <span className={cn(
                      "px-2 py-1 text-xs font-medium rounded-full",
                      payment.paymentStatus === 'completed' 
                        ? "bg-green-100 text-green-700"
                        : payment.paymentStatus === 'partial'
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-700"
                    )}>
                      {payment.paymentStatus === 'completed' 
                        ? 'Pago Completo'
                        : payment.paymentStatus === 'partial'
                        ? 'Seña Pagada'
                        : 'Pendiente'
                      }
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Método de pago</span>
                      <span className="font-medium text-gray-900">
                        {payment.paymentMethod === 'cash' ? 'Efectivo' :
                         payment.paymentMethod === 'card' ? 'Tarjeta' :
                         payment.paymentMethod === 'transfer' ? 'Transferencia' : '-'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Monto total</span>
                      <span className="font-medium text-gray-900">
                        ${payment.totalAmount.toLocaleString()}
                      </span>
                    </div>

                    {payment.paymentStatus === 'partial' && payment.deposit && (
                      <>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Seña pagada</span>
                          <span className="font-medium text-gray-900">
                            ${payment.deposit.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Restante</span>
                          <span className="font-medium text-gray-900">
                            ${(payment.totalAmount - payment.deposit).toLocaleString()}
                          </span>
                        </div>
                        
                        <button
                          onClick={() => onUpdatePayment?.({
                            ...payment,
                            paymentStatus: 'completed'
                          })}
                          className="w-full mt-2 px-3 py-2 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-md transition-colors flex items-center justify-center gap-2"
                        >
                          <IconCreditCard className="w-4 h-4" />
                          Marcar como Pago Completo
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {description && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Descripción</h4>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {description}
                  </p>
                </div>
              )}
              
              {guests && guests.length > 0 && (
                <div className={cn(!description && "pt-0")}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <IconUsers className="w-4 h-4 text-gray-500" />
                      <h4 className="text-sm font-medium text-gray-900">
                        {type === 'class' ? 'Participantes' : 'Jugadores'}
                      </h4>
                    </div>
                    <span className="text-xs text-gray-500">
                      {guests.length} {guests.length === 1 ? 'participante' : 'participantes'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {guests.map((guest, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">
                            {guest.fullName}
                          </span>
                          <span className="text-xs text-gray-500">
                            DNI: {guest.dni}
                          </span>
                          {guest.email && (
                            <span className="text-xs text-gray-500">
                              {guest.email}
                            </span>
                          )}
                        </div>
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {guest.fullName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!description && !guests?.length && !payment && (
                <div className="text-center text-gray-500">
                  No hay información adicional disponible
                </div>
              )}
            </div>

            <div className="flex justify-between items-center p-6 pt-2 border-t">
              {onCancelBooking && (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors flex items-center gap-1.5"
                >
                  <IconTrash className="w-4 h-4" />
                  <span>Cancelar {type === 'class' ? 'Clase' : 'Turno'}</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors ml-auto"
              >
                Cerrar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
} 