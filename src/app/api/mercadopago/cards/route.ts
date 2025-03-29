import { NextResponse } from 'next/server';
import { mercadopago } from '@/lib/mercadopago';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mercadoPagoCustomerService } from '@/services/mercadopago-customer.service';
import { StoredCard } from '@/components/shifts-registration/components/card-list/shared/types';

/**
 * POST: Obtener tarjetas o guardar una nueva
 * Body: 
 * - Para obtener tarjetas: { customerId, userId, empresaId }
 * - Para guardar tarjeta: { token, mercadoPagoCustomerId, userId, empresaId }
 */
export async function POST(request: Request) {
  const requestId = `req_mp_cards_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`📝 [${requestId}] Iniciando solicitud POST de tarjetas`);

  try {
    const body = await request.json();
    const { token, mercadoPagoCustomerId, customerId, userId, empresaId } = body;
    
    // Verificar si es una solicitud para obtener tarjetas o para guardar una nueva
    if (!token && (customerId || mercadoPagoCustomerId)) {
      // CASO 1: Obtener tarjetas (similar al GET pero recibiendo parámetros por POST)
      console.log(`📋 [${requestId}] Obteniendo tarjetas para cliente:`, {
        customerId: customerId || mercadoPagoCustomerId,
        userId: userId ? '...present...' : 'missing',
        empresaId: empresaId ? '...present...' : 'missing'
      });
      
      if (!userId || !empresaId) {
        console.error(`❌ [${requestId}] Faltan datos requeridos (userId, empresaId)`);
        return NextResponse.json(
          { error: 'Se requieren userId y empresaId' },
          { status: 400 }
        );
      }
      
      // Usar el customerId proporcionado o obtenerlo
      let mpCustomerId = customerId || mercadoPagoCustomerId;
      let customerData;
      
      if (!mpCustomerId) {
        console.log(`📍 [${requestId}] No se proporcionó customerId, obteniendo desde servicio`);
        
        // Obtener el customer_id a través del servicio
        customerData = await mercadoPagoCustomerService.getOrCreateCustomer(
          userId,
          empresaId
        );
        
        if (!customerData || customerData.status !== 'active') {
          console.error(`❌ [${requestId}] No se encontró un cliente activo`);
          return NextResponse.json(
            { error: 'No se encontró un cliente activo' },
            { status: 404 }
          );
        }
        
        mpCustomerId = customerData.mercadoPagoCustomerId;
      }
      
      console.log(`✅ [${requestId}] Cliente identificado:`, {
        customerId: mpCustomerId
      });
      
      // Obtener las tarjetas del cliente
      try {
        const mpCardsResponse = await mercadopago.card.all({
          customer_id: mpCustomerId
        });
        
        const mpCards = mpCardsResponse.response || [];
        console.log(`✅ [${requestId}] Tarjetas obtenidas: ${mpCards.length}`);
        
        // Transformar al formato esperado por el frontend
        const cards: StoredCard[] = mpCards.map((card: any) => ({
          id: card.id,
          brand: card.payment_method?.name?.toLowerCase() || 'unknown',
          last4: card.last_four_digits,
          expMonth: parseInt(card.expiration_month, 10),
          expYear: parseInt(card.expiration_year, 10),
          customerId: mpCustomerId
        }));
        
        // Actualizar el contador de tarjetas en la BD
        if (userId && empresaId) {
          await supabaseAdmin
            .from('mercadopago_customers')
            .update({
              payment_methods_count: cards.length,
              last_used: new Date().toISOString()
            })
            .match({
              mercadopago_customer_id: mpCustomerId
            });
        }
        
        return NextResponse.json({ cards });
      } catch (cardError: any) {
        console.error(`❌ [${requestId}] Error al obtener tarjetas:`, cardError);
        return NextResponse.json(
          { 
            error: cardError.message || 'Error al obtener tarjetas',
            details: cardError.cause || cardError.stack
          },
          { status: 500 }
        );
      }
    } else if (token && (mercadoPagoCustomerId || customerId)) {
      // CASO 2: Guardar una nueva tarjeta
      // Esta es la implementación original para guardar tarjeta
      const actualCustomerId = mercadoPagoCustomerId || customerId;
      
      console.log(`📝 [${requestId}] Guardando tarjeta para cliente:`, {
        customerId: actualCustomerId,
        token: token ? '...present...' : 'missing'
      });

      if (!token || !actualCustomerId || !userId || !empresaId) {
        console.error(`❌ [${requestId}] Faltan datos requeridos`);
        return NextResponse.json(
          { error: 'Se requieren token, customerId, userId y empresaId' },
          { status: 400 }
        );
      }

      // 1. Asociar tarjeta al cliente en MercadoPago
      console.log(`📍 [${requestId}] Asociando tarjeta al cliente: ${actualCustomerId}`);
      const cardResponse = await mercadopago.card.create({
        token,
        customer_id: actualCustomerId
      });

      if (!cardResponse || !cardResponse.response) {
        throw new Error('Error al crear la tarjeta en MercadoPago');
      }

      const card = cardResponse.response;
      console.log(`✅ [${requestId}] Tarjeta guardada en MercadoPago:`, {
        cardId: card.id,
        last4: card.last_four_digits
      });

      // 2. Actualizar contador de tarjetas en la tabla
      await supabaseAdmin
        .from('mercadopago_customers')
        .update({
          payment_methods_count: parseInt(card.payment_methods_count || '0', 10) + 1,
          last_used: new Date().toISOString()
        })
        .match({
          user_id: userId,
          empresa_id: empresaId,
          mercadopago_customer_id: actualCustomerId
        });

      return NextResponse.json({
        success: true,
        paymentMethodId: card.id,
        last4: card.last_four_digits,
        brand: card.payment_method?.name || 'unknown'
      });

    } else {
      console.error(`❌ [${requestId}] Solicitud inválida`);
      return NextResponse.json(
        { error: 'Solicitud inválida' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error(`❌ [${requestId}] Error al procesar solicitud:`, error);
    return NextResponse.json(
      { 
        error: error.message || 'Error al procesar solicitud',
        details: error.cause || error.stack
      },
      { status: 500 }
    );
  }
}

/**
 * GET: Obtener tarjetas guardadas de un cliente de MercadoPago
 * Query params: empresaId, userId
 */
export async function GET(request: Request) {
  const requestId = `req_mp_cards_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`📝 [${requestId}] Iniciando solicitud para obtener tarjetas`);

  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get('empresaId');
  const userId = searchParams.get('userId');
  
  if (!empresaId || !userId) {
    console.error(`❌ [${requestId}] Faltan parámetros requeridos`);
    return NextResponse.json(
      { error: 'Faltan parámetros requeridos' },
      { status: 400 }
    );
  }

  try {
    console.log(`📍 [${requestId}] Obteniendo cliente para:`, {
      empresaId: empresaId ? '...present...' : 'missing',
      userId: userId ? '...present...' : 'missing'
    });

    // 1. Obtener el customer_id
    const customerData = await mercadoPagoCustomerService.getOrCreateCustomer(
      userId,
      empresaId
    );

    if (!customerData || customerData.status !== 'active') {
      console.error(`❌ [${requestId}] No se encontró un cliente activo`);
      return NextResponse.json(
        { error: 'No se encontró un cliente activo' },
        { status: 404 }
      );
    }

    console.log(`✅ [${requestId}] Cliente obtenido:`, {
      customerId: customerData.mercadoPagoCustomerId
    });

    // 2. Obtener las tarjetas del cliente
    const mpCardsResponse = await mercadopago.card.all({
      customer_id: customerData.mercadoPagoCustomerId
    });

    const mpCards = mpCardsResponse.response || [];
    console.log(`✅ [${requestId}] Tarjetas obtenidas: ${mpCards.length}`);

    // 3. Transformar al formato esperado por el frontend
    const cards: StoredCard[] = mpCards.map((card: any) => ({
      id: card.id,
      brand: card.payment_method?.name?.toLowerCase() || 'unknown',
      last4: card.last_four_digits,
      expMonth: parseInt(card.expiration_month, 10),
      expYear: parseInt(card.expiration_year, 10),
      customerId: customerData.mercadoPagoCustomerId
    }));

    // 4. Actualizar el contador de tarjetas en la BD
    await supabaseAdmin
      .from('mercadopago_customers')
      .update({
        payment_methods_count: cards.length,
        last_used: new Date().toISOString()
      })
      .match({
        mercadopago_customer_id: customerData.mercadoPagoCustomerId
      });

    return NextResponse.json({ cards });

  } catch (error: any) {
    console.error(`❌ [${requestId}] Error al obtener tarjetas:`, error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener tarjetas' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Eliminar una tarjeta guardada
 * Query params: cardId, customerId
 */
export async function DELETE(request: Request) {
  const requestId = `req_mp_cards_delete_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`📝 [${requestId}] Iniciando solicitud para eliminar tarjeta`);

  const { searchParams } = new URL(request.url);
  const cardId = searchParams.get('cardId');
  const mercadoPagoCustomerId = searchParams.get('customerId');
  
  if (!cardId || !mercadoPagoCustomerId) {
    console.error(`❌ [${requestId}] Faltan parámetros requeridos`);
    return NextResponse.json(
      { error: 'Faltan parámetros requeridos' },
      { status: 400 }
    );
  }

  try {
    console.log(`📍 [${requestId}] Eliminando tarjeta:`, {
      cardId,
      customerId: mercadoPagoCustomerId
    });

    // Eliminar tarjeta en MercadoPago
    await mercadopago.card.delete(mercadoPagoCustomerId, cardId);

    console.log(`✅ [${requestId}] Tarjeta eliminada correctamente`);

    // Actualizar contador de tarjetas
    await supabaseAdmin
      .from('mercadopago_customers')
      .update({
        payment_methods_count: Math.max(0, 
          // Resta 1 al contador actual, asegurando que nunca sea menor que 0
          parseInt((await supabaseAdmin
            .from('mercadopago_customers')
            .select('payment_methods_count')
            .eq('mercadopago_customer_id', mercadoPagoCustomerId)
            .single()).data?.payment_methods_count || '1', 10) - 1
        ),
        last_used: new Date().toISOString()
      })
      .match({
        mercadopago_customer_id: mercadoPagoCustomerId
      });

    return NextResponse.json({ 
      success: true,
      message: 'Tarjeta eliminada correctamente'
    });

  } catch (error: any) {
    console.error(`❌ [${requestId}] Error al eliminar tarjeta:`, error);
    return NextResponse.json(
      { 
        error: error.message || 'Error al eliminar tarjeta',
        success: false
      },
      { status: 500 }
    );
  }
}
