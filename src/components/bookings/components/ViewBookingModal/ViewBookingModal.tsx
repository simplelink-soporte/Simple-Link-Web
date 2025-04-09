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
import { PAYMENT_TYPE_MAPPINGS } from '@/types/bookings'
import { getCurrencySymbol } from "@/lib/currency-utils"

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
const formatPrice = (amount: number | undefined | null, country?: string | null) => {
  // Verificar explícitamente si amount es undefined o null para evitar cálculos incorrectos
  if (amount === undefined || amount === null) {
    console.log('⚠️ formatPrice: Monto no definido, devolviendo 0.00');
    return `${getCurrencySymbol(country)}0.00`;
  }
  
  // Agregar logging detallado para debugging
  console.log(`💰 formatPrice: Monto=${amount}, País="${country || 'No especificado'}"`);
  
  // Obtener el símbolo de moneda basado en el país
  const symbol = getCurrencySymbol(country);
  console.log(`💰 formatPrice: Símbolo obtenido=${symbol}`);
  
  // Formatear el número a 2 decimales
  const formattedNumber = amount.toFixed(2);
  console.log(`💰 formatPrice: Número formateado=${formattedNumber}`);
  
  // Devolver el precio formateado con el símbolo correcto
  return `${symbol}${formattedNumber}`;
}

// Función para formatear el método de pago (movida fuera del componente PaymentDetails)
const formatPaymentMethod = (method: string) => {
  if (!method) return 'No especificado'
  const methods: Record<string, string> = {
    'cash': 'Efectivo',
    'card': 'Tarjeta',
    'transfer': 'Transferencia',
    'stripe': 'Tarjeta'
  }
  return methods[method.toLowerCase()] || method.charAt(0).toUpperCase() + method.slice(1)
}

// Sistema de logging estructurado para debugging
const logBookingData = (stage: string, data: any) => {
  console.log(`🔖 [${stage}] Datos de la reserva:`, {
    id: data?.id,
    total: data?.totalAmount,
    paymentType: data?.paymentType,
    canCharge: data?.paymentType === 'guarantee'
  })
}

function PaymentDetails({ 
  total, 
  deposit,
  paymentMethod, 
  status,
  paymentType,
  onNewPayment,
  country
}: { 
  total: number
  deposit: number
  paymentMethod: string
  status: string
  paymentType: PaymentTypeEnum
  onNewPayment: (amount: number, method: string) => void
  country?: string | null
}) {
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  
  // Simplificamos esta parte para evitar errores
  const isValidPaymentType = (type: string): type is PaymentTypeEnum => {
    return ['booking', 'deposit', 'remaining', 'guarantee', 'no_show_charge'].includes(type)
  }
  
  const getPaymentTypeText = (type: PaymentTypeEnum): string => {
    const typeMapping: Record<PaymentTypeEnum, string> = {
      'booking': 'Pago completo',
      'deposit': 'Seña',
      'remaining': 'Pago restante',
      'guarantee': 'Garantía',
      'no_show_charge': 'Cargo por no asistencia',
      'full': 'Pago completo'
    }
    return typeMapping[type] || 'Desconocido'
  }

  // Normalizar el status para asegurar que sea una cadena válida
  const normalizedStatus = typeof status === 'string' ? status.toLowerCase() : '';
  const isPartial = normalizedStatus === 'partial';
  const isPending = normalizedStatus === 'pending';
  const hasRemainingPayment = isPartial || isPending;

  // Log detallado de props y validación
  useEffect(() => {
    console.log('💰 PaymentDetails Props:', {
      timestamp: new Date().toISOString(),
      props: {
        total,
        deposit,
        paymentMethod,
        status,
        paymentType,
        country
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
  }, [total, deposit, paymentMethod, status, paymentType, country])

  // Log para depuración de botones de pago
  useEffect(() => {
    if (status === 'partial' || status === 'pending') {
      console.log('📊 Evaluando mostrar botones de pago:', {
        status,
        paymentType,
        shouldShowPartial: status === 'partial',
        shouldShowPending: status === 'pending'
      });
    }
  }, [status, paymentType]);

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

  return (
    <div className="space-y-4">
      <div className="pt-2 border-t flex justify-between text-sm">
        <span className="font-medium text-gray-900">Total</span>
        <span className="font-medium text-gray-900">
          {formatPrice(total, country)}
        </span>
      </div>

      {/* Monto Depositado */}
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Monto depositado</span>
        <span className="text-gray-900">{formatPrice(deposit, country)}</span>
      </div>

      {/* Método de Pago */}
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Método de pago</span>
        <span className="text-gray-700">
          {formatPaymentMethod(paymentMethod)}
        </span>
      </div>

      {/* Tipo de Pago - Siempre mostrar */}
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Tipo de pago</span>
        <span className={cn(
          "px-2 py-1 rounded-full text-xs font-medium",
          paymentType === 'guarantee' && "bg-purple-100 text-purple-700",
          paymentType === 'deposit' && "bg-blue-100 text-blue-700",
          paymentType === 'booking' && "bg-green-100 text-green-700",
          paymentType === 'remaining' && "bg-indigo-100 text-indigo-700",
          paymentType === 'no_show_charge' && "bg-red-100 text-red-700"
        )}>
          {getPaymentTypeText(paymentType)}
        </span>
      </div>

      {/* Estado - Siempre mostrar */}
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Estado del pago</span>
        <span className={cn(
          "px-2 py-1 rounded-full text-xs font-medium",
          normalizedStatus === 'completed' && "bg-green-100 text-green-700",
          normalizedStatus === 'partial' && "bg-yellow-100 text-yellow-700",
          normalizedStatus === 'pending' && "bg-gray-100 text-gray-700"
        )}>
          {getStatusText(status)}
        </span>
      </div>

      {/* Botones de Pago - Mostrar independientemente del tipo de pago si el estado es el adecuado */}
      {isPartial && (
        <Button
          onClick={() => {
            console.log('🔘 Botón de Registrar Resto clickeado:', { 
              status, 
              paymentType, 
              timestamp: new Date().toISOString() 
            });
            setShowPaymentModal(true);
          }}
          variant="outline"
          className="w-full mt-4 border-dashed hover:border-solid transition-all duration-200"
        >
          Registrar Resto
        </Button>
      )}

      {isPending && (
        <Button
          onClick={() => {
            console.log('🔘 Botón de Registrar Pago clickeado:', { 
              status, 
              paymentType, 
              timestamp: new Date().toISOString() 
            });
            setShowPaymentModal(true);
          }}
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
        remainingAmount={normalizedStatus === 'pending' ? total : total - deposit}
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
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [isProcessingCancel, setIsProcessingCancel] = useState(false)
  const { toast } = useToast()

  // Obtener el país de la organización para determinar la moneda
  const organizationCountry = organization?.country || null;

  // Timezone de la organización o por defecto 'UTC'
  // Nota: Si el tipo Organization no tiene timezone, usar fallback seguro
  const organizationTimezone = (organization as any)?.timezone || 'UTC';

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
      
      if (!organizationTimezone) return result;

      // Transformar los horarios si no vienen transformados
      const startDateTime = DateTime.fromFormat(
        result.startTime,
        'HH:mm:ss',
        { zone: 'UTC' }
      ).setZone(organizationTimezone);

      const endDateTime = DateTime.fromFormat(
        result.endTime,
        'HH:mm:ss',
        { zone: 'UTC' }
      ).setZone(organizationTimezone);

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

  useEffect(() => {
    if (organization) {
      console.log('🌍 Información de organización:', {
        orgName: organization.name,
        orgId: organization.id,
        country: organization.country,
        countryVariable: organizationCountry
      });
    }
  }, [organization, organizationCountry]);

  const handlePayment = async (amount: number, method: PaymentMethodEnum) => {
    if (!currentBooking) return

    try {
      // Registrar el pago
      await registerPayment({
        bookingId: currentBooking.id,
        depositAmount: amount,
        paymentMethod: method
      })

      // Invalidar y refrescar las queries relacionadas
      await queryClient.invalidateQueries({ queryKey: ['booking', currentBooking.id] })
      await queryClient.invalidateQueries({ queryKey: ['bookings'] })

      // Actualizar el estado local
      const updatedData = await bookingQueryService.getBookingById(currentBooking.id)
      setSelectedBooking(updatedData)
      
      toast({
        title: "Pago completado",
        description: "El pago se ha registrado correctamente",
        variant: "default"
      })
      setShowPaymentModal(false)
      onClose() // Cerrar el modal principal
    } catch (error) {
      console.error('Error al procesar el pago:', error)
      toast({
        title: "Error",
        description: "Error al procesar el pago",
        variant: "destructive"
      })
    }
  }

  const handleCancelBooking = async ({ 
    reason, 
    shouldCharge,
    refundAction
  }: { 
    reason?: string; 
    shouldCharge?: boolean;
    refundAction?: {
      type: 'full' | 'percentage';
      percentage?: number;
      processMethod: 'stripe' | 'external';
      amount?: number;
      refundId?: string;
    };
  }) => {
    if (!currentBooking) return;

    setIsProcessingCancel(true);
    try {
      // Obtener los datos de pago necesarios, si existen en las propiedades
      // Nota: Usamos acceso seguro con as any para evitar errores de tipo
      const paymentMethodId = (currentBooking as any).stripe_payment_method_id || '';

      // Determinar si debemos procesar como reembolso
      const hasRefund = Boolean(refundAction);
      const refundAmount = refundAction?.amount || null;
      const refundId = refundAction?.refundId || null;

      // Calcular monto del cargo por cancelación si corresponde
      const chargeAmount = shouldCharge ? (currentBooking.totalAmount * 0.3) : 0;

      console.log('🔐 Ejecutando cancelación de reserva con parámetros:', {
        booking_id: currentBooking.id,
        reason,
        should_charge: shouldCharge,
        has_refund: hasRefund,
        refund_amount: refundAmount,
        refund_id: refundId,
        charge_amount: chargeAmount,
        timestamp: new Date().toISOString()
      });

      let data, error;

      // Bifurcación del flujo según sea reembolso o cancelación simple
      if (hasRefund) {
        // Si hay reembolso, usamos la RPC original que ya ha sido adaptada para reembolsos
        ({ data, error } = await supabase.rpc('cancel_booking_v1', {
          p_booking_id: currentBooking.id,
          p_charge_amount: chargeAmount,
          p_reason: reason,
          p_should_charge: shouldCharge,
          p_stripe_payment_intent_id: null, // Este campo es requerido por la función RPC
          p_stripe_payment_method_id: paymentMethodId,
          p_has_refund: hasRefund,
          p_refund_amount: refundAmount,
          p_stripe_refund_id: refundId
        }));
      } else {
        // Si NO hay reembolso, usamos la nueva RPC especializada para cancelaciones
        console.log('🔄 Usando nueva RPC para cancelación sin reembolso');
        ({ data, error } = await supabase.rpc('update_payment_status_cancelled', {
          p_booking_id: currentBooking.id,
          p_reason: reason || 'Cancelación de reserva',
          p_charge_amount: chargeAmount,
          p_stripe_payment_intent_id: null, // Lo actualizaremos si se procesa un cargo
          p_stripe_payment_method_id: paymentMethodId
        }));
      }

      if (error) throw error;

      console.log('✅ Cancelación procesada correctamente:', data);

      toast({
        title: "Reserva " + (hasRefund ? "reembolsada" : "cancelada"),
        description: hasRefund 
          ? "La reserva ha sido cancelada y el reembolso ha sido procesado"
          : shouldCharge 
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
        <AnimatePresence mode="wait">
          {isOpen && (
            <>
              {/* Overlay */}
              <motion.div
                key="view-booking-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/10 z-40"
              />

              {/* Modal */}
              <motion.div
                key="view-booking-modal"
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
                className="fixed inset-y-2 right-2 w-[500px] bg-white rounded-2xl border z-50 overflow-hidden"
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
                      {/* Sección de resumen */}
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <h3 className="text-sm font-medium text-gray-900">
                            Información de la reserva
                          </h3>
                          <p className="text-xs text-gray-500">
                            {format(new Date(currentBooking.date + "T00:00:00"), "dd 'de' MMMM, yyyy", { locale: es })} • {currentBooking.startTime} - {currentBooking.endTime}
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          {processedData.participants.map((participant, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className={cn(
                                "flex items-center py-1.5",
                                "group transition-colors duration-200"
                              )}
                            >
                              <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mr-3">
                                <span className="text-sm font-medium text-gray-900">
                                  {processedData.getInitial(participant)}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">{processedData.formatParticipantName(participant)}</p>
                                {/* Acceder a email de forma segura para evitar errores de tipo */}
                                {(participant as any)?.email && (
                                  <p className="text-xs text-gray-400">
                                    {(participant as any).email}
                                  </p>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* Detalles principales */}
                      <div className="space-y-6">
                        {/* Sección de Pistas */}
                        <div className="space-y-2">
                          <h3 className="text-sm font-medium text-gray-900">
                            Pistas reservadas
                          </h3>
                          <div className="space-y-1.5">
                            {processedData.courtName && (
                              <div className="flex items-center justify-between py-1.5">
                                <span className="text-sm text-gray-600">{processedData.courtName}</span>
                                <span className="text-sm text-gray-900 font-mono">{formatPrice(processedData.courtPrice, organizationCountry)}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Sección de Items Rentados */}
                        {processedData.hasRentedItems && (
                          <div className="space-y-2">
                            <h3 className="text-sm font-medium text-gray-900">
                              Equipamiento rentado
                            </h3>
                            <div className="space-y-1.5">
                              {processedData.rentedItems.map((item, index) => (
                                <div 
                                  key={index}
                                  className="flex items-center justify-between py-1.5"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600">
                                      {item.name} ({item.quantity}x)
                                    </span>
                                  </div>
                                  <span className="text-sm text-gray-900 font-mono">{formatPrice(item.pricePerUnit * item.quantity, organizationCountry)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Estado del Pago */}
                        <div className="space-y-2">
                          <h3 className="text-sm font-medium text-gray-900">
                            Estado del pago
                          </h3>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between py-1.5">
                              <span className="text-sm text-gray-600">Método de pago</span>
                              <span className="text-sm text-gray-900">{formatPaymentMethod(processedData.paymentMethod)}</span>
                            </div>
                            <div className="flex items-center justify-between py-1.5">
                              <span className="text-sm text-gray-600">Estado</span>
                              <span className={cn(
                                "text-sm font-medium",
                                processedData.paymentStatus === 'completed' && "text-gray-600",
                                processedData.paymentStatus === 'pending' && "text-gray-600",
                                processedData.paymentStatus === 'partial' && "text-gray-600"
                              )}>
                                {getStatusText(processedData.paymentStatus)}
                              </span>
                            </div>
                            {/* Mostrar el monto depositado siempre, sin importar si es 0 */}
                            <div className="flex items-center justify-between py-1.5">
                              <span className="text-sm text-gray-600">Monto depositado</span>
                              <span className="text-sm text-gray-900 font-mono">{formatPrice(processedData.depositAmount, organizationCountry)}</span>
                            </div>
                            {processedData.paymentStatus === 'partial' && (
                              <div className="flex items-center justify-between py-1.5">
                                <span className="text-sm text-gray-600">Restante</span>
                                <span className="text-sm text-gray-900 font-mono">{formatPrice(processedData.totalAmount - processedData.depositAmount, organizationCountry)}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between py-1.5 border-t border-gray-100">
                              <span className="text-sm font-medium text-gray-900">Total</span>
                              <span className="text-sm font-medium text-gray-900 font-mono">{formatPrice(processedData.totalAmount, organizationCountry)}</span>
                            </div>
                            
                            {/* Botón de pago para reservas señadas o pendientes */}
                            {(processedData.paymentStatus === 'partial' || processedData.paymentStatus === 'pending') && (
                              <button
                                onClick={() => setShowPaymentModal(true)}
                                className={cn(
                                  "w-full mt-6 px-4 py-2.5 rounded-lg",
                                  "text-sm font-medium",
                                  "border border-zinc-200",
                                  "bg-white text-zinc-900",
                                  "hover:bg-zinc-50 hover:border-zinc-300",
                                  "transition-all duration-200"
                                )}
                              >
                                Completar pago
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
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
                        className="flex-1 border-gray-200 hover:border-red-100 hover:text-red-600 transition-colors duration-200"
                      >
                        Cancelar Reserva
                      </Button>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Modal de Pago */}
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onConfirm={handlePayment}
          remainingAmount={processedData?.totalAmount - processedData?.depositAmount || 0}
          country={organizationCountry}
        />

        {/* Modal de Confirmación de Cancelación */}
        <CancelBookingModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleCancelBooking}
          hasGuarantee={currentBooking?.paymentType === 'guarantee'}
          totalAmount={processedData?.totalAmount}
          guaranteePercentage={currentBooking?.guarantee_percentage}
          booking={{
            id: currentBooking?.id || '',
            stripe_payment_method_id: currentBooking?.stripe_payment_method_id,
            customer_name: currentBooking?.customer_name,
            customer_email: currentBooking?.customer_email,
            customer_id: currentBooking?.customer_id,
            payment_type: currentBooking?.paymentType // Pasar el tipo de pago para determinar si mostrar opciones de reembolso
          }}
        />
      </>,
      document.body
    )
  }

  return null
} 