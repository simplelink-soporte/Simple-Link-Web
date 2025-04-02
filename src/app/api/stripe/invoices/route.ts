import { NextResponse } from 'next/server';
import { Stripe } from 'stripe';
import { supabase } from '@/lib/supabase';
import { getUserRole, isAdmin } from '@/lib/auth';
import { stripeConnectionService } from '@/services/stripeConnectionService';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

/**
 * Endpoint para obtener facturas desde Stripe
 * Usa autenticación con Supabase y obtiene la cuenta de Stripe desde la base de datos
 * 
 * NOTA: Este código utiliza @supabase/auth-helpers-nextjs que está obsoleto.
 * En el futuro, se recomienda migrar a @supabase/ssr según la documentación oficial:
 * https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function GET(request: Request) {
  try {
    // 1. Verificar autenticación con Supabase usando el enfoque server-side compatible con auth-helpers
    const cookieStore = cookies();
    const supabaseServerClient = createServerComponentClient<Database>({ 
      cookies: () => cookieStore
    });
    const { data: { session } } = await supabaseServerClient.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    // Verificar si el usuario tiene permisos administrativos
    // Modificado para permitir acceso a usuarios no administradores
    const userIsAdmin = isAdmin(session.user);
    // Si no es administrador, registramos pero no bloqueamos
    if (!userIsAdmin) {
      console.log('Usuario no administrador accediendo a facturas:', session.user.id);
      // Continuamos con la ejecución en lugar de bloquear
    }

    // 2. Obtener parámetros de consulta
    const url = new URL(request.url);
    const empresaId = url.searchParams.get('empresaId') || session.user.app_metadata?.empresa_id;
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 100;
    const statusParam = url.searchParams.get('status');
    
    // Verificar si estamos buscando por un tipo de pago personalizado
    const isCustomFilterType = statusParam === 'deposit' || 
                              statusParam === 'guarantee' || 
                              statusParam === 'pending' ||
                              statusParam === 'paid';
    
    // Sólo asignar status si tiene un valor válido y no es un filtro personalizado
    const status = statusParam && statusParam.trim() !== '' && !isCustomFilterType
      ? statusParam as 'draft' | 'open' | 'paid' | 'uncollectible' | 'void' 
      : undefined;
      
    console.log('🔄 Parámetros de consulta:', {
      empresaId, 
      limit, 
      statusParam,
      isCustomFilterType,
      stripeStatus: status
    });
    
    const customer = url.searchParams.get('customer') || undefined;
    
    if (!empresaId) {
      return NextResponse.json({ error: 'Se requiere empresaId' }, { status: 400 });
    }

    // 3. Obtener la conexión de Stripe desde la base de datos
    const connection = await stripeConnectionService.getConnection(empresaId);
    
    if (!connection) {
      return NextResponse.json({ error: 'No hay conexión de Stripe para esta empresa' }, { status: 404 });
    }
    
    if (connection.isArgentina) {
      return NextResponse.json({ 
        message: 'Empresa argentina detectada, no se utiliza Stripe', 
        invoices: []
      });
    }

    if (!connection.stripe_account_id || connection.stripe_account_id === 'no-stripe-required') {
      return NextResponse.json({ error: 'No hay cuenta de Stripe configurada' }, { status: 404 });
    }

    // 4. Inicializar Stripe con la clave secreta del servidor
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY no está configurada en las variables de entorno');
      return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 });
    }
    
    console.log('🔄 Configurando cliente Stripe con cuenta:', {
      accountId: connection.stripe_account_id,
      apiVersion: '2025-02-24.acacia'
    });
    
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-02-24.acacia',
      stripeAccount: connection.stripe_account_id // Importante: usar la cuenta del club
    });

    // Verificar que la cuenta está activa y funcionando
    try {
      console.log('🔄 Verificando cuenta Stripe...');
      const account = await stripe.accounts.retrieve();
      console.log('✅ Cuenta Stripe verificada:', {
        id: account.id,
        business_type: account.business_type,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        capabilities: account.capabilities
      });
    } catch (error: any) {
      console.error('❌ Error al verificar la cuenta Stripe:', error.message);
      if (error.code === 'account_invalid') {
        return NextResponse.json({ 
          error: 'La cuenta de Stripe no es válida o ha sido desactivada', 
          details: error.message 
        }, { status: 401 });
      }
    }

    // 5. Listar facturas
    console.log('🔍 Consultando facturas de Stripe...');
    
    // Si es un filtro personalizado, necesitamos obtener todas las facturas y filtrar después
    if (isCustomFilterType) {
      console.log(`🔍 Filtro personalizado detectado: "${statusParam}". Obteniendo todas las facturas...`);
    }
    
    // Usar siempre una consulta básica para obtener todas las facturas posibles
    const invoiceParams: Stripe.InvoiceListParams = {
      limit
    };
    
    // Añadir filtros solo si se proporcionan valores válidos y no son filtros personalizados
    if (status) invoiceParams.status = status;
    if (customer) invoiceParams.customer = customer;
    
    try {
      // Primera consulta para facturas en estado 'open'
      const openInvoices = await stripe.invoices.list({
        ...invoiceParams,
        status: 'open'
      });
      
      // Segunda consulta para facturas en estado 'paid'
      const paidInvoices = await stripe.invoices.list({
        ...invoiceParams,
        status: 'paid'
      });
      
      // Combinar resultados
      const allInvoices = [...openInvoices.data, ...paidInvoices.data];
      
      console.log(`✅ Facturas encontradas en Stripe: ${allInvoices.length} (Open: ${openInvoices.data.length}, Paid: ${paidInvoices.data.length})`);
      
      if (allInvoices.length === 0) {
        return NextResponse.json({ 
          message: 'No se encontraron facturas en esta cuenta de Stripe', 
          invoices: [] 
        });
      }

      // Log de depuración para los metadatos de cada factura
      console.log('🔍 Analizando metadatos de facturas:');
      allInvoices.forEach((invoice, index) => {
        console.log(`📄 Factura #${index + 1} (${invoice.id}):`, {
          metadata: invoice.metadata,
          payment_type: invoice.metadata?.payment_type,
          is_partial_payment: invoice.metadata?.is_partial_payment,
          status: invoice.status
        });
      });
      
      // Mapear a formato interno (simplificado para la API)
      const mappedInvoices = allInvoices.map(invoice => {
        // Extraer el tipo de pago de los metadatos (si existe)
        const paymentType = invoice.metadata?.payment_type;
        const isPartialPayment = invoice.metadata?.is_partial_payment === 'true';
        
        // Determinar el estado en función del tipo de pago y el estado de Stripe
        let status;
        if (paymentType === 'deposit' || isPartialPayment) {
          status = 'deposit'; // Prioridad máxima para señas
        } else if (paymentType === 'guarantee') {
          status = 'guarantee'; // Prioridad máxima para garantías
        } else {
          // Si no hay un tipo de pago especial, usar el estado de Stripe
          status = invoice.status === 'paid' ? 'paid' :
                  invoice.status === 'open' ? 'pending' :
                  invoice.status === 'uncollectible' ? 'overdue' :
                  invoice.status === 'void' ? 'cancelled' : 'pending';
        }
        
        return {
          id: invoice.id,
          invoice_number: invoice.number || `FAC-${invoice.created.toString().slice(-8)}`,
          customer_id: typeof invoice.customer === 'string' ? invoice.customer : '',
          customer_name: invoice.customer_name || (invoice.customer_email || 'Cliente'),
          date: new Date(invoice.created * 1000).toISOString(),
          due_date: invoice.due_date 
            ? new Date(invoice.due_date * 1000).toISOString() 
            : new Date(invoice.created * 1000 + 30 * 24 * 60 * 60 * 1000).toISOString(),
          amount: invoice.total / 100,
          status, // Usar el estado calculado arriba
          branch_id: invoice.metadata?.branch_id || '',
          created_at: new Date(invoice.created * 1000).toISOString(),
          updated_at: new Date().toISOString(),
          court_type: invoice.metadata?.court_type,
          court_time: invoice.metadata?.court_time,
          class_type: invoice.metadata?.class_type,
          stripe_hosted_url: invoice.hosted_invoice_url,
          stripe_pdf_url: invoice.invoice_pdf,
          // Incluir información sobre el tipo de pago
          payment_type: paymentType as 'full' | 'deposit' | 'guarantee' || undefined,
          payment_description: invoice.metadata?.payment_description
        };
      });
      
      // Aplicar filtro personalizado si es necesario
      let filteredInvoices = mappedInvoices;
      
      if (isCustomFilterType) {
        console.log(`🔍 Aplicando filtro personalizado: "${statusParam}"`);
        
        if (statusParam === 'paid') {
          // Para 'paid', mostrar solo facturas pagadas que NO son señas ni garantías
          filteredInvoices = mappedInvoices.filter(invoice => 
            invoice.status === 'paid' && 
            invoice.payment_type !== 'deposit' &&
            invoice.payment_type !== 'guarantee' &&
            !invoice.payment_description?.toLowerCase().includes('seña') &&
            !invoice.payment_description?.toLowerCase().includes('garantia') &&
            !invoice.payment_description?.toLowerCase().includes('garantía')
          );
          console.log(`✅ Facturas de pagos COMPLETOS después del filtrado: ${filteredInvoices.length}`);
        } else {
          // Para otros tipos personalizados, filtrar normalmente
          filteredInvoices = mappedInvoices.filter(invoice => invoice.status === statusParam);
          console.log(`✅ Facturas después del filtrado personalizado: ${filteredInvoices.length}`);
        }
      }
      
      return NextResponse.json({ invoices: filteredInvoices });
    } catch (error: any) {
      console.error('Error al obtener facturas de Stripe:', error);
      return NextResponse.json({ 
        error: 'Error al obtener facturas', 
        details: error.message 
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error al obtener facturas de Stripe:', error);
    return NextResponse.json({ 
      error: 'Error al obtener facturas', 
      details: error.message 
    }, { status: 500 });
  }
}

/**
 * Endpoint para crear facturas en Stripe desde el cliente
 * Recibe los parámetros necesarios y utiliza la clave secreta del servidor
 * para interactuar con la API de Stripe de forma segura
 */
export async function POST(request: Request) {
  try {
    // 1. Verificar autenticación con Supabase usando el enfoque server-side
    const cookieStore = cookies();
    const supabaseServerClient = createServerComponentClient<Database>({ 
      cookies: () => cookieStore
    });
    const { data: { session } } = await supabaseServerClient.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    // 2. Obtener el cuerpo de la solicitud
    const requestBody = await request.json();
    
    // Log detallado del cuerpo completo de la solicitud
    console.log('📦 CUERPO COMPLETO DE LA SOLICITUD:', JSON.stringify(requestBody, null, 2));
    
    const {
      stripeAccountId,
      customerId,
      customerEmail,
      customerName,
      amount,
      description,
      bookingId,
      empresaId,
      courtId,
      branchId,
      totalAmount = amount, // Si no se proporciona totalAmount, asumimos que es igual a amount
      country // Añadimos el parámetro country
    } = requestBody;
    
    // Crear ID único para el seguimiento de esta solicitud
    const requestId = `mbi_${Date.now().toString(36)}`;

    // Obtener el país de la empresa si no se proporcionó
    let countryToUse = country;
    
    if (!countryToUse && empresaId) {
      try {
        console.log(`🔍 [${requestId}] Buscando país de la empresa: ${empresaId}`);
        const { data: empresaData } = await supabaseServerClient
          .from('empresas')
          .select('country')
          .eq('id', empresaId)
          .single();

        if (empresaData?.country) {
          countryToUse = empresaData.country;
          console.log(`✅ [${requestId}] País de la empresa encontrado: ${countryToUse}`);
        }
      } catch (error) {
        console.error(`❌ [${requestId}] Error al buscar país de la empresa:`, error);
        // Continuar con el valor por defecto si hay error
      }
    }
    
    // Función para determinar la moneda basada en el país
    const getCurrencyCodeByCountry = (country?: string | null): string => {
      if (!country) return 'eur'; // Por defecto
      
      const countryLower = country.toLowerCase();
      switch (countryLower) {
        case 'mexico':
        case 'méxico':
          return 'mxn'; // Peso mexicano
        case 'argentina':
          return 'ars'; // Peso argentino
        case 'españa':
        case 'espana':
        case 'spain':
        case 'europe':
        case 'europa':
          return 'eur'; // Euro
        default:
          return 'eur'; // Por defecto para otros países
      }
    };
    
    // Determinar la moneda basada en el país
    const currencyCode = getCurrencyCodeByCountry(countryToUse);
    console.log(`🌎 [${requestId}] País detectado: ${countryToUse || 'No especificado'}, usando moneda: ${currencyCode}`);
    
    console.log('📦 Parámetros recibidos para crear factura:', {
      stripeAccountId,
      customerEmail,
      amount,
      description,
      bookingId,
      empresaId,
      country: countryToUse,
      currencyCode
    });
    
    // 3. Validar parámetros obligatorios
    if (!stripeAccountId) {
      return NextResponse.json({ error: 'Se requiere stripeAccountId' }, { status: 400 });
    }
    
    if (!customerEmail) {
      return NextResponse.json({ error: 'Se requiere customerEmail' }, { status: 400 });
    }
    
    if (!amount) {
      return NextResponse.json({ error: 'Se requiere amount' }, { status: 400 });
    }
    
    if (!bookingId) {
      return NextResponse.json({ error: 'Se requiere bookingId' }, { status: 400 });
    }
    
    if (!empresaId) {
      return NextResponse.json({ error: 'Se requiere empresaId' }, { status: 400 });
    }
    
    // 4. Inicializar Stripe con la clave secreta del servidor
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY no está configurada en las variables de entorno');
      return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 });
    }
    
    console.log(`🔄 [${requestId}] Iniciando creación de factura en el servidor:`, {
      stripeAccountId,
      customerEmail,
      description,
      amount
    });
    
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-02-24.acacia',
      stripeAccount: stripeAccountId
    });
    
    // 5. Preparar metadatos para la factura
    const isPartialPayment = requestBody.isPartialPayment === true;
    const paymentType = requestBody.paymentType || 'booking';
    
    const metadata = {
      payment_type: paymentType,
      customer_email: customerEmail,
      customer_name: customerName || '',
      booking_id: bookingId,
      empresaId: empresaId,
      court_id: courtId || '',
      branch_id: branchId || '',
      payment_date: new Date().toISOString(),
      payment_description: isPartialPayment ? 'Pago parcial (seña)' : 'Pago completo',
      payment_method: 'manual',
      invoice_type: 'manual_booking',
      is_partial_payment: isPartialPayment ? 'true' : 'false',
      country: countryToUse || '' // Incluir el país en los metadatos
    };
    
    console.log(`📝 [${requestId}] Metadatos para la factura:`, metadata);
    
    // 6. Verificar o crear el cliente en Stripe
    let finalCustomerId = customerId;
    
    if (!finalCustomerId) {
      console.log(`🔍 [${requestId}] No se proporcionó customer ID, buscando por email: ${customerEmail}`);
      
      // Buscar si el cliente ya existe por su email
      const customers = await stripe.customers.list({
        email: customerEmail,
        limit: 1
      });
      
      // Si el cliente no existe, crearlo
      if (customers.data.length === 0) {
        console.log(`➕ [${requestId}] Cliente no encontrado, creando nuevo cliente en Stripe`);
        
        const newCustomer = await stripe.customers.create({
          email: customerEmail,
          name: customerName || customerEmail,
          metadata: {
            empresaId: empresaId
          }
        });
        
        finalCustomerId = newCustomer.id;
        console.log(`✅ [${requestId}] Nuevo cliente creado: ${finalCustomerId}`);
      } else {
        finalCustomerId = customers.data[0].id;
        console.log(`✅ [${requestId}] Cliente existente encontrado: ${finalCustomerId}`);
      }
    }
    
    // 7. Crear la factura
    const invoiceDescription = `Factura: ${description}`;
    const invoice = await stripe.invoices.create({
      customer: finalCustomerId,
      collection_method: 'send_invoice', // Cambiado de 'charge_automatically' a 'send_invoice' para permitir el envío manual
      description: invoiceDescription,
      currency: currencyCode, // Usar el código de moneda determinado por el país
      metadata: {
        ...metadata,
        booking_id: bookingId, // Asegurar que siempre esté presente el ID de reserva
        payment_type: isPartialPayment ? 'deposit' : 'booking', // Tipo de pago (seña o completo)
        is_partial_payment: isPartialPayment ? 'true' : 'false', // Flag explícito para el webhook
        invoice_origin: 'manual_booking', // Indicar que es una factura manual
        total_amount: totalAmount ? totalAmount.toString() : '', // Monto total de la reserva
        country: countryToUse || '' // Incluir el país en los metadatos
      },
      days_until_due: 30, // Número de días hasta vencimiento
      footer: isPartialPayment && totalAmount 
        ? `Esta factura corresponde únicamente al pago de seña. El monto total de la reserva es de ${totalAmount.toFixed(2)} ${currencyCode.toUpperCase()}. Quedan pendientes ${(totalAmount - amount).toFixed(2)} ${currencyCode.toUpperCase()} por abonar.`
        : undefined
    });
    
    console.log(`✅ [${requestId}] Factura creada:`, invoice.id);
    
    // 8. Añadir el ítem a la factura con buen formato
    if (isPartialPayment && totalAmount) {
      // Si es una seña, incluir información más clara sobre el pago parcial
      const remainingAmount = Math.max(0, totalAmount - amount);
      
      // Añadir el ítem principal (seña)
      await stripe.invoiceItems.create({
        customer: finalCustomerId,
        invoice: invoice.id,
        amount: Math.round(amount * 100), // Convertir a centavos
        currency: currencyCode, // Usar el código de moneda determinado por el país
        description: `${description} - PAGO DE SEÑA`,
        metadata: {
          ...metadata,
          item_type: 'deposit'
        }
      });
      
      // Añadir línea informativa sobre el total y lo pendiente (con precio 0)
      await stripe.invoiceItems.create({
        customer: finalCustomerId,
        invoice: invoice.id,
        amount: 0, // Sin costo, sólo informativo
        currency: currencyCode, // Usar el código de moneda determinado por el país
        description: `Monto total: ${totalAmount.toFixed(2)} ${currencyCode.toUpperCase()} - Pendiente: ${remainingAmount.toFixed(2)} ${currencyCode.toUpperCase()}`,
        metadata: {
          ...metadata,
          item_type: 'info'
        }
      });
    } else {
      // Si es pago completo, mantener el formato simple
      await stripe.invoiceItems.create({
        customer: finalCustomerId,
        invoice: invoice.id,
        amount: Math.round(amount * 100), // Convertir a centavos
        currency: currencyCode, // Usar el código de moneda determinado por el país
        description: description,
        metadata
      });
    }
    
    console.log(`✅ [${requestId}] Items añadidos a la factura`);
    
    // 9. Finalizar la factura
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
    
    console.log(`✅ [${requestId}] Factura finalizada`);
    
    // 10. Para el caso de seña o pagos manuales, marcar como pagada inmediatamente
    // ya que estos pagos ya fueron realizados cuando se hizo la reserva
    let paidInvoice = finalizedInvoice;
    try {
      // Toda factura creada debe marcarse como ya pagada, porque representa un pago ya realizado
      paidInvoice = await stripe.invoices.pay(finalizedInvoice.id, {
        paid_out_of_band: true
      });
      console.log(`✅ [${requestId}] Factura marcada como pagada`);
    } catch (payError) {
      console.warn(`⚠️ [${requestId}] Error al marcar como pagada:`, payError);
      // Continuamos aunque no se pueda marcar como pagada
    }
    
    // 11. Enviar la factura por email (como comprobante/recibo)
    try {
      await stripe.invoices.sendInvoice(paidInvoice.id);
      
      console.log(`📧 [${requestId}] Factura enviada por email a: ${customerEmail}`);
      
      // 12. Construir respuesta de éxito
      return NextResponse.json({
        success: true,
        invoiceId: paidInvoice.id,
        invoiceUrl: paidInvoice.hosted_invoice_url,
        emailSent: true
      });
    } catch (emailError) {
      console.error(`❌ [${requestId}] Error al enviar factura por email:`, emailError);
      
      // Si no se pudo enviar el email, intentamos igualmente marcar como pagada
      return NextResponse.json({
        success: true,
        invoiceId: paidInvoice.id,
        invoiceUrl: paidInvoice.hosted_invoice_url,
        emailSent: false
      });
    }
  } catch (error: any) {
    console.error('❌ Error al crear factura en Stripe:', error);
    return NextResponse.json({ 
      success: false,
      error: {
        message: error.message || 'Error al crear factura',
        code: error.code || 'INVOICE_ERROR'
      }
    }, { status: error.status || 500 });
  }
}
