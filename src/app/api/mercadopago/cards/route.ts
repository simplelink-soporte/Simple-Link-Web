import { NextResponse } from 'next/server';
import { mercadopago } from '@/lib/mercadopago';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mercadoPagoCustomerService } from '@/services/mercadopago-customer.service';
import { StoredCard } from '@/components/shifts-registration/components/card-list/shared/types';
import axios from 'axios';

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
        console.log(`🔍 [${requestId}] Intentando obtener tarjetas con MercadoPago para cliente: ${mpCustomerId}`);
        
        const mpCardsResponse = await mercadopago.card.all({
          customer_id: mpCustomerId
        });
        
        console.log(`📄 [${requestId}] Respuesta de MercadoPago:`, {
          status: mpCardsResponse?.status || 'unknown',
          dataType: mpCardsResponse?.response ? typeof mpCardsResponse.response : 'undefined'
        });
        
        // Verificar si tenemos un array o directamente el array
        const mpCards = Array.isArray(mpCardsResponse.response) 
          ? mpCardsResponse.response 
          : (mpCardsResponse.response || []);
        
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
        
        // Si hay un error específico del SDK, intentar directamente con la API
        try {
          console.log(`🔄 [${requestId}] Intentando obtener tarjetas directamente con la API REST`);
          
          const response = await axios.get(
            `https://api.mercadopago.com/v1/customers/${mpCustomerId}/cards`,
            {
              headers: {
                'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          console.log(`✅ [${requestId}] Tarjetas obtenidas vía API REST: ${response.data?.length || 0}`);
          
          // Transformar al formato esperado por el frontend
          const cards: StoredCard[] = (response.data || []).map((card: any) => ({
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
          
        } catch (apiError: any) {
          console.error(`❌ [${requestId}] Error al obtener tarjetas con API REST:`, {
            message: apiError.message,
            status: apiError.response?.status,
            data: apiError.response?.data
          });
          
          return NextResponse.json(
            { error: 'Error al obtener tarjetas de MercadoPago', details: apiError.message },
            { status: apiError.response?.status || 500 }
          );
        }
      }
    } else if (token && (mercadoPagoCustomerId || customerId)) {
      // CASO 2: Guardar una nueva tarjeta
      console.log(`📝 [${requestId}] Guardando nueva tarjeta para cliente:`, {
        customerId: mercadoPagoCustomerId || customerId,
        tokenExists: !!token,
        tokenType: typeof token,
        tokenLength: typeof token === 'string' ? token.length : 'N/A'
      });
      
      const mpCustomerId = mercadoPagoCustomerId || customerId;
      
      if (!mpCustomerId) {
        console.error(`❌ [${requestId}] Falta customerId para guardar la tarjeta`);
        return NextResponse.json(
          { error: 'Se requiere customerId para guardar la tarjeta' },
          { status: 400 }
        );
      }
      
      try {
        // Guardar la tarjeta usando mercadopago
        console.log(`⏳ [${requestId}] Intentando guardar tarjeta con SDK usando token:`, token);
        
        const savedCard = await mercadopago.card.create({
          token,
          customer_id: mpCustomerId
        });
        
        console.log(`✅ [${requestId}] Tarjeta guardada correctamente:`, {
          cardId: savedCard.response?.id
        });
        
        // Actualizar contador en BD
        if (userId && empresaId) {
          // Primero obtener cantidad actualizada
          const mpCardsResponse = await mercadopago.card.all({
            customer_id: mpCustomerId
          });
          
          const cardsCount = mpCardsResponse.response 
            ? (Array.isArray(mpCardsResponse.response) 
                ? mpCardsResponse.response.length 
                : 1) 
            : 1;
          
          await supabaseAdmin
            .from('mercadopago_customers')
            .update({
              payment_methods_count: cardsCount,
              last_used: new Date().toISOString()
            })
            .match({
              mercadopago_customer_id: mpCustomerId
            });
        }
        
        return NextResponse.json({
          success: true,
          card: {
            id: savedCard.response?.id,
            brand: savedCard.response?.payment_method?.name?.toLowerCase() || 'unknown',
            last4: savedCard.response?.last_four_digits,
            expMonth: parseInt(savedCard.response?.expiration_month, 10),
            expYear: parseInt(savedCard.response?.expiration_year, 10),
            customerId: mpCustomerId
          }
        });
        
      } catch (cardError: any) {
        console.error(`❌ [${requestId}] Error al guardar tarjeta:`, {
          message: cardError.message,
          status: cardError.response?.status,
          data: cardError.response?.data
        });
        
        // Si hay un error específico del SDK, intentar directamente con la API
        try {
          console.log(`🔄 [${requestId}] Intentando guardar tarjeta directamente con la API REST`);
          
          const response = await axios.post(
            `https://api.mercadopago.com/v1/customers/${mpCustomerId}/cards`,
            { token },
            {
              headers: {
                'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          console.log(`✅ [${requestId}] Tarjeta guardada vía API REST: ${response.status}`);
          
          return NextResponse.json({
            success: true,
            card: {
              id: response.data?.id,
              brand: response.data?.payment_method?.name?.toLowerCase() || 'unknown',
              last4: response.data?.last_four_digits,
              expMonth: parseInt(response.data?.expiration_month, 10),
              expYear: parseInt(response.data?.expiration_year, 10),
              customerId: mpCustomerId
            }
          });
          
        } catch (apiError: any) {
          console.error(`❌ [${requestId}] Error al guardar tarjeta con API REST:`, {
            message: apiError.message,
            status: apiError.response?.status,
            data: apiError.response?.data
          });
          
          return NextResponse.json(
            { 
              error: 'Error al guardar tarjeta en MercadoPago',
              details: apiError.response?.data?.message || apiError.message
            },
            { status: apiError.response?.status || 500 }
          );
        }
      }
    } else {
      console.error(`❌ [${requestId}] Solicitud inválida: faltan datos requeridos`);
      return NextResponse.json(
        { error: 'Faltan datos requeridos para la operación' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error(`❌ [${requestId}] Error general:`, error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET: Obtener tarjetas guardadas de un cliente de MercadoPago
 * Query params: empresaId, userId
 */
export async function GET(request: Request) {
  const requestId = `req_mp_cards_get_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`📝 [${requestId}] Iniciando solicitud GET de tarjetas`);
  
  try {
    const url = new URL(request.url);
    const empresaId = url.searchParams.get('empresaId');
    const userId = url.searchParams.get('userId');
    
    if (!empresaId || !userId) {
      console.error(`❌ [${requestId}] Faltan parámetros requeridos (empresaId, userId)`);
      return NextResponse.json(
        { error: 'Se requieren empresaId y userId como parámetros' },
        { status: 400 }
      );
    }
    
    // Obtener el customer_id desde el servicio
    const customerData = await mercadoPagoCustomerService.getOrCreateCustomer(
      userId,
      empresaId
    );
    
    if (!customerData || customerData.status !== 'active') {
      console.warn(`⚠️ [${requestId}] No se encontró un cliente activo`);
      // No es un error crítico, simplemente no hay tarjetas
      return NextResponse.json({ cards: [] });
    }
    
    const mpCustomerId = customerData.mercadoPagoCustomerId;
    
    console.log(`✅ [${requestId}] Cliente identificado:`, {
      customerId: mpCustomerId
    });
    
    // Obtener las tarjetas del cliente
    try {
      const mpCardsResponse = await mercadopago.card.all({
        customer_id: mpCustomerId
      });
      
      console.log(`📄 [${requestId}] Respuesta de MercadoPago:`, {
        status: mpCardsResponse?.status || 'unknown',
        dataType: typeof mpCardsResponse?.response
      });
      
      // Verificar si tenemos un array o directamente el array
      const mpCards = Array.isArray(mpCardsResponse.response) 
        ? mpCardsResponse.response 
        : (mpCardsResponse.response || []);
      
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
      
      return NextResponse.json({ cards });
    } catch (cardError: any) {
      console.error(`❌ [${requestId}] Error al obtener tarjetas:`, cardError);
      
      // Si hay un error específico del SDK, intentar directamente con la API
      try {
        console.log(`🔄 [${requestId}] Intentando obtener tarjetas directamente con la API REST`);
        
        const response = await axios.get(
          `https://api.mercadopago.com/v1/customers/${mpCustomerId}/cards`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log(`✅ [${requestId}] Tarjetas obtenidas vía API REST: ${response.data?.length || 0}`);
        
        // Transformar al formato esperado por el frontend
        const cards: StoredCard[] = (response.data || []).map((card: any) => ({
          id: card.id,
          brand: card.payment_method?.name?.toLowerCase() || 'unknown',
          last4: card.last_four_digits,
          expMonth: parseInt(card.expiration_month, 10),
          expYear: parseInt(card.expiration_year, 10),
          customerId: mpCustomerId
        }));
        
        return NextResponse.json({ cards });
        
      } catch (apiError: any) {
        console.error(`❌ [${requestId}] Error al obtener tarjetas con API REST:`, {
          message: apiError.message,
          status: apiError.response?.status,
          data: apiError.response?.data
        });
        
        return NextResponse.json(
          { error: 'Error al obtener tarjetas de MercadoPago', details: apiError.message },
          { status: apiError.response?.status || 500 }
        );
      }
    }
  } catch (error: any) {
    console.error(`❌ [${requestId}] Error general:`, error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Eliminar una tarjeta guardada
 * Query params: cardId, customerId
 */
export async function DELETE(request: Request) {
  const requestId = `req_mp_cards_del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`📝 [${requestId}] Iniciando solicitud DELETE de tarjeta`);
  
  try {
    const url = new URL(request.url);
    const cardId = url.searchParams.get('cardId');
    const customerId = url.searchParams.get('customerId');
    
    if (!cardId || !customerId) {
      console.error(`❌ [${requestId}] Faltan parámetros requeridos (cardId, customerId)`);
      return NextResponse.json(
        { error: 'Se requieren cardId y customerId como parámetros' },
        { status: 400 }
      );
    }
    
    console.log(`🗑️ [${requestId}] Eliminando tarjeta:`, {
      cardId,
      customerId
    });
    
    try {
      // Eliminar la tarjeta en MercadoPago
      await mercadopago.card.delete({
        id: cardId,
        customer_id: customerId
      });
      
      console.log(`✅ [${requestId}] Tarjeta eliminada correctamente`);
      
      return NextResponse.json({
        success: true,
        message: 'Tarjeta eliminada correctamente'
      });
    } catch (cardError: any) {
      console.error(`❌ [${requestId}] Error al eliminar tarjeta:`, cardError);
      
      // Si hay un error específico del SDK, intentar directamente con la API
      try {
        console.log(`🔄 [${requestId}] Intentando eliminar tarjeta directamente con la API REST`);
        
        await axios.delete(
          `https://api.mercadopago.com/v1/customers/${customerId}/cards/${cardId}`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log(`✅ [${requestId}] Tarjeta eliminada vía API REST`);
        
        return NextResponse.json({
          success: true,
          message: 'Tarjeta eliminada correctamente'
        });
        
      } catch (apiError: any) {
        console.error(`❌ [${requestId}] Error al eliminar tarjeta con API REST:`, {
          message: apiError.message,
          status: apiError.response?.status,
          data: apiError.response?.data
        });
        
        return NextResponse.json(
          { 
            error: 'Error al eliminar tarjeta en MercadoPago',
            details: apiError.response?.data?.message || apiError.message
          },
          { status: apiError.response?.status || 500 }
        );
      }
    }
  } catch (error: any) {
    console.error(`❌ [${requestId}] Error general:`, error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
