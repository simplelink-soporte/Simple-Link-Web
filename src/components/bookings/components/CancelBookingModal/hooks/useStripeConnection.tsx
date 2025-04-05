import { useState, useEffect } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';

interface UseStripeConnectionProps {
  isOpen: boolean;
  booking: {
    id: string;
    stripe_payment_method_id?: string;
    customer_id?: string;
    customer_name?: string;
    customer_email?: string;
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
      if (!organization?.stripe_account_id) return;
      
      setStripeAccountId(organization.stripe_account_id);
      console.log('📊 Datos de organización cargados:', { 
        organization_id: organization.id,
        stripe_account_id: organization.stripe_account_id
      });
    } catch (error) {
      console.error('Error al cargar datos de la organización:', error);
    }
  };

  const loadStripeData = async () => {
    setIsLoadingStripe(true);
    setLoadAttempted(true);
    
    try {
      // Asegurarnos que tengamos una conexión con Stripe
      if (!stripeConnection?.enabled) {
        await loadStripeConnection();
      }

      const { enabled, account_id } = stripeConnection || {};
      setStripeEnabled(enabled || false);
      
      if (!enabled) {
        console.log('⚠️ Conexión con Stripe no está habilitada');
        return;
      }

      // Verificar que tenemos los datos necesarios
      if (!booking?.stripe_payment_method_id) {
        console.log('⚠️ No hay método de pago registrado para esta reserva');
        return;
      }

      // Guardar los datos de Stripe
      setStripePaymentMethodId(booking.stripe_payment_method_id);
      
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
