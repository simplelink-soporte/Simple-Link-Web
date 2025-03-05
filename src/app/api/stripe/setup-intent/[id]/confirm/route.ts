import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { StripeSetupIntentService } from '@/services/stripe-setup-intent.service';
import { createId } from '@paralleldrive/cuid2';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const requestId = createId();
  const setupIntentId = params.id;

  try {
    const headersList = await headers();
    const stripeAccount = headersList.get('Stripe-Account');

    if (!stripeAccount) {
      console.error(`❌ [${requestId}] Error: Falta el header Stripe-Account`);
      return NextResponse.json(
        { error: 'Se requiere el header Stripe-Account' },
        { status: 400 }
      );
    }

    if (!setupIntentId) {
      console.error(`❌ [${requestId}] Error: Falta el ID del Setup Intent`);
      return NextResponse.json(
        { error: 'Se requiere el ID del Setup Intent' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { payment_method_id } = body;

    if (!payment_method_id) {
      console.error(`❌ [${requestId}] Error: Falta el ID del método de pago`);
      return NextResponse.json(
        { error: 'Se requiere el ID del método de pago' },
        { status: 400 }
      );
    }

    console.log(`📝 [${requestId}] Iniciando confirmación:`, {
      setupIntentId,
      paymentMethodId: payment_method_id,
      stripeAccount
    });

    const result = await StripeSetupIntentService.confirm({
      setupIntentId,
      paymentMethodId: payment_method_id,
      stripeAccountId: stripeAccount,
      requestId
    });

    return NextResponse.json(result);
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
      } else if (error.message.includes('método de pago no existe')) {
        status = 400;
        message = error.message;
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