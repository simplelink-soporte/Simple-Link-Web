import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

/**
 * Busca facturas relacionadas con un booking ID utilizando estrategias optimizadas
 * @param stripe Instancia de Stripe inicializada
 * @param bookingId ID de la reserva
 * @param startTime Tiempo de inicio para medir rendimiento
 */
async function findInvoicesForBooking(
  stripe: Stripe,
  bookingId: string,
  startTime: number
): Promise<{ matchingInvoices: Stripe.Invoice[], searchTime: number }> {
  try {
    // Verificar si podemos obtener la información de la reserva para conocer el customer_id
    // Nota: Este paso es opcional y depende de la existencia del endpoint
    let customerId = null;
    let foundByBookingData = false;
    
    try {
      const bookingResponse = await fetch(`/api/bookings/${bookingId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (bookingResponse?.ok) {
        const bookingData = await bookingResponse.json();
        if (bookingData?.stripeCustomerId) {
          customerId = bookingData.stripeCustomerId;
          foundByBookingData = true;
          console.log(`👤 [API] Encontrado customer_id=${customerId} de datos de reserva`);
        }
      }
    } catch (fetchError) {
      // No es crítico si falla este intento, seguimos con la estrategia alternativa
      console.log(`🛡️ [API] No se pudo obtener datos de la reserva: ${(fetchError as Error).message}`);
    }
    
    // Estrategia 1: Búsqueda directa por metadatos (más eficiente)
    console.log(`💡 [API] Usando búsqueda directa por metadatos booking_id=${bookingId}`);
    const metadataSearchResult = await stripe.invoices.search({
      query: `metadata['booking_id']:'${bookingId}'`,
      limit: 5,
      expand: ['data.customer', 'data.charge', 'data.payment_intent', 'data.lines']
    });
    
    // Si encontramos facturas por metadatos, usamos esos resultados directamente
    if (metadataSearchResult.data.length > 0) {
      console.log(`✅ [API] Encontradas ${metadataSearchResult.data.length} facturas directamente por metadatos`);
      return {
        matchingInvoices: metadataSearchResult.data,
        searchTime: Date.now() - startTime
      };
    }
    
    // Estrategia 2: Si no encontramos por metadatos, intentamos búsqueda por cliente si disponible
    let invoices;
    if (customerId) {
      console.log(`🏦 [API] Buscando facturas para customer_id=${customerId} (búsqueda secundaria)`);
      invoices = await stripe.invoices.list({
        limit: 5, // Pocas facturas por cliente normalmente
        customer: customerId,
        expand: ['data.customer', 'data.charge', 'data.payment_intent', 'data.lines']
      });
    } else {
      // Estrategia 3: Último recurso - búsqueda limitada
      console.log(`🔎 [API] Sin coincidencias por metadatos ni customer_id, usando búsqueda limitada`);
      invoices = await stripe.invoices.list({
        limit: 10, // Reducimos aún más el límite para mejor rendimiento
        expand: ['data.customer', 'data.charge', 'data.payment_intent', 'data.lines']
      });
    }
    
    // Métodos adicionales para encontrar facturas relacionadas con la reserva
    const filteredInvoices = invoices.data.filter(invoice => {
      // 1. Método estándar: booking_id en metadata
      const hasBookingIdInMetadata = invoice.metadata && invoice.metadata.booking_id === bookingId;
      
      // 2. Método alternativo: booking_id en la descripción de la factura o de sus líneas
      const hasBookingIdInDescription = 
        invoice.description?.includes(bookingId) || 
        invoice.lines?.data?.some(line => line.description?.includes(bookingId));
      
      // 3. Método alternativo: booking_id en los metadatos de cualquier ítem de factura
      const hasBookingIdInLineItemMetadata = invoice.lines?.data?.some(
        line => line.metadata && line.metadata.booking_id === bookingId
      );
      
      // 4. Método alternativo: booking_id en la referencia externa
      const hasBookingIdInExternalReference = 
        invoice.footer?.includes(bookingId) || 
        invoice.custom_fields?.some(field => field.value?.includes(bookingId));
      
      // Registramos detalles para depuración
      if (hasBookingIdInMetadata || hasBookingIdInDescription || 
          hasBookingIdInLineItemMetadata || hasBookingIdInExternalReference) {
        console.log(`🔍 [API] Factura ${invoice.id} relacionada con booking ${bookingId}:`, {
          por_metadata: hasBookingIdInMetadata,
          por_descripcion: hasBookingIdInDescription,
          por_linea_item: hasBookingIdInLineItemMetadata,
          por_referencia: hasBookingIdInExternalReference
        });
      }
      
      // Una factura coincide si cumple CUALQUIERA de los criterios
      return hasBookingIdInMetadata || 
             hasBookingIdInDescription || 
             hasBookingIdInLineItemMetadata || 
             hasBookingIdInExternalReference;
    });
    
    const elapsed = Date.now() - startTime;
    console.log(`📊 [API] Búsqueda optimizada completada en ${elapsed}ms - ` + 
      `Modo: ${foundByBookingData ? 'Por customer_id' : 'General'}, ` +
      `Facturas analizadas: ${invoices.data.length}, ` +
      `Coincidencias: ${filteredInvoices.length}`);
      
    // Información detallada sobre cada factura encontrada  
    if (filteredInvoices.length > 0) {
      filteredInvoices.forEach((invoice, index) => {
        console.log(`💳 [API] Detalle Factura #${index+1} para booking ${bookingId}:`, {
          invoice_id: invoice.id,
          customer: typeof invoice.customer === 'string' ? invoice.customer : 'objeto-customer',
          amount_due: invoice.amount_due,
          total: invoice.total,
          status: invoice.status,
          has_payment_intent: Boolean(invoice.payment_intent),
          payment_intent_prefix: invoice.payment_intent ? 
            (typeof invoice.payment_intent === 'string' ? 
              invoice.payment_intent.substring(0, 10) + '...' : 'objeto-paymentIntent') : 'N/A',
          has_charge: Boolean(invoice.charge),
          charge_prefix: invoice.charge ? 
            (typeof invoice.charge === 'string' ? 
              invoice.charge.substring(0, 10) + '...' : 'objeto-charge') : 'N/A',
          metadata: invoice.metadata || {}
        });
      });
    } else {
      console.log(`⚠️ [API] No se encontraron facturas para booking ${bookingId} después de búsqueda exhaustiva`);
    }
    
    return { matchingInvoices: filteredInvoices, searchTime: elapsed };
  } catch (error) {
    console.warn(`⚠️ [API] Error en la estrategia optimizada: ${(error as Error).message}. Usando búsqueda estándar.`);
    // Si falla la estrategia optimizada, volvemos al método estándar
    const invoices = await stripe.invoices.list({
      limit: 20,
      expand: ['data.customer', 'data.charge', 'data.lines']
    });
    
    // Usamos los mismos métodos mejorados de búsqueda
    const filteredInvoices = invoices.data.filter(invoice => {
      // 1. Método estándar: booking_id en metadata
      const hasBookingIdInMetadata = invoice.metadata && invoice.metadata.booking_id === bookingId;
      
      // 2. Método alternativo: booking_id en la descripción
      const hasBookingIdInDescription = 
        invoice.description?.includes(bookingId) || 
        invoice.lines?.data?.some(line => line.description?.includes(bookingId));
      
      // 3. Método alternativo: booking_id en metadatos de línea
      const hasBookingIdInLineItemMetadata = invoice.lines?.data?.some(
        line => line.metadata && line.metadata.booking_id === bookingId
      );
      
      // 4. Método alternativo: booking_id en referencia 
      const hasBookingIdInExternalReference = 
        invoice.footer?.includes(bookingId) || 
        invoice.custom_fields?.some(field => field.value?.includes(bookingId));
      
      // Una factura coincide si cumple CUALQUIERA de los criterios
      return hasBookingIdInMetadata || 
             hasBookingIdInDescription || 
             hasBookingIdInLineItemMetadata || 
             hasBookingIdInExternalReference;
    });
    
    const elapsed = Date.now() - startTime;
    console.log(`📊 [API] Búsqueda estándar completada en ${elapsed}ms - Total facturas: ${invoices.data.length}`);
    
    return { matchingInvoices: filteredInvoices, searchTime: elapsed };
  }
}

/**
 * Endpoint para buscar facturas relacionadas con una reserva
 * 
 * @param req Solicitud HTTP con accountId y bookingId como query params
 */
export async function GET(req: NextRequest) {
  try {
    // Obtenemos los parámetros de la URL
    const url = new URL(req.url);
    const accountId = url.searchParams.get('accountId');
    const bookingId = url.searchParams.get('bookingId');

    // Validamos parámetros
    if (!accountId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Se requiere un ID de cuenta de Stripe válido',
            code: 'missing_account_id',
          },
        },
        { status: 400 }
      );
    }

    if (!bookingId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Se requiere un ID de reserva válido',
            code: 'missing_booking_id',
          },
        },
        { status: 400 }
      );
    }

    // Inicializamos Stripe con la clave secreta (solo disponible en el backend)
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Error de configuración: Clave de Stripe no configurada en el servidor',
            code: 'stripe_key_missing',
          },
        },
        { status: 500 }
      );
    }

    console.log(`🔍 [API] Buscando facturas para reserva: ${bookingId} en cuenta: ${accountId}`);

    // Configuramos Stripe para usar la cuenta Connect específica
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-02-24.acacia', // Asegúrate de que esta versión es compatible
      stripeAccount: accountId,
    });

    // Estrategia optimizada para buscar facturas por booking_id
    console.log(`🔍 [API] Buscando facturas para booking_id=${bookingId} con estrategia optimizada`);
    
    const startTime = Date.now();
    
    // Ejecutamos la búsqueda optimizada de facturas
    console.log(`🔍 [API] Buscando facturas para booking_id=${bookingId} con estrategia optimizada`);
    const { matchingInvoices, searchTime } = await findInvoicesForBooking(stripe, bookingId, startTime);
    
    console.log(`✅ [API] Facturas asociadas a la reserva ${bookingId}: ${matchingInvoices.length}`);
    
    if (matchingInvoices.length > 0) {
      console.log(`💳 [API] Detalles de la primera factura:`, {
        invoice_id: matchingInvoices[0].id,
        customer: typeof matchingInvoices[0].customer === 'string' ? matchingInvoices[0].customer : 'objeto-customer',
        amount: matchingInvoices[0].amount_due,
        created: new Date(matchingInvoices[0].created * 1000).toISOString(),
        status: matchingInvoices[0].status,
        has_payment_intent: Boolean(matchingInvoices[0].payment_intent),
        payment_intent_prefix: matchingInvoices[0].payment_intent ? 
          (typeof matchingInvoices[0].payment_intent === 'string' ? 
            matchingInvoices[0].payment_intent.substring(0, 10) + '...' : 'objeto-paymentIntent') : 'N/A',
        has_charge: Boolean(matchingInvoices[0].charge),
        charge_prefix: matchingInvoices[0].charge ? 
          (typeof matchingInvoices[0].charge === 'string' ? 
            matchingInvoices[0].charge.substring(0, 10) + '...' : 'objeto-charge') : 'N/A',
        metadata: matchingInvoices[0].metadata || {}
      });
    }

    // Devolvemos las facturas encontradas junto con datos de rendimiento
    return NextResponse.json({
      success: true,
      invoices: matchingInvoices,
      performance: {
        search_time_ms: searchTime,
        invoices_found: matchingInvoices.length
      }
    });
  } catch (error: any) {
    console.error('❌ [API] Error al buscar facturas:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error.message || 'Error inesperado al buscar facturas',
          code: 'invoice_search_error',
        },
      },
      { status: 500 }
    );
  }
}
