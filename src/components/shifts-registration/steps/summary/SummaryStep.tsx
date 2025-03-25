'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { useShiftForm } from '../../context/ShiftFormContext';
import { StepComponentProps } from '../StepRenderer';
import { StepNavigation } from '../../shared/StepNavigation';
import { Button } from '@/components/ui/button';
import { IconCalendar, IconClock, IconLock, IconMapPin, IconCreditCard, IconChevronDown, IconChevronRight, IconX, IconCheck, IconPackage } from '@tabler/icons-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { PaymentTypeEnum } from '@/components/shifts-registration/components/payment-types';
import { PaymentTypeSection } from '@/components/shifts-registration/components/PaymentTypeSection';
import { PaymentSectionWithStripe, PaymentMethod as StripePaymentMethod } from '@/components/shifts-registration/components/PaymentSection';
import { useStripeConfig } from '@/hooks/useStripeConfig';
import { useAuth } from '@/contexts/AuthContext';
import { useClientOrganizationContext } from '@/contexts/ClientOrganizationContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { MobileLayout } from '../../shared/MobileLayout';
// Nuevos imports para el procesamiento de reservas de turnos
import { shiftBookingService } from '@/services/shiftBookingService';
import { PaymentMethodEnum, PaymentStatusEnum } from '@/types/bookings';
// Importar los servicios de pago
import { fullPaymentService } from '@/services/full-payment-client.service';
import { depositPaymentService } from '@/services/deposit-payment-client.service';

// Función para formatear la fecha en un formato legible
const formatShiftDate = (dateString: string) => {
  try {
    const date = parseISO(dateString);
    const dayName = format(date, 'EEEE', { locale: es });
    const dayNumber = format(date, 'd');
    const month = format(date, 'MMMM', { locale: es });
    return {
      dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
      dayNumber,
      month
    };
  } catch (error) {
    console.error('Error al parsear la fecha:', error);
    return {
      dayName: 'Día',
      dayNumber: '-',
      month: 'Mes'
    };
  }
};

export function SummaryStep({ 
  onNext, 
  onPrevious, 
  isLastStep, 
  isFirstStep, 
  progress, 
  viewType 
}: StepComponentProps) {
  const { state, dispatch } = useShiftForm();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isContentVisible, setIsContentVisible] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentTypeEnum | null>(null);
  const [selectedCardMethod, setSelectedCardMethod] = useState<StripePaymentMethod | null>(null);
  const [showCardMethodModal, setShowCardMethodModal] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [summarySubStep, setSummarySubStep] = useState<'details' | 'payment'>('details');
  const [showPaymentList, setShowPaymentList] = useState(false);
  const [itemsData, setItemsData] = useState<any[]>([]);
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  // Obtenemos la información necesaria para el ID de Stripe (igual que en classes)
  const { user } = useAuth();
  const { organization } = useClientOrganizationContext();
  const { organization: adminOrganization } = useOrganization();

  // Determinamos el ID de empresa a usar, priorizando el del contexto del cliente
  const empresaId = useMemo(() => 
    organization?.id || adminOrganization?.id || user?.metadata?.empresa_id
  , [organization?.id, adminOrganization?.id, user?.metadata?.empresa_id]);

  // Obtener la configuración de Stripe usando el ID de empresa
  const { stripeAccountId, isConnected } = useStripeConfig(empresaId || null);

  // Log para depuración
  useEffect(() => {
    console.log('[SummaryStep-Shifts] IDs disponibles:', {
      clientOrgId: organization?.id,
      adminOrgId: adminOrganization?.id,
      userMetadataEmpresaId: user?.metadata?.empresa_id,
      selectedEmpresaId: empresaId,
      stripeAccountId,
      isConnected,
      userId: user?.id
    });
  }, [organization?.id, adminOrganization?.id, user?.metadata?.empresa_id, empresaId, stripeAccountId, isConnected, user?.id]);

  // Ref para exponer métodos y estados al componente padre
  const summaryStepRef = useRef<any>({});
  
  // Detectar si es dispositivo móvil usando el hook
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Efecto para la animación del contenido
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsContentVisible(true);
    }, 50);
    
    return () => clearTimeout(timer);
  }, []);

  // Efecto para cargar los datos de los ítems desde localStorage
  useEffect(() => {
    try {
      const storedItemsData = window.localStorage.getItem('itemsWithStockData');
      if (storedItemsData) {
        const parsedData = JSON.parse(storedItemsData);
        setItemsData(parsedData);
        console.log('📋 [SummaryStep] Datos de ítems cargados del localStorage:', parsedData);
      }
    } catch (e) {
      console.error('❌ [SummaryStep] Error al cargar datos de ítems desde localStorage:', e);
    }
  }, []);

  // Verificar la validez de la fecha
  const isValid = (date: Date): boolean => {
    return !isNaN(date.getTime());
  };

  // Manejar selección de método de pago
  const handleSelectPaymentMethod = useCallback((method: PaymentTypeEnum) => {
    setSelectedPaymentMethod(method);
    setShowPaymentList(false);
  }, []);

  // Manejar clics fuera del componente para cerrar la lista
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowPaymentList(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Manejar la creación de reserva
  const handleCreateReservation = useCallback(async () => {
    if (isProcessing || !selectedPaymentMethod) {
      if (!selectedPaymentMethod) {
        toast({
          title: 'Método de pago requerido',
          description: 'Por favor, selecciona un método de pago para continuar',
          variant: 'destructive'
        });
      }
      return;
    }
    
    // Validar que hay una tarjeta seleccionada si el método de pago lo requiere
    if ((selectedPaymentMethod === 'guarantee' || selectedPaymentMethod === 'card' || selectedPaymentMethod === 'full' || selectedPaymentMethod === 'deposit') && !selectedCardMethod) {
      toast({
        title: 'Tarjeta requerida',
        description: 'Por favor, selecciona una tarjeta para continuar',
        variant: 'destructive'
      });
      return;
    }
    
    setIsProcessing(true);
    setShowOverlay(true);
    
    let paymentAmount = 0;
    
    try {
      // Obtener los detalles del turno
      const shiftDetails = state.shiftDetails;
      if (!shiftDetails) {
        throw new Error('No se encontraron los detalles del turno');
      }

      // Verificar si tenemos los IDs necesarios
      if (!user?.id) {
        throw new Error('No se pudo identificar al usuario');
      }

      if (!empresaId) {
        throw new Error('No se pudo identificar la empresa');
      }

      // Determinar si se necesita procesar el pago con tarjeta a través de Stripe
      const isCardPayment = 
        (selectedPaymentMethod === 'card' || 
         selectedPaymentMethod === 'full' || 
         selectedPaymentMethod === 'deposit') && 
        selectedCardMethod && 
        stripeAccountId;
        
      // Obtener el porcentaje de garantía del contexto, con valor predeterminado si no está configurado
      const guaranteePercentage = state.paymentPercentages?.garantia || 
                               state.paymentPercentages?.guarantee || 
                               40; // Porcentaje predeterminado actualizado a 40%

      // Obtener el porcentaje de seña del contexto con valor predeterminado
      const depositPercentage = state.paymentPercentages?.sena ||
                               state.paymentPercentages?.deposit ||
                               25; // Porcentaje predeterminado para seña
      
      // Solo procesar pago con Stripe si se seleccionó método de tarjeta
      if (isCardPayment && selectedCardMethod) {
        // Obtener el customer ID de Stripe
        const stripeCustomerId = selectedCardMethod.customerId;
        
        if (!stripeCustomerId) {
          console.error('❌ [SummaryStep] No se encontró customerId en el método de pago seleccionado');
          throw new Error('No se encontró la información necesaria del cliente para procesar el pago');
        }
        
        // Mostrar mensaje al usuario
        toast({
          title: 'Procesando pago',
          description: selectedPaymentMethod === 'deposit' 
            ? 'Estamos procesando el pago de tu seña...' 
            : 'Estamos procesando tu pago con tarjeta...',
          variant: 'default'
        });
        
        try {
          let paymentResult: any = null; // Usamos any temporalmente para manejar los diferentes tipos de respuesta
          
          if (selectedPaymentMethod === 'deposit') {
            // Procesar pago de seña
            console.log('🔄 [SummaryStep] Procesando pago de SEÑA con depositPaymentService...');
            // Calcular el precio total (turno + ítems)
            const totalAmount = shiftDetails.price + state.itemsTotalPrice;
            paymentResult = await depositPaymentService.processPayment({
              paymentMethodId: selectedCardMethod.id,
              amount: totalAmount * (depositPercentage / 100), // Calculamos el monto de la seña según el porcentaje
              totalAmount: totalAmount,
              depositPercentage: depositPercentage,
              empresaId: empresaId || '',
              description: `Seña - Turno en ${shiftDetails.courtName}`,
              stripeCustomerId: stripeCustomerId,
              stripeAccountId: stripeAccountId
            });
          } else {
            // Procesar pago completo
            console.log('🔄 [SummaryStep] Procesando PAGO COMPLETO con fullPaymentService...');
            // Calcular el precio total (turno + ítems)
            const totalAmount = shiftDetails.price + state.itemsTotalPrice;
            paymentResult = await fullPaymentService.processPayment({
              paymentMethodId: selectedCardMethod.id,
              amount: totalAmount,
              empresaId: empresaId || '',
              description: `Pago completo - Turno en ${shiftDetails.courtName}`,
              stripeCustomerId: stripeCustomerId,
              stripeAccountId: stripeAccountId
            });
          }
          
          console.log('✅ [SummaryStep] Resultado del procesamiento de pago:', paymentResult);
          
          // Calcular el monto de depósito basado en el tipo de pago y el resultado
          if (selectedPaymentMethod === 'deposit' && paymentResult?.depositAmount) {
            paymentAmount = paymentResult.depositAmount;
          } else if ((selectedPaymentMethod === 'full' || selectedPaymentMethod === 'card') && paymentResult?.success) {
            paymentAmount = shiftDetails.price + state.itemsTotalPrice;
          }
              
          console.log('💰 [SummaryStep] Monto de depósito a registrar:', paymentAmount);
          
          // Verificar el resultado del pago
          if (!paymentResult?.success) {
            console.error('❌ [SummaryStep] Error al procesar el pago:', paymentResult?.error);
            toast({
              title: 'Error de pago',
              description: paymentResult?.message || 'No se pudo procesar el pago con tarjeta',
              variant: 'destructive'
            });
            setIsProcessing(false);
            setShowOverlay(false);
            return;
          }
          
          console.log('✅ [SummaryStep] Pago procesado correctamente:', {
            paymentIntentId: paymentResult.paymentIntentId,
            status: paymentResult.chargeStatus,
            isDepositPayment: selectedPaymentMethod === 'deposit',
            depositAmount: selectedPaymentMethod === 'deposit' && 'depositAmount' in paymentResult ? paymentResult.depositAmount : null,
            totalAmount: selectedPaymentMethod === 'deposit' && 'totalAmount' in paymentResult ? paymentResult.totalAmount : shiftDetails.price + state.itemsTotalPrice
          });
          
          toast({
            title: 'Pago exitoso',
            description: selectedPaymentMethod === 'deposit' 
              ? 'Tu seña ha sido procesada correctamente' 
              : 'Tu pago ha sido procesado correctamente',
            variant: 'default'
          });
          
          // Guardar el ID del payment intent como respaldo
          try {
            localStorage.setItem('lastPaymentIntentId', paymentResult.paymentIntentId || '');
            localStorage.setItem('lastPaymentTimestamp', new Date().toISOString());
            if (selectedPaymentMethod === 'deposit' && 
                'depositAmount' in paymentResult && 
                'totalAmount' in paymentResult && 
                'depositPercentage' in paymentResult) {
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
          setShowOverlay(false);
          return;
        }
      } else {
        console.log('⚠️ [SummaryStep] No se requiere procesamiento de pago con Stripe, continuando con la creación de reserva');
      }
      
      // Mapear el tipo de pago a PaymentMethodEnum
      const paymentMethodMap: Record<string, PaymentMethodEnum> = {
        'cash': 'cash',
        'card': 'card',
        'full': 'card',
        'deposit': 'card',
        'guarantee': 'card',
        'transfer': 'transfer'
      };

      const paymentMethod = paymentMethodMap[selectedPaymentMethod] || 'cash';
      const paymentStatus = 
        selectedPaymentMethod === 'full' || selectedPaymentMethod === 'card' 
          ? 'completed' as PaymentStatusEnum
          : selectedPaymentMethod === 'deposit' 
            ? 'partial' as PaymentStatusEnum
            : 'pending' as PaymentStatusEnum;
            
      // Obtener los datos completos de los ítems seleccionados desde localStorage
      let itemsDataToUse = itemsData;
      
      // Log antes de crear la reserva
      console.log('📋 [SummaryStep] Procediendo a crear la reserva con los siguientes parámetros:', {
        paymentMethod,
        paymentType: selectedPaymentMethod,
        paymentStatus,
        hasCardMethod: !!selectedCardMethod,
        depositAmount: paymentAmount,
        selectedItems: state.selectedItems,
        itemsTotalPrice: state.itemsTotalPrice,
        itemsCompleteData: itemsDataToUse.length > 0 ? itemsDataToUse : 'No disponible'
      });
      
      // Crear la reserva de turno usando el servicio
      const bookingResult = await shiftBookingService.createShiftBooking(
        shiftDetails, 
        {
          userId: user.id,
          empresaId: empresaId,
          paymentMethod,
          paymentStatus,
          paymentType: selectedPaymentMethod as PaymentTypeEnum,
          stripePaymentMethodId: selectedCardMethod?.id,
          guaranteePercentage: selectedPaymentMethod === 'guarantee' ? guaranteePercentage : undefined,
          depositAmount: paymentAmount,  // Usamos el monto calculado basado en el resultado del pago
          rentalItems: state.selectedItems,
          rentalItemsPrice: state.itemsTotalPrice,
          itemsData: itemsDataToUse // Pasamos los datos completos de los ítems
        }
      );
      
      if (bookingResult.error) {
        console.error('❌ [SummaryStep] Error al crear la reserva de turno:', bookingResult.error);
        toast({
          title: 'Error de reserva',
          description: bookingResult.error.message || 'No se pudo completar la reserva',
          variant: 'destructive'
        });
        setIsProcessing(false);
        setShowOverlay(false);
        return;
      }
      
      // Si llegamos aquí, la reserva fue creada exitosamente
      console.log('✅ [SummaryStep] Reserva de turno creada con éxito. ID:', bookingResult.id);
      
      // Guardar el ID de la reserva en el estado
      dispatch({ type: 'SET_BOOKING_ID', payload: bookingResult.id || '' });
      
      // Mostrar mensaje de éxito
      toast({
        title: 'Reserva creada',
        description: 'Tu reserva ha sido procesada correctamente',
        variant: 'default'
      });
      
      // Esperar un segundo antes de avanzar para que el usuario vea el mensaje
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Avanzar al siguiente paso
      onNext();
    } catch (error: any) {
      console.error('Error al procesar la reserva:', error);
      toast({
        title: 'Error',
        description: error?.message || 'No se pudo procesar la reserva',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
      setShowOverlay(false);
    }
  }, [isProcessing, selectedPaymentMethod, selectedCardMethod, onNext, toast, state.shiftDetails, user, empresaId, stripeAccountId, dispatch]);

  // Manejar la navegación entre sub-pasos
  const handleNextSubStep = useCallback(() => {
    if (summarySubStep === 'details') {
      setSummarySubStep('payment');
    } else {
      handleCreateReservation();
    }
  }, [summarySubStep, handleCreateReservation]);

  // Manejar el retroceso entre sub-pasos
  const handlePreviousSubStep = useCallback(() => {
    if (summarySubStep === 'payment') {
      setSummarySubStep('details');
    } else {
      onPrevious();
    }
  }, [summarySubStep, onPrevious]);
  
  // Mantener el ref actualizado con los valores actuales
  useEffect(() => {
    // Función para publicar actualizaciones
    const publishStateUpdate = () => {
      // Actualizar el ref con los datos actuales
      summaryStepRef.current = {
        summarySubStep,
        selectedPaymentMethod,
        selectedCardMethod,
        isProcessing,
        handleNextSubStep,
        handlePreviousSubStep
      };
      
      // Exponer los datos para el StepRenderer si estamos en vista móvil
      if (isMobile && typeof window !== 'undefined') {
        (window as any).__summaryStepData = summaryStepRef.current;
        
        // Disparar un evento personalizado para que los listeners puedan reaccionar inmediatamente
        const event = new CustomEvent('summary-step-update', { 
          detail: summaryStepRef.current 
        });
        window.dispatchEvent(event);
      }
    };
    
    // Publicar estado al montar y cuando cambian las dependencias
    publishStateUpdate();
    
    // Asegurarse de que el StepRenderer puede detectar cambios reactivamente
    const handleBeforeUnload = () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__summaryStepData;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (typeof window !== 'undefined') {
        delete (window as any).__summaryStepData;
      }
    };
  }, [
    isMobile, 
    summarySubStep, 
    selectedPaymentMethod,
    selectedCardMethod, 
    isProcessing, 
    handleNextSubStep, 
    handlePreviousSubStep
  ]);

  // Componente para el precio total
  const TotalPriceDisplay = useCallback(() => {
    // Si no hay detalles del turno seleccionado, no renderizar
    if (!state.shiftDetails) return null;
    
    // Formatear el precio (sumando el precio del turno y el precio de los ítems)
    const shiftPrice = state.shiftDetails?.price || 0;
    const itemsPrice = state.itemsTotalPrice || 0;
    const totalPrice = shiftPrice + itemsPrice;
    const formatted = totalPrice.toFixed(2);
    const [integerPart, decimalPart] = formatted?.split('.');
    
    return (
      <div className="flex flex-col items-center justify-center py-5 my-4">
        {/* Título de Precio Total */}
        <p className="text-sm font-semibold mb-2 text-gray-500">
          Precio Total
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
  }, [state.shiftDetails, state.itemsTotalPrice]);

  // Renderizado de los detalles de la reserva
  const ReservationDetails = useCallback(() => {
    // Verificamos que tengamos toda la información necesaria
    if (!state.shiftDetails) return null;

    // Usamos los detalles del turno para obtener la fecha
    // Si no tenemos fecha en shiftDetails, usamos la fecha actual (sólo para desarrollo)
    const formattedDate = state.shiftDetails.date 
      ? formatShiftDate(state.shiftDetails.date)
      : formatShiftDate(new Date().toISOString());
    
    const { dayName, dayNumber, month } = formattedDate;
    
    // Verificar si hay artículos seleccionados
    const hasItems = Object.keys(state.selectedItems).length > 0;

    return (
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
                  {dayName}, {dayNumber} de {month} | {state.shiftDetails?.startTime} - {state.shiftDetails?.endTime}
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
                  Ubicación del Turno
                </p>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Cancha:</span>{' '}
                    {state.shiftDetails?.courtName}
                  </p>
                </div>
              </div>
              <div className="border-b border-gray-200 my-2" />
            </div>
          </div>

          {/* Detalles del turno */}
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-md bg-gray-100">
              <IconClock className="h-4 w-4 text-gray-500" />
            </div>
            <div className="flex-1">
              <div className="space-y-1 pb-2">
                <p className="text-sm font-semibold text-gray-900">
                  Detalles del Turno
                </p>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Duración:</span>{' '}
                    {state.duration} {state.duration === 1 ? 'hora' : 'horas'}
                  </p>
                </div>
              </div>
              {hasItems && <div className="border-b border-gray-200 my-2" />}
            </div>
          </div>

          {/* Artículos seleccionados */}
          {hasItems && (
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-md bg-gray-100">
                <IconPackage className="h-4 w-4 text-gray-500" />
              </div>
              <div className="flex-1">
                <div className="space-y-1 pb-2">
                  <p className="text-sm font-semibold text-gray-900">
                    Artículos Seleccionados
                  </p>
                  <div className="space-y-3 mt-2">
                    {Object.entries(state.selectedItems).map(([itemId, quantity]) => {
                      // Buscar el item completo en itemsData
                      const itemDetails = itemsData.find(item => item.id === itemId);
                      // Obtener el precio según la duración
                      const itemPrice = itemDetails 
                        ? (itemDetails.duration_pricing && state.duration
                            ? itemDetails.duration_pricing[`${state.duration * 60}`] || 0
                            : 0)
                        : 0;
                      
                      return (
                        <div key={itemId} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-sm text-gray-600">
                              {itemDetails ? itemDetails.name : itemId}
                            </span>
                          </div>
                          <span className="text-sm text-gray-600 font-medium">
                            €{((itemPrice || 0) * quantity).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }, [state.shiftDetails, state.duration, state.selectedItems, state.itemsTotalPrice, itemsData]);

  // Componente para la sección de métodos de pago
  const PaymentMethodsSection = useCallback(() => {
    // Determinar si el método de pago requiere tarjeta
    const requiresCard = selectedPaymentMethod === 'guarantee' 
      || selectedPaymentMethod === 'card' 
      || selectedPaymentMethod === 'full' 
      || selectedPaymentMethod === 'deposit';
    
    return (
      <div className="space-y-4 rounded-lg border border-gray-200 bg-white/60 overflow-hidden">
        <div className="p-6 space-y-4" ref={containerRef}>
          <div>
            <h3 className="text-base font-medium text-gray-900">Finaliza tu reserva</h3>
            <p className="text-sm text-gray-500 mt-1">Configura los detalles de pago para confirmar tu reserva</p>
          </div>
          
          {/* Línea divisoria después del título */}
          <div className="border-t border-gray-200 pt-4"></div>
          
          {/* Título para la sección de tipo de pago */}
          <div>
            <h4 className="text-[14px] font-medium text-gray-700 mb-2">Elige cómo deseas realizar el pago</h4>
          </div>
          
          <PaymentTypeSection 
            selectedPaymentMethod={selectedPaymentMethod}
            setSelectedPaymentMethod={setSelectedPaymentMethod}
          />
          
          {/* Mostrar el selector de tarjeta sólo si el método seleccionado requiere tarjeta */}
          {requiresCard && (
            <>
              {/* Línea divisoria entre secciones */}
              <div className="border-t border-gray-200 pt-4"></div>
              
              <div>
                <h4 className="text-[14px] font-medium text-gray-700 mb-2">
                  Selecciona o agrega una tarjeta
                </h4>
                <PaymentSectionWithStripe
                  selectedMethod={selectedCardMethod}
                  onShowMethods={() => setShowCardMethodModal(true)}
                  onUpdateMethod={(method: StripePaymentMethod) => {
                    console.log('Actualizando método de tarjeta:', method);
                    setSelectedCardMethod(method);
                    return Promise.resolve();
                  }}
                  onRemoveMethod={() => setSelectedCardMethod(null)}
                  theme="light"
                  viewType={isMobile ? "mobile" : "desktop"}
                  expandCardList={!selectedCardMethod}
                  stripeAccountId={stripeAccountId || ''} // Pasar el ID de cuenta de Stripe
                />
              </div>
            </>
          )}
        </div>
      </div>
    );
  }, [selectedPaymentMethod, selectedCardMethod, isMobile, containerRef, stripeAccountId]);

  return (
    <div>
      {/* Overlay de procesamiento */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.2
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

      <AnimatePresence mode="wait">
        {isContentVisible && (
          isMobile ? (
            // Layout móvil usando MobileLayout
            <MobileLayout
              onNext={handleNextSubStep}
              onBack={handlePreviousSubStep}
              nextLabel={summarySubStep === 'payment' ? "Confirmar Reserva" : "Continuar"}
              isNextDisabled={
                summarySubStep === 'payment' && 
                (!selectedPaymentMethod || 
                ((selectedPaymentMethod === 'guarantee' || selectedPaymentMethod === 'card' || selectedPaymentMethod === 'full' || selectedPaymentMethod === 'deposit') && !selectedCardMethod) || 
                isProcessing)
              }
              isProcessing={isProcessing}
              allowScroll={true} // Permitir scroll en el paso de resumen
            >
              <motion.div
                key={summarySubStep}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col h-full"
              >
                {/* Contenido basado en el sub-paso actual */}
                {summarySubStep === 'details' ? (
                  // Sub-paso 1: Detalles de la reserva
                  <>
                    <TotalPriceDisplay />
                    <ReservationDetails />
                  </>
                ) : (
                  // Sub-paso 2: Configuración de pago
                  <>
                    <TotalPriceDisplay />
                    <PaymentMethodsSection />
                  </>
                )}
              </motion.div>
            </MobileLayout>
          ) : (
            // Layout desktop - cambia según el sub-paso
            <motion.div
              key={summarySubStep}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="w-full"
            >
              <div className="w-full max-w-6xl mx-auto">
                <div className="flex flex-col w-full h-full">
                  {summarySubStep === 'details' ? (
                    // Vista de detalles (primer sub-paso)
                    <div className="w-full py-8 px-6 overflow-y-auto">
                      <div className="w-full max-w-xl mx-auto">
                        <TotalPriceDisplay />
                        <ReservationDetails />
                      </div>
                    </div>
                  ) : (
                    // Vista de pago (segundo sub-paso)
                    <>
                      {/* Sección superior: Solo precio total */}
                      <div className="w-full py-8 px-6 overflow-y-auto">
                        <div className="w-full max-w-xl mx-auto">
                          <TotalPriceDisplay />
                        </div>
                      </div>
                      
                      {/* Sección: Configuración de pago */}
                      <div className="w-full py-8 px-6 overflow-y-auto">
                        <div className="w-full max-w-xl mx-auto">
                          <PaymentMethodsSection />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* Navegación con StepNavigation para desktop */}
              <StepNavigation
                onNext={handleNextSubStep}
                onBack={handlePreviousSubStep}
                nextLabel={summarySubStep === 'payment' ? "Confirmar Reserva" : "Continuar"}
                isNextDisabled={
                  summarySubStep === 'payment' && 
                  (!selectedPaymentMethod || 
                  ((selectedPaymentMethod === 'guarantee' || selectedPaymentMethod === 'card' || selectedPaymentMethod === 'full' || selectedPaymentMethod === 'deposit') && !selectedCardMethod) || 
                  isProcessing)
                }
                isProcessing={isProcessing}
              />
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  );
}
