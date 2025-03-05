import { NextResponse } from 'next/server';
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY no está configurado');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia'
});

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`📝 [${requestId}] Iniciando eliminación de método de pago:`, params.id);

  try {
    const { stripeAccountId } = await request.json();

    if (!stripeAccountId) {
      throw new Error('stripeAccountId es requerido');
    }

    console.log(`📍 [${requestId}] Eliminando método de pago:`, {
      paymentMethodId: params.id,
      stripeAccountId
    });

    // Eliminar el método de pago
    const deletedMethod = await stripe.paymentMethods.detach(
      params.id,
      {
        stripeAccount: stripeAccountId
      }
    );

    console.log(`✅ [${requestId}] Método de pago eliminado:`, deletedMethod.id);

    return NextResponse.json({ 
      deleted: true,
      paymentMethod: deletedMethod
    });

  } catch (error) {
    console.error(`❌ [${requestId}] Error al eliminar método de pago:`, error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      },
      { status: 400 }
    );
  }
} 