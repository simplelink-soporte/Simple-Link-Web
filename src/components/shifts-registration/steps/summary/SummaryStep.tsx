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
import { usePaymentGatewayByCountry } from '@/hooks/usePaymentGatewayByCountry';
import { useAuth } from '@/contexts/AuthContext';
import { useClientOrganizationContext } from '@/contexts/ClientOrganizationContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { MobileLayout } from '../../shared/MobileLayout';
import { shiftBookingService } from '@/services/shiftBookingService';
import { PaymentMethodEnum, PaymentStatusEnum } from '@/types/bookings';
import { fullPaymentService } from '@/services/full-payment-client.service';
import { depositPaymentService } from '@/services/deposit-payment-client.service';

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
  const [summarySubStep, setSummarySubStep] = useState<'details' | 'payment'>('details');
  const [showPaymentList, setShowPaymentList] = useState(false);
  const [itemsData, setItemsData] = useState<any[]>([]);
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();
  const { organization } = useClientOrganizationContext();
  const { organization: adminOrganization } = useOrganization();

  const empresaId = useMemo(() => 
    organization?.id || adminOrganization?.id || user?.metadata?.empresa_id
  , [organization?.id, adminOrganization?.id, user?.metadata?.empresa_id]);

  const { 
    activeGateway, 
    isLoading: isLoadingGateway,
    stripeAccountId, 
    stripeConnected,
    mercadoPagoUserId,
    mercadoPagoConnected
  } = usePaymentGatewayByCountry(empresaId || null);

  useEffect(() => {
    console.log('[SummaryStep-Shifts] Verificación de pasarelas de pago:', {
      clientOrgId: organization?.id,
      adminOrgId: adminOrganization?.id,
      userMetadataEmpresaId: user?.metadata?.empresa_id,
      selectedEmpresaId: empresaId,
      activeGateway,
      stripeAccountId,
      stripeConnected,
      mercadoPagoUserId,
      mercadoPagoConnected,
      userId: user?.id
    });
  }, [organization?.id, adminOrganization?.id, user?.metadata?.empresa_id, empresaId, activeGateway, stripeAccountId, stripeConnected, mercadoPagoUserId, mercadoPagoConnected, user?.id]);

  const summaryStepRef = useRef<any>({});
  
  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsContentVisible(true);
    }, 50);
    
    return () => clearTimeout(timer);
  }, []);

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

  const isValid = (date: Date): boolean => {
    return !isNaN(date.getTime());
  };

  const handleSelectPaymentMethod = useCallback((method: PaymentTypeEnum) => {
    setSelectedPaymentMethod(method);
    setShowPaymentList(false);
  }, []);

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
    
    if ((selectedPaymentMethod === 'guarantee' || selectedPaymentMethod === 'card' || selectedPaymentMethod === 'full' || selectedPaymentMethod === 'deposit') && !selectedCardMethod) {
      toast({
        title: 'Tarjeta requerida',
        description: 'Por favor, selecciona una tarjeta para continuar',
        variant: 'destructive'
      });
      return;
    }
    
    setIsProcessing(true);
    
    let paymentAmount = 0;
    
    try {
      const shiftDetails = state.shiftDetails;
      if (!shiftDetails) {
        throw new Error('No se encontraron los detalles del turno');
      }

      if (!user?.id) {
        throw new Error('No se pudo identificar al usuario');
      }

      if (!empresaId) {
        throw new Error('No se pudo identificar la empresa');
      }

      const isCardPayment = 
        (selectedPaymentMethod === 'card' || 
         selectedPaymentMethod === 'full' || 
         selectedPaymentMethod === 'deposit') && 
        selectedCardMethod !== null;

      const shouldProcessWithStripe = isCardPayment && activeGateway === 'stripe';
      const shouldProcessWithMercadoPago = isCardPayment && activeGateway === 'mercadopago';
      
      if (isCardPayment) {
        if (activeGateway === 'none') {
          console.error('❌ [SummaryStep] Error al procesar el pago: No hay una pasarela de pago configurada');
          toast({
            title: 'Error de configuración',
            description: activeGateway === 'mercadopago' || activeGateway === 'loading' ? 
              'No se encontró configuración de MercadoPago para procesar el pago' : 
              'No se encontró configuración de Stripe para procesar el pago',
            variant: 'destructive'
          });
          setIsProcessing(false);
          return;
        }
        
        if (shouldProcessWithStripe) {
          if (!stripeAccountId) {
            console.error('❌ [SummaryStep] Error al procesar el pago: No se encontró el ID de cuenta de Stripe');
            toast({
              title: 'Error de pago',
              description: 'No se encontró la configuración de Stripe para procesar el pago',
              variant: 'destructive'
            });
            setIsProcessing(false);
            return;
          }
          
          if (!stripeConnected) {
            console.error('❌ [SummaryStep] Error al procesar el pago: No se pudo conectar con Stripe');
            toast({
              title: 'Error de pago',
              description: 'No se pudo conectar con Stripe para procesar el pago',
              variant: 'destructive'
            });
            setIsProcessing(false);
            return;
          }
        }
        
        if (shouldProcessWithMercadoPago) {
          if (!mercadoPagoUserId) {
            console.error('❌ [SummaryStep] Error al procesar el pago: No se encontró el ID de usuario de MercadoPago');
            toast({
              title: 'Error de pago',
              description: 'No se encontró la configuración de MercadoPago para procesar el pago',
              variant: 'destructive'
            });
            setIsProcessing(false);
            return;
          }
          
          if (!mercadoPagoConnected) {
            console.error('❌ [SummaryStep] Error al procesar el pago: No se pudo conectar con MercadoPago');
            toast({
              title: 'Error de pago',
              description: 'No se pudo conectar con MercadoPago para procesar el pago',
              variant: 'destructive'
            });
            setIsProcessing(false);
            return;
          }
        }
      }
      
      // Obtener el porcentaje de garantía del contexto, con valor predeterminado si no está configurado
      const guaranteePercentage = state.paymentPercentages?.garantia || 
                               state.paymentPercentages?.guarantee || 
                               40; // Porcentaje predeterminado actualizado a 40%

      // Obtener el porcentaje de seña del contexto con valor predeterminado
      const depositPercentage = state.paymentPercentages?.sena ||
                               state.paymentPercentages?.deposit ||
                               25; // Porcentaje predeterminado para seña

      if (isCardPayment && selectedCardMethod) {
        const stripeCustomerId = selectedCardMethod.customerId;
        
        if (!stripeCustomerId) {
          console.error('❌ [SummaryStep] No se encontró customerId en el método de pago seleccionado');
          throw new Error('No se encontró la información necesaria del cliente para procesar el pago');
        }
        
        toast({
          title: 'Procesando pago',
          description: selectedPaymentMethod === 'deposit' 
            ? 'Estamos procesando el pago de tu seña...' 
            : 'Estamos procesando tu pago con tarjeta...',
          variant: 'default'
        });
        
        try {
          let paymentResult: any = null; 
          
          if (selectedPaymentMethod === 'deposit') {
            console.log(`🔄 [SummaryStep] Procesando pago de SEÑA con ${activeGateway === 'mercadopago' ? 'MercadoPago' : 'Stripe'}...`);
            const totalAmount = shiftDetails.price + state.itemsTotalPrice;
            
            if (activeGateway === 'mercadopago') {
              console.log('⚠️ [SummaryStep] Procesando con MercadoPago - servicios en desarrollo');
              paymentResult = await depositPaymentService.processPayment({
                paymentMethodId: selectedCardMethod.id,
                amount: totalAmount * (depositPercentage / 100),
                totalAmount: totalAmount,
                depositPercentage: depositPercentage,
                empresaId: empresaId || '',
                description: `Seña - Turno en ${shiftDetails.courtName} (MercadoPago)`,
                stripeCustomerId: stripeCustomerId,
                stripeAccountId: '', // Vacío cuando se usa MercadoPago
                customerEmail: user?.email || '' // Añadir el email del usuario para facturación
                // Se debe modificar el servicio para soportar estas propiedades:
                // useMercadoPago: true,
                // mercadoPagoUserId: mercadoPagoUserId || ''
              });
            } else {
              paymentResult = await depositPaymentService.processPayment({
                paymentMethodId: selectedCardMethod.id,
                amount: totalAmount * (depositPercentage / 100),
                totalAmount: totalAmount,
                depositPercentage: depositPercentage,
                empresaId: empresaId || '',
                description: `Seña - Turno en ${shiftDetails.courtName}`,
                stripeCustomerId: stripeCustomerId,
                stripeAccountId: shouldProcessWithStripe && stripeAccountId ? stripeAccountId : '',
                customerEmail: user?.email || '' // Añadir el email del usuario para facturación
              });
            }
          } else {
            console.log(`🔄 [SummaryStep] Procesando PAGO COMPLETO con ${activeGateway === 'mercadopago' ? 'MercadoPago' : 'Stripe'}...`);
            const totalAmount = shiftDetails.price + state.itemsTotalPrice;
            
            if (activeGateway === 'mercadopago') {
              console.log('⚠️ [SummaryStep] Procesando con MercadoPago - servicios en desarrollo');
              paymentResult = await fullPaymentService.processPayment({
                paymentMethodId: selectedCardMethod.id,
                amount: totalAmount,
                empresaId: empresaId || '',
                description: `Pago completo - Turno en ${shiftDetails.courtName} (MercadoPago)`,
                stripeCustomerId: stripeCustomerId,
                stripeAccountId: '', // Vacío cuando se usa MercadoPago
                customerEmail: user?.email || '' // Añadir el email del usuario para facturación
              });
            } else {
              paymentResult = await fullPaymentService.processPayment({
                paymentMethodId: selectedCardMethod.id,
                amount: totalAmount,
                empresaId: empresaId || '',
                description: `Pago completo - Turno en ${shiftDetails.courtName}`,
                stripeCustomerId: stripeCustomerId,
                stripeAccountId: shouldProcessWithStripe && stripeAccountId ? stripeAccountId : '',
                customerEmail: user?.email || '' // Añadir el email del usuario para facturación
              });
            }
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
          return;
        }
      } else {
        console.log(`⚠️ [SummaryStep] No se requiere procesamiento de pago con ${activeGateway === 'mercadopago' ? 'MercadoPago' : 'Stripe'}, continuando con la creación de reserva`);
      }
      
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
            
      let itemsDataToUse = itemsData;
      
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
      
      const bookingResult = await shiftBookingService.createShiftBooking(
        shiftDetails, 
        {
          userId: user?.id || '',
          empresaId: empresaId || '',
          paymentMethod,
          paymentStatus,
          paymentType: selectedPaymentMethod as any, 
          stripePaymentMethodId: selectedCardMethod?.id,
          guaranteePercentage: selectedPaymentMethod === 'guarantee' ? guaranteePercentage : undefined,
          depositAmount: paymentAmount,  
          rentalItems: state.selectedItems,
          rentalItemsPrice: state.itemsTotalPrice,
          itemsData: itemsDataToUse 
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
        return;
      }
      
      console.log('✅ [SummaryStep] Reserva de turno creada con éxito. ID:', bookingResult.id);
      
      dispatch({ type: 'SET_BOOKING_ID', payload: bookingResult.id || '' });
      
      toast({
        title: 'Reserva creada',
        description: 'Tu reserva ha sido procesada correctamente',
        variant: 'default'
      });
      
      // Esperar un tiempo adecuado antes de pasar al siguiente paso
      // Asegura que el overlay permanezca visible por suficiente tiempo
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Pasar al siguiente paso solo después de haber esperado
      // esto evita que haya un momento donde el overlay desaparezca antes de la transición
      onNext();
      
      // No desactivamos isProcessing aquí, lo haremos en el useEffect de desmontaje
    } catch (error: any) {
      console.error('Error al procesar la reserva:', error);
      toast({
        title: 'Error',
        description: error?.message || 'No se pudo procesar la reserva',
        variant: 'destructive'
      });
      // En caso de error, sí desactivamos el procesamiento inmediatamente
      setIsProcessing(false);
    }
  }, [isProcessing, selectedPaymentMethod, selectedCardMethod, onNext, toast, state.shiftDetails, user, empresaId, stripeAccountId, dispatch]);

  useEffect(() => {
    return () => {
      // Esto asegura que si el componente se desmonta mientras está procesando,
      // no quedarán estados pendientes
      if (isProcessing) {
        setIsProcessing(false);
      }
    };
  }, [isProcessing]);

  const handleNextSubStep = useCallback(() => {
    if (summarySubStep === 'details') {
      setSummarySubStep('payment');
    } else {
      handleCreateReservation();
    }
  }, [summarySubStep, handleCreateReservation]);

  const handlePreviousSubStep = useCallback(() => {
    if (summarySubStep === 'payment') {
      setSummarySubStep('details');
    } else {
      onPrevious();
    }
  }, [summarySubStep, onPrevious]);
  
  useEffect(() => {
    const publishStateUpdate = () => {
      summaryStepRef.current = {
        summarySubStep,
        selectedPaymentMethod,
        selectedCardMethod,
        isProcessing,
        handleNextSubStep,
        handlePreviousSubStep
      };
      
      if (isMobile && typeof window !== 'undefined') {
        (window as any).__summaryStepData = summaryStepRef.current;
        
        const event = new CustomEvent('summary-step-update', { 
          detail: summaryStepRef.current 
        });
        window.dispatchEvent(event);
      }
    };
    
    publishStateUpdate();
    
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

  const TotalPriceDisplay = useCallback(() => {
    if (!state.shiftDetails) return null;
    
    const shiftPrice = state.shiftDetails?.price || 0;
    const itemsPrice = state.itemsTotalPrice || 0;
    const totalPrice = shiftPrice + itemsPrice;
    const formatted = totalPrice.toFixed(2);
    const [integerPart, decimalPart] = formatted?.split('.');
    
    return (
      <div className="flex flex-col items-center justify-center py-5 my-4">
        <p className="text-sm font-semibold mb-2 text-gray-500">
          Precio Total
        </p>

        <p className="text-5xl font-semibold leading-none mb-4 text-gray-900">
          €{integerPart}<span className="opacity-40 text-gray-600">.{decimalPart}</span>
        </p>

        <div className="flex items-center justify-center gap-2">
          <IconLock className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-medium text-gray-500">
            Pago seguro garantizado
          </span>
        </div>
      </div>
    );
  }, [state.shiftDetails, state.itemsTotalPrice]);

  const ReservationDetails = useCallback(() => {
    if (!state.shiftDetails) return null;

    const formattedDate = state.shiftDetails.date 
      ? formatShiftDate(state.shiftDetails.date)
      : formatShiftDate(new Date().toISOString());
    
    const { dayName, dayNumber, month } = formattedDate;
    
    const hasItems = Object.keys(state.selectedItems).length > 0;

    return (
      <div className="space-y-4 rounded-lg border border-gray-200 bg-white/60 overflow-hidden">
        <div className="p-6 space-y-4">
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
                      const itemDetails = itemsData.find(item => item.id === itemId);
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

  const PaymentMethodsSection = useCallback(() => {
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
          
          <div className="border-t border-gray-200 pt-4"></div>
          
          <div>
            <h4 className="text-[14px] font-medium text-gray-700 mb-2">Elige cómo deseas realizar el pago</h4>
          </div>
          
          <PaymentTypeSection 
            selectedPaymentMethod={selectedPaymentMethod}
            setSelectedPaymentMethod={setSelectedPaymentMethod}
          />
          
          {requiresCard && (
            <>
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
                  stripeAccountId={stripeAccountId || ''}
                  mercadoPagoUserId={mercadoPagoUserId || ''}
                  empresaId={empresaId || ''}
                  amount={(state.shiftDetails?.price || 0) + (state.itemsTotalPrice || 0)}
                />
              </div>
            </>
          )}
        </div>
      </div>
    );
  }, [selectedPaymentMethod, selectedCardMethod, isMobile, containerRef, stripeAccountId, mercadoPagoUserId, empresaId]);

  return (
    <div>
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.3,
              ease: "easeInOut"
            }}
            className="fixed inset-0 flex items-center justify-center z-[9999] bg-white/70 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 0.3,
                ease: "easeInOut" 
              }}
              className="text-center"
            >
              <div className="flex items-center justify-center">
                {'Simple Link'.split('').map((letter, index) => (
                  <motion.span
                    key={index}
                    className={`text-xl font-medium ${letter === ' ' ? 'mx-1' : ''}`}
                    animate={{
                      color: ['#374151', '#94a3b8', '#374151'], 
                      opacity: [1, 0.6, 1]
                    }}
                    transition={{
                      duration: 1.8,
                      times: [0, 0.5, 1], 
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: index * 0.07, 
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
              allowScroll={true} 
            >
              <motion.div
                key={summarySubStep}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col h-full"
              >
                {summarySubStep === 'details' ? (
                  <>
                    <TotalPriceDisplay />
                    <ReservationDetails />
                  </>
                ) : (
                  <>
                    <TotalPriceDisplay />
                    <PaymentMethodsSection />
                  </>
                )}
              </motion.div>
            </MobileLayout>
          ) : (
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
                    <div className="w-full py-8 px-6 overflow-y-auto">
                      <div className="w-full max-w-xl mx-auto">
                        <TotalPriceDisplay />
                        <ReservationDetails />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-full py-8 px-6 overflow-y-auto">
                        <div className="w-full max-w-xl mx-auto">
                          <TotalPriceDisplay />
                        </div>
                      </div>
                      
                      <div className="w-full py-8 px-6 overflow-y-auto">
                        <div className="w-full max-w-xl mx-auto">
                          <PaymentMethodsSection />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
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
