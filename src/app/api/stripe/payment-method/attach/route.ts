import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(request: Request) {
  try {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    console.log(`📝 [${requestId}] Iniciando solicitud de attach payment method`);

    const body = await request.json();
    const { payment_method_id, customer_id } = body;
    const headersList = headers();
    const stripeAccount = headersList.get('Stripe-Account');

    console.log(`📍 [${requestId}] Datos recibidos:`, {
      payment_method_id: '...present...',
      customer_id: '...present...',
      stripeAccount: stripeAccount ? '...present...' : 'not present'
    });

    if (!payment_method_id || !customer_id) {
      throw new Error('Faltan datos requeridos');
    }

    // Adjuntar el método de pago al cliente
    const paymentMethod = await stripe.paymentMethods.attach(
      payment_method_id,
      { customer: customer_id },
      { stripeAccount }
    );

    console.log(`✅ [${requestId}] Método de pago adjuntado:`, {
      id: paymentMethod.id,
      type: paymentMethod.type,
      customer: paymentMethod.customer
    });

    return NextResponse.json({ 
      attached_payment_method: paymentMethod 
    });

  } catch (error) {
    console.error('❌ Error al adjuntar método de pago:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 400 }
    );
  }
} 