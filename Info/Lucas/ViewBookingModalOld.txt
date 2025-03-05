import { motion, AnimatePresence } from "framer-motion"
import { IconClock, IconUsers, IconCash, IconCalendar, IconChevronDown, IconBallTennis, IconPackage } from "@tabler/icons-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useCourts } from "@/hooks/useCourts"
import { useBranchContext } from "@/contexts/BranchContext"
import { timeToMinutes } from "@/lib/time-utils"
import { type PaymentStatusEnum, type PaymentTypeEnum, type SelectedBooking, type PaymentMethodEnum } from '@/types/bookings'
import { cn } from "@/lib/utils"
import { useState, useEffect, useMemo } from "react"
import { bookingService } from "@/services/bookingService"
import { toast } from '@/components/ui/use-toast'
import { PaymentModal } from "../PaymentModal/PaymentModal"
import { Button } from "@/components/ui/button"
import { paymentService } from "@/services/paymentService"
import { useQueryClient, type UseQueryOptions } from '@tanstack/react-query'
import { useBookings } from '@/hooks/useBookings'
import { useQuery } from '@tanstack/react-query'
import { CancelBookingModal } from "../CancelBookingModal/CancelBookingModal"
import { useToast } from '@/components/ui/use-toast'
import { IconCircleCheck } from '@tabler/icons-react'
import { createPortal } from "react-dom"
import { bookingQueryService } from '@/services/bookingQueryService'
import { useOrganization } from '@/contexts/OrganizationContext'
import { supabase } from "@/lib/supabase"
import { DateTime } from "luxon"

interface ViewBookingModalProps {
  isOpen: boolean
  onClose: () => void
  booking: SelectedBooking | null
  setSelectedBooking: (booking: SelectedBooking | null) => void
  onCancelSuccess: () => void
}

// Funciones helper
const formatTime = (time?: string) => {
  if (!time) return '--:--'
  return time.split(':').slice(0, 2).join(':')
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'text-green-600 ring-green-600/20 bg-green-50'
    case 'partial':
      return 'text-yellow-600 ring-yellow-600/20 bg-yellow-50'
    case 'pending':
      return 'text-gray-600 ring-gray-600/20 bg-gray-50'
    default:
      return 'text-gray-600 ring-gray-600/20 bg-gray-50'
  }
}

const getStatusText = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'Completado'
    case 'partial':
      return 'Señado'
    case 'pending':
      return 'Pendiente'
    default:
      return 'Pendiente'
  }
}

interface CollapsibleSectionProps {
  icon: React.ReactNode
  title: string
  count?: number
  children: React.ReactNode
}

function CollapsibleSection({ icon, title, count, children }: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  return (
    <div className="flex flex-col">
      <button 
        onClick={() => setIsExpanded(prev => !prev)}
        className="flex items-center justify-between w-full group"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            {icon}
          </div>
          <span className="text-sm font-medium text-gray-900">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {count !== undefined && (
            <span className="text-sm text-gray-500">{count}</span>
          )}
          <IconChevronDown 
            className={cn(
              "w-4 h-4 text-gray-400 transition-transform duration-200",
              isExpanded && "transform rotate-180"
            )}
            stroke={1.5}
          />
        </div>
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3 pl-8">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// 1. Modificar la función helper para formatear precios
const formatPrice = (amount: number | undefined | null) => {
  if (typeof amount !== 'number') return '0,00 €'
  
  try {
    return amount.toLocaleString('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  } catch (error) {
    console.error('Error formateando precio:', error)
    return '0,00 €'
  }
}

// Sistema de logging estructurado para debugging
const logBookingData = (stage: string, data: any) => {
  console.log(`🔍 [${stage}]`, {
    timestamp: new Date().toISOString(),
    data: {
      id: data?.id,
      paymentType: data?.paymentType,
      paymentStatus: data?.paymentStatus,
      paymentMethod: data?.paymentMethod,
      isGuarantee: data?.paymentType === 'guarantee'
    }
  })
}

function PaymentDetails({ 
  total, 
  deposit,
  paymentMethod, 
  status,
  paymentType,
  onNewPayment
}: { 
  total: number
  deposit: number
  paymentMethod: string
  status: string
  paymentType: PaymentTypeEnum
  onNewPayment: (amount: number, method: string) => void
}) {
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  // Log detallado de props y validación
  useEffect(() => {
    console.log('💰 PaymentDetails Props:', {
      timestamp: new Date().toISOString(),
      props: {
        total,
        deposit,
        paymentMethod,
        status,
        paymentType
      },
      validation: {
        isGuarantee: paymentType === 'guarantee',
        hasPaymentType: Boolean(paymentType),
        paymentTypeValue: paymentType,
        paymentTypeType: typeof paymentType,
        rawPaymentType: JSON.stringify(paymentType),
        isValidType: ['booking', 'deposit', 'remaining', 'guarantee', 'no_show_charge'].includes(paymentType)
      }
    })
  }, [total, deposit, paymentMethod, status, paymentType])

  // Validación explícita del paymentType
  const isValidPaymentType = (type: string): type is PaymentTypeEnum => {
    return ['booking', 'deposit', 'remaining', 'guarantee', 'no_show_charge'].includes(type)
  }

  // Log en cada renderizado
  console.log('🎯 Renderizando PaymentDetails:', {
    paymentType,
    isGuarantee: paymentType === 'guarantee',
    shouldShowGuarantee: Boolean(paymentType === 'guarantee'),
    validation: {
      isValid: isValidPaymentType(paymentType),
      type: typeof paymentType,
      value: String(paymentType)
    }
  })

  const formatPaymentMethod = (method: string) => {
    if (!method) return 'No especificado'
    const methods: Record<string, string> = {
      'cash': 'Efectivo',
      'card': 'Tarjeta',
      'transfer': 'Transferencia',
      'stripe': 'Stripe'
    }
    return methods[method.toLowerCase()] || method.charAt(0).toUpperCase() + method.slice(1)
  }

  return (
    <div className="space-y-4">
      <div className="pt-2 border-t flex justify-between text-sm">
        <span className="font-medium text-gray-900">Total</span>
        <span className="font-medium text-gray-900">
          {formatPrice(total)}
        </span>
      </div>

      {/* Monto Depositado */}
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Monto depositado</span>
        <span className="text-gray-900">{formatPrice(deposit)}</span>
      </div>

      {/* Método de Pago */}
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Método de pago</span>
        <span className="text-gray-700">
          {formatPaymentMethod(paymentMethod)}
        </span>
      </div>

      {/* Tipo de Pago - Solo mostrar si es guarantee */}
      {paymentType === 'guarantee' && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Tipo de pago</span>
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
            Garantía
          </span>
        </div>
      )}

      {/* Estado */}
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Estado</span>
        <span className={cn(
          "px-2 py-1 rounded-full text-xs font-medium",
          status === 'completed' && "bg-green-100 text-green-700",
          status === 'partial' && "bg-yellow-100 text-yellow-700",
          status === 'pending' && "bg-gray-100 text-gray-700"
        )}>
          {getStatusText(status)}
        </span>
      </div>

      {/* Botones de Pago - No mostrar si es guarantee */}
      {status === 'partial' && paymentType !== 'guarantee' && (
        <Button
          onClick={() => setShowPaymentModal(true)}
          variant="outline"
          className="w-full mt-4 border-dashed hover:border-solid transition-all duration-200"
        >
          Registrar Resto
        </Button>
      )}

      {status === 'pending' && paymentType !== 'guarantee' && (
        <Button
          onClick={() => setShowPaymentModal(true)}
          variant="outline"
          className="w-full mt-4 border-dashed hover:border-solid hover:border-green-200 hover:bg-green-50 hover:text-green-600 transition-all duration-200"
        >
          Registrar Pago
        </Button>
      )}

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={onNewPayment}
        remainingAmount={status === 'pending' ? total : total - deposit}
      />
    </div>
  )
}

type RentalItem = NonNullable<SelectedBooking['rentedItems']>[number]
type Participant = SelectedBooking['participants'][number]

interface Court {
  id: string
  name: string
}

interface ProcessedData {
  courtName: string
  courtPrice: number
  hasValidParticipants: boolean
  participants: SelectedBooking['participants']
  rentedItems: RentalItem[]
  hasRentedItems: boolean
  formatParticipantName: (participant: Participant) => string
  getInitial: (participant: Participant) => string
  durationInMinutes: number
  totalAmount: number
  depositAmount: number
  paymentMethod: PaymentMethodEnum
  paymentStatus: PaymentStatusEnum
  paymentType: PaymentTypeEnum
  rentalsTotal: number
}

export function ViewBookingModal({ 
  isOpen, 
  onClose, 
  booking,
  setSelectedBooking,
  onCancelSuccess
}: ViewBookingModalProps) {
  const { currentBranch } = useBranchContext()
  const { organization, stripeConnection } = useOrganization()
  const { data: courts = [] } = useCourts({ branchId: currentBranch?.id })
  const queryClient = useQueryClient()
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [isProcessingCancel, setIsProcessingCancel] = useState(false)
  const { toast } = useToast()

  const { registerPayment, cancelBooking } = useBookings({
    branchId: currentBranch?.id
  })

  const { data: currentBooking, isLoading } = useQuery({
    queryKey: ['booking', booking?.id] as const,
    queryFn: async () => {
      if (!booking?.id) throw new Error('No booking ID provided')
      
      // Si ya tenemos los datos transformados, los usamos
      if (booking.startTime && booking.endTime) {
        return booking;
      }
      
      // Si no, obtenemos los datos y los transformamos
      const result = await bookingQueryService.getBookingById(booking.id)
      
      if (!businessHours?.timezone) return result;

      // Transformar los horarios si no vienen transformados
      const startDateTime = DateTime.fromFormat(
        result.startTime,
        'HH:mm:ss',
        { zone: 'UTC' }
      ).setZone(businessHours.timezone);

      const endDateTime = DateTime.fromFormat(
        result.endTime,
        'HH:mm:ss',
        { zone: 'UTC' }
      ).setZone(businessHours.timezone);

      return {
        ...result,
        startTime: startDateTime.toFormat('HH:mm'),
        endTime: endDateTime.toFormat('HH:mm')
      };
    },
    enabled: !!booking?.id && isOpen,
    placeholderData: (previousData) => {
      if (previousData) return previousData
      if (booking) return booking
      return undefined
    },
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false
  })

  // Procesar datos solo cuando sea necesario
  const processedData = useMemo<ProcessedData | null>(() => {
    if (!currentBooking) return null

    // Validación explícita del paymentType
    const isValidPaymentType = (type: string): type is PaymentTypeEnum => {
      return ['booking', 'deposit', 'remaining', 'guarantee', 'no_show_charge'].includes(type)
    }

    // Log inicial para debugging
    console.log('🔍 Datos sin procesar:', {
      id: currentBooking.id,
      paymentType: currentBooking.paymentType,
      isValid: isValidPaymentType(currentBooking.paymentType),
      rawType: typeof currentBooking.paymentType,
      timestamp: new Date().toISOString()
    })

    // Encontrar el nombre de la pista
    const court = courts.find((c: Court) => c.id === currentBooking.court)
    const courtName = court?.name || 'Pista no encontrada'

    // Validación y procesamiento de participantes
    const participants = Array.isArray(currentBooking.participants) ? currentBooking.participants : []

    // Validación más robusta de items rentados
    const rentedItems = currentBooking.rentedItems && Array.isArray(currentBooking.rentedItems) 
      ? currentBooking.rentedItems
      : []
    
    const rentalsTotal = rentedItems.reduce((acc: number, item: RentalItem) => {
      return acc + (item.pricePerUnit * item.quantity)
    }, 0)

    const hasRentedItems = rentedItems.length > 0

    // Asegurar que el precio de la pista sea un número válido
    const courtPrice = typeof currentBooking.courtPrice === 'number' ? currentBooking.courtPrice : 0

    // Log de validación del paymentType
    console.log('🔄 Validación de paymentType:', {
      original: currentBooking.paymentType,
      type: typeof currentBooking.paymentType,
      isValid: ['booking', 'deposit', 'remaining', 'guarantee', 'no_show_charge'].includes(currentBooking.paymentType)
    })

    return {
      courtName,
      courtPrice,
      hasValidParticipants: participants.length > 0,
      participants,
      rentedItems,
      hasRentedItems,
      formatParticipantName: (participant: Participant) => {
        if (!participant) return 'Usuario no registrado'
        const name = `${participant.firstName || 'Usuario'} ${participant.lastName || 'no registrado'}`.trim()
        return name
      },
      getInitial: (participant: Participant) => {
        if (!participant || !participant.firstName) return 'U'
        return participant.firstName.charAt(0).toUpperCase()
      },
      durationInMinutes: timeToMinutes(currentBooking.endTime) - timeToMinutes(currentBooking.startTime),
      totalAmount: currentBooking.totalAmount ?? 0,
      depositAmount: currentBooking.depositAmount ?? 0,
      paymentMethod: currentBooking.paymentMethod as PaymentMethodEnum,
      paymentStatus: currentBooking.paymentStatus as PaymentStatusEnum,
      paymentType: isValidPaymentType(currentBooking.paymentType) 
        ? currentBooking.paymentType 
        : 'booking' as PaymentTypeEnum,
      rentalsTotal
    }
  }, [currentBooking, courts])

  // Validar elegibilidad para cargo
  const canChargeNoShow = useMemo(() => {
    if (!currentBooking || !stripeConnection) return false;

    return (
      currentBooking.paymentType === 'guarantee' &&
      stripeConnection.charges_enabled &&
      stripeConnection.account_status === 'active'
    );
  }, [currentBooking, stripeConnection]);

  // Efectos de logging
  useEffect(() => {
    if (currentBooking) {
      console.log('💾 Estado actual de la reserva:', {
        id: currentBooking.id,
        paymentType: currentBooking.paymentType,
        isGuarantee: currentBooking.paymentType === 'guarantee',
        timestamp: new Date().toISOString()
      })
    }
  }, [currentBooking]);

  useEffect(() => {
    if (showCancelModal && currentBooking && processedData) {
      console.log('🔍 Estado de cancelación:', {
        paymentType: currentBooking.paymentType,
        canChargeNoShow,
        stripeConnection: {
          enabled: stripeConnection?.charges_enabled,
          status: stripeConnection?.account_status
        },
        totalAmount: processedData.totalAmount
      });
    }
  }, [showCancelModal, currentBooking, canChargeNoShow, stripeConnection, processedData]);

  const handlePayment = async (amount: number, method: string) => {
    if (!currentBooking) return

    try {
      await registerPayment({
        bookingId: currentBooking.id,
        depositAmount: amount,
        paymentMethod: method,
        notes: `Pago restante de reserva ${currentBooking.id}`
      })

      // Invalidar y refrescar las queries relacionadas
      await queryClient.invalidateQueries({ queryKey: ['booking', currentBooking.id] })
      await queryClient.invalidateQueries({ queryKey: ['bookings'] })

      // Actualizar el estado local
      const updatedData = await bookingQueryService.getBookingById(currentBooking.id)
      setSelectedBooking(updatedData)
    } catch (error) {
      console.error('Error al procesar el pago:', error)
      toast({
        description: 'Error al procesar el pago',
        variant: 'destructive'
      })
    }
  }

  const handleCancelBooking = async ({ 
    reason, 
    shouldCharge 
  }: { 
    reason?: string; 
    shouldCharge?: boolean 
  }) => {
    if (!currentBooking) return;

    setIsProcessingCancel(true);
    try {
      const { data, error } = await supabase.rpc('cancel_booking_v1', {
        p_booking_id: currentBooking.id,
        p_reason: reason,
        p_should_charge: shouldCharge,
        p_charge_amount: shouldCharge ? (currentBooking.totalAmount * 0.3) : null,
        p_stripe_payment_method_id: currentBooking.stripePaymentMethodId,
        p_stripe_account_id: organization?.stripeAccountId
      });

      if (error) throw error;

      toast({
        title: "Reserva cancelada",
        description: shouldCharge 
          ? "La reserva ha sido cancelada y se procesará el cargo"
          : "La reserva ha sido cancelada exitosamente"
      });

      onCancelSuccess?.();
      setShowCancelModal(false);
      onClose();
    } catch (error) {
      console.error('Error al cancelar reserva:', error);
      toast({
        title: "Error",
        description: "No se pudo procesar la cancelación",
        variant: "destructive"
      });
    } finally {
      setIsProcessingCancel(false);
    }
  };

  const handleCancelSuccess = () => {}

  // Mejorar la lógica de renderizado
  if (!isOpen) return null

  // Solo mostrar loading en la carga inicial
  if (isLoading && !currentBooking) {
    return createPortal(
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 flex items-center justify-center z-50"
      >
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <p className="text-gray-500">Cargando datos de la reserva...</p>
        </div>
      </motion.div>,
      document.body
    )
  }

  // Si tenemos datos (ya sea de initialData o de la query), renderizar
  if (currentBooking && processedData) {
    return createPortal(
      <>
        <AnimatePresence>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ 
              x: "100%", 
              opacity: 0,
              transition: {
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1]
              }
            }}
            transition={{ 
              type: "spring",
              damping: 30,
              stiffness: 300,
              mass: 0.8
            }}
            className="fixed inset-y-0 right-0 w-[500px] bg-white shadow-2xl border-l z-50"
          >
            <div className="h-full flex flex-col">
              {/* Encabezado */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="p-6 border-b"
              >
                <h2 className="text-xl font-semibold">Detalles de la Reservación</h2>
              </motion.div>

              {/* Contenido Principal */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="flex-1 overflow-y-auto"
              >
                <div className="p-6 space-y-8">
                  {/* Nueva sección de resumen */}
                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                    className="rounded-lg bg-gray-50/80 p-4 border border-gray-100"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-x-2">
                          {/* Columna izquierda: Solo Usuario */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-white shadow-sm ring-1 ring-gray-900/5 flex items-center justify-center flex-shrink-0">
                                <span className="text-sm font-medium text-gray-900">
                                  {processedData.getInitial(processedData.participants[0])}
                                </span>
                              </div>
                              <h3 className="text-sm font-medium text-gray-900 truncate">
                                {processedData.formatParticipantName(processedData.participants[0])}
                              </h3>
                            </div>
                            
                            {/* Lista de participantes adicionales */}
                            {processedData.hasValidParticipants && processedData.participants.length > 1 && (
                              <div className="mt-2 text-xs text-gray-500 space-y-1">
                                {processedData.participants.slice(1).map((participant, index) => (
                                  <div key={index} className="flex items-center gap-1.5">
                                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                                      <span className="text-xs font-medium text-gray-600">
                                        {processedData.getInitial(participant)}
                                      </span>
                                    </div>
                                    <span className="text-sm text-gray-500">
                                      {processedData.formatParticipantName(participant)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Columna derecha: Solo Fecha y Horario */}
                          <div className="text-right pt-1">
                            <p className="text-xs font-medium text-gray-700">
                              {format(new Date(currentBooking.date), "dd 'de' MMMM, yyyy", { locale: es })}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {/* Los horarios ya vienen transformados desde BookingsTable */}
                              {currentBooking.startTime} - {currentBooking.endTime}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Detalles principales */}
                  <motion.div 
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                    className="rounded-lg bg-white p-4 border border-gray-200 shadow-sm space-y-4"
                  >
                    {/* Sección de Pistas */}
                    <CollapsibleSection
                      icon={<IconBallTennis className="h-5 w-5 text-gray-400" />}
                      title="Pistas"
                      count={1}
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">
                            {processedData.courtName} ({processedData.durationInMinutes} min)
                          </span>
                          <span className="text-gray-900">
                            {formatPrice(processedData.courtPrice)}
                          </span>
                        </div>
                      </div>
                    </CollapsibleSection>

                    {/* Sección de Participantes */}
                    {processedData.hasValidParticipants && (
                      <CollapsibleSection
                        icon={<IconUsers className="h-5 w-5 text-gray-400" />}
                        title="Participantes"
                        count={processedData.participants.length}
                      >
                        <div className="space-y-2">
                          {processedData.participants.map((participant, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                                <span className="text-xs font-medium text-gray-600">
                                  {processedData.getInitial(participant)}
                                </span>
                              </div>
                              <span className="text-sm text-gray-500">
                                {processedData.formatParticipantName(participant)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </CollapsibleSection>
                    )}

                    {/* Sección de Ítems */}
                    {processedData && (
                      <CollapsibleSection
                        icon={<IconPackage className="h-5 w-5 text-gray-400" />}
                        title="Ítems Alquilados"
                        count={processedData.rentedItems.length}
                      >
                        <div className="space-y-2">
                          {processedData.rentedItems.length > 0 ? (
                            <>
                              {processedData.rentedItems.map((item, index) => (
                                <div key={index} className="flex justify-between text-sm">
                                  <span className="text-gray-500">
                                    {item.name} (x{item.quantity})
                                  </span>
                                  <span className="text-gray-900">
                                    {formatPrice(item.pricePerUnit * item.quantity)}
                                  </span>
                                </div>
                              ))}
                              {processedData.rentalsTotal > 0 && (
                                <div className="pt-2 border-t flex justify-between text-sm">
                                  <span className="font-medium text-gray-900">Total Ítems</span>
                                  <span className="font-medium text-gray-900">
                                    {formatPrice(processedData.rentalsTotal)}
                                  </span>
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-gray-500">No hay ítems alquilados</p>
                          )}
                        </div>
                      </CollapsibleSection>
                    )}

                    {/* Detalles de Pago */}
                    <PaymentDetails
                      total={processedData.totalAmount}
                      deposit={processedData.depositAmount}
                      paymentMethod={processedData.paymentMethod}
                      status={processedData.paymentStatus}
                      paymentType={processedData.paymentType}
                      onNewPayment={handlePayment}
                    />
                  </motion.div>
                </div>
              </motion.div>

              {/* Pie del Modal */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.3 }}
                className="p-6 border-t bg-white"
              >
                <div className="flex gap-3">
                  <Button
                    onClick={onClose}
                    variant="outline"
                    className="flex-1 bg-gray-50 hover:bg-gray-100"
                  >
                    Cerrar
                  </Button>
                  <Button
                    onClick={() => setShowCancelModal(true)}
                    variant="outline"
                    className="flex-1 border-gray-200 hover:border-red-100 hover:text-red-600 hover:bg-red-50 transition-colors duration-200"
                  >
                    Cancelar Reserva
                  </Button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Modal de Confirmación */}
        <CancelBookingModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleCancelBooking}
          hasGuarantee={currentBooking?.paymentType === 'guarantee'}
          totalAmount={processedData?.totalAmount}
          booking={currentBooking}
        />
      </>,
      document.body
    )
  }

  return null
} 