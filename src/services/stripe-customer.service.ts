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
      // 1. Buscar en Supabase con un enfoque más agresivo para encontrar cualquier registro existente
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

      // Filtrar por cliente activo o el más reciente, incluso si está marcado como inactivo
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
            // Pequeña pausa para reducir colisiones de concurrencia
            await new Promise(resolve => setTimeout(resolve, 300));
            return await this.createNewCustomerSafely(userId, stripeAccountId);
          }
        }
      }

      // 5. Si no hay cliente o todos están inactivos y no es un reintento, crear uno nuevo
      if (!isRetry) {
        return await this.createNewCustomerSafely(userId, stripeAccountId);
      }

      throw new Error('No se pudo recuperar ni crear el cliente después de múltiples intentos');

    } catch (error: any) {
      if (error.code === '23505' && !isRetry) {
        // Si es un error de duplicado y no es un reintento, esperar un momento y reintentar
        // Incrementamos el tiempo de espera para dar más margen a la resolución
        await new Promise(resolve => setTimeout(resolve, 1500));
        console.log('Detectado cliente duplicado, intentando recuperar...');
        return await this.getOrCreateCustomer(userId, stripeAccountId, true);
      }
      console.error('Error in getOrCreateCustomer:', error);
      throw error;
    }
  }

  // Método nuevo para manejar mejor la concurrencia en la creación
  private async createNewCustomerSafely(userId: string, stripeAccountId: string): Promise<StripeCustomerCache> {
    // Verificar una vez más si se creó el cliente entre la verificación inicial y ahora
    // Esto reduce significativamente el riesgo de crear duplicados en situaciones de alta concurrencia
    const { data: latestCheck } = await supabaseAdmin
      .from('stripe_customers')
      .select('*')
      .match({
        user_id: userId,
        stripe_account_id: stripeAccountId,
        status: 'active'
      })
      .limit(1);

    // Si encontramos un cliente activo en esta segunda verificación, lo usamos
    if (latestCheck && latestCheck.length > 0) {
      console.log('Cliente creado por otro proceso mientras verificábamos, usando el existente');
      return {
        stripeCustomerId: latestCheck[0].stripe_customer_id,
        stripeAccountId,
        userId,
        lastUsed: new Date().toISOString(),
        status: 'active'
      };
    }

    // Si no hay cliente activo, procedemos a crear uno nuevo
    try {
      const customer = await stripe.customers.create(
        {
          metadata: {
            user_id: userId,
            created_at: new Date().toISOString()
          }
        },
        { stripeAccount: stripeAccountId }
      );
      
      // Generar un UUID único para el registro
      const recordId = crypto.randomUUID ? crypto.randomUUID() : 
                       `${userId.substring(0, 8)}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
      // Usamos upsert con onConflict para manejar mejor los casos de concurrencia
      const { data: newCustomer, error } = await supabaseAdmin
        .from('stripe_customers')
        .upsert({
          id: recordId,
          user_id: userId,
          stripe_customer_id: customer.id,
          stripe_account_id: stripeAccountId,
          last_used: new Date().toISOString(),
          status: 'active',
          metadata: {
            stripe_created_at: customer.created,
            initial_creation: true
          }
        }, { 
          onConflict: 'user_id,stripe_account_id', 
          ignoreDuplicates: false 
        })
        .select()
        .single();
  
      if (error) {
        // Si hay error en la inserción pero ya creamos el cliente en Stripe,
        // intentamos recuperar el registro existente para evitar inconsistencias
        if (error.code === '23505') {
          console.log('Conflicto al insertar, buscando registro existente');
          const { data: existingRecord } = await supabaseAdmin
            .from('stripe_customers')
            .select('*')
            .match({
              user_id: userId,
              stripe_account_id: stripeAccountId
            })
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (existingRecord && existingRecord.length > 0) {
            return {
              stripeCustomerId: existingRecord[0].stripe_customer_id,
              stripeAccountId,
              userId,
              lastUsed: new Date().toISOString(),
              status: 'active'
            };
          }
        }
        throw error;
      }
  
      return {
        stripeCustomerId: customer.id,
        stripeAccountId,
        userId,
        lastUsed: new Date().toISOString(),
        status: 'active'
      };
    } catch (error) {
      console.error('Error al crear cliente de forma segura:', error);
      throw error;
    }
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