import { createId } from '@paralleldrive/cuid2';
import { Stripe } from 'stripe';
import { createSupabaseClient } from '@/lib/supabase';

interface CreateInvoiceParams {
  paymentIntentId: string;
  stripeAccountId: string;
  customerId: string;
  amount: number;
  description: string;
  metadata?: Record<string, string>;
}

interface CreateManualBookingInvoiceParams {
  stripeAccountId: string;
  customerId?: string; // Corregido el tipo para permitir undefined
  customerEmail: string;
  customerName?: string;
  amount: number;
  description: string;
  bookingId: string;
  empresaId: string;
  courtId?: string;
  branchId?: string;
  paymentType?: 'booking' | 'deposit'; // Tipo de pago: completo o seña
  isPartialPayment?: boolean; // Indica si es un pago parcial
}

/**
 * Servicio para crear y enviar facturas profesionales mediante la API de Invoices de Stripe
 * Implementa un enfoque que genera PDFs descargables y facturas formales
 */
export class StripeInvoiceService {
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

      // 2. Determinar el tipo de pago (completo, seña o garantía)
      const paymentType = params.metadata?.payment_type || 'full';
      const isDepositPayment = paymentType === 'deposit';
      const isGuaranteePayment = paymentType === 'guarantee';
      
      // Preparamos metadatos específicos sobre el tipo de pago
      const enhancedMetadata = {
        ...params.metadata,
        // Mantener el tipo de pago original sin sobrescribirlo
        payment_type: paymentType,
        // Añadir información adicional según el tipo de pago
        payment_description: isDepositPayment 
          ? `Seña (${params.metadata?.deposit_percentage || '30'}%)`
          : isGuaranteePayment
            ? 'Cargo por garantía'
            : 'Pago completo',
        payment_date: new Date().toISOString()
      };
      
      // Descripción para la factura (sin mencionar si es seña o pago completo)
      const invoiceDescription = `Factura: ${params.description}`;

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
              ...enhancedMetadata
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
            description: params.description // Descripción simple sin mencionar tipo de pago
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
                  ...enhancedMetadata
                }
              });
              
              // Añadir item a la nueva factura
              await stripe.invoiceItems.create({
                customer: params.customerId,
                invoice: newInvoice.id,
                amount: Math.round(params.amount * 100),
                currency: 'eur',
                description: `${params.description} [Referencia: ${params.paymentIntentId.slice(-8)}]`
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

  // Método específico para crear facturas para reservas manuales con pago completo
  async createManualBookingInvoice(params: CreateManualBookingInvoiceParams): Promise<{
    success: boolean;
    invoiceId?: string;
    invoiceUrl?: string;
    error?: { message: string; code: string };
  }> {
    const requestId = `mbi_${Date.now().toString(36)}`;
    console.log(`🔄 [${requestId}] Iniciando creación de factura para reserva manual:`, params);
    
    // Verificar explícitamente la presencia de bookingId
    if (!params.bookingId) {
      console.warn(`⚠️ [${requestId}] ADVERTENCIA: No se proporcionó bookingId en los parámetros!`);
    }

    try {
      // Convertir los parámetros a un formato adecuado para la API, asegurando que todos los
      // campos requeridos estén presentes y sean del tipo correcto
      const apiParams = {
        stripeAccountId: params.stripeAccountId,
        customerId: params.customerId || undefined,
        customerEmail: params.customerEmail,
        customerName: params.customerName || undefined,
        amount: params.amount,
        description: params.description,
        bookingId: params.bookingId,
        empresaId: params.empresaId,
        courtId: params.courtId || undefined,
        branchId: params.branchId || undefined,
        paymentType: params.paymentType || undefined,
        isPartialPayment: params.isPartialPayment || undefined
      };
      
      console.log(`📦 [${requestId}] Parámetros procesados para enviar a la API:`, apiParams);
      
      // Utilizar el endpoint de API para crear la factura en el servidor
      const response = await fetch('/api/stripe/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiParams)
      });
      
      // Log detallado de la respuesta
      console.log(`🔍 [${requestId}] Respuesta del servidor:`, {
        status: response.status,
        statusText: response.statusText
      });
      
      const result = await response.json();
      console.log(`📄 [${requestId}] Cuerpo de la respuesta:`, result);
      
      if (!response.ok) {
        console.error(`❌ [${requestId}] Error al crear factura en el servidor:`, result.error);
        return {
          success: false,
          error: {
            message: result.error?.message || 'Error al crear factura',
            code: result.error?.code || 'INVOICE_ERROR'
          }
        };
      }
      
      console.log(`✅ [${requestId}] Factura creada exitosamente en el servidor:`, {
        invoiceId: result.invoiceId,
        invoiceUrl: result.invoiceUrl
      });
      
      return {
        success: true,
        invoiceId: result.invoiceId,
        invoiceUrl: result.invoiceUrl
      };
    } catch (error: any) {
      console.error(`❌ [${requestId}] Error al crear factura para reserva manual:`, error);
      return {
        success: false,
        error: {
          message: error.message || 'Error al crear factura',
          code: error.code || 'INVOICE_ERROR'
        }
      };
    }
  }

  // Método para generar una factura a partir del ID de una reserva
  async generateInvoiceFromBooking(bookingId: string): Promise<{
    success: boolean;
    invoiceId?: string;
    invoiceUrl?: string;
    error?: { message: string; code: string };
  }> {
    const requestId = `gib_${Date.now().toString(36)}`;
    console.log(`🔄 [${requestId}] Generando factura para reserva manual ID:`, bookingId);

    try {
      // 1. Obtener datos de la reserva desde la base de datos
      const supabase = createSupabaseClient();
      
      // Obtener la información completa de la reserva
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          id, 
          court_id, 
          total_price, 
          court_price,
          payment_status,
          payment_method,
          court:court_id(
            id, 
            name, 
            branch_id
          )
        `)
        .eq('id', bookingId)
        .single();

      if (bookingError || !booking) {
        console.error(`❌ [${requestId}] Error al obtener datos de la reserva:`, bookingError);
        return {
          success: false,
          error: {
            message: 'No se pudo encontrar la reserva',
            code: 'BOOKING_NOT_FOUND'
          }
        };
      }

      // Ahora obtenemos los datos de la sede y empresa en consultas separadas
      const courtId = booking.court_id;
      const court = booking.court;
      const branchId = court ? court.branch_id : null;

      if (!branchId) {
        console.error(`❌ [${requestId}] No se encontró la sede asociada a la cancha:`, {
          courtId,
          court: booking.court
        });
        return {
          success: false,
          error: {
            message: 'No se pudo obtener la información de la sede',
            code: 'BRANCH_NOT_FOUND'
          }
        };
      }

      // Obtener datos de la sede
      const { data: sede, error: sedeError } = await supabase
        .from('sedes')
        .select('id, name, empresa_id')
        .eq('id', branchId)
        .single();

      if (sedeError || !sede) {
        console.error(`❌ [${requestId}] Error al obtener datos de la sede:`, sedeError);
        return {
          success: false,
          error: {
            message: 'No se pudo obtener información de la sede',
            code: 'BRANCH_ERROR'
          }
        };
      }

      // Obtener datos de la empresa
      const { data: empresa, error: empresaError } = await supabase
        .from('empresas')
        .select('id, stripe_account_id')
        .eq('id', sede.empresa_id)
        .single();

      if (empresaError || !empresa) {
        console.error(`❌ [${requestId}] Error al obtener datos de la empresa:`, empresaError);
        return {
          success: false,
          error: {
            message: 'No se pudo obtener información de la empresa',
            code: 'COMPANY_ERROR'
          }
        };
      }

      // Obtener los datos del usuario que hizo la reserva (participantes)
      const { data: participants, error: participantsError } = await supabase
        .from('booking_participants')
        .select(`
          id,
          user_id,
          role,
          usuarios:user_id(id, email, nombre)
        `)
        .eq('booking_id', bookingId)
        .limit(1);

      // Si no hay participantes, intentar obtener el cliente de otras fuentes
      let userInfo: { email: string, nombre: string } = {
        email: 'cliente@example.com',
        nombre: 'Cliente'
      };
      
      if (participantsError || !participants || participants.length === 0) {
        console.warn(`⚠️ [${requestId}] No se encontraron participantes para la reserva:`, {
          bookingId,
          error: participantsError
        });
        
        // Intentar obtener información del cliente buscando en otras reservas o en stripe_customers
        const { data: stripeCustomers, error: stripeError } = await supabase
          .from('stripe_customers')
          .select('*')
          .eq('empresa_id', sede.empresa_id)
          .limit(1);
          
        if (!stripeError && stripeCustomers && stripeCustomers.length > 0) {
          userInfo = {
            email: stripeCustomers[0].email || 'cliente@example.com',
            nombre: stripeCustomers[0].name || 'Cliente'
          };
          console.log(`✅ [${requestId}] Se encontró información de cliente en stripe_customers`);
        } else {
          console.warn(`⚠️ [${requestId}] No se encontró información de cliente, usando valores por defecto`);
        }
      } else {
        // Usar el primer participante como cliente
        const participant = participants[0];
        if (participant.usuarios) {
          userInfo = {
            email: participant.usuarios.email || 'cliente@example.com',
            nombre: participant.usuarios.nombre || 'Cliente'
          };
          console.log(`✅ [${requestId}] Se encontró información de cliente en participant`);
        } else {
          console.warn(`⚠️ [${requestId}] Participante encontrado pero sin datos de usuario, usando valores por defecto`);
        }
      }

      // 2. Extraer información necesaria para la factura
      const stripeAccountId = empresa.stripe_account_id;
      
      if (!stripeAccountId) {
        console.error(`❌ [${requestId}] La empresa no tiene cuenta de Stripe configurada`);
        return {
          success: false,
          error: {
            message: 'La empresa no tiene cuenta de Stripe configurada',
            code: 'STRIPE_ACCOUNT_NOT_FOUND'
          }
        };
      }

      // 3. Obtener cliente de Stripe o crear uno nuevo
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
        stripeAccount: stripeAccountId
      });

      // Buscar o crear cliente en Stripe
      let customerId: string | undefined;
      const customerEmail = userInfo.email;
      const customerName = userInfo.nombre;
      
      if (!customerEmail) {
        console.error(`❌ [${requestId}] No se encontró email del cliente para la reserva`);
        return {
          success: false,
          error: {
            message: 'No se encontró email del cliente',
            code: 'CUSTOMER_EMAIL_NOT_FOUND'
          }
        };
      }
      
      // Buscar si el cliente ya existe en Stripe
      try {
        const customers = await stripe.customers.list({
          email: customerEmail,
          limit: 1
        });
        
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
          console.log(`✅ [${requestId}] Cliente encontrado en Stripe:`, customerId);
        } else {
          // Crear nuevo cliente en Stripe
          const newCustomer = await stripe.customers.create({
            email: customerEmail,
            name: customerName || customerEmail,
            metadata: {
              empresaId: sede.empresa_id
            }
          });
          customerId = newCustomer.id;
          console.log(`✅ [${requestId}] Nuevo cliente creado en Stripe:`, customerId);
        }
      } catch (stripeError) {
        console.error(`❌ [${requestId}] Error al buscar/crear cliente en Stripe:`, stripeError);
        // Continuamos sin cliente ID si hay error
      }
      
      // 4. Crear la factura para la reserva manual
      const courtName = court ? court.name : 'Pista';
      const invoiceResult = await this.createManualBookingInvoice({
        stripeAccountId,
        customerId,
        customerEmail,
        customerName: customerName || undefined,
        amount: booking.total_price,
        description: `Reserva: ${courtName}`,
        bookingId: booking.id,
        empresaId: sede.empresa_id || '',
        courtId: booking.court_id,
        branchId: branchId,
        paymentType: 'booking',
        isPartialPayment: false
      });

      if (!invoiceResult.success) {
        console.error(`❌ [${requestId}] Error al crear factura para reserva:`, invoiceResult.error);
        return invoiceResult;
      }

      // 5. Actualizar la reserva con el ID de la factura (opcional, para futuras referencias)
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          invoice_id: invoiceResult.invoiceId,
          invoice_url: invoiceResult.invoiceUrl
        })
        .eq('id', bookingId);

      if (updateError) {
        console.warn(`⚠️ [${requestId}] No se pudo actualizar la reserva con el ID de factura:`, updateError);
        // No fallamos la operación por esto, la factura ya fue creada
      }

      console.log(`✅ [${requestId}] Factura generada exitosamente para reserva ID: ${bookingId}`);
      return invoiceResult;
      
    } catch (error: any) {
      console.error(`❌ [${requestId}] Error inesperado al generar factura para reserva:`, error);
      return {
        success: false,
        error: {
          message: error.message || 'Error al generar factura',
          code: error.code || 'UNEXPECTED_ERROR'
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
