import { useState, useEffect } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { bookingInvoiceService } from '@/services/booking-invoice.service';

interface UseStripeRefundProps {
  isOpen: boolean;
  booking: {
    id: string;
    payment_type?: string;
    customer_id?: string;
    customer_name?: string;
    customer_email?: string;
  };
}

interface StripeRefundData {
  isReady: boolean;
  stripeAccountId: string | null;
  stripeCustomerId: string | null;
  hasValidInvoice: boolean;
  invoiceData: {
    hasInvoice: boolean;
    invoices: Array<any>;
    paymentIntent?: string;
    chargeId?: string;
    metadata?: Record<string, any>;
  };
  customerDetails: {
    name?: string;
    email?: string;
  };
}

/**
 * Hook personalizado para gestionar la conexión Stripe específicamente para reembolsos
 * Reutiliza los datos de conexión Stripe ya cargados en el contexto de la organización
 */
export function useStripeRefund({ isOpen, booking }: UseStripeRefundProps) {
  const { stripeConnection } = useOrganization();
  const [isLoading, setIsLoading] = useState(false);
  const [loadAttempted, setLoadAttempted] = useState(false);
  
  // Estado de la conexión y datos para reembolsos
  const [refundData, setRefundData] = useState<StripeRefundData>({
    isReady: false,
    stripeAccountId: null,
    stripeCustomerId: null,
    hasValidInvoice: false,
    invoiceData: {
      hasInvoice: false,
      invoices: []
    },
    customerDetails: {}
  });

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    // No cargar datos para reservas tipo 'guarantee', evitando consultas innecesarias a la API
    if (isOpen && booking?.id && !loadAttempted && booking?.payment_type !== 'guarantee') {
      console.log('🔄 [useStripeRefund] Iniciando carga de datos para reembolso (no es tipo guarantee):', {
        booking_id: booking?.id,
        payment_type: booking?.payment_type,
        timestamp: new Date().toISOString()
      });
      loadRefundData();
    } else if (isOpen && booking?.payment_type === 'guarantee') {
      console.log('🛑 [useStripeRefund] Omitiendo carga de factura para reserva tipo guarantee:', {
        booking_id: booking?.id,
        payment_type: booking?.payment_type,
        timestamp: new Date().toISOString()
      });
      setLoadAttempted(true); // Marcamos como intentado para evitar reintentosq
      setIsLoading(false); // Aseguramos que no se muestre como cargando
    }
  }, [isOpen, booking?.id, booking?.payment_type, loadAttempted, stripeConnection]);
  
  /**
   * Obtiene la conexión con Stripe directamente desde la API
   * @param organizationId ID de la organización
   * @returns Objeto con la información de conexión de Stripe
   */
  const fetchStripeConnection = async (organizationId: string) => {
    try {
      console.log('🔍 [useStripeRefund] Buscando conexión Stripe directamente para:', organizationId);
      const response = await fetch(`/api/stripe/connection/${organizationId}`);
      
      if (!response.ok) {
        throw new Error(`Error al obtener conexión Stripe: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('💾 [useStripeRefund] Datos recibidos de API:', data);

      // La API devuelve datos exactamente en este formato
      if (data && data.stripe_account_id) {
        console.log('✅ [useStripeRefund] Conexión obtenida directamente:', {
          stripe_account_id: data.stripe_account_id,
          charges_enabled: data.account_details?.charges_enabled || false,
          account_status: data.account_status
        });
        
        return {
          stripe_account_id: data.stripe_account_id,
          charges_enabled: data.account_details?.charges_enabled || false,
          account_status: data.account_status
        };
      }
      
      // Los logs muestran un formato diferente, así que también lo manejamos
      if (data && data.stripeAccountId) {
        console.log('✅ [useStripeRefund] Conexión obtenida (formato logs):', {
          stripe_account_id: data.stripeAccountId,
          account_status: data.accountStatus
        });
        
        return {
          stripe_account_id: data.stripeAccountId,
          charges_enabled: data.charges_enabled || false,
          account_status: data.accountStatus || 'pending'
        };
      }
      
      console.log('⚠️ [useStripeRefund] Formato de respuesta de API no reconocido:', data);
      return null;
    } catch (error) {
      console.error('❌ [useStripeRefund] Error al obtener conexión Stripe:', error);
      return null;
    }
  };

  /**
   * Carga todos los datos necesarios para procesar un reembolso
   * Reutiliza la conexión Stripe existente del contexto o la busca directamente
   */
  const loadRefundData = async () => {
    console.log('🔄 [useStripeRefund] Iniciando carga de datos para reembolso:', {
      booking_id: booking?.id,
      payment_type: booking?.payment_type,
      hasStripeConnection: Boolean(stripeConnection),
      timestamp: new Date().toISOString()
    });
    
    setIsLoading(true);
    setLoadAttempted(true);
    
    try {
      // 1. Verificar si ya tenemos los datos de conexión de Stripe
      let stripeAccountId: string | null = null;
      
      // 1.a. Si hay conexión en el contexto, usarla
      if (stripeConnection && stripeConnection.stripe_account_id) {
        stripeAccountId = stripeConnection.stripe_account_id;
        console.log('✅ [useStripeRefund] Usando conexión Stripe del contexto:', stripeAccountId);
      } 
      // 1.b. Si no hay conexión en el contexto, intentar obtenerla directamente
      else {
        console.log('⚠️ [useStripeRefund] No se encontró conexión Stripe en contexto');
        
        // Obtener el ID de la organización del localStorage o cualquier otra fuente
        const empresaId = localStorage.getItem('current_empresa_id');
        
        if (empresaId) {
          const directConnection = await fetchStripeConnection(empresaId);
          if (directConnection && directConnection.stripe_account_id) {
            stripeAccountId = directConnection.stripe_account_id;
            console.log('✅ [useStripeRefund] Conexión Stripe obtenida directamente:', stripeAccountId);
          }
        }
      }
      
      // 1.c. Si no se pudo obtener la conexión de ninguna forma, terminar
      if (!stripeAccountId) {
        console.log('❌ [useStripeRefund] No se pudo obtener conexión Stripe');
        setRefundData(prev => ({
          ...prev,
          isReady: false,
          stripeAccountId: null
        }));
        setIsLoading(false);
        return;
      }
      console.log('✅ [useStripeRefund] Usando conexión Stripe ya cargada:', stripeAccountId);
      
      // 2. Buscar facturas asociadas a la reserva
      console.log('🔍 [useStripeRefund] Buscando facturas para booking_id:', booking.id);
      const invoiceResult = await bookingInvoiceService.findInvoicesByBookingId(
        stripeAccountId, 
        booking.id
      );
      
      if (invoiceResult.success && invoiceResult.count > 0) {
        console.log('✅ [useStripeRefund] Facturas encontradas:', {
          count: invoiceResult.count,
          hasLatestInvoice: Boolean(invoiceResult.invoices[0]),
          hasPaymentIntent: Boolean(invoiceResult.invoices[0]?.payment_intent),
          hasCharge: Boolean(invoiceResult.invoices[0]?.charge || invoiceResult.invoices[0]?.latest_charge),
          timestamp: new Date().toISOString()
        });
        
        // Extraer datos importantes para reembolso
        const latestInvoice = invoiceResult.invoices[0];
        const metadata = latestInvoice.metadata || {};
        
        // Añadir logs detallados para inspeccionar la estructura completa de la factura
        console.log('🔍 [useStripeRefund] Estructura de factura encontrada:', {
          invoice_properties: Object.keys(latestInvoice),
          has_invoice_id: Boolean(latestInvoice.invoice_id),
          invoice_id_value: latestInvoice.invoice_id || 'N/A',
          metadata_properties: Object.keys(metadata) 
        });
        
        // Buscar payment_intent_id y charge_id tanto directamente como en los metadatos
        const paymentIntent = latestInvoice.payment_intent || metadata.payment_intent_id;
        const chargeId = latestInvoice.charge || latestInvoice.latest_charge || metadata.charge_id;
        
        // Verificación de depuración para payment intent
        if (paymentIntent) {
          console.log('✅ [useStripeRefund] Payment Intent encontrado:', {
            source: latestInvoice.payment_intent ? 'invoice.payment_intent' : 'metadata.payment_intent_id',
            paymentIntentPrefix: paymentIntent.substring(0, 10) + '...'
          });
        }
        
        // Verificación de depuración para charge
        if (chargeId) {
          console.log('✅ [useStripeRefund] Charge ID encontrado:', {
            source: (latestInvoice.charge || latestInvoice.latest_charge) ? 'invoice.charge/latest_charge' : 'metadata.charge_id',
            chargeIdPrefix: chargeId.substring(0, 10) + '...'
          });
        }
        
        // Determinar si la factura tiene datos válidos para reembolso
        const hasValidInvoiceData = Boolean(paymentIntent || chargeId);
        
        setRefundData({
          isReady: hasValidInvoiceData,
          stripeAccountId,
          stripeCustomerId: booking.customer_id || null,
          hasValidInvoice: hasValidInvoiceData,
          invoiceData: {
            hasInvoice: true,
            invoices: invoiceResult.invoices,
            paymentIntent,
            chargeId,
            metadata
          },
          customerDetails: {
            name: booking.customer_name,
            email: booking.customer_email
          }
        });
      } else {
        console.log('ℹ️ [useStripeRefund] No se encontraron facturas para esta reserva');
        setRefundData(prev => ({
          ...prev,
          isReady: false,
          stripeAccountId,
          stripeCustomerId: booking.customer_id || null,
          hasValidInvoice: false,
          invoiceData: {
            hasInvoice: false,
            invoices: []
          },
          customerDetails: {
            name: booking.customer_name,
            email: booking.customer_email
          }
        }));
      }
    } catch (error) {
      console.error('❌ [useStripeRefund] Error al cargar datos para reembolso:', error);
      setRefundData(prev => ({
        ...prev,
        isReady: false
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Depuración del estado final
  useEffect(() => {
    if (isOpen && !isLoading && loadAttempted) {
      console.log('🔄 [useStripeRefund] Estado final:', {
        isReady: refundData.isReady,
        hasStripeAccountId: Boolean(refundData.stripeAccountId),
        hasCustomerId: Boolean(refundData.stripeCustomerId),
        hasValidInvoice: refundData.hasValidInvoice,
        invoiceCount: refundData.invoiceData.invoices.length,
        hasPaymentIntent: Boolean(refundData.invoiceData.paymentIntent),
        hasChargeId: Boolean(refundData.invoiceData.chargeId),
        booking_id: booking?.id,
        timestamp: new Date().toISOString()
      });
    }
  }, [isOpen, isLoading, loadAttempted, refundData, booking?.id]);
      
  return {
    isLoading,
    refundData,
    loadRefundData
  };
}