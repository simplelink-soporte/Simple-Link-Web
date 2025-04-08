import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Booking } from '@/types/booking';
import { useStripeRefund } from '../hooks/useStripeRefund';
import { useRefundProcessing } from '../hooks/useRefundProcessing';

// Interfaces para los datos del contexto
interface RefundContextData {
  // Datos de la factura y reembolso
  invoiceId: string | undefined;
  paymentIntentId: string | undefined;
  chargeId: string | undefined;
  stripeAccountId: string | null;
  totalAmount: number;
  hasValidInvoice: boolean;
  isLoading: boolean;
  
  // Estados de proceso de reembolso
  shouldProcessRefund: boolean;
  showRefundOptions: boolean;
  refundType: 'full' | 'percentage';
  refundPercentage: number;
  refundMethod: 'stripe' | 'external';
  isProcessing: boolean;
  
  // Setters para estados
  setShouldProcessRefund: (value: boolean) => void;
  setShowRefundOptions: (value: boolean) => void;
  setRefundType: (value: 'full' | 'percentage') => void;
  setRefundPercentage: (value: number) => void;
  setRefundMethod: (value: 'stripe' | 'external') => void;
  setIsProcessing: (value: boolean) => void;
  
  // Funciones principales
  processStripeRefund: () => Promise<boolean>;
  registerExternalRefund: () => Promise<boolean>;
}

interface RefundProviderProps {
  children: ReactNode;
  booking: Booking;
  isOpen: boolean;
  totalAmount: number;
  guaranteeStripeAccountId?: string | null;
}

// Crear el contexto
const RefundContext = createContext<RefundContextData | undefined>(undefined);

// Hook para usar el contexto
export const useRefundContext = (): RefundContextData => {
  const context = useContext(RefundContext);
  if (!context) {
    throw new Error('useRefundContext debe ser usado dentro de un RefundProvider');
  }
  return context;
};

// Proveedor del contexto
export const RefundProvider: React.FC<RefundProviderProps> = ({
  children,
  booking,
  isOpen,
  totalAmount,
  guaranteeStripeAccountId
}) => {
  // Hook especializado para obtener datos de factura
  const { isLoading: isLoadingRefund, refundData } = useStripeRefund({
    isOpen,
    booking
  });
  
  // Extraer y memoizar IDs importantes
  const [invoiceId, setInvoiceId] = useState<string | undefined>(undefined);
  const [paymentIntentId, setPaymentIntentId] = useState<string | undefined>(undefined);
  const [chargeId, setChargeId] = useState<string | undefined>(undefined);
  
  // Usar el hook de procesamiento de reembolso
  const {
    shouldProcessRefund,
    setShouldProcessRefund,
    showRefundOptions,
    setShowRefundOptions,
    refundType,
    setRefundType,
    refundPercentage,
    setRefundPercentage,
    refundMethod,
    setRefundMethod,
    isProcessing,
    setIsProcessing,
    processStripeRefund,
    registerExternalRefund
  } = useRefundProcessing({
    totalAmount,
    stripeAccountId: refundData?.stripeAccountId || guaranteeStripeAccountId || null,
    bookingId: booking?.id || '',
    invoiceId,
    paymentIntentId
  });
  
  // Efecto para extraer y almacenar todos los IDs relevantes cuando cambian los datos de reembolso
  useEffect(() => {
    if (refundData?.invoiceData?.invoices?.[0]) {
      const invoice = refundData.invoiceData.invoices[0];
      const metadata = invoice.metadata || {};
      
      // Extraer los IDs de diversas fuentes
      const extractedInvoiceId = invoice.id;
      const extractedPaymentIntentId = 
        invoice.payment_intent || 
        metadata.payment_intent_id || 
        undefined;
      const extractedChargeId = 
        invoice.charge || 
        invoice.latest_charge || 
        metadata.charge_id || 
        undefined;
      
      console.log('📑 [RefundContext] Datos de factura extraídos:', {
        invoice_id: extractedInvoiceId,
        payment_intent_id: extractedPaymentIntentId,
        charge_id: extractedChargeId,
        metadata_keys: Object.keys(metadata)
      });
      
      setInvoiceId(extractedInvoiceId);
      setPaymentIntentId(extractedPaymentIntentId);
      setChargeId(extractedChargeId);
    } else {
      console.log('❌ [RefundContext] No se encontraron datos de factura para reembolso');
      setInvoiceId(undefined);
      setPaymentIntentId(undefined);
      setChargeId(undefined);
    }
  }, [refundData]);
  
  // Valor del contexto
  const contextValue: RefundContextData = {
    // Datos de la factura y reembolso
    invoiceId,
    paymentIntentId,
    chargeId,
    stripeAccountId: refundData?.stripeAccountId || guaranteeStripeAccountId || null,
    totalAmount,
    hasValidInvoice: refundData?.hasValidInvoice || false,
    isLoading: isLoadingRefund,
    
    // Estados de proceso de reembolso
    shouldProcessRefund,
    showRefundOptions,
    refundType,
    refundPercentage,
    refundMethod,
    isProcessing,
    
    // Setters para estados
    setShouldProcessRefund,
    setShowRefundOptions,
    setRefundType,
    setRefundPercentage,
    setRefundMethod,
    setIsProcessing,
    
    // Funciones principales
    processStripeRefund,
    registerExternalRefund
  };
  
  return (
    <RefundContext.Provider value={contextValue}>
      {children}
    </RefundContext.Provider>
  );
};
