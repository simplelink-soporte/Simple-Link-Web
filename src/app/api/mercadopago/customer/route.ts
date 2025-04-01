import { NextResponse } from 'next/server';
import { mercadoPagoCustomerService } from '@/services/mercadopago-customer.service';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Endpoint para obtener o crear un cliente de MercadoPago
 * Método: POST
 * Body: { empresaId, userId, email, metadata, mercadoPagoUserId }
 */
export async function POST(request: Request) {
  const requestId = `req_mp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`📝 [${requestId}] Iniciando solicitud de Cliente MercadoPago`);

  // Verificar que MercadoPago está configurado
  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    console.error(`❌ [${requestId}] Error: MERCADOPAGO_ACCESS_TOKEN no está configurado`);
    return NextResponse.json(
      { error: 'MercadoPago no está configurado en el servidor' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { empresaId, userId, email, metadata = {}, mercadoPagoUserId } = body;

    console.log(`📍 [${requestId}] Datos recibidos:`, {
      empresaId: empresaId ? '...present...' : 'missing',
      userId: userId ? '...present...' : 'missing',
      email: email ? '...present...' : 'missing',
      mercadoPagoUserId: mercadoPagoUserId ? '...present...' : 'missing'
    });

    if (!empresaId || !userId || !email) {
      console.error(`❌ [${requestId}] Error: Faltan datos requeridos`);
      return NextResponse.json(
        { error: 'Se requieren empresaId, userId y email' },
        { status: 400 }
      );
    }

    // Si no se proporcionó mercadoPagoUserId, intentamos obtenerlo de la base de datos
    let mpUserId = mercadoPagoUserId;
    if (!mpUserId) {
      console.log(`📍 [${requestId}] Buscando mercadoPagoUserId para empresaId:`, empresaId);
      
      try {
        const { data: mpConnection, error } = await supabaseAdmin
          .from('mercadopago_connections')
          .select('mercadopago_user_id')
          .eq('empresa_id', empresaId)
          .single();
          
        if (error) {
          console.error(`❌ [${requestId}] Error al buscar conexión MercadoPago:`, error);
          return NextResponse.json(
            { error: 'No se pudo encontrar la configuración de MercadoPago para esta empresa' },
            { status: 400 }
          );
        }
        
        if (mpConnection?.mercadopago_user_id) {
          mpUserId = mpConnection.mercadopago_user_id;
          console.log(`✅ [${requestId}] mercadoPagoUserId encontrado:`, mpUserId);
        } else {
          console.error(`❌ [${requestId}] No se encontró mercadoPagoUserId para empresaId:`, empresaId);
          return NextResponse.json(
            { error: 'La empresa no tiene una cuenta de MercadoPago configurada' },
            { status: 400 }
          );
        }
      } catch (dbError) {
        console.error(`❌ [${requestId}] Error de base de datos:`, dbError);
        return NextResponse.json(
          { error: 'Error al consultar información de MercadoPago' },
          { status: 500 }
        );
      }
    }

    // Enviar los datos del usuario al servicio en lugar de buscarlos en BD
    const userData = {
      email,
      metadata
    };

    // Envolver en try/catch específico para obtener cliente
    try {
      console.log(`💾 [${requestId}] Llamando a getOrCreateCustomer con:`, {
        userId: userId ? '...presente...' : 'faltante',
        empresaId: empresaId ? '...presente...' : 'faltante', 
        mpUserId: mpUserId ? '...presente...' : 'faltante',
        userData: userData ? 'objeto presente' : 'faltante'
      });

      const customerData = await mercadoPagoCustomerService.getOrCreateCustomer(
        userId,
        empresaId,
        mpUserId, // Agregamos el mercadoPagoUserId
        userData
      );

      if (!customerData) {
        console.error(`❌ [${requestId}] Error: No se pudo procesar el cliente`);
        return NextResponse.json(
          { error: 'Error al procesar el cliente' },
          { status: 500 }
        );
      }

      console.log(`✅ [${requestId}] Cliente procesado:`, {
        customerId: customerData.mercadoPagoCustomerId,
        status: customerData.status
      });

      return NextResponse.json(customerData);
    } catch (serviceError: any) {
      console.error(`❌ [${requestId}] Error en servicio MercadoPago:`, {
        message: serviceError.message,
        stack: serviceError.stack?.slice(0, 200) || 'No disponible', // Limitar longitud del stack para evitar logs excesivos
        name: serviceError.name,
        code: serviceError.code
      });
      
      return NextResponse.json({
        error: serviceError.message || 'Error en el servicio de MercadoPago',
        stack: process.env.NODE_ENV === 'development' ? serviceError.stack : undefined,
        details: process.env.NODE_ENV === 'development' ? JSON.stringify(serviceError) : undefined
      }, { status: 500 });
    }
  } catch (parseError: any) {
    console.error(`❌ [${requestId}] Error al parsear el body:`, parseError);
    
    return NextResponse.json(
      { 
        error: 'Error al procesar la solicitud',
        details: parseError.message
      },
      { status: 400 }
    );
  }
}
