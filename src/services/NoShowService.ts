import { SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { createId } from '@paralleldrive/cuid2';
import type { Database } from '@/types/supabase';
import { ValidationService } from './ValidationService';
import { StripePaymentService } from './stripe-payment.service';
import { stripeDataService } from './server/stripe-data.service';
import { createInvoiceService } from './stripe-invoice.service';

interface NoShowServiceConfig {
  stripe: Stripe;
  supabase: SupabaseClient<Database>;
  validationService: ValidationService;
}

interface NoShowChargeParams {
  bookingId: string;
  amount: number;
  reason?: string;
  empresaId: string;
  country?: string; // País de la organización para determinar la moneda
  stripeData?: {
    paymentMethodId: string;
    accountId: string;
    customerId?: string;
  };
  customerEmail?: string;
  customerName?: string;
}

interface NoShowResult {
  success: boolean;
  data?: {
    booking_id: string;
    cancelled_at: string;
    charge_status?: string;
    payment_id?: string;
    charge_amount?: number;
    invoice_id?: string;
    invoice_url?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export class NoShowService {
  private readonly stripePaymentService: StripePaymentService;

  constructor(private readonly config: NoShowServiceConfig) {
    this.stripePaymentService = new StripePaymentService(
      config.stripe,
      config.supabase,
      config.validationService
    );
  }

  async processNoShow(params: NoShowChargeParams): Promise<NoShowResult> {
    const requestId = createId();
    console.log(`🔄 [${requestId}] Iniciando proceso de no-show:`, {
      bookingId: params.bookingId,
      amount: params.amount,
      hasCustomerEmail: Boolean(params.customerEmail),
      country: params.country || 'No especificado'
    });

    try {
      // 1. Obtener datos de Stripe (del servidor o usar los proporcionados)
      let stripeData = params.stripeData;
      
      // Si no se proporcionaron datos de Stripe, intentar obtenerlos del servidor
      if (!stripeData) {
        console.log(`🔍 [${requestId}] Buscando datos Stripe en servidor para:`, params.bookingId);
        const serverStripeData = await stripeDataService.getStripePaymentData(params.bookingId);
        
        if (!serverStripeData) {
          return {
            success: false,
            error: {
              code: 'STRIPE_DATA_NOT_FOUND',
              message: 'No se encontraron datos de Stripe para la reserva'
            }
          };
        }
        
        stripeData = {
          paymentMethodId: serverStripeData.paymentMethodId,
          accountId: serverStripeData.accountId,
          customerId: serverStripeData.customerId || undefined
        };
      }

      // En este punto, stripeData está garantizado a tener un valor
      // 2. Procesar el cargo en Stripe
      console.log(`🔍 [${requestId}] Pasando datos Stripe a chargeNoShow:`, {
        hasCustomerId: Boolean(stripeData.customerId),
        customerIdPrefix: stripeData.customerId ? stripeData.customerId.substring(0, 8) + '...' : 'N/A'
      });

      const chargeResult = await this.stripePaymentService.chargeNoShow({
        bookingId: params.bookingId,
        amount: params.amount,
        reason: params.reason,
        stripeAccountId: stripeData.accountId,
        stripePaymentMethodId: stripeData.paymentMethodId,
        stripeCustomerId: stripeData.customerId,
        empresaId: params.empresaId
      });

      if (!chargeResult.success) {
        return {
          success: false,
          error: chargeResult.error
        };
      }

      // Generar factura para el cargo de garantía
      console.log(`📄 [${requestId}] Generando factura de garantía para:`, {
        bookingId: params.bookingId,
        paymentIntentId: chargeResult.paymentIntentId,
        amount: params.amount,
        hasCustomerEmail: Boolean(params.customerEmail),
        country: params.country || 'No especificado'
      });

      try {
        // Si hay email de cliente y un paymentIntent válido, generar factura
        if (params.customerEmail && chargeResult.paymentIntentId) {
          console.log(`✅ [${requestId}] Usando datos de cliente proporcionados directamente:`, {
            hasEmail: Boolean(params.customerEmail),
            hasName: Boolean(params.customerName)
          });
          
          // Actualizar o establecer el email del cliente en Stripe (necesario para facturas)
          if (stripeData.customerId) {
            try {
              console.log(`📝 [${requestId}] Actualizando cliente Stripe con email:`, params.customerEmail);
              await this.config.stripe.customers.update(
                stripeData.customerId,
                { email: params.customerEmail },
                { stripeAccount: stripeData.accountId }
              );
              console.log(`✅ [${requestId}] Cliente actualizado con email exitosamente`);
            } catch (updateError) {
              console.warn(`⚠️ [${requestId}] Error al actualizar email del cliente:`, updateError);
              // Continuamos aunque haya error, por si acaso el email ya estaba configurado
            }
          }
          
          // Usar país proporcionado o intentar obtenerlo de la base de datos
          let country = params.country;
          if (!country && params.empresaId) {
            try {
              // Si no tenemos país pero tenemos id de empresa, intentar obtenerlo
              console.log(`🔍 [${requestId}] Obteniendo país de la organización para factura no-show:`, params.empresaId);
              const { data: org } = await this.config.supabase
                .from('organizations')
                .select('country, name')
                .eq('id', params.empresaId)
                .single();
              
              if (org && org.country) {
                country = org.country;
                console.log(`🌎 [${requestId}] País de la organización para no-show:`, country);
              } else if (org && org.name) {
                // Inferir país a partir del nombre de la organización
                const name = org.name.toLowerCase();
                if (name.includes('mexico') || name.includes('méxico')) {
                  country = 'MX';
                  console.log(`🌎 [${requestId}] País inferido por nombre de organización:`, country);
                } else if (name.includes('argentina')) {
                  country = 'AR';
                  console.log(`🌎 [${requestId}] País inferido por nombre de organización:`, country);
                } else if (name.includes('españa') || name.includes('espana')) {
                  country = 'ES';
                  console.log(`🌎 [${requestId}] País inferido por nombre de organización:`, country);
                }
              }
            } catch (countryError) {
              console.warn(`⚠️ [${requestId}] Error al obtener país de la organización:`, countryError);
              // Continuamos sin el país, el servicio de facturación usará el valor por defecto
            }
          }
          
          // Crear la factura usando el servicio de facturación - siguiendo el patrón de process-full-payment
          const invoiceResult = await createInvoiceService.createAndSendInvoice({
            paymentIntentId: chargeResult.paymentIntentId,
            stripeAccountId: stripeData.accountId,
            customerId: stripeData.customerId || '',
            amount: params.amount,
            description: `Cargo por garantía: ${params.reason || 'Cancelación tardía o no presentación'}`,
            metadata: {
              payment_type: 'guarantee',
              customer_email: params.customerEmail,
              customer_name: params.customerName || '',
              booking_id: params.bookingId,
              empresaId: params.empresaId,
              country: country || '' // Añadir país de la organización para la factura
            }
          });

          console.log(`${invoiceResult.success ? '✅' : '⚠️'} [${requestId}] Resultado de generación de factura:`, {
            success: invoiceResult.success,
            invoiceId: invoiceResult.invoiceId,
            hasUrl: Boolean(invoiceResult.invoiceUrl),
            error: invoiceResult.error
          });
          
          return {
            success: true,
            data: {
              booking_id: params.bookingId,
              cancelled_at: new Date().toISOString(),
              charge_status: chargeResult.chargeStatus,
              payment_id: chargeResult.paymentIntentId,
              // Agregar información de la factura
              invoice_id: invoiceResult.invoiceId,
              invoice_url: invoiceResult.invoiceUrl
            }
          };
        } else {
          // Variable para almacenar datos del cliente
          let customerEmail = params.customerEmail;
          let customerName = params.customerName;
          
          // Si no tenemos datos del cliente directamente, intentar obtenerlos de la reserva
          if (!customerEmail) {
            console.log(`🔍 [${requestId}] Buscando datos adicionales del cliente en la reserva y sus relaciones`);
            
            // 1. Obtener datos de la reserva
            const { data: booking } = await this.config.supabase
              .from('bookings')
              .select('*')
              .eq('id', params.bookingId)
              .single();
            
            if (booking) {
              console.log(`✅ [${requestId}] Reserva encontrada en base de datos`);
              
              // Usar cualquier dato directo de la reserva como respaldo
              customerEmail = customerEmail || booking.customer_email;
              customerName = customerName || booking.customer_name;
              
              // 2. Si tenemos un stripe_customer_id, usar esa relación (enfoque prioritario)
              if (stripeData.customerId) {
                try {
                  console.log(`🔍 [${requestId}] Buscando stripe_customer con ID:`, stripeData.customerId);
                  
                  // Primero buscar en stripe_customers para obtener el user_id
                  const { data: stripeCustomer } = await this.config.supabase
                    .from('stripe_customers')
                    .select('*')
                    .eq('stripe_customer_id', stripeData.customerId)
                    .single();
                  
                  if (stripeCustomer && stripeCustomer.user_id) {
                    console.log(`✅ [${requestId}] Encontrado stripe_customer con user_id:`, stripeCustomer.user_id);
                    
                    // Consultar los datos del usuario relacionado con el stripe_customer
                    const { data: userData } = await this.config.supabase
                      .from('usuarios')
                      .select('email, nombre')
                      .eq('id', stripeCustomer.user_id)
                      .single();
                    
                    if (userData) {
                      console.log(`✅ [${requestId}] Datos de usuario encontrados en la relación stripe_customer -> usuario`);
                      customerEmail = customerEmail || userData.email;
                      customerName = customerName || userData.nombre;
                      
                      console.log(`👤 [${requestId}] Datos del cliente obtenidos desde stripe_customer -> usuario:`, {
                        hasEmail: Boolean(customerEmail),
                        hasName: Boolean(customerName),
                        email: customerEmail,
                        nombre: customerName
                      });
                    }
                  } else {
                    console.log(`⚠️ [${requestId}] No se encontró stripe_customer para el ID:`, stripeData.customerId);
                  }
                } catch (stripeCustomerError) {
                  console.error(`❌ [${requestId}] Error al obtener relación stripe_customer -> user:`, stripeCustomerError);
                }
              }
              
              // 3. Como método de respaldo, intentar con customer_id en bookings (si existe)
              if ((!customerEmail || !customerName) && booking.customer_id) {
                try {
                  console.log(`🔍 [${requestId}] Buscando datos en tabla de customers con ID:`, booking.customer_id);
                  
                  const { data: customer } = await this.config.supabase
                    .from('customers')
                    .select('*')
                    .eq('id', booking.customer_id)
                    .single();
                  
                  if (customer) {
                    console.log(`✅ [${requestId}] Customer encontrado en base de datos`);
                    customerEmail = customerEmail || customer.email;
                    customerName = customerName || customer.name;
                    
                    console.log(`👤 [${requestId}] Datos del cliente desde tabla customers:`, {
                      hasEmail: Boolean(customerEmail),
                      hasName: Boolean(customerName)
                    });
                  }
                } catch (customerError) {
                  console.warn(`⚠️ [${requestId}] Error al buscar en tabla customers:`, customerError);
                }
              }
              
              // 4. Si finalmente tenemos el email, intentar actualizar el cliente de Stripe
              if (customerEmail && stripeData.customerId) {
                try {
                  console.log(`📝 [${requestId}] Actualizando cliente Stripe con email:`, customerEmail);
                  
                  await this.config.stripe.customers.update(
                    stripeData.customerId,
                    { 
                      email: customerEmail,
                      name: customerName || undefined
                    },
                    { stripeAccount: stripeData.accountId }
                  );
                  
                  console.log(`✅ [${requestId}] Cliente de Stripe actualizado con email: ${customerEmail}`);
                } catch (updateError) {
                  console.warn(`⚠️ [${requestId}] Error al actualizar cliente de Stripe:`, updateError);
                  // Continuamos aunque haya error
                }
              }
            } else {
              console.warn(`⚠️ [${requestId}] No se encontró la reserva en la base de datos`);
            }
          }

          // Solo crear factura si tenemos datos suficientes
          if (chargeResult.paymentIntentId && customerEmail) {
            console.log(`✅ [${requestId}] Creando factura con email: ${customerEmail}`);
            
            // Actualizar o establecer el email del cliente en Stripe (necesario para facturas)
            if (stripeData.customerId && customerEmail) {
              try {
                console.log(`📝 [${requestId}] Actualizando cliente Stripe con email`);
                await this.config.stripe.customers.update(
                  stripeData.customerId,
                  { email: customerEmail },
                  { stripeAccount: stripeData.accountId }
                );
              } catch (updateError) {
                console.warn(`⚠️ [${requestId}] Error al actualizar email del cliente:`, updateError);
                // Continuamos aunque haya error, por si acaso el email ya estaba configurado
              }
            }
            
            // Usar país proporcionado o intentar obtenerlo de la base de datos
            let country = params.country;
            if (!country && params.empresaId) {
              try {
                // Si no tenemos país pero tenemos id de empresa, intentar obtenerlo
                console.log(`🔍 [${requestId}] Obteniendo país de la organización para factura no-show:`, params.empresaId);
                const { data: org } = await this.config.supabase
                  .from('organizations')
                  .select('country, name')
                  .eq('id', params.empresaId)
                  .single();
                
                if (org && org.country) {
                  country = org.country;
                  console.log(`🌎 [${requestId}] País de la organización para no-show:`, country);
                } else if (org && org.name) {
                  // Inferir país a partir del nombre de la organización
                  const name = org.name.toLowerCase();
                  if (name.includes('mexico') || name.includes('méxico')) {
                    country = 'MX';
                    console.log(`🌎 [${requestId}] País inferido por nombre de organización:`, country);
                  } else if (name.includes('argentina')) {
                    country = 'AR';
                    console.log(`🌎 [${requestId}] País inferido por nombre de organización:`, country);
                  } else if (name.includes('españa') || name.includes('espana')) {
                    country = 'ES';
                    console.log(`🌎 [${requestId}] País inferido por nombre de organización:`, country);
                  }
                }
              } catch (countryError) {
                console.warn(`⚠️ [${requestId}] Error al obtener país de la organización:`, countryError);
                // Continuamos sin el país, el servicio de facturación usará el valor por defecto
              }
            }
            
            // Crear la factura usando el servicio de facturación
            const invoiceResult = await createInvoiceService.createAndSendInvoice({
              paymentIntentId: chargeResult.paymentIntentId,
              stripeAccountId: stripeData.accountId,
              customerId: stripeData.customerId || '',
              amount: params.amount,
              description: `Cargo por garantía: ${params.reason || 'Cancelación tardía o no presentación'}`,
              metadata: {
                booking_id: params.bookingId,
                customer_email: customerEmail,
                customer_name: customerName || '',
                payment_type: 'guarantee', // Especificar que es un pago de garantía
                payment_description: 'Cargo por garantía',
                charge_type: 'no_show',
                empresaId: params.empresaId,
                country: country || '' // Añadir país de la organización para la factura
              }
            });

            console.log(`${invoiceResult.success ? '✅' : '⚠️'} [${requestId}] Resultado de generación de factura:`, {
              success: invoiceResult.success,
              invoiceId: invoiceResult.invoiceId,
              hasUrl: Boolean(invoiceResult.invoiceUrl),
              error: invoiceResult.error
            });
            
            return {
              success: true,
              data: {
                booking_id: params.bookingId,
                cancelled_at: new Date().toISOString(),
                charge_status: chargeResult.chargeStatus,
                payment_id: chargeResult.paymentIntentId,
                // Agregar información de la factura
                invoice_id: invoiceResult.invoiceId,
                invoice_url: invoiceResult.invoiceUrl
              }
            };
          } else {
            console.warn(`⚠️ [${requestId}] No se pudo generar factura: Datos insuficientes`, {
              hasPaymentIntent: Boolean(chargeResult.paymentIntentId),
              hasCustomerEmail: Boolean(customerEmail)
            });
          }
        }
      } catch (invoiceError) {
        // No interrumpir el flujo si hay error en la factura
        console.error(`❌ [${requestId}] Error al generar factura:`, invoiceError);
      }

      // 3. Cancelar la reserva y registrar el pago usando RPC
      const { data: cancelResult, error: cancelError } = await this.config.supabase
        .rpc('cancel_booking_v1', {
          p_booking_id: params.bookingId,
          p_reason: params.reason || 'Cargo por no-show aplicado',
          p_should_charge: true,
          p_charge_amount: params.amount,
          p_stripe_payment_intent_id: chargeResult.paymentIntentId,
          p_stripe_payment_method_id: stripeData.paymentMethodId
        });

      if (cancelError) {
        console.error(`❌ [${requestId}] Error al cancelar reserva:`, cancelError);
        throw cancelError;
      }

      return {
        success: true,
        data: {
          booking_id: params.bookingId,
          cancelled_at: new Date().toISOString(),
          charge_status: chargeResult.chargeStatus,
          ...cancelResult
        }
      };

    } catch (error: any) {
      console.error(`❌ [${requestId}] Error en processNoShow:`, error);
      return {
        success: false,
        error: {
          code: 'PROCESS_ERROR',
          message: 'Error al procesar no-show',
          details: error.message
        }
      };
    }
  }
} 