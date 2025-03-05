import Stripe from 'stripe';
import { StripeCustomerCache, StripeCustomerData } from '@/types/stripe';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { stripe } from '@/lib/stripe';

export class StripeCustomerService {
  async getOrCreateCustomer(
    userId: string, 
    stripeAccountId: string, 
    isRetry = false
  ): Promise<StripeCustomerCache> {
    try {
      // 1. Buscar en Supabase
      const { data: existingCustomers, error: searchError } = await supabaseAdmin
        .from('stripe_customers')
        .select('*')
        .match({
          user_id: userId,
          stripe_account_id: stripeAccountId
        })
        .order('created_at', { ascending: false });

      if (searchError) {
        console.error('Error al buscar cliente:', searchError);
        throw searchError;
      }

      // Filtrar por cliente activo o el más reciente
      const activeCustomer = existingCustomers?.find(customer => customer.status === 'active') || 
                           existingCustomers?.[0];
      
      if (activeCustomer) {
        try {
          // 2. Validar existencia en Stripe
          const stripeCustomer = await stripe.customers.retrieve(
            activeCustomer.stripe_customer_id,
            { stripeAccount: stripeAccountId }
          );

          if (!stripeCustomer.deleted) {
            // 3. Si el cliente no está activo, reactivarlo
            if (activeCustomer.status !== 'active') {
              await supabaseAdmin
                .from('stripe_customers')
                .update({
                  status: 'active',
                  last_used: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .match({ id: activeCustomer.id });
            } else {
              // Solo actualizar last_used si ya está activo
              await this.updateCustomerLastUsed(activeCustomer.id);
            }

            return {
              stripeCustomerId: activeCustomer.stripe_customer_id,
              stripeAccountId,
              userId,
              lastUsed: new Date().toISOString(),
              status: 'active' as const
            };
          }
        } catch (stripeError: any) {
          // 4. Marcar como inactivo si no existe en Stripe
          await this.markCustomerAsInactive(activeCustomer.id, stripeError.message);
          
          // Si no es un reintento, crear nuevo cliente
          if (!isRetry) {
            return await this.createNewCustomer(userId, stripeAccountId);
          }
        }
      }

      // 5. Si no hay cliente o todos están inactivos y no es un reintento, crear uno nuevo
      if (!isRetry) {
        return await this.createNewCustomer(userId, stripeAccountId);
      }

      throw new Error('No se pudo recuperar ni crear el cliente después de múltiples intentos');

    } catch (error: any) {
      if (error.code === '23505' && !isRetry) {
        // Si es un error de duplicado y no es un reintento, esperar un momento y reintentar
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('Detectado cliente duplicado, intentando recuperar...');
        return await this.getOrCreateCustomer(userId, stripeAccountId, true);
      }
      console.error('Error in getOrCreateCustomer:', error);
      throw error;
    }
  }

  private async createNewCustomer(userId: string, stripeAccountId: string): Promise<StripeCustomerCache> {
    const customer = await stripe.customers.create(
      {
        metadata: {
          user_id: userId,
          created_at: new Date().toISOString()
        }
      },
      { stripeAccount: stripeAccountId }
    );

    const { data: newCustomer, error } = await supabaseAdmin
      .from('stripe_customers')
      .insert({
        user_id: userId,
        stripe_customer_id: customer.id,
        stripe_account_id: stripeAccountId,
        last_used: new Date().toISOString(),
        metadata: {
          stripe_created_at: customer.created,
          initial_creation: true
        }
      })
      .select()
      .single();

    if (error) throw error;

    return {
      stripeCustomerId: customer.id,
      stripeAccountId,
      userId,
      lastUsed: new Date().toISOString(),
      status: 'active'
    };
  }

  private async updateCustomerLastUsed(id: string) {
    const { error } = await supabaseAdmin
      .from('stripe_customers')
      .update({ last_used: new Date().toISOString() })
      .match({ id });

    if (error) throw error;
  }

  private async markCustomerAsInactive(id: string, errorMessage: string) {
    const { error } = await supabaseAdmin
      .from('stripe_customers')
      .update({
        status: 'inactive',
        last_payment_error: errorMessage,
        updated_at: new Date().toISOString()
      })
      .match({ id });

    if (error) throw error;
  }
}

export const stripeCustomerService = new StripeCustomerService(); 