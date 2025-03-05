import { NextResponse } from 'next/server';
import { stripeCustomerService } from '@/services/stripe-customer.service';

export async function POST(request: Request) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`📝 [${requestId}] Iniciando solicitud de Cliente`);

  try {
    const body = await request.json();
    const { stripeAccountId, userId } = body;

    console.log(`📍 [${requestId}] Datos recibidos:`, {
      stripeAccountId: stripeAccountId ? '...present...' : 'missing',
      userId: userId ? '...present...' : 'missing'
    });

    if (!stripeAccountId || !userId) {
      console.error(`❌ [${requestId}] Error: Faltan datos requeridos`);
      return NextResponse.json(
        { error: 'Se requieren stripeAccountId y userId' },
        { status: 400 }
      );
    }

    const customerData = await stripeCustomerService.getOrCreateCustomer(
      userId,
      stripeAccountId
    );

    if (!customerData) {
      console.error(`❌ [${requestId}] Error: No se pudo procesar el cliente`);
      return NextResponse.json(
        { error: 'Error al procesar el cliente' },
        { status: 500 }
      );
    }

    console.log(`✅ [${requestId}] Cliente procesado:`, {
      customerId: customerData.stripeCustomerId,
      status: customerData.status
    });

    return NextResponse.json(customerData);

  } catch (error: any) {
    console.error(`❌ [${requestId}] Error:`, error);
    
    // Manejar errores específicos
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Error de concurrencia al crear el cliente. Por favor, intente nuevamente.' },
        { status: 409 }
      );
    }

    // Errores de Stripe
    if (error.type?.startsWith('Stripe')) {
      return NextResponse.json(
        { error: error.message || 'Error al procesar con Stripe' },
        { status: 400 }
      );
    }

    // Error genérico
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error.message
      },
      { status: 500 }
    );
  }
} 