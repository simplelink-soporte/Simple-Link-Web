import { NextResponse } from 'next/server';
import { mercadoPagoCustomerService } from '@/services/mercadopago-customer.service';

/**
 * Endpoint para obtener o crear un cliente de MercadoPago
 * Método: POST
 * Body: { empresaId, userId, email, metadata }
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
    const { empresaId, userId, email, metadata = {} } = body;

    console.log(`📍 [${requestId}] Datos recibidos:`, {
      empresaId: empresaId ? '...present...' : 'missing',
      userId: userId ? '...present...' : 'missing',
      email: email ? '...present...' : 'missing'
    });

    if (!empresaId || !userId || !email) {
      console.error(`❌ [${requestId}] Error: Faltan datos requeridos`);
      return NextResponse.json(
        { error: 'Se requieren empresaId, userId y email' },
        { status: 400 }
      );
    }

    // Enviar los datos del usuario al servicio en lugar de buscarlos en BD
    const userData = {
      email,
      metadata
    };

    // Envolver en try/catch específico para obtener cliente
    try {
      const customerData = await mercadoPagoCustomerService.getOrCreateCustomer(
        userId,
        empresaId,
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
      console.error(`❌ [${requestId}] Error en servicio MercadoPago:`, serviceError);
      
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
