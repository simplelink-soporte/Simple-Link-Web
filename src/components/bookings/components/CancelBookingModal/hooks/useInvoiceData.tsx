import { useState, useEffect } from 'react';
import { bookingInvoiceService } from '@/services/booking-invoice.service';

interface UseInvoiceDataProps {
  isOpen: boolean;
  bookingId?: string;
  stripeAccountId: string | null;
  paymentType?: string;
}

interface InvoiceData {
  hasInvoice: boolean;
  invoices: Array<any>;
  paymentIntent?: string;
  chargeId?: string;
  metadata?: Record<string, any>;
}

export function useInvoiceData({ 
  isOpen, 
  bookingId, 
  stripeAccountId,
  paymentType
}: UseInvoiceDataProps) {
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({ 
    hasInvoice: false, 
    invoices: [] 
  });

  useEffect(() => {
    // Reiniciamos el estado de invoice cuando se abre el modal
    if (isOpen) {
      setInvoiceData({ hasInvoice: false, invoices: [] });
    }
    
    // Solo buscamos facturas si es pago completo o booking
    if (isOpen && bookingId && stripeAccountId && (paymentType === 'full' || paymentType === 'booking')) {
      console.log('🔍 Verificando si se deben buscar facturas:', { 
        paymentType,
        bookingId,
        stripeAccountId,
        isBookingType: paymentType === 'booking',
        timestamp: new Date().toISOString()
      });
      
      const checkForInvoices = async () => {
        setIsLoadingInvoice(true);
        try {
          console.log('🔍 Buscando facturas para la reserva:', bookingId);
          const result = await bookingInvoiceService.findInvoicesByBookingId(stripeAccountId, bookingId);
          
          if (result.success && result.count > 0) {
            // Extraer datos importantes de la primera factura (son cronológicas)
            const latestInvoice = result.invoices[0];
            const chargeId = latestInvoice.charge || latestInvoice.latest_charge;
            const paymentIntent = latestInvoice.payment_intent;
            const metadata = latestInvoice.metadata || {};
            
            // Verificar si la factura tiene el booking_id en metadata
            const hasBookingIdInMetadata = metadata?.booking_id === bookingId;
            
            console.log('✅ Facturas encontradas:', {
              count: result.count,
              hasLatestInvoice: Boolean(latestInvoice),
              hasPaymentIntent: Boolean(paymentIntent),
              hasChargeId: Boolean(chargeId),
              hasBookingIdInMetadata,
              bookingIdInMetadata: metadata?.booking_id,
              timestamp: new Date().toISOString()
            });
            
            setInvoiceData({
              hasInvoice: true,
              invoices: result.invoices || [],
              paymentIntent,
              chargeId,
              metadata
            });
          } else {
            console.log('ℹ️ No se encontraron facturas para esta reserva');
            setInvoiceData({
              hasInvoice: false,
              invoices: []
            });
          }
        } catch (error) {
          console.error('❌ Error al buscar facturas:', error);
          setInvoiceData({
            hasInvoice: false,
            invoices: []
          });
        } finally {
          setIsLoadingInvoice(false);
        }
      };
      
      checkForInvoices();
    }
  }, [isOpen, bookingId, paymentType, stripeAccountId]);

  return {
    isLoadingInvoice,
    invoiceData,
    setInvoiceData
  };
}
