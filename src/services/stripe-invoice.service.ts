import { createId } from '@paralleldrive/cuid2';
import { Stripe } from 'stripe';
import { createSupabaseClient } from '@/lib/supabase';
import { countryDetectionService } from './country-detection.service';

/**
 * Obtiene el código de moneda según el país proporcionado
 * @param country Código ISO o nombre del país
 * @returns Código de moneda (mxn, ars, eur)
 * @deprecated Use countryDetectionService.getCurrencyCodeByCountry en su lugar
 */
const getCurrencyCodeByCountry = (country?: string | null): string => {
  // Usar el servicio centralizado de detección de países
  return countryDetectionService.getCurrencyCodeByCountry(country || '');
};

interface CreateInvoiceParams {
  paymentIntentId: string;
  stripeAccountId: string;
  customerId: string;
  amount: number;
  description: string;
  metadata?: Record<string, string>;
  contextCountry?: string | null; // Nuevo parámetro opcional para el país desde el contexto
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
  totalAmount?: number; // Monto total de la reserva, importante para cálculos de seña
  country?: string; // Mantener este campo para reservas manuales
}

/**
 * Servicio para crear y enviar facturas profesionales mediante la API de Invoices de Stripe
 * Implementa un enfoque que genera PDFs descargables y facturas formales
 */
export class StripeInvoiceService {
  private supabase = createSupabaseClient();
  
  // Instancia única (patrón singleton)
  private static instance: StripeInvoiceService;
  
  // Método para obtener la instancia única
  public static getInstance(): StripeInvoiceService {
    if (!StripeInvoiceService.instance) {
      StripeInvoiceService.instance = new StripeInvoiceService();
    }
    return StripeInvoiceService.instance;
  }

  /**
   * Obtiene el país de una organización por su ID
   * @param empresaId ID de la organización
   * @returns Código ISO o nombre del país, o null si no se encuentra
   */
  private async getCountryByOrganizationId(empresaId?: string): Promise<string | null> {
    if (!empresaId) {
      console.error('❌ No se proporcionó ID de organización para obtener el país');
      return null;
    }
    
    try {
      // Utilizar el servicio especializado para la detección de países
      return await countryDetectionService.getCountryByOrganizationId(empresaId);
    } catch (error: any) {
      console.error(`❌ Error al obtener país para organización ${empresaId}:`, error.message);
      throw error; // Propagar el error para que el llamador pueda manejarlo
    }
  }

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

      // 5. Verificar el estado del PaymentIntent antes de crear la factura
      console.log(`🔍 [${requestId}] Obteniendo detalles del PaymentIntent:`, params.paymentIntentId);
      const paymentIntent = await stripe.paymentIntents.retrieve(params.paymentIntentId);
      
      if (!paymentIntent) {
        console.error(`❌ [${requestId}] No se encontró el PaymentIntent`);
        return {
          success: false,
          error: {
            message: 'No se encontró el PaymentIntent',
            code: 'payment_intent_not_found'
          }
        };
      }
      
      // Extraer metadatos importantes del PaymentIntent si no están en los params
      // Esto garantiza que siempre obtenemos la información más actualizada
      const paymentMetadata = paymentIntent.metadata || {};
      const updatedMetadata = {
        ...params.metadata,
        ...paymentMetadata // Priorizar los metadatos del PaymentIntent
      };
      
      // Obtener el país, priorizando el país del contexto (si existe)
      let country = params.contextCountry || updatedMetadata?.country || '';
      const empresaId = updatedMetadata?.empresaId || '';
      
      // Si no tenemos país pero tenemos empresaId, obtener el país desde la BD
      // Solo hacemos la consulta si NO tenemos el país desde el contexto
      if (!country && empresaId) {
        console.log(`🔍 [${requestId}] No se proporcionó país desde contexto, obteniendo país de la organización:`, empresaId);
        const dbCountry = await this.getCountryByOrganizationId(empresaId);
        if (dbCountry) {
          country = dbCountry;
        }
        console.log(`🌎 [${requestId}] País obtenido de la base de datos:`, country || 'No encontrado');
      } else if (params.contextCountry) {
        console.log(`🌎 [${requestId}] Usando país desde contexto:`, params.contextCountry);
      }
      
      // Determinar la moneda según el país usando el servicio centralizado
      const currencyCode = countryDetectionService.getCurrencyCodeByCountry(country || '');
      
      console.log(`🌎 [${requestId}] País detectado: ${country || 'No especificado'}, usando moneda: ${currencyCode}`);
      
      // Determinar el tipo de pago (completo, seña o garantía)
      const paymentType = updatedMetadata?.payment_type || 'full';
      const isDepositPayment = paymentType === 'deposit';
      const isGuaranteePayment = paymentType === 'guarantee';
      
      // Preparamos metadatos específicos sobre el tipo de pago
      const enhancedMetadata = {
        ...updatedMetadata,
        // Mantener el tipo de pago original sin sobrescribirlo
        payment_type: paymentType,
        // Añadir información adicional según el tipo de pago
        payment_description: isDepositPayment 
          ? `Seña (${updatedMetadata?.deposit_percentage || '30'}%)`
          : isGuaranteePayment 
            ? `Garantía (${updatedMetadata?.guarantee_percentage || '10'}%)`
            : 'Pago completo'
      };
      
      // Si es un pago garantía, puede que no hay cobro real
      if (isGuaranteePayment) {
        console.log(`ℹ️ [${requestId}] Pago de tipo garantía identificado`);
      }
      
      // Crear una descripción específica para la factura según el tipo de pago
      let invoiceDescription = params.description;
      
      if (isDepositPayment) {
        const percentage = updatedMetadata?.deposit_percentage || '30';
        invoiceDescription = `Seña (${percentage}%) - ${params.description}`;
      } else if (isGuaranteePayment) {
        const percentage = updatedMetadata?.guarantee_percentage || '10'; 
        invoiceDescription = `Garantía (${percentage}%) - ${params.description}`;
      }
      
      // Verificar que el estado sea 'succeeded' para continuar
      if (paymentIntent.status !== 'succeeded') {
        console.error(`❌ [${requestId}] PaymentIntent no está en estado succeeded:`, paymentIntent.status);
        return {
          success: false,
          error: {
            message: `El pago no está en estado succeeded (${paymentIntent.status})`,
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
          currency: currencyCode,
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
          currency: currencyCode,
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
            console.warn(`⚠️ [${requestId}] No se pudo actualizar el PaymentIntent con receipt_email:`, payError);
              
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
              currency: currencyCode,
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
              currency: currencyCode,
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
    pdfUrl?: string;
    error?: any
  }> {
    const requestId = createId();
    console.log(`🔄 [${requestId}] Iniciando creación de factura manual para reserva:`, params.bookingId);

    try {
      // 1. Configurar Stripe con la cuenta correcta
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
        stripeAccount: params.stripeAccountId
      });

      // 2. Obtener el país de la organización
      let country = '';
      try {
        if (params.country) {
          // Si se proporciona un país explícito, usarlo
          country = params.country;
          console.log(`🌎 [${requestId}] Usando país proporcionado explícitamente:`, country);
        } else if (params.empresaId) {
          console.log(`🔍 [${requestId}] Obteniendo país de la organización para factura manual:`, params.empresaId);
          const dbCountry = await this.getCountryByOrganizationId(params.empresaId);
          if (dbCountry) {
            country = dbCountry;
            console.log(`🌎 [${requestId}] País obtenido de la base de datos:`, country);
          }
        }
        
        if (!country) {
          throw new Error(`No se pudo determinar el país para la factura de la reserva ${params.bookingId}`);
        }
      } catch (countryError: any) {
        console.error(`❌ [${requestId}] Error al obtener país para factura:`, countryError.message);
        throw new Error(`Error al determinar el país: ${countryError.message}`);
      }

      // 3. Determinar la moneda según el país
      let currencyCode;
      try {
        currencyCode = countryDetectionService.getCurrencyCodeByCountry(country);
        console.log(`🌎 [${requestId}] Usando moneda para factura manual: ${currencyCode} (país: ${country})`);
      } catch (currencyError: any) {
        console.error(`❌ [${requestId}] Error al determinar moneda para el país ${country}:`, currencyError.message);
        throw new Error(`Error al determinar la moneda: ${currencyError.message}`);
      }

      // 3. Buscar o crear el cliente si es necesario
      let customerId = params.customerId;

      if (!customerId) {
        console.log(`🔍 [${requestId}] Sin customerID proporcionado, buscando cliente por email:`, params.customerEmail);
        // Buscar cliente por email
        const customers = await stripe.customers.list({
          email: params.customerEmail
        });
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
          console.log(`✅ [${requestId}] Cliente encontrado por email: ${customerId}`);
        } else {
          // Crear cliente si no existe
          const customer = await stripe.customers.create({
            email: params.customerEmail,
            name: params.customerName || 'Cliente'
          });
          customerId = customer.id;
          console.log(`✅ [${requestId}] Cliente creado: ${customerId}`);
        }
      }

      // 4. Crear la factura para la reserva manual
      const isDepositPayment = params.paymentType === 'deposit' || params.isPartialPayment;
      const depositPercentage = '30'; // Porcentaje de seña por defecto
      
      const invoiceParams: Stripe.InvoiceCreateParams = {
        customer: customerId,
        collection_method: 'charge_automatically',
        auto_advance: true,
        description: params.description,
        currency: currencyCode,
        metadata: {
          booking_id: params.bookingId,
          empresa_id: params.empresaId,
          court_id: params.courtId || '',
          branch_id: params.branchId || '',
          payment_type: params.paymentType || 'booking',
          is_partial_payment: String(params.isPartialPayment || false),
          total_amount: params.totalAmount?.toString() || '',
          country: country || ''
        },
        // Añadir un footer con información adicional si es un pago de seña
        footer: isDepositPayment 
          ? `Esta factura corresponde únicamente al pago de seña. El monto total de la reserva es de ${
              params.totalAmount 
                ? `${parseFloat(params.totalAmount.toString()).toFixed(2)}${currencyCode === 'eur' ? '€' : currencyCode === 'mxn' ? ' MXN' : ''}`
                : 'un valor mayor'
            }. Quedan pendientes ${
              params.totalAmount 
                ? `${(parseFloat(params.totalAmount.toString()) - params.amount).toFixed(2)}${currencyCode === 'eur' ? '€' : currencyCode === 'mxn' ? ' MXN' : ''}`
                : 'pagos adicionales'
            } por abonar.`
          : undefined
      };
      
      const invoice = await stripe.invoices.create(invoiceParams);

      // Añadir items a la factura con formato mejorado
      if (isDepositPayment) {
        // Si es una seña, incluir información más clara sobre el pago parcial
        const totalAmount = params.totalAmount || params.amount;
        const remainingAmount = Math.max(0, parseFloat(totalAmount.toString()) - params.amount);
        
        // Añadir el item principal (seña)
        await stripe.invoiceItems.create({
          customer: customerId,
          invoice: invoice.id,
          amount: Math.round(params.amount * 100), // Convertir a centavos
          currency: currencyCode,
          description: `${params.description} - PAGO DE SEÑA`
        });
        
        // Añadir línea informativa sobre el total y lo pendiente (con precio 0)
        if (totalAmount > 0) {
          await stripe.invoiceItems.create({
            customer: customerId,
            invoice: invoice.id,
            amount: 0, // No se cobra
            currency: currencyCode,
            description: `Información: El monto total de la reserva es de ${parseFloat(totalAmount.toString()).toFixed(2)}${currencyCode === 'eur' ? '€' : currencyCode === 'mxn' ? ' MXN' : ''}. Tras este pago de seña, quedarán pendientes ${remainingAmount.toFixed(2)}${currencyCode === 'eur' ? '€' : currencyCode === 'mxn' ? ' MXN' : ''}.`
          });
        }
      } else {
        // Si es pago completo, mantener el formato simple
        await stripe.invoiceItems.create({
          customer: customerId,
          invoice: invoice.id,
          amount: Math.round(params.amount * 100),
          currency: currencyCode,
          description: params.description
        });
      }

      // Finalizar la factura
      const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

      // Verificar si la factura está ya pagada o necesita marcarse como pagada
      let invoiceToReturn = finalizedInvoice;
      
      if (finalizedInvoice.status !== 'paid') {
        console.log(`🔄 [${requestId}] Factura manual no está pagada automáticamente, marcándola como pagada...`);
        
        try {
          // Método estándar: marcar como pagada fuera del sistema (paid_out_of_band)
          invoiceToReturn = await stripe.invoices.pay(finalizedInvoice.id, {
            paid_out_of_band: true // Indica que ya fue pagada fuera del flujo regular de facturación
          });
          console.log(`✅ [${requestId}] Factura manual marcada como pagada exitosamente`);
        } catch (payError) {
          console.warn(`⚠️ [${requestId}] Error al marcar factura manual como pagada:`, payError);
          
          // Método alternativo si el anterior falla
          console.log(`🔄 [${requestId}] Intentando método alternativo para marcar como pagada...`);
          
          // 1. Anular la factura actual que está en estado incorrecto
          await stripe.invoices.voidInvoice(finalizedInvoice.id);
          
          // 2. Crear una nueva factura con los mismos datos
          const newInvoice = await stripe.invoices.create({
            customer: customerId,
            collection_method: 'charge_automatically',
            description: `${params.description} [Registro de pago]`,
            currency: currencyCode,
            metadata: {
              booking_id: params.bookingId,
              empresa_id: params.empresaId,
              court_id: params.courtId || '',
              branch_id: params.branchId || '',
              payment_type: params.paymentType || 'booking',
              is_partial_payment: String(params.isPartialPayment || false),
              total_amount: params.totalAmount?.toString() || '',
              country: country || '',
              original_invoice_id: finalizedInvoice.id
            }
          });
          
          // 3. Añadir item a la nueva factura
          await stripe.invoiceItems.create({
            customer: customerId,
            invoice: newInvoice.id,
            amount: Math.round(params.amount * 100),
            currency: currencyCode,
            description: `${params.description} [Pago ya realizado]`
          });
          
          // 4. Finalizar la nueva factura
          const finalNewInvoice = await stripe.invoices.finalizeInvoice(newInvoice.id);
          
          // 5. Marcar como pagada usando el método más simple
          invoiceToReturn = await stripe.invoices.pay(finalNewInvoice.id, {
            paid_out_of_band: true
          });
          
          console.log(`✅ [${requestId}] Método alternativo exitoso: Nueva factura creada y marcada como pagada`);
        }
      } else {
        console.log(`✅ [${requestId}] Factura manual ya estaba marcada como pagada automáticamente`);
      }

      // 5. Obtener la URL de la factura y del PDF
      const invoiceUrl = invoiceToReturn.hosted_invoice_url;
      const pdfUrl = invoiceToReturn.invoice_pdf;

      console.log(`✅ [${requestId}] Factura manual creada exitosamente:`, {
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
    } catch (error: any) {
      console.error(`❌ [${requestId}] Error al crear factura manual para reserva:`, error);
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
          courts:court_id (
            id,
            name,
            branch:branch_id (
              id,
              name,
              empresas:empresa_id (
                id,
                stripe_account_id,
                country
              )
            )
          )
        `)
        .eq('id', bookingId)
        .single();

      if (!booking) {
        console.error(`❌ [${requestId}] Reserva no encontrada:`, bookingId);
        return {
          success: false,
          error: {
            message: 'Reserva no encontrada',
            code: 'BOOKING_NOT_FOUND'
          }
        };
      }

      // Acceder a la primera pista, ya que la consulta devuelve un array
      const court = booking.courts && booking.courts.length > 0 ? booking.courts[0] : null;
      
      // Obtener datos de la sede a partir de la pista
      const branchId = court?.branch?.id;
      const sede = court?.branch || null;
      
      if (!court || !sede) {
        console.error(`❌ [${requestId}] No se pudo obtener información de la pista o sede:`, {
          courtId: booking.court_id,
          branchId
        });
        return {
          success: false,
          error: {
            message: 'No se pudo obtener información de la pista o sede',
            code: 'COURT_OR_BRANCH_NOT_FOUND'
          }
        };
      }

      // Obtener datos de la empresa
      const empresa = sede.empresas || null;

      if (!empresa) {
        console.error(`❌ [${requestId}] Error al obtener datos de la empresa:`, {
          sede,
          empresa
        });
        return {
          success: false,
          error: {
            message: 'No se pudo obtener información de la empresa',
            code: 'COMPANY_ERROR'
          }
        };
      }

      // 2. Extraer información necesaria para la factura
      const stripeAccountId = empresa.stripe_account_id;
      
      // Obtener el país de la empresa para la moneda correcta
      let country = 'España'; // Valor por defecto
      
      // Intentar obtener el país de los metadatos de la empresa si está disponible
      if (empresa && typeof empresa === 'object' && 'country' in empresa) {
        country = empresa.country || country;
      }
      
      console.log(`🌎 [${requestId}] País de la empresa:`, country);
      
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
      const customerEmail = 'cliente@example.com';
      const customerName = 'Cliente';
      
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
        email: customerEmail,
        nombre: customerName
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
          .eq('empresa_id', sede.id)
          .limit(1);
          
        if (!stripeError && stripeCustomers && stripeCustomers.length > 0) {
          userInfo = {
            email: stripeCustomers[0].email || customerEmail,
            nombre: stripeCustomers[0].name || customerName
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
            email: participant.usuarios.email || customerEmail,
            nombre: participant.usuarios.nombre || customerName
          };
          console.log(`✅ [${requestId}] Se encontró información de cliente en participant`);
        } else {
          console.warn(`⚠️ [${requestId}] Participante encontrado pero sin datos de usuario, usando valores por defecto`);
        }
      }

      // 4. Crear la factura para la reserva manual
      const courtName = court ? court.name : 'Pista';
      const invoiceResult = await this.createManualBookingInvoice({
        stripeAccountId,
        customerId,
        customerEmail: userInfo.email,
        customerName: userInfo.nombre || undefined,
        amount: booking.total_price,
        description: `Reserva: ${courtName}`,
        bookingId: booking.id,
        empresaId: sede.id || '',
        courtId: booking.court_id,
        branchId: branchId,
        paymentType: 'booking',
        isPartialPayment: false,
        totalAmount: booking.total_price,
        country: country // Añadir el país para determinar la moneda
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
export const createInvoiceService = StripeInvoiceService.getInstance();
