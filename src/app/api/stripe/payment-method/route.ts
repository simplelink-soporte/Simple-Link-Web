import { NextResponse } from 'next/server';
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY no está configurado');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia'
});

export async function POST(request: Request) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`📝 [${requestId}] Iniciando creación de PaymentMethod`);

  try {
    const stripeAccount = request.headers.get('Stripe-Account');
    if (!stripeAccount) {
      throw new Error('Stripe-Account header es requerido');
    }

    const body = await request.json();
    const { type, card } = body;

    if (!type || !card || !card.token) {
      throw new Error('Datos inválidos para crear PaymentMethod');
    }

    console.log(`✅ [${requestId}] Creando PaymentMethod en cuenta:`, stripeAccount);

    const paymentMethod = await stripe.paymentMethods.create(
      {
        type,
        card: {
          token: card.token
        }
      },
      {
        stripeAccount
      }
    );

    console.log(`✅ [${requestId}] PaymentMethod creado:`, paymentMethod.id);

    return NextResponse.json({ paymentMethod });
  } catch (error) {
    console.error(`❌ [${requestId}] Error al crear PaymentMethod:`, error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      },
      { status: 400 }
    );
  }
} 