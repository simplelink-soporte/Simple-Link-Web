import { createId } from '@paralleldrive/cuid2';
import { Stripe } from 'stripe';

interface CreateInvoiceParams {
  paymentIntentId: string;
  stripeAccountId: string;
  customerId: string;
  amount: number;
  description: string;
  metadata?: Record<string, string>;
}

/**
 * Servicio para crear y enviar facturas profesionales mediante la API de Invoices de Stripe
 * Implementa un enfoque que genera PDFs descargables y facturas formales
 */
class StripeInvoiceService {
  /**
   * Crea y envía una factura profesional después de un pago exitoso
   * @param params Parámetros necesarios para crear la factura
   * @returns Resultado de la operación
   */
  async createAndSendInvoice(params: CreateInvoiceParams): Promise<{ 
    success: boolean, 
    invoiceId?: string, 
    invoiceUrl?: string, 
    pdfUrl?: string,
    error?: any 
  }> {
    const requestId = createId();
    console.log(`🔄 [${requestId}] Iniciando creación de factura profesional para PaymentIntent:`, params.paymentIntentId);

    try {
      // 1. Configurar Stripe con la cuenta correcta
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
        stripeAccount: params.stripeAccountId
      });

      // 2. Determinar el tipo de pago (completo o seña)
      const isDepositPayment = params.metadata?.payment_type === 'deposit';
      
      // Descripción adaptada según tipo de pago
      const invoiceDescription = isDepositPayment 
        ? `Factura de Seña (${params.metadata?.deposit_percentage || '30'}%): ${params.description}`
        : `Factura: ${params.description}`;

      // 3. Obtener el email del cliente desde los metadatos
      const customerEmail = params.metadata?.customer_email;
      
      if (!customerEmail) {
        console.warn(`⚠️ [${requestId}] No se proporcionó email para enviar la factura`);
        return {
          success: false,
          error: {
            message: 'No se proporcionó email para la factura',
            code: 'missing_email'
          }
        };
      }

      try {
        // 4. IMPORTANTE: Actualizar el cliente de Stripe con el email
        // Esto es necesario porque Stripe requiere que el cliente tenga un email
        // asociado directamente en su objeto Customer para enviar facturas
        console.log(`📧 [${requestId}] Actualizando cliente de Stripe con email:`, customerEmail);
        
        try {
          await stripe.customers.update(
            params.customerId,
            {
              email: customerEmail
            }
          );
          console.log(`✅ [${requestId}] Cliente actualizado con email:`, customerEmail);
        } catch (updateError) {
          console.error(`⚠️ [${requestId}] Error al actualizar cliente:`, updateError);
          // Continuamos aunque haya error, por si acaso el email ya estaba configurado
        }
        
        // 5. Obtener información del PaymentIntent para vincularlo correctamente con la factura
        console.log(`🔍 [${requestId}] Obteniendo detalles del PaymentIntent:`, params.paymentIntentId);
        const paymentIntent = await stripe.paymentIntents.retrieve(params.paymentIntentId);
        
        if (!paymentIntent || paymentIntent.status !== 'succeeded') {
          console.error(`❌ [${requestId}] El PaymentIntent no está en estado succeeded:`, paymentIntent?.status);
          return {
            success: false,
            error: {
              message: `El pago no está en estado succeeded (${paymentIntent?.status})`,
              code: 'invalid_payment_intent_status'
            }
          };
        }

        // 6. Crear la factura formal usando el sistema de Invoices de Stripe
        console.log(`🧾 [${requestId}] Creando factura profesional para el cliente:`, params.customerId);
        
        try {
          // 6.1. Obtener el cargo (charge) asociado al PaymentIntent
          console.log(`🔍 [${requestId}] Obteniendo cargos asociados al PaymentIntent`);
          const charges = await stripe.charges.list({
            payment_intent: params.paymentIntentId
          });
          
          if (!charges.data.length) {
            console.warn(`⚠️ [${requestId}] No se encontraron cargos asociados al PaymentIntent. Continuando con método alternativo.`);
          }
          
          // 6.2. Crear la factura en modo AUTO_ADVANCE para que Stripe maneje los estados
          const invoice = await stripe.invoices.create({
            customer: params.customerId,
            collection_method: 'charge_automatically',
            auto_advance: true, // Dejar que Stripe maneje automáticamente el estado de la factura
            description: invoiceDescription,
            currency: 'eur',
            default_payment_method: paymentIntent.payment_method as string,
            metadata: {
              payment_intent_id: params.paymentIntentId,
              ...params.metadata
            },
            custom_fields: [
              {
                name: 'Referencia de Pago',
                value: params.paymentIntentId
              }
            ]
          });

          // 6.3. Añadir el ítem a la factura
          await stripe.invoiceItems.create({
            customer: params.customerId,
            invoice: invoice.id,
            amount: Math.round(params.amount * 100), // Convertir a centavos
            currency: 'eur',
            description: isDepositPayment 
              ? `Seña (${params.metadata?.deposit_percentage || '30'}%): ${params.description}`
              : params.description
          });

          // 6.4. Finalizar la factura para que Stripe intente avanzar su estado automáticamente
          const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
          
          // 6.5. Si la factura no está pagada automáticamente, intentamos marcarla como pagada
          // Esto puede ocurrir porque el objeto invoice no tiene enlazado directamente el cargo,
          // aunque hayamos especificado el payment_method
          let invoiceToReturn = finalizedInvoice;
          
          if (finalizedInvoice.status !== 'paid') {
            console.log(`🔄 [${requestId}] Factura no está pagada automáticamente, intentando marcarla como pagada...`);
            
            try {
              // 6.5.1 Método estándar: pay con paid_out_of_band
              invoiceToReturn = await stripe.invoices.pay(finalizedInvoice.id, {
                paid_out_of_band: true // Indica que ya fue pagada fuera del flujo regular de facturación
              });
              console.log(`✅ [${requestId}] Factura marcada como pagada exitosamente mediante pay/paid_out_of_band`);
            } catch (payError) {
              console.warn(`⚠️ [${requestId}] Error al marcar como pagada con método estándar:`, payError);
              
              // 6.5.2 Método alternativo: voidInvoice y luego crear una nueva con estado correcto
              console.log(`🔄 [${requestId}] Intentando método alternativo...`);
              
              // Anular la factura actual que está en estado incorrecto
              await stripe.invoices.voidInvoice(finalizedInvoice.id);
              
              // Crear una nueva factura con metadatos similares pero usando otra estrategia
              const newInvoice = await stripe.invoices.create({
                customer: params.customerId,
                collection_method: 'charge_automatically',
                // No especificar default_payment_method ya que puede estar causando conflicto
                description: `${invoiceDescription} [Corregida]`,
                currency: 'eur',
                metadata: {
                  payment_intent_id: params.paymentIntentId,
                  original_invoice_id: finalizedInvoice.id,
                  ...params.metadata
                }
              });
              
              // Añadir item a la nueva factura
              await stripe.invoiceItems.create({
                customer: params.customerId,
                invoice: newInvoice.id,
                amount: Math.round(params.amount * 100),
                currency: 'eur',
                description: `${isDepositPayment ? `Seña (${params.metadata?.deposit_percentage || '30'}%)` : 'Pago'}: ${params.description} [Referencia: ${params.paymentIntentId.slice(-8)}]`
              });
              
              // Finalizar la nueva factura
              const finalNewInvoice = await stripe.invoices.finalizeInvoice(newInvoice.id);
              
              // Marcar como pagada usando el método más simple
              invoiceToReturn = await stripe.invoices.pay(finalNewInvoice.id, {
                paid_out_of_band: true
              });
              
              console.log(`✅ [${requestId}] Método alternativo exitoso: Nueva factura creada y marcada como pagada`);
            }
          } else {
            console.log(`✅ [${requestId}] Factura marcada como pagada automáticamente por Stripe`);
          }
          
          // 6.6. Obtener la URL de la factura y del PDF
          const invoiceUrl = invoiceToReturn.hosted_invoice_url;
          const pdfUrl = invoiceToReturn.invoice_pdf;
          
          // 6.7. Como no podemos usar sendInvoice con collection_method='charge_automatically',
          // creamos una copia de la factura para enviarla por email si es necesario
          let emailSent = false;
          try {
            // Verificar si el cliente tiene email configurado
            const customer = await stripe.customers.retrieve(params.customerId);
            if (customer && !customer.deleted && customer.email) {
              console.log(`📨 [${requestId}] Enviando notificación por email al cliente ${customer.email}...`);
              
              // Envío de email mediante la API Stripe Email de receipt_email
              // Esta es una alternativa al envío manual de facturas que funciona con facturas ya pagadas
              try {
                // Intentar actualizar el PaymentIntent para asegurar que tenga receipt_email
                await stripe.paymentIntents.update(params.paymentIntentId, {
                  receipt_email: customer.email
                });
                console.log(`✅ [${requestId}] PaymentIntent actualizado con receipt_email para envío de recibo`);
                emailSent = true;
              } catch (receiptError) {
                console.warn(`⚠️ [${requestId}] No se pudo actualizar el PaymentIntent con receipt_email:`, receiptError);
              }
              
              // Si la factura está en estado pagado, informamos que el cliente puede acceder a ella
              if (invoiceToReturn.status === 'paid' && invoiceUrl) {
                console.log(`📨 [${requestId}] El cliente puede acceder a la factura pagada mediante la URL: ${invoiceUrl}`);
              }
            } else {
              console.warn(`⚠️ [${requestId}] El cliente no tiene email configurado o no se pudo recuperar`);
            }
          } catch (emailError) {
            console.warn(`⚠️ [${requestId}] Error al intentar enviar notificación por email:`, emailError);
          }
          
          console.log(`✅ [${requestId}] Factura profesional creada exitosamente:`, {
            invoiceId: invoiceToReturn.id,
            invoiceNumber: invoiceToReturn.number,
            status: invoiceToReturn.status,
            amount: invoiceToReturn.amount_paid / 100,
            invoiceUrl: invoiceUrl || 'No disponible',
            pdfUrl: pdfUrl || 'No disponible'
          });

          return {
            success: true,
            invoiceId: invoiceToReturn.id,
            invoiceUrl: invoiceUrl || undefined,
            pdfUrl: pdfUrl || undefined
          };
        } catch (invoiceError: any) {
          // Si falla la creación de la factura, registramos el error y devolvemos los detalles
          console.error(`❌ [${requestId}] Error al crear la factura profesional:`, invoiceError);
          
          return {
            success: false,
            error: {
              message: invoiceError.message || "No se pudo crear la factura profesional",
              code: invoiceError.code || "invoice_creation_error",
              type: invoiceError.type || "unknown"
            }
          };
        }
      } catch (invoiceError: any) {
        // Si falla la creación de la factura, registramos el error y devolvemos los detalles
        console.error(`❌ [${requestId}] Error al crear la factura profesional:`, invoiceError);
        
        return {
          success: false,
          error: {
            message: invoiceError.message || "No se pudo crear la factura profesional",
            code: invoiceError.code || "invoice_creation_error",
            type: invoiceError.type || "unknown"
          }
        };
      }
    } catch (error: any) {
      console.error(`❌ [${requestId}] Error general al configurar factura:`, error);
      return {
        success: false,
        error: {
          message: error.message,
          code: error.code,
          type: error.type
        }
      };
    }
  }

  /**
   * Verifica si la funcionalidad de facturas profesionales está habilitada
   * @returns boolean indicando si las facturas profesionales están habilitadas
   */
  isInvoiceFeatureEnabled(): boolean {
    return process.env.STRIPE_INVOICES_ENABLED !== 'false';
  }
}

// Exportar una instancia única del servicio
export const createInvoiceService = new StripeInvoiceService();
