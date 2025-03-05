import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripeCustomerService } from '@/services/stripe-customer.service';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY no está configurado');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-01-27.acacia'
});

export async function POST(request: Request) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`📝 [${requestId}] Iniciando listado de métodos de pago`);

  try {
    const { stripeAccountId, userId, customerId } = await request.json();

    if (!stripeAccountId || !userId) {
      console.warn(`⚠️ [${requestId}] Faltan datos requeridos:`, {
        hasStripeAccount: Boolean(stripeAccountId),
        hasUserId: Boolean(userId)
      });
      return NextResponse.json(
        { error: 'stripeAccountId y userId son requeridos' },
        { status: 400 }
      );
    }

    console.log(`📍 [${requestId}] Obteniendo customer para:`, {
      userId,
      stripeAccountId,
      hasCustomerId: Boolean(customerId)
    });

    // Usar el customerId proporcionado o obtenerlo del servicio
    const customer = customerId 
      ? { stripeCustomerId: customerId }
      : await stripeCustomerService.getOrCreateCustomer(userId, stripeAccountId);

    if (!customer) {
      console.error(`❌ [${requestId}] No se pudo obtener/crear el customer`);
      return NextResponse.json(
        { error: 'Error al obtener el customer' },
        { status: 500 }
      );
    }

    console.log(`✅ [${requestId}] Customer encontrado:`, {
      customerId: customer.stripeCustomerId
    });

    // Listar métodos de pago del customer
    const paymentMethods = await stripe.paymentMethods.list(
      {
        customer: customer.stripeCustomerId,
        type: 'card'
      },
      {
        stripeAccount: stripeAccountId
      }
    );

    // Transformar los datos para el frontend
    const formattedMethods = paymentMethods.data.map(method => ({
      id: method.id,
      brand: method.card?.brand || 'unknown',
      last4: method.card?.last4 || '****',
      expMonth: method.card?.exp_month || 0,
      expYear: method.card?.exp_year || 0
    }));

    console.log(`✅ [${requestId}] Métodos de pago encontrados:`, {
      count: formattedMethods.length,
      methods: formattedMethods
    });

    return NextResponse.json({ 
      paymentMethods: formattedMethods,
      customerId: customer.stripeCustomerId
    });

  } catch (error) {
    console.error(`❌ [${requestId}] Error al listar métodos de pago:`, {
      error,
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      },
      { status: 400 }
    );
  }
} 