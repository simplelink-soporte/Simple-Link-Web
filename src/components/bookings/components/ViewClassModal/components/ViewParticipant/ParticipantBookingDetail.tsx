import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { IconArrowLeft, IconCalendar, IconCircleCheck, IconCreditCard, IconCurrencyDollar, IconUserCancel, IconEdit } from '@tabler/icons-react'
import type { ClassParticipant } from '@/services/classParticipantService'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { PaymentDetailsStep } from '../AddParticipant/PaymentDetailsStep'
import { createSupabaseClient } from '@/lib/supabase'
import { toast } from '@/components/ui/use-toast'
import type { PaymentMethodEnum, PaymentStatusEnum } from '@/types/bookings'

interface ParticipantBookingDetailProps {
  participant: ClassParticipant | null
  onBack: () => void
  classStatus?: string // Estado de la clase (active, completed, cancelled)
}

export function ParticipantBookingDetail({ 
  participant, 
  onBack,
  classStatus = 'active' // Valor por defecto
}: ParticipantBookingDetailProps) {
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createSupabaseClient();
  
  if (!participant) {
    return null
  }

  // Verificar si está inhabilitada la edición basado en el estado de la clase
  const isEditingDisabled = classStatus === 'completed' || classStatus === 'cancelled';

  // Función helper para formatear moneda
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return '0,00 €'
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount)
  }

  // Función para obtener el estado de pago en español
  const getPaymentStatusText = (status?: string) => {
    switch (status) {
      case 'pending': return 'Pendiente'
      case 'partial': return 'Parcial'
      case 'completed': return 'Completado'
      case 'cancelled': return 'Cancelado'
      default: return 'Desconocido'
    }
  }

  // Función para obtener el método de pago en español
  const getPaymentMethodText = (method?: string) => {
    switch (method) {
      case 'cash': return 'Efectivo'
      case 'card': return 'Tarjeta'
      case 'transfer': return 'Transferencia'
      case 'stripe': return 'Stripe'
      default: return 'Desconocido'
    }
  }

  // Función para obtener el color de la insignia según el estado
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-50 text-yellow-800 border-yellow-300'
      case 'partial': return 'bg-blue-50 text-blue-800 border-blue-300'
      case 'completed': return 'bg-green-50 text-green-800 border-green-300'
      case 'cancelled': return 'bg-red-50 text-red-800 border-red-300'
      default: return 'bg-gray-50 text-gray-800 border-gray-300'
    }
  }

  // Función para actualizar el estado de pago en Supabase
  const updatePaymentStatus = async (
    paymentDetails: {
      paymentMethod: PaymentMethodEnum;
      paymentStatus: PaymentStatusEnum;
      depositAmount?: number;
    }
  ) => {
    if (!participant.bookingDetails?.id) {
      toast({
        title: "Error",
        description: "ID de reserva no disponible",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // En lugar de llamar a una función RPC, actualizamos directamente la tabla bookings
      const { data, error } = await supabase
        .from('bookings')
        .update({
          payment_status: paymentDetails.paymentStatus,
          payment_method: paymentDetails.paymentMethod,
          deposit_amount: paymentDetails.depositAmount || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', participant.bookingDetails.id);

      if (error) {
        console.error('Error al actualizar el estado de pago:', error);
        toast({
          title: "Error",
          description: `No se pudo actualizar el estado de pago: ${error.message}`,
          variant: "destructive"
        });
        return;
      }

      // Actualizar los detalles de la reserva en el estado local
      if (participant.bookingDetails) {
        participant.bookingDetails = {
          ...participant.bookingDetails,
          payment_status: paymentDetails.paymentStatus,
          payment_method: paymentDetails.paymentMethod,
          deposit_amount: paymentDetails.depositAmount || participant.bookingDetails.deposit_amount
        };
      }

      // Agregar registro en la tabla de pagos para mantener el historial
      await supabase
        .from('payments')
        .insert({
          booking_id: participant.bookingDetails.id,
          payment_method: paymentDetails.paymentMethod,
          payment_status: paymentDetails.paymentStatus,
          deposit_amount: paymentDetails.depositAmount || 0,
          total_price: participant.bookingDetails.total_price,
          notes: `Actualización de estado de pago a ${paymentDetails.paymentStatus}`
        });

      // Mostrar un mensaje de éxito
      toast({
        title: "Estado de pago actualizado",
        description: "La reserva ha sido actualizada correctamente",
        variant: "default"
      });

      // Cerrar el formulario de edición
      setIsEditingPayment(false);
    } catch (err) {
      console.error('Error inesperado:', err);
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado al procesar la solicitud",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className="space-y-5"
    >
      {/* Header con botón de regreso */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-xs"
        >
          <IconArrowLeft size={14} />
          <span>Volver a lista</span>
        </button>
        
        <h3 className="text-sm font-medium text-gray-900">
          Detalles de reserva
        </h3>
      </div>

      {/* Información del participante */}
      <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
        <div className="flex items-center space-x-3 mb-3">
          <div className="h-10 w-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
            <span className="text-sm font-medium text-blue-700">
              {participant.fullName?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">
              {participant.fullName}
            </h3>
            <p className="text-xs text-gray-500">
              {participant.email || 'Sin email'}
              {participant.phone && ` • ${participant.phone}`}
            </p>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs font-medium text-gray-700">Rol del participante</span>
          <Badge variant="outline" className="ml-2 text-xs">
            {participant.role === 'player' ? 'Jugador' : 'Invitado'}
          </Badge>
        </div>
      </div>

      {/* Detalles de la reserva */}
      {participant.bookingDetails ? (
        <>
          {isEditingPayment ? (
            // Formulario de edición de estado de pago usando PaymentDetailsStep
            <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
              <div className="bg-blue-50 p-3 rounded-md mb-4 text-xs text-blue-700">
                <p className="font-medium">Actualizando estado de pago</p>
                <p>Reserva #{participant.bookingDetails.id.slice(0, 8)}</p>
              </div>
              
              <PaymentDetailsStep
                onConfirm={updatePaymentStatus}
                onBack={() => setIsEditingPayment(false)}
                sessionPrice={participant.bookingDetails.total_price}
                isLoading={isLoading}
                initialPaymentMethod={participant.bookingDetails.payment_method as PaymentMethodEnum}
                initialPaymentStatus={participant.bookingDetails.payment_status as PaymentStatusEnum}
                initialDepositAmount={participant.bookingDetails.deposit_amount}
              />
            </div>
          ) : (
            // Vista normal de detalles de reserva
            <div className="bg-white border border-gray-100 rounded-lg overflow-hidden shadow-sm">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    Información de la reserva
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    #{participant.bookingId?.slice(0, 8)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditingPayment(true)}
                  className={cn("h-8 w-8", {
                    "opacity-50 cursor-not-allowed": isEditingDisabled
                  })}
                  disabled={isEditingDisabled}
                  title={isEditingDisabled ? "No se puede editar una reserva de clase finalizada o cancelada" : "Editar detalles de pago"}
                >
                  <IconEdit size={16} className="text-gray-500" />
                </Button>
              </div>
              
              {isEditingDisabled && (
                <div className="absolute top-14 right-4 left-4 bg-gray-50 border border-gray-200 rounded-md p-2 text-xs text-gray-500 text-center shadow-sm">
                  No se puede editar una reserva de {classStatus === 'completed' ? 'clase finalizada' : 'clase cancelada'}
                </div>
              )}
              
              <div className="p-4 space-y-4">
                {/* Estado del pago */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconCircleCheck size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-600">Estado del pago</span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      getStatusColor(participant.bookingDetails.payment_status)
                    )}
                  >
                    {getPaymentStatusText(participant.bookingDetails.payment_status)}
                  </Badge>
                </div>
                
                {/* Método de pago */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconCreditCard size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-600">Método de pago</span>
                  </div>
                  <span className="text-sm text-gray-900">
                    {getPaymentMethodText(participant.bookingDetails.payment_method)}
                  </span>
                </div>
                
                {/* Fecha de la reserva */}
                {participant.bookingDetails.date && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <IconCalendar size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-600">Fecha de reserva</span>
                    </div>
                    <span className="text-sm text-gray-900">
                      {format(new Date(participant.bookingDetails.date), "dd 'de' MMMM, yyyy", { locale: es })}
                    </span>
                  </div>
                )}
                
                {/* Precios */}
                <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                  {participant.bookingDetails.deposit_amount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Depósito pagado</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(participant.bookingDetails.deposit_amount)}
                      </span>
                    </div>
                  )}
                  
                  {participant.bookingDetails.court_price > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Precio de la pista</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(participant.bookingDetails.court_price)}
                      </span>
                    </div>
                  )}
                  
                  {participant.bookingDetails.class_session_price > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Precio de la clase</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(participant.bookingDetails.class_session_price)}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-sm font-medium text-gray-700">Total</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(participant.bookingDetails.total_price)}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Estado de cancelación */}
              {participant.bookingDetails.cancelled_at && (
                <div className="mt-2 p-3 bg-red-50 border-t border-red-100">
                  <div className="flex items-start gap-2">
                    <IconUserCancel size={16} className="text-red-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-700">Reserva cancelada</p>
                      <p className="text-xs text-red-600 mt-0.5">
                        {participant.bookingDetails.cancellation_reason || 'Sin motivo especificado'}
                      </p>
                      <p className="text-xs text-red-500 mt-1">
                        {format(new Date(participant.bookingDetails.cancelled_at), "dd 'de' MMMM, yyyy • HH:mm", { locale: es })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-lg text-yellow-700 text-sm">
          No se pudieron cargar los detalles de la reserva.
        </div>
      )}
    </motion.div>
  )
} 