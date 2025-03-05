import { NextResponse } from 'next/server';
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('La clave secreta de Stripe no está configurada');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true
});

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`📝 [${requestId}] Verificando estado de Setup Intent:`, params.id);

  try {
    // Obtener la cuenta conectada del header
    const stripeAccount = request.headers.get('Stripe-Account');
    if (!stripeAccount) {
      console.error(`❌ [${requestId}] Error: Falta el header Stripe-Account`);
      return NextResponse.json(
        { error: 'Se requiere el header Stripe-Account' },
        { status: 400 }
      );
    }

    // Verificar que el SetupIntent existe
    try {
      const setupIntent = await stripe.setupIntents.retrieve(
        params.id,
        { stripeAccount }
      );

      console.log(`✅ [${requestId}] SetupIntent encontrado:`, {
        id: setupIntent.id,
        status: setupIntent.status
      });

      return NextResponse.json({
        id: setupIntent.id,
        status: setupIntent.status,
        customer: setupIntent.customer,
        payment_method: setupIntent.payment_method
      });

    } catch (error) {
      console.error(`❌ [${requestId}] Error al verificar SetupIntent:`, error);
      
      if (error instanceof Stripe.errors.StripeError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.statusCode || 400 }
        );
      }

      throw error;
    }

  } catch (error) {
    console.error(`❌ [${requestId}] Error:`, error);
    
    let status = 500;
    let message = 'Error interno del servidor';

    if (error instanceof Error) {
      if (error.message.includes('No such setupintent')) {
        status = 404;
        message = 'SetupIntent no encontrado';
      } else if (error.message.includes('Invalid API Key')) {
        status = 401;
        message = 'Error de autenticación con Stripe';
      } else {
        message = error.message;
      }
    }

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
} 