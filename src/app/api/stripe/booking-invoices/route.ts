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
    
    // Si tenemos un customer_id, hacemos una búsqueda más acotada
    let invoices;
    if (customerId) {
      console.log(`🏦 [API] Buscando facturas para customer_id=${customerId} (más eficiente)`);
      invoices = await stripe.invoices.list({
        limit: 5, // Pocas facturas por cliente normalmente
        customer: customerId,
        expand: ['data.customer', 'data.charge']
      });
    } else {
      // Si no tenemos customer_id, usamos una búsqueda limitada
      console.log(`🔎 [API] Sin customer_id disponible, usando búsqueda limitada`);
      invoices = await stripe.invoices.list({
        limit: 20, // Reducimos el límite para mejorar rendimiento
        expand: ['data.customer', 'data.charge']
      });
    }
    
    // Filtrado del lado del servidor
    const filteredInvoices = invoices.data.filter(invoice => 
      invoice.metadata && invoice.metadata.booking_id === bookingId
    );
    
    const elapsed = Date.now() - startTime;
    console.log(`📊 [API] Búsqueda optimizada completada en ${elapsed}ms - ` + 
      `Modo: ${foundByBookingData ? 'Por customer_id' : 'General'}, ` +
      `Facturas analizadas: ${invoices.data.length}, ` +
      `Coincidencias: ${filteredInvoices.length}`);
    
    return { matchingInvoices: filteredInvoices, searchTime: elapsed };
  } catch (error) {
    console.warn(`⚠️ [API] Error en la estrategia optimizada: ${(error as Error).message}. Usando búsqueda estándar.`);
    // Si falla la estrategia optimizada, volvemos al método estándar
    const invoices = await stripe.invoices.list({
      limit: 20,
      expand: ['data.customer', 'data.charge']
    });
    
    const filteredInvoices = invoices.data.filter(invoice => 
      invoice.metadata && invoice.metadata.booking_id === bookingId
    );
    
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
