import { useState, useCallback } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { MercadoPagoConnection } from '@/services/mercadoPagoConnectionService';

/**
 * Hook personalizado para gestionar la verificación de pasarelas de pago (Stripe y Mercado Pago)
 * 
 * Proporciona estados y funciones para verificar conexiones, validar su estado,
 * y gestionar los estados de carga y error.
 */
export function usePaymentGatewaysVerification() {
  const { loadStripeConnection, organization } = useOrganization();
  
  // Estados para Stripe
  const [stripeConnection, setStripeConnection] = useState<{
    stripe_account_id: string;
    charges_enabled: boolean;
    account_status: string;
  } | null>(null);
  const [isLoadingStripe, setIsLoadingStripe] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [stripeVerified, setStripeVerified] = useState(false);

  // Estados para Mercado Pago
  const [mercadoPagoConnection, setMercadoPagoConnection] = useState<MercadoPagoConnection | null>(null);
  const [isLoadingMercadoPago, setIsLoadingMercadoPago] = useState(false);
  const [mercadoPagoError, setMercadoPagoError] = useState<string | null>(null);
  const [mercadoPagoVerified, setMercadoPagoVerified] = useState(false);

  /**
   * Valida si una conexión de Stripe es válida para procesar pagos
   */
  const isValidStripeConnection = useCallback((connection: any) => {
    return connection && 
           connection.stripe_account_id && 
           connection.charges_enabled && 
           connection.account_status === 'active';
  }, []);

  /**
   * Valida si una conexión de Mercado Pago es válida para procesar pagos
   */
  const isValidMercadoPagoConnection = useCallback((connection: MercadoPagoConnection | null) => {
    return connection && 
           connection.mercadopago_user_id &&
           connection.account_status === 'active';
  }, []);

  /**
   * Verifica la conexión con Stripe y actualiza los estados correspondientes
   * Utiliza caché inteligente para evitar verificaciones innecesarias
   */
  const checkStripeConnection = useCallback(async () => {
    // Uso de caché - si ya verificamos y tenemos un resultado, devolver ese resultado
    if (stripeVerified && !isValidStripeConnection(stripeConnection)) {
      return false;
    }
    
    if (stripeVerified && isValidStripeConnection(stripeConnection)) {
      return true;
    }
    
    setIsLoadingStripe(true);
    setStripeError(null);
    
    try {
      const connection = await loadStripeConnection();
      setStripeConnection(connection);
      setStripeVerified(true);
      
      return isValidStripeConnection(connection);
    } catch (error) {
      console.error("Error al verificar la conexión de Stripe:", error);
      setStripeError("Error al verificar la conexión de Stripe");
      setStripeConnection(null);
      return false;
    } finally {
      setIsLoadingStripe(false);
    }
  }, [loadStripeConnection, stripeVerified, stripeConnection, isValidStripeConnection]);

  /**
   * Verifica la conexión con Mercado Pago y actualiza los estados correspondientes
   * Utiliza caché inteligente para evitar verificaciones innecesarias
   */
  const checkMercadoPagoConnection = useCallback(async () => {
    // Uso de caché - si ya verificamos y tenemos un resultado, devolver ese resultado
    if (mercadoPagoVerified && !isValidMercadoPagoConnection(mercadoPagoConnection)) {
      return false;
    }
    
    if (mercadoPagoVerified && isValidMercadoPagoConnection(mercadoPagoConnection)) {
      return true;
    }
    
    // Si no hay ID de organización, no podemos verificar
    if (!organization?.id) {
      console.warn("No se puede verificar Mercado Pago sin ID de organización");
      return false;
    }
    
    setIsLoadingMercadoPago(true);
    setMercadoPagoError(null);
    
    try {
      const response = await fetch(`/api/mercadopago/connection/${organization.id}`);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (!data.country_supported) {
        setMercadoPagoError("Mercado Pago no está disponible para tu país");
        setMercadoPagoConnection(null);
        setMercadoPagoVerified(true);
        return false;
      }
      
      setMercadoPagoConnection(data.connection);
      setMercadoPagoVerified(true);
      
      return isValidMercadoPagoConnection(data.connection);
    } catch (error) {
      console.error("Error al verificar la conexión de Mercado Pago:", error);
      setMercadoPagoError("Error al verificar la conexión de Mercado Pago");
      setMercadoPagoConnection(null);
      return false;
    } finally {
      setIsLoadingMercadoPago(false);
    }
  }, [organization?.id, mercadoPagoVerified, mercadoPagoConnection, isValidMercadoPagoConnection]);

  /**
   * Reinicia todos los estados de verificación para forzar nuevas verificaciones
   */
  const resetVerifications = useCallback(() => {
    console.log("🔄 Reiniciando estados de verificación de pasarelas de pago");
    setStripeVerified(false);
    setMercadoPagoVerified(false);
  }, []);

  /**
   * Verifica todas las pasarelas de pago en paralelo
   */
  const verifyAll = useCallback(async () => {
    console.log("🔍 Verificando todas las conexiones de pago");
    return Promise.all([
      checkStripeConnection(),
      checkMercadoPagoConnection()
    ]);
  }, [checkStripeConnection, checkMercadoPagoConnection]);

  // Estados combinados para facilitar el uso en la UI
  const hasValidPaymentGateway = 
    (stripeVerified && isValidStripeConnection(stripeConnection)) || 
    (mercadoPagoVerified && isValidMercadoPagoConnection(mercadoPagoConnection));

  const isLoadingPaymentGateway = isLoadingStripe || isLoadingMercadoPago;
  const paymentGatewayError = stripeError || mercadoPagoError;

  return {
    // Estados individuales
    stripeConnection,
    mercadoPagoConnection,
    stripeVerified,
    mercadoPagoVerified,
    isLoadingStripe,
    isLoadingMercadoPago,
    stripeError,
    mercadoPagoError,
    
    // Estados combinados para la UI
    hasValidPaymentGateway,
    isLoadingPaymentGateway,
    paymentGatewayError,
    
    // Funciones
    checkStripeConnection,
    checkMercadoPagoConnection,
    isValidStripeConnection,
    isValidMercadoPagoConnection,
    resetVerifications,
    verifyAll
  };
}
