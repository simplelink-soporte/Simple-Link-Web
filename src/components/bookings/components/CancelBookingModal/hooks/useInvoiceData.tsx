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
      console.log('🔍 Verificando si se deben buscar facturas:', { paymentType });
      
      const checkForInvoices = async () => {
        setIsLoadingInvoice(true);
        try {
          console.log('🔍 Buscando facturas para la reserva:', bookingId);
          const result = await bookingInvoiceService.findInvoicesByBookingId(stripeAccountId, bookingId);
          
          if (result.success && result.count > 0) {
            console.log('✅ Facturas encontradas:', result.invoices);
            setInvoiceData({
              hasInvoice: true,
              invoices: result.invoices || []
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
