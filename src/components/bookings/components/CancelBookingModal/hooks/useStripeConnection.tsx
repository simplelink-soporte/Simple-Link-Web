import { useState, useEffect } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';
import { paymentService } from '@/services/paymentService';

// Tipos para mejorar la tipificación
interface OrganizationWithStripe {
  id: string;
  name: string;
  stripe_account_id?: string;
  // otros campos...
  [key: string]: any;
}

interface UseStripeConnectionProps {
  isOpen: boolean;
  booking: {
    id: string;
    stripe_payment_method_id?: string;
    customer_id?: string;
    customer_name?: string;
    customer_email?: string;
    user_id?: string;
  };
  hasGuarantee: boolean;
}

export function useStripeConnection({
  isOpen,
  booking,
  hasGuarantee
}: UseStripeConnectionProps) {
  const { organization, stripeConnection, loadStripeConnection } = useOrganization();
  const [isLoadingStripe, setIsLoadingStripe] = useState(false);
  const [loadAttempted, setLoadAttempted] = useState(false);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [stripePaymentMethodId, setStripePaymentMethodId] = useState<string | null>(null);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
  const [customerDetails, setCustomerDetails] = useState<{
    name?: string;
    email?: string;
  }>({});

  // Cargar datos organizacionales cuando se abre el modal
  useEffect(() => {
    if (isOpen && booking?.id && !stripeAccountId) {
      loadOrganizationData();
    }
  }, [isOpen, booking?.id, stripeAccountId, loadStripeConnection]);

  // Cargar datos de Stripe cuando se abre el modal y hay garantía
  useEffect(() => {
    if (isOpen && hasGuarantee && !loadAttempted) {
      loadStripeData();
    }
  }, [isOpen, hasGuarantee, loadAttempted]);

  const loadOrganizationData = async () => {
    try {
      const org = organization as OrganizationWithStripe;
      if (!org?.stripe_account_id) {
        console.log('⚠️ La organización no tiene stripe_account_id configurado');
        return;
      }
      
      setStripeAccountId(org.stripe_account_id);
      console.log('📊 Datos de organización cargados:', { 
        organization_id: org.id,
        stripe_account_id: org.stripe_account_id
      });
    } catch (error) {
      console.error('Error al cargar datos de la organización:', error);
    }
  };

  const loadStripeData = async () => {
    console.log('🔄 Iniciando carga de datos Stripe:', {
      booking_id: booking?.id,
      timestamp: new Date().toISOString()
    });
    
    setIsLoadingStripe(true);
    setLoadAttempted(true);
    setStripeEnabled(false); // Reset inicial
    
    try {
      // 1. Cargar conexión Stripe
      const connection = await loadStripeConnection();
      console.log('✅ Conexión Stripe cargada:', connection);

      // IMPORTANTE: Si la conexión existe, verificamos que tenga las propiedades necesarias
      if (!connection) {
        console.log('⚠️ Conexión Stripe no encontrada');
        setStripeEnabled(false);
        return;
      }
      
      console.log('💳 Estado de conexión Stripe:', {
        charges_enabled: connection.charges_enabled,
        account_status: connection.account_status
      });
      
      // Si no tiene charges_enabled o no está activa, no continuamos
      if (!connection.charges_enabled || connection.account_status !== 'active') {
        console.log('⚠️ Conexión Stripe no activa o sin capacidad de cargos');
        setStripeEnabled(false);
        return;
      }

      // 2. Si Stripe está habilitado, obtener datos de pago
      if (booking?.id) {
        // Uso directo de datos existentes para garantía
        const org = organization as OrganizationWithStripe;
        if (booking.stripe_payment_method_id && org?.stripe_account_id && booking.customer_id) {
          console.log('💡 Usando datos existentes de la reserva:', {
            hasPaymentMethodId: Boolean(booking.stripe_payment_method_id),
            hasStripeAccountId: Boolean(org?.stripe_account_id),
            hasCustomerId: Boolean(booking.customer_id)
          });
          
          setStripePaymentMethodId(booking.stripe_payment_method_id);
          setStripeAccountId(org.stripe_account_id);
          setStripeCustomerId(booking.customer_id);
          setStripeEnabled(true);
          return;
        }
        
        console.log('🛠️ Intentando obtener datos desde paymentService...');
        const stripeData = await paymentService.getStripePaymentData(booking.id);
        console.log('💳 Datos de pago obtenidos:', {
          hasPaymentMethod: Boolean(stripeData?.paymentMethodId),
          hasAccountId: Boolean(stripeData?.accountId),
          hasCustomerId: Boolean(stripeData?.customerId),
          timestamp: new Date().toISOString()
        });

        if (stripeData?.paymentMethodId && stripeData?.accountId && stripeData?.customerId) {
          setStripePaymentMethodId(stripeData.paymentMethodId);
          setStripeAccountId(stripeData.accountId);
          setStripeCustomerId(stripeData.customerId);
          setStripeEnabled(true);
          console.log('✅ Stripe habilitado correctamente con datos de paymentService');
        } else {
          console.log('⚠️ Datos de Stripe incompletos:', {
            hasPaymentMethod: Boolean(stripeData?.paymentMethodId),
            hasAccountId: Boolean(stripeData?.accountId),
            hasCustomerId: Boolean(stripeData?.customerId)
          });
          
          // FALLBACK: Si tenemos al menos el ID del método de pago y el accountId
          const org = organization as OrganizationWithStripe;
          if (booking.stripe_payment_method_id && org?.stripe_account_id) {
            console.log('💡 FALLBACK: Usando datos parciales disponibles');
            setStripePaymentMethodId(booking.stripe_payment_method_id);
            setStripeAccountId(org.stripe_account_id);
            
            // Solo establecer customerId si es un valor no vacío
            if (booking.customer_id && booking.customer_id.trim() !== '') {
              console.log('✅ Customer ID encontrado en booking:', booking.customer_id);
              setStripeCustomerId(booking.customer_id);
              setStripeEnabled(true);
              return;
            } else {
              // Intentar buscar el customer_id en la base de datos usando paymentService
              try {
                // Verificar que existe user_id antes de buscar
                if (!booking.user_id) {
                  console.error('❌ No hay user_id disponible para buscar el cliente Stripe');
                  setStripeEnabled(false);
                  return;
                }
                
                console.log('🔍 Intentando obtener customer_id por otras vías...', {
                  userId: booking.user_id
                });
                
                const customerData = await paymentService.getStripeCustomerByUserId(booking.user_id);
                
                if (customerData?.stripeCustomerId) {
                  console.log('✅ Customer ID encontrado en stripe_customers:', customerData.stripeCustomerId);
                  setStripeCustomerId(customerData.stripeCustomerId);
                  setStripeEnabled(true);
                  return;
                } else {
                  console.error('❌ No se pudo encontrar un customer_id válido');
                  setStripeEnabled(false);
                  return;
                }
              } catch (error) {
                console.error('❌ Error al buscar customer_id:', error);
                setStripeEnabled(false);
                return;
              }
            }
          }
        }
      } else {
        console.log('⚠️ No hay ID de reserva disponible');
        return;
      }
      
      // Verificar customer_id y buscar detalles adicionales si es necesario
      if (booking.customer_id) {
        setStripeCustomerId(booking.customer_id);
        
        // Si no tenemos los datos del cliente, intentamos buscarlos
        if (!booking.customer_name || !booking.customer_email) {
          const { data: customerData, error } = await supabase
            .from('customers')
            .select('name, email')
            .eq('id', booking.customer_id)
            .single();
            
          if (error) {
            console.error('Error al cargar datos del cliente:', error);
          } else if (customerData) {
            setCustomerDetails({
              name: customerData.name,
              email: customerData.email
            });
            console.log('👤 Datos del cliente cargados desde DB:', customerData);
          }
        } else {
          // Si ya tenemos los datos del cliente, los guardamos directamente
          setCustomerDetails({
            name: booking.customer_name,
            email: booking.customer_email
          });
          console.log('👤 Datos del cliente disponibles desde la reserva');
        }
      }
      
      console.log('✅ Datos de Stripe cargados correctamente');
      
    } catch (error) {
      console.error('Error al cargar datos de Stripe:', error);
      setStripeEnabled(false);
    } finally {
      setIsLoadingStripe(false);
    }
  };

  // Depuración del estado final
  useEffect(() => {
    if (isOpen && hasGuarantee && !isLoadingStripe && loadAttempted) {
      console.log('💯 Estado final de useStripeConnection:', {
        stripeEnabled,
        hasPaymentMethodId: Boolean(stripePaymentMethodId),
        hasAccountId: Boolean(stripeAccountId),
        hasCustomerId: Boolean(stripeCustomerId),
        customerIdLength: stripeCustomerId ? stripeCustomerId.length : 0,
        booking_id: booking?.id,
        timestamp: new Date().toISOString()
      });
      
      // Si no tenemos un customerId válido, deshabilitar Stripe
      if (!stripeCustomerId || stripeCustomerId.trim() === '') {
        console.error('❌ ERROR CRÍTICO: Customer ID ausente o vacío. Deshabilitando Stripe');
        setStripeEnabled(false);
      }
    }
  }, [isOpen, hasGuarantee, isLoadingStripe, loadAttempted, stripeEnabled, 
      stripePaymentMethodId, stripeAccountId, stripeCustomerId, booking?.id]);
      
  return {
    stripeEnabled,
    isLoadingStripe,
    stripePaymentMethodId,
    stripeAccountId,
    stripeCustomerId,
    customerDetails,
    loadStripeData
  };
}
