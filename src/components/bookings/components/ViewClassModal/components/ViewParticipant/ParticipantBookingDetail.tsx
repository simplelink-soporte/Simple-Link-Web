import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { IconArrowLeft, IconCalendar, IconCircleCheck, IconCreditCard, IconCurrencyDollar, IconUserCancel, IconEdit, IconShieldCheck, IconX } from '@tabler/icons-react'
import type { ClassParticipant } from '@/services/classParticipantService'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { PaymentDetailsStep } from '../AddParticipant/PaymentDetailsStep'
import { createSupabaseClient } from '@/lib/supabase'
import { toast } from '@/components/ui/use-toast'
import type { PaymentMethodEnum, PaymentStatusEnum } from '@/types/bookings'
import { CancelBookingModal } from '@/components/bookings/components/CancelBookingModal/CancelBookingModal'

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
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const supabase = createSupabaseClient();
  
  if (!participant) {
    return null
  }

  // Verificar si está inhabilitada la edición basado en el estado de la clase
  const isEditingDisabled = classStatus === 'completed' || classStatus === 'cancelled';

  // Verificar si la reserva puede ser cancelada
  const canBeCancelled = 
    participant.bookingDetails?.payment_status !== 'completed' && 
    participant.bookingDetails?.payment_status !== 'cancelled' &&
    !participant.bookingDetails?.cancelled_at &&
    classStatus !== 'completed' &&
    classStatus !== 'cancelled';

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

  // Función para verificar si una reserva tiene garantía
  const hasGuarantee = () => {
    return participant.bookingDetails?.payment_type === 'guarantee';
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

  // Manejar la confirmación de cancelación
  const handleCancelBookingConfirm = ({ reason, shouldCharge }: { reason?: string; shouldCharge?: boolean }) => {
    // Actualizar la UI para reflejar que la reserva ha sido cancelada
    if (participant.bookingDetails) {
      participant.bookingDetails.cancelled_at = new Date().toISOString();
      participant.bookingDetails.cancellation_reason = reason || 'Sin motivo especificado';
      participant.bookingDetails.payment_status = 'cancelled';
    }

    // Mostrar notificación
    toast({
      title: "Reserva cancelada",
      description: "La reserva ha sido cancelada exitosamente",
      variant: "default"
    });
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

        {/* Si hay detalles de la reserva, mostrar la información */}
        {isEditingPayment ? (
          <PaymentDetailsStep 
            initialData={{
              paymentMethod: participant.bookingDetails?.payment_method as PaymentMethodEnum || 'cash',
              paymentStatus: participant.bookingDetails?.payment_status as PaymentStatusEnum || 'pending',
              depositAmount: participant.bookingDetails?.deposit_amount || 0
            }}
            isLoading={isLoading}
            onCancel={() => setIsEditingPayment(false)}
            onSubmit={updatePaymentStatus}
          />
        ) : participant.bookingDetails ? (
          <div className="space-y-3">
            {/* Estado de pago */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Estado de pago</span>
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={cn(
                    getStatusColor(participant.bookingDetails.payment_status),
                    "text-xs px-2 py-0.5 font-normal"
                  )}
                >
                  {getPaymentStatusText(participant.bookingDetails.payment_status)}
                </Badge>
                
                {/* Indicador de garantía */}
                {hasGuarantee() && (
                  <Badge 
                    variant="outline" 
                    className="bg-purple-50 text-purple-800 border-purple-300 text-xs px-2 py-0.5 font-normal flex items-center gap-1"
                  >
                    <IconShieldCheck size={12} />
                    <span>Con garantía</span>
                  </Badge>
                )}
                
                {!isEditingDisabled && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => setIsEditingPayment(true)}
                  >
                    <IconEdit size={14} className="text-gray-400" />
                  </Button>
                )}
              </div>
            </div>
            
            {/* Método de pago */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Método de pago</span>
              <div className="flex items-center gap-1.5">
                <IconCreditCard size={14} className="text-gray-500" />
                <span className="text-xs font-medium text-gray-700">
                  {getPaymentMethodText(participant.bookingDetails.payment_method)}
                </span>
              </div>
            </div>
            
            {/* Importe */}
            {typeof participant.bookingDetails.total_price === 'number' && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Importe total</span>
                <div className="flex items-center gap-1.5">
                  <IconCurrencyDollar size={14} className="text-gray-500" />
                  <span className="text-xs font-medium text-gray-700">
                    {formatCurrency(participant.bookingDetails.total_price)}
                  </span>
                </div>
              </div>
            )}
            
            {/* Depósito */}
            {typeof participant.bookingDetails.deposit_amount === 'number' && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Importe abonado</span>
                <div className="flex items-center gap-1.5">
                  <IconCurrencyDollar size={14} className="text-gray-500" />
                  <span className="text-xs font-medium text-gray-700">
                    {formatCurrency(participant.bookingDetails.deposit_amount)}
                  </span>
                </div>
              </div>
            )}
            
            {/* Fecha de la reserva o clase */}
            {(participant.bookingDetails.date || participant.bookingDetails.created_at) && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Fecha de reserva</span>
                <div className="flex items-center gap-1.5">
                  <IconCalendar size={14} className="text-gray-500" />
                  <span className="text-xs font-medium text-gray-700">
                    {participant.bookingDetails.date 
                      ? format(new Date(participant.bookingDetails.date), 'PPP', { locale: es })
                      : participant.bookingDetails.created_at
                        ? format(new Date(participant.bookingDetails.created_at), 'PPP', { locale: es })
                        : 'Fecha no disponible'}
                  </span>
                </div>
              </div>
            )}
            
            {/* Información adicional sobre la reserva o clase */}
            {participant.bookingDetails.description && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <h4 className="text-xs font-medium text-gray-700 mb-1">Notas</h4>
                <p className="text-xs text-gray-600 whitespace-pre-line">
                  {participant.bookingDetails.description}
                </p>
              </div>
            )}
            
            {/* Garantía */}
            {hasGuarantee() && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconShieldCheck size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-600">Garantía</span>
                </div>
                <Badge 
                  variant="outline" 
                  className="bg-purple-50 text-purple-800 border-purple-300"
                >
                  Con garantía
                </Badge>
              </div>
            )}
            
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
        ) : (
          <div className="text-center py-3">
            <p className="text-xs text-gray-500">
              No hay información de reserva disponible para este participante
            </p>
          </div>
        )}
      </div>
      
      {/* Botones de acción */}
      <div className="flex gap-2 mt-4">
        <Button
          onClick={onBack}
          variant="outline"
          size="sm"
          className="w-full text-xs"
        >
          Volver
        </Button>
        
        {/* Botón para cancelar reserva (solo visible si la reserva no está completada o cancelada) */}
        {canBeCancelled && participant.bookingDetails && (
          <Button
            onClick={() => setIsCancelModalOpen(true)}
            variant="destructive"
            size="sm"
            className="w-full text-xs"
          >
            Cancelar reserva
          </Button>
        )}
      </div>

      {/* Modal de cancelación de reserva */}
      {participant.bookingDetails && (
        <CancelBookingModal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          onConfirm={handleCancelBookingConfirm}
          hasGuarantee={hasGuarantee()}
          totalAmount={participant.bookingDetails.total_price}
          booking={{
            id: participant.bookingDetails.id,
            stripe_payment_method_id: undefined // Este dato se obtiene en el modal
          }}
        />
      )}
    </motion.div>
  )
}