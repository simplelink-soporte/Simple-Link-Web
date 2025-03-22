"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { IconChevronDown, IconChevronRight, IconCash, IconCreditCard, IconBuildingBank, IconLoader2, IconCalendar, IconClock, IconMapPin, IconLock } from '@tabler/icons-react'
import { format, parseISO, isValid } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { cn } from '@/lib/utils'
import { useClassRegistration } from '../context/ClassRegistrationContext'
import { UserPackageService } from '../services'
import { StepContainer } from '../shared/StepContainer'
import { StepHeader } from '../shared/StepSection'
import { StepNavigation } from '../shared/StepNavigation'
import { useClassBooking } from '@/hooks/useClassBooking'
import { useToast } from '@/components/ui/use-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { PaymentTypeSection } from '../components/PaymentTypeSection'
import { PaymentMethodEnum } from '@/types/bookings';
import { PaymentMethod } from '../types/models'
import { PaymentTypeEnum, PAYMENT_TYPES, PaymentType } from '../components/payment-types'
import { PaymentMethod as CardPaymentMethod, PaymentSectionWithStripe } from '../components/PaymentSection'
import { useClientOrganizationContext } from '@/contexts/ClientOrganizationContext'
import { useStripeConfig } from '@/hooks/useStripeConfig'
import { useOrganization } from '@/contexts/OrganizationContext'
import { useAuth } from '@/contexts/AuthContext'
import type { Database } from '@/types/supabase'
import type { UserPackageFromDB, ClassSession, PaymentMethod } from '../types/models'
import { fullPaymentService } from '@/services/full-payment-client.service'
import { depositPaymentService } from '@/services/deposit-payment-client.service'
import { requiresCardPayment } from '../components/PaymentTypeSection'

// Definición de los métodos de pago disponibles
const PAYMENT_METHODS: Record<PaymentMethodEnum, {
  icon: typeof IconCash
  label: string
  description: string
}> = {
  cash: {
    icon: IconCash,
    label: 'Efectivo',
    description: 'Paga en efectivo al llegar a la clase'
  },
  card: {
    icon: IconCreditCard,
    label: 'Tarjeta',
    description: 'Pago con tarjeta en la recepción'
  },
  transfer: {
    icon: IconBuildingBank,
    label: 'Transferencia',
    description: 'Transferencia bancaria'
  }
}

export function SummaryStep() {
  const { state, updateState, goToStep } = useClassRegistration()
  // Usando type assertion con el operador 'as' para asegurarnos de que activePackage tenga la propiedad 'package'
  const [activePackage, setActivePackage] = useState<UserPackageFromDB & { package?: { name: string; branch_ids: string[] } } | null>(null)
  const [isPackageValidForClass, setIsPackageValidForClass] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isContentVisible, setIsContentVisible] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [selectedPaymentType, setSelectedPaymentType] = useState<PaymentTypeEnum | null>(null)
  const [selectedCardMethod, setSelectedCardMethod] = useState<CardPaymentMethod | null>(null)
  const [showCardMethodsList, setShowCardMethodsList] = useState(false)
  const [guaranteePercentage, setGuaranteePercentage] = useState<number>(30) // Nuevo estado para el porcentaje de garantía
  // Estado para controlar la visibilidad del overlay
  const [showOverlay, setShowOverlay] = useState(false)
  // Estado para controlar la vista actual en dispositivos móviles
  const [mobileView, setMobileView] = useState<'details' | 'payment'>('details')
  
  // Exponemos el estado mobileView para ser utilizado por el componente StepNavigation global
  // Este efecto actualiza el localStorage cuando cambia mobileView
  useEffect(() => {
    try {
      localStorage.setItem('summaryStepMobileView', mobileView);
    } catch (error) {
      console.warn('No se pudo guardar el estado mobileView en localStorage', error);
    }
  }, [mobileView]);
  
  // Obtenemos la organización del contexto específico de cliente
  const { organization } = useClientOrganizationContext()
  // Obtenemos la organización del contexto general (para acceso directo a empresa_id)
  const { organization: adminOrganization } = useOrganization()
  // Obtenemos el usuario autenticado para su ID
  const { user } = useAuth()
  
  // Determinamos el ID de empresa a usar, priorizando el del contexto del cliente si está disponible
  const empresaId = useMemo(() => 
    organization?.id || adminOrganization?.id || user?.metadata?.empresa_id
  , [organization?.id, adminOrganization?.id, user?.metadata?.empresa_id])
  
  // Obtener la configuración de Stripe usando el ID de empresa correcto
  const { stripeAccountId, isConnected } = useStripeConfig(empresaId || null)

  // Log para depuración - uso de useEffect con dependencias específicas
  useEffect(() => {
    console.log('[SummaryStep] IDs disponibles:', {
      clientOrgId: organization?.id,
      adminOrgId: adminOrganization?.id,
      userMetadataEmpresaId: user?.metadata?.empresa_id,
      selectedEmpresaId: empresaId,
      stripeAccountId,
      isConnected,
      userId: user?.id
    });
  }, [organization?.id, adminOrganization?.id, user?.metadata?.empresa_id, empresaId, stripeAccountId, isConnected, user?.id]);

  const userPackageService = new UserPackageService()
  const supabase = createClientComponentClient<Database>()
  const { submitClassBooking } = useClassBooking()
  const { toast } = useToast()

  // Detectar si es dispositivo móvil - optimizado con throttle para mejor rendimiento
  useEffect(() => {
    // Función para verificar si el dispositivo es móvil
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    // Ejecutar inmediatamente en el montaje
    checkIsMobile()
    
    // Crear una versión throttled para evitar múltiples llamadas durante resize
    const handleResize = () => {
      // Verificar si el componente sigue montado antes de actualizar el estado
      checkIsMobile()
    }
    
    // Agregar listener con throttling
    window.addEventListener('resize', handleResize)
    
    // Limpiar listener al desmontar
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, []) // Sin dependencias para que solo se monte una vez

  // Efecto para la animación del contenido - Solo se ejecuta una vez al montar
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsContentVisible(true)
    }, 50)
    
    return () => clearTimeout(timer)
  }, []) // Sin dependencias para que solo se ejecute una vez al montar

  // Formatear fecha - convertido a función memoizada para evitar recálculos
  const formatSessionDate = useCallback((dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
    
    const dayName = format(date, 'EEEE', { locale: es })
    const dayNumber = format(date, 'd', { locale: es })
    const monthName = format(date, 'MMMM', { locale: es })
    
    return {
      dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
      dayNumber,
      month: monthName.charAt(0).toUpperCase() + monthName.slice(1)
    }
  }, []) // Sin dependencias, función estable

  // Encontrar la sesión seleccionada - convertido a useMemo para evitar recálculos
  const selectedSession = useMemo(() => {
    return state.selectedClass?.sessions.find(
      (session: ClassSession) => session.id === state.selectedSessions[0]
    )
  }, [state.selectedClass?.sessions, state.selectedSessions[0]])

  // Manejar la selección de tipo de pago
  const handlePaymentTypeSelection = useCallback((type: PaymentTypeEnum | null, percentage?: number) => {
    console.log('📢 Tipo de pago seleccionado:', type, percentage ? `con porcentaje: ${percentage}%` : '')
    setSelectedPaymentType(type)
    
    // Si se proporciona un porcentaje y el tipo es garantía, actualizarlo
    if (percentage !== undefined && type === 'guarantee') {
      setGuaranteePercentage(percentage)
      console.log('📢 Porcentaje de garantía actualizado:', percentage)
    }
    
    // Cerrar la lista de tarjetas si está abierta
    if (showCardMethodsList) {
      setShowCardMethodsList(false)
    }
  }, [showCardMethodsList])

  // Mostrar la lista de métodos de pago
  const handleShowPaymentMethods = useCallback(() => {
    console.log('📢 Mostrando métodos de pago')
    setShowCardMethodsList(true)
    
    // Cerrar la selección de tipo de pago si está abierta
    if (selectedPaymentType !== null) {
      // No cerramos el tipo de pago completamente, solo ocultamos su lista desplegable
      // Esto se maneja dentro del componente PaymentTypeSection
    }
  }, [selectedPaymentType])

  // Actualizar el método de pago seleccionado
  const handleUpdatePaymentMethod = useCallback(async (method: CardPaymentMethod) => {
    console.log('📢 Actualizando método de pago:', method)
    setSelectedCardMethod(method)
    
    // Una vez seleccionado el método, también aseguramos que la lista permanezca cerrada
    setShowCardMethodsList(false)
    
    // Si el método es tarjeta, actualizar también el método de pago general
    if (method.type === 'card' && state.selectedPayment !== 'card') {
      updateState({ type: 'SELECT_PAYMENT', payload: 'card' })
    }
    
    return Promise.resolve()
  }, [state.selectedPayment, updateState])

  // Eliminar el método de pago seleccionado
  const handleRemovePaymentMethod = useCallback(() => {
    console.log('📢 Eliminando método de pago')
    setSelectedCardMethod(null)
  }, [])

  // Manejar la creación de reserva
  const handleCreateReservation = useCallback(async () => {
    if (isProcessing || !state.selectedPayment) return
    
    setIsProcessing(true)
    // Mostrar el overlay al iniciar el proceso
    setShowOverlay(true)
    
    console.log('📋 [SummaryStep] Iniciando creación de reserva:');
    console.log('📋 [SummaryStep] Método de pago:', state.selectedPayment);
    console.log('📋 [SummaryStep] Tipo de pago seleccionado:', selectedPaymentType);
    console.log('📋 [SummaryStep] Datos de clase seleccionada:', state.selectedClass);
    console.log('📋 [SummaryStep] ID de sesión seleccionada:', state.selectedSessions[0]);
    console.log('📋 [SummaryStep] Datos de sesión completa:', selectedSession);
    
    try {
      // Depuración adicional para identificar por qué no se procesa el pago
      console.log('🔍 [SummaryStep] Verificando condiciones para procesar pago con Stripe:');
      console.log('🔍 [SummaryStep] - Método seleccionado es card:', state.selectedPayment === 'card');
      console.log('🔍 [SummaryStep] - Existe método de tarjeta:', !!selectedCardMethod);
      console.log('🔍 [SummaryStep] - Tipo de pago seleccionado:', selectedPaymentType);
      console.log('🔍 [SummaryStep] - Session existe:', !!selectedSession);
      console.log('🔍 [SummaryStep] - stripeAccountId existe:', !!stripeAccountId);
      console.log('🔍 [SummaryStep] - Datos de tarjeta:', selectedCardMethod ? JSON.stringify({
        id: selectedCardMethod.id,
        brand: selectedCardMethod.brand,
        last4: selectedCardMethod.last4,
        customerId: selectedCardMethod.customerId
      }) : 'No hay método de tarjeta seleccionado');
      
      // Determinar si se necesita procesar el pago con tarjeta a través de Stripe
      const isCardPayment = 
        state.selectedPayment === 'card' && 
        selectedCardMethod && 
        selectedPaymentType !== null && 
        selectedSession && 
        stripeAccountId;
      
      // Verificar si es pago completo o pago de seña
      const isFullPayment = selectedPaymentType === 'full';
      const isDepositPayment = selectedPaymentType === 'deposit';
      
      if (isCardPayment) {
        // Obtener el customer ID de Stripe
        const stripeCustomerId = selectedCardMethod.customerId;
        
        if (!stripeCustomerId) {
          console.error('❌ [SummaryStep] No se encontró customerId en el método de pago seleccionado');
          throw new Error('No se encontró la información necesaria del cliente para procesar el pago');
        }
        
        // Mostrar mensaje al usuario
        toast({
          title: 'Procesando pago',
          description: isDepositPayment 
            ? 'Estamos procesando el pago de tu seña...' 
            : 'Estamos procesando tu pago con tarjeta...',
          variant: 'default'
        });
        
        try {
          let paymentResult;
          
          if (isDepositPayment) {
            // Procesar pago de seña
            console.log('🔄 [SummaryStep] Procesando pago de SEÑA con depositPaymentService...');
            console.log('📋 [SummaryStep] Datos para pago de seña:', {
              amount: selectedSession.price * 0.3, // 30% por defecto como seña
              totalAmount: selectedSession.price,
              depositPercentage: 30,
              paymentMethodId: selectedCardMethod.id,
              stripeAccountId,
              stripeCustomerId
            });
            
            paymentResult = await depositPaymentService.processPayment({
              paymentMethodId: selectedCardMethod.id,
              amount: selectedSession.price * 0.3, // 30% por defecto
              totalAmount: selectedSession.price,
              depositPercentage: 30,
              empresaId: empresaId || '',
              description: `Seña - Clase: ${state.selectedClass?.title}`,
              stripeCustomerId: stripeCustomerId,
              stripeAccountId: stripeAccountId
            });
          } else {
            // Procesar pago completo (como estaba antes)
            console.log('🔄 [SummaryStep] Procesando PAGO COMPLETO con fullPaymentService...');
            paymentResult = await fullPaymentService.processPayment({
              paymentMethodId: selectedCardMethod.id,
              amount: selectedSession.price,
              empresaId: empresaId || '',
              description: `Pago completo - Clase: ${state.selectedClass?.title}`,
              stripeCustomerId: stripeCustomerId,
              stripeAccountId: stripeAccountId
            });
          }
          
          console.log('✅ [SummaryStep] Resultado del procesamiento de pago:', paymentResult);
          
          // Verificar el resultado del pago
          if (!paymentResult.success) {
            console.error('❌ [SummaryStep] Error al procesar el pago:', paymentResult.error);
            toast({
              title: 'Error de pago',
              description: paymentResult.message || 'No se pudo procesar el pago con tarjeta',
              variant: 'destructive'
            });
            setIsProcessing(false);
            return;
          }
          
          console.log('✅ [SummaryStep] Pago procesado correctamente:', {
            paymentIntentId: paymentResult.paymentIntentId,
            status: paymentResult.chargeStatus,
            isDepositPayment: isDepositPayment,
            depositAmount: isDepositPayment ? paymentResult.depositAmount : null,
            totalAmount: isDepositPayment ? paymentResult.totalAmount : selectedSession.price
          });
          
          toast({
            title: 'Pago exitoso',
            description: isDepositPayment 
              ? 'Tu seña ha sido procesada correctamente' 
              : 'Tu pago ha sido procesado correctamente',
            variant: 'default'
          });
          
          // Guardar el ID del payment intent como respaldo
          try {
            localStorage.setItem('lastPaymentIntentId', paymentResult.paymentIntentId || '');
            localStorage.setItem('lastPaymentTimestamp', new Date().toISOString());
            if (isDepositPayment) {
              localStorage.setItem('lastDepositAmount', JSON.stringify({
                depositAmount: paymentResult.depositAmount,
                totalAmount: paymentResult.totalAmount,
                depositPercentage: paymentResult.depositPercentage
              }));
            }
          } catch (storageError) {
            console.warn('⚠️ [SummaryStep] No se pudo guardar en localStorage:', storageError);
          }
        } catch (paymentError: any) {
          console.error('❌ [SummaryStep] Error al llamar al servicio de pago:', paymentError);
          toast({
            title: 'Error de pago',
            description: paymentError?.message || 'Error inesperado al procesar el pago',
            variant: 'destructive'
          });
          setIsProcessing(false);
          return;
        }
      } else {
        console.log('⚠️ [SummaryStep] No se requiere procesamiento de pago con Stripe, continuando con la creación de reserva');
      }
      
      // Log antes de crear la reserva
      console.log('📋 [SummaryStep] Procediendo a crear la reserva con los siguientes parámetros:', {
        paymentMethod: state.selectedPayment,
        paymentType: selectedPaymentType,
        hasCardMethod: !!selectedCardMethod
      });
      
      // Procesar la creación de reservas con el método de pago seleccionado
      const result = await submitClassBooking({
        paymentMethod: state.selectedPayment as PaymentMethodEnum,
        paymentType: selectedPaymentType || undefined,
        paymentMethodDetails: state.selectedPayment === 'card' && selectedCardMethod 
          ? selectedCardMethod as { id: string; [key: string]: any }
          : undefined,
        guaranteePercentage: selectedPaymentType === 'guarantee' ? guaranteePercentage : undefined
      });
      
      if (result.error) {
        console.error('❌ [SummaryStep] Error al crear la reserva:', result.error);
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive'
        })
        setIsProcessing(false)
        return
      }
      
      console.log('📋 [SummaryStep] Reserva creada exitosamente, avanzando a confirmación')
      toast({
        title: 'Reserva exitosa',
        description: 'Tu reserva ha sido procesada correctamente',
        variant: 'default'
      })
      
      // Solo avanzar al paso de confirmación si la reserva fue exitosa
      // Implementamos un retraso mínimo de 1 segundo antes de avanzar
      const processStartTime = Date.now();
      const minProcessTime = 1000; // 1 segundo en milisegundos
      
      // Calcular cuánto tiempo ha pasado desde que comenzó el proceso
      const elapsedTime = Date.now() - processStartTime;
      
      // Si ha pasado menos de 1 segundo, esperamos la diferencia
      if (elapsedTime < minProcessTime) {
        await new Promise(resolve => setTimeout(resolve, minProcessTime - elapsedTime));
      }
      
      goToStep('confirmation')
    } catch (error: any) {
      console.error('❌ [SummaryStep] Error inesperado al crear la reserva:', error)
      toast({
        title: 'Error', 
        description: error?.message || 'Error al procesar el pago',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
      // Ocultamos el overlay cuando termina el proceso
      setShowOverlay(false)
    }
  }, [isProcessing, state.selectedPayment, selectedPaymentType, selectedCardMethod, selectedSession, submitClassBooking, toast, goToStep, empresaId, stripeAccountId, state.selectedClass])

  // Escuchar evento de crear reserva desde el botón Continuar
  // Usar useCallback para crear una función estable
  const handleCreateReservationEvent = useCallback(() => {
    console.log('📣 Evento de creación de reserva recibido')
    // Solo avanzar a la creación de reserva si estamos en la vista de pago en móvil
    // o si estamos en desktop
    if (!isMobile || mobileView === 'payment') {
      handleCreateReservation()
    } else {
      // Si estamos en la vista de detalles en móvil, cambiar a la vista de pago
      setMobileView('payment')
    }
  }, [handleCreateReservation, isMobile, mobileView]) // Añadimos mobileView como dependencia
  
  useEffect(() => {
    // Escuchar un evento personalizado que se emitirá desde ClassRegistrationForm
    window.addEventListener('create-class-reservation', handleCreateReservationEvent)

    // Limpiar el listener al desmontar
    return () => {
      window.removeEventListener('create-class-reservation', handleCreateReservationEvent)
    }
  }, [handleCreateReservationEvent]) // Solo se vuelve a ejecutar si cambia handleCreateReservationEvent

  // Función para manejar el clic del botón de navegación en modo móvil
  const handleNavigationButtonClick = useCallback(() => {
    if (isMobile) {
      if (mobileView === 'details') {
        // Si estamos en la vista de detalles, cambiamos a la vista de pago
        setMobileView('payment');
        return true; // Indicamos que manejamos el evento
      }
      // En la vista de pago, dejamos que el manejador normal haga su trabajo
    }
    return false; // No manejamos el evento, dejamos que el handler por defecto lo maneje
  }, [isMobile, mobileView]);
  
  // Registrar un evento personalizado para interceptar clics en el botón "Continuar"
  useEffect(() => {
    const handleStepButtonClick = (event: Event) => {
      // Si manejamos el evento, detenemos la propagación
      if (handleNavigationButtonClick()) {
        event.stopPropagation();
        event.preventDefault();
      }
    };
    
    // Escuchar eventos de clic en el botón de navegación del paso
    document.addEventListener('step-navigation-next-click', handleStepButtonClick);
    
    return () => {
      document.removeEventListener('step-navigation-next-click', handleStepButtonClick);
    };
  }, [handleNavigationButtonClick]);

  // Función para manejar el clic del botón de volver en modo móvil
  const handleBackButtonClick = useCallback(() => {
    if (isMobile && mobileView === 'payment') {
      // Si estamos en la vista de pago, volvemos a la vista de detalles
      setMobileView('details');
      return true; // Indicamos que manejamos el evento
    }
    return false; // No manejamos el evento, dejamos que el handler por defecto lo maneje
  }, [isMobile, mobileView]);
  
  // Registrar un evento personalizado para interceptar clics en el botón "Volver"
  useEffect(() => {
    const handleStepBackClick = (event: Event) => {
      // Si manejamos el evento, detenemos la propagación
      if (handleBackButtonClick()) {
        event.stopPropagation();
        event.preventDefault();
      }
    };
    
    // Escuchar eventos de clic en el botón de volver del paso
    document.addEventListener('step-navigation-back-click', handleStepBackClick);
    
    return () => {
      document.removeEventListener('step-navigation-back-click', handleStepBackClick);
    };
  }, [handleBackButtonClick]);

  // Verificar si el usuario tiene paquetes activos y si son válidos para la clase
  useEffect(() => {
    // Evitamos ejecuciones innecesarias
    if (state.isGuest) return
    
    // Si no tenemos una clase o branch seleccionada, no hay nada que verificar
    if (!state.selectedClass?.branchInfo?.id) return
    
    const checkActivePackages = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user?.id) return

        const activePackages = await userPackageService.getUserActivePackages(session.user.id)
        if (activePackages.length > 0) {
          const pkg = activePackages[0]
          // Asegurarnos de que el estado coincida con nuestro tipo
          setActivePackage({
            ...pkg,
            status: pkg.status === 'cancelled' ? 'inactive' : pkg.status
          } as UserPackageFromDB)

          // Verificar si el paquete es válido para la sede de la clase
          // Usando type assertion para acceder a la propiedad package que TypeScript no reconoce en el tipo
          const packageData = pkg as unknown as { package?: { branch_ids?: string[] } }
          if (packageData?.package?.branch_ids && state.selectedClass?.branchInfo?.id) {
            const isValid = packageData.package.branch_ids.includes(state.selectedClass.branchInfo.id)
            setIsPackageValidForClass(isValid)
          }
        }
      } catch (error) {
        console.error('❌ Error al verificar paquetes activos:', error)
      }
    }

    // Ejecutamos la verificación solo cuando sea necesario
    checkActivePackages()
  }, [state.isGuest, state.selectedClass?.branchInfo?.id]) // Dependencias más específicas

  // Componente para mostrar información de depuración si es necesario
  const DebugInfo = useCallback(() => {
    const showDebug = false; // Cambiar a true para mostrar información de depuración en el UI
    
    if (!showDebug) return null;
    
    return (
      <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50 text-xs">
        <h4 className="font-semibold mb-2">Información de depuración:</h4>
        <div className="space-y-1">
          <p><span className="font-medium">ID Organización Cliente:</span> {organization?.id || 'No disponible'}</p>
          <p><span className="font-medium">ID Organización Admin:</span> {adminOrganization?.id || 'No disponible'}</p>
          <p><span className="font-medium">ID Empresa Usuario:</span> {user?.metadata?.empresa_id || 'No disponible'}</p>
          <p><span className="font-medium">ID Empresa Seleccionado:</span> {empresaId || 'No disponible'}</p>
          <p><span className="font-medium">ID Cuenta Stripe:</span> {stripeAccountId || 'No disponible'}</p>
          <p><span className="font-medium">Stripe Conectado:</span> {isConnected ? 'Sí' : 'No'}</p>
          <p><span className="font-medium">ID Usuario:</span> {user?.id || 'No disponible'}</p>
        </div>
      </div>
    );
  }, [organization, adminOrganization, user, empresaId, stripeAccountId, isConnected]);

  // Componente para el precio total
  const TotalPriceDisplay = useCallback(() => {
    // Si no hay sesión seleccionada, no renderizar
    if (!selectedSession) return null;
    
    // Calcular el precio según el tipo de pago seleccionado
    let price = selectedSession.price;
    let priceLabel = "Precio Total";
    
    // Si el tipo de pago es "deposit" (seña) y hay configuración de pago con porcentaje de pago parcial
    if (selectedPaymentType === 'deposit' && state.selectedClass?.payment_config?.partialPaymentPercentage) {
      const percentage = state.selectedClass.payment_config.partialPaymentPercentage;
      price = (price * percentage) / 100;
      priceLabel = `Seña (${percentage}%)`;
    }
    
    // Formatear el precio
    const formatted = price.toFixed(2);
    const [integerPart, decimalPart] = formatted.split('.');
    
    return (
      <div className="flex flex-col items-center justify-center py-5 my-4">
        {/* Título de Precio Total o Seña */}
        <p className="text-sm font-semibold mb-2 text-gray-500">
          {priceLabel}
        </p>

        {/* Precio con decimales estilizados */}
        <p className="text-5xl font-semibold leading-none mb-4 text-gray-900">
          €{integerPart}<span className="opacity-40 text-gray-600">.{decimalPart}</span>
        </p>

        {/* Indicador de Pago Seguro */}
        <div className="flex items-center justify-center gap-2">
          <IconLock className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-medium text-gray-500">
            Pago seguro garantizado
          </span>
        </div>
      </div>
    );
  }, [selectedSession, selectedPaymentType, state.selectedClass?.payment_config]);

  // Determinar si el tipo de pago seleccionado requiere tarjeta
  const showCardPaymentSection = useMemo(() => {
    return requiresCardPayment(selectedPaymentType);
  }, [selectedPaymentType]);

  if (!selectedSession || !state.selectedClass) {
    return (
      <StepContainer stepId="summary-error">
        <StepHeader 
          title="Error en la reserva" 
          subtitle="No se ha seleccionado una clase o sesión válida" 
        />
        <div className="mt-6 flex flex-col items-center justify-center">
          <IconLoader2 className="w-8 h-8 text-gray-400 animate-spin" />
          <p className="mt-4 text-sm text-gray-600">
            Redirigiendo a la selección de clase...
          </p>
        </div>
      </StepContainer>
    )
  }

  // A partir de aquí, sabemos que selectedClass y selectedSession no son null
  const selectedClass = state.selectedClass;

  const { dayName, dayNumber, month } = formatSessionDate(selectedSession.date)
  const timeSlot = selectedClass.schedule.timeSlots[0]

  // Renderizado de los detalles de la reserva
  const ReservationDetails = useCallback(() => (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white/60 overflow-hidden">
      {/* Secciones de detalles con iconos */}
      <div className="p-6 space-y-4">
        {/* Fecha y horario */}
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-md bg-gray-100">
            <IconCalendar className="h-4 w-4 text-gray-500" />
          </div>
          <div className="flex-1">
            <div className="space-y-1 pb-2">
              <p className="text-sm font-semibold text-gray-900">
                Fecha Seleccionada
              </p>
              <p className="text-sm text-gray-600">
                {dayName}, {dayNumber} de {month} | {selectedSession.startTime} - {selectedSession.endTime}
              </p>
            </div>
            <div className="border-b border-gray-200 my-2" />
          </div>
        </div>

        {/* Ubicación */}
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-md bg-gray-100">
            <IconMapPin className="h-4 w-4 text-gray-500" />
          </div>
          <div className="flex-1">
            <div className="space-y-1 pb-2">
              <p className="text-sm font-semibold text-gray-900">
                Ubicación de la Reserva
              </p>
              <div className="space-y-1">
                {selectedClass.branchInfo && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Sede:</span>{' '}
                    {selectedClass.branchInfo.name}
                  </p>
                )}
                {selectedSession.courts && selectedSession.courts.length > 0 && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Cancha:</span>{' '}
                    {selectedSession.courts[0].name}
                    {selectedSession.courts[0].description && (
                      <span className="text-gray-500 text-xs ml-1">
                        ({selectedSession.courts[0].description})
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
            <div className="border-b border-gray-200 my-2" />
          </div>
        </div>

        {/* Detalles de la clase */}
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-md bg-gray-100">
            <IconClock className="h-4 w-4 text-gray-500" />
          </div>
          <div className="flex-1">
            <div className="space-y-1 pb-2">
              <p className="text-sm font-semibold text-gray-900">
                Detalles de la clase
              </p>
              <div className="space-y-1">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Nombre:</span>{' '}
                  {selectedClass.title}
                </p>
                {selectedSession.instructor && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Instructor:</span>{' '}
                    {selectedSession.instructor}
                  </p>
                )}
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Tipo:</span>{' '}
                  {selectedClass.is_recurring ? 'Clase recurrente' : 'Clase única'}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Cupos disponibles:</span>{' '}
                  {selectedSession.spotsLeft} de {selectedSession.totalSpots}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  ), [selectedClass, selectedSession, dayName, dayNumber, month]);

  // Sección de tipo de pago
  const PaymentTypesSection = useCallback(() => {
    // Filtrar los tipos de pago basados en los métodos disponibles de la clase
    const availablePaymentTypes = PAYMENT_TYPES.filter(type => {
      // Mapeo entre PaymentTypeEnum y los valores de la tabla classes
      const paymentTypeToMethodMap: Record<string, PaymentMethod> = {
        'booking': 'pay_at_club',
        'full': 'full_payment',
        'deposit': 'partial_payment',
        'guarantee': 'guarantee'
      };
      
      // Verificar si el método de pago correspondiente está disponible en la clase
      const methodToCheck = paymentTypeToMethodMap[type.id];
      return state.selectedClass?.availablePaymentMethods?.includes(methodToCheck);
    });

    return (
      <div className="space-y-4">
        <div className="mb-2">
          <h3 className="text-sm font-medium text-gray-700">
            Elige cómo deseas realizar el pago
          </h3>
        </div>

        <PaymentTypeSection
          selectedType={selectedPaymentType}
          onSelect={handlePaymentTypeSelection}
          viewType={isMobile ? 'mobile' : 'desktop'}
          paymentTypes={availablePaymentTypes}
          paymentConfig={state.selectedClass?.payment_config}
        />
      </div>
    );
  }, [selectedPaymentType, handlePaymentTypeSelection, isMobile, state.selectedClass?.availablePaymentMethods, state.selectedClass?.payment_config]);

  // Sección de métodos de pago con tarjeta
  const CardPaymentSection = useCallback(() => (
    <div className="space-y-4">
      <div className="mb-2">
        <h3 className="text-sm font-medium text-gray-700">
          Selecciona o agrega una tarjeta
        </h3>
      </div>

      <PaymentSectionWithStripe
        selectedMethod={selectedCardMethod}
        onShowMethods={handleShowPaymentMethods}
        onUpdateMethod={handleUpdatePaymentMethod}
        onRemoveMethod={handleRemovePaymentMethod}
        viewType={isMobile ? 'mobile' : 'desktop'}
        stripeAccountId={stripeAccountId || ''}
        expandCardList={showCardMethodsList}
      />
    </div>
  ), [selectedCardMethod, showCardMethodsList, isMobile, handleShowPaymentMethods, handleUpdatePaymentMethod, handleRemovePaymentMethod, stripeAccountId]);

  // Componente de Layout para Desktop
  const DesktopLayout = useCallback(({ children }: { children: React.ReactNode }) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="w-full max-w-6xl mx-auto rounded-xl overflow-hidden shadow-lg"
    >
      {children}
    </motion.div>
  ), []);

  return (
    <StepContainer stepId="summary" centered={false}>
      {/* Overlay de procesamiento */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 0.5, 
              ease: "easeInOut"
            }}
            className="fixed inset-0 flex items-center justify-center z-[9999] bg-white/70 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="text-center"
            >
              <div className="flex items-center justify-center">
                {/* Aplicamos la animación a cada letra individualmente con transición de color */}
                {'Simple Link'.split('').map((letter, index) => (
                  <motion.span
                    key={index}
                    className={`text-xl font-medium ${letter === ' ' ? 'mx-1' : ''}`}
                    animate={{
                      color: ['#374151', '#94a3b8', '#374151'], // Transición de color: gris oscuro -> gris claro -> gris oscuro
                      opacity: [1, 0.6, 1]
                    }}
                    transition={{
                      duration: 1.8,
                      times: [0, 0.5, 1], // Distribución del tiempo para cada valor de animación
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: index * 0.07, // Delay sutil entre letras
                    }}
                  >
                    {letter}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {isContentVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full"
          >
            {isMobile ? (
              // Layout móvil - una columna con dos vistas
              <div className="w-full max-w-lg mx-auto space-y-6 px-4">
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold mb-1 text-gray-900">
                    {mobileView === 'details' ? '' : ''}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {mobileView === 'details' 
                      ? '' 
                      : ''}
                  </p>
                </div>
                <AnimatePresence mode="wait">
                  {mobileView === 'details' ? (
                    <motion.div
                      key="details"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <TotalPriceDisplay />
                      <ReservationDetails />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="payment"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <TotalPriceDisplay />
                      
                      {/* Contenedor unificado para la sección de pago similar a ReservationDetails */}
                      <div className="space-y-4 rounded-lg border border-gray-200 bg-white/60 overflow-hidden">
                        <div className="p-6 space-y-6">
                          {/* Título y subtítulo de la sección */}
                          <div className="flex items-start gap-3">
                            <div className="hidden sm:flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-md bg-gray-100">
                              <IconCreditCard className="h-4 w-4 text-gray-500" />
                            </div>
                            <div className="flex-1">
                              <div className="space-y-1 pb-2">
                                <p className="text-sm font-semibold text-gray-900">
                                  Finaliza tu reserva
                                </p>
                                <p className="text-sm text-gray-600">
                                  Configura los detalles de pago para confirmar tu reserva
                                </p>
                              </div>
                              <div className="border-b border-gray-200 my-2" />
                            </div>
                          </div>
                          
                          {/* Elementos de pago con mejor separación */}
                          <PaymentTypesSection />
                          <div className="border-b border-gray-200 my-4" />
                          {showCardPaymentSection && <CardPaymentSection />}
                        </div>
                      </div>
                      
                      <DebugInfo />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              // Layout desktop - dos columnas con estilo de DesktopSummaryLayout
              <DesktopLayout>
                <div className="flex flex-row w-full h-full">
                  {/* Columna izquierda: Configuración de pago */}
                  <div className="w-1/2 py-8 px-6 overflow-y-auto bg-white">
                    <div className="w-full max-w-lg mx-auto space-y-6">
                      {/* Título y subtítulo principal */}
                      <div className="mb-6">
                        <h2 className="text-xl font-semibold mb-1 text-gray-900">
                          Finaliza tu reserva
                        </h2>
                        <p className="text-sm text-gray-500">
                          Configura los detalles de pago para confirmar tu reserva
                        </p>
                      </div>
                      
                      <PaymentTypesSection />
                      {showCardPaymentSection && <CardPaymentSection />}
                      <DebugInfo />
                    </div>
                  </div>
                  
                  {/* Columna derecha: Detalles y total */}
                  <div className="w-1/2 py-8 px-6 overflow-y-auto bg-gray-50">
                    <div className="w-full max-w-lg mx-auto">
                      <TotalPriceDisplay />
                      <ReservationDetails />
                    </div>
                  </div>
                </div>
              </DesktopLayout>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Espacio para la navegación (StepNavigation se mostrará al final de la página) */}
      <div className="w-full h-12 md:h-16"></div>
      
      <StepNavigation
        isProcessing={isProcessing}
        nextLabel="Confirmar reserva"
      />
    </StepContainer>
  )
}
