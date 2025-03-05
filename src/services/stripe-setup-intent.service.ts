import { stripe } from '@/lib/stripe';
import { createId } from '@paralleldrive/cuid2';

interface SetupIntentOptions {
  customerId: string;
  stripeAccountId: string;
  requestId?: string;
}

interface ConfirmSetupIntentOptions {
  setupIntentId: string;
  paymentMethodId: string;
  stripeAccountId: string;
  requestId?: string;
}

export class StripeSetupIntentService {
  private static generateRequestId(): string {
    return createId();
  }

  private static async verifyCustomer(customerId: string, stripeAccountId: string) {
    try {
      const customer = await stripe.customers.retrieve(customerId, {
        stripeAccount: stripeAccountId
      });

      if (!customer || customer.deleted) {
        throw new Error('Cliente no encontrado o eliminado');
      }

      return customer;
    } catch (error) {
      console.error('❌ Error al verificar cliente:', error);
      throw new Error('Cliente no válido para esta cuenta');
    }
  }

  static async create({
    customerId,
    stripeAccountId,
    requestId = createId()
  }: SetupIntentOptions) {
    console.log(`📝 [${requestId}] Iniciando creación de Setup Intent`);

    try {
      // 1. Verificar cliente
      await this.verifyCustomer(customerId, stripeAccountId);

      // 2. Crear Setup Intent
      const setupIntent = await stripe.setupIntents.create(
        {
          customer: customerId,
          payment_method_types: ['card'],
          usage: 'off_session',
          metadata: {
            requestId,
            createdAt: new Date().toISOString()
          }
        },
        {
          stripeAccount: stripeAccountId
        }
      );

      console.log(`✅ [${requestId}] Setup Intent creado:`, {
        setupIntentId: setupIntent.id,
        status: setupIntent.status
      });

      return {
        setupIntentId: setupIntent.id,
        clientSecret: setupIntent.client_secret,
        status: setupIntent.status
      };
    } catch (error) {
      console.error(`❌ [${requestId}] Error al crear Setup Intent:`, error);
      throw error;
    }
  }

  static async confirm({
    setupIntentId,
    paymentMethodId,
    stripeAccountId,
    requestId = createId()
  }: ConfirmSetupIntentOptions) {
    console.log(`📝 [${requestId}] Iniciando confirmación de Setup Intent:`, setupIntentId);

    try {
      // 1. Verificar que el SetupIntent existe
      const setupIntent = await stripe.setupIntents.retrieve(
        setupIntentId,
        { stripeAccount: stripeAccountId }
      );

      if (!setupIntent) {
        throw new Error('SetupIntent no encontrado');
      }

      if (setupIntent.status === 'canceled') {
        throw new Error('SetupIntent cancelado');
      }

      // 2. Verificar que el PaymentMethod existe en la cuenta conectada
      try {
        await stripe.paymentMethods.retrieve(paymentMethodId, {
          stripeAccount: stripeAccountId
        });
      } catch (error) {
        console.error(`❌ [${requestId}] Error al verificar PaymentMethod:`, error);
        throw new Error('El método de pago no existe o no pertenece a esta cuenta');
      }

      // 3. Confirmar SetupIntent con el PaymentMethod verificado
      const confirmedSetupIntent = await stripe.setupIntents.confirm(
        setupIntentId,
        {
          payment_method: paymentMethodId,
          return_url: process.env.NEXT_PUBLIC_APP_URL
        },
        {
          stripeAccount: stripeAccountId
        }
      );

      console.log(`✅ [${requestId}] SetupIntent confirmado:`, {
        id: confirmedSetupIntent.id,
        status: confirmedSetupIntent.status
      });

      return {
        setupIntent: confirmedSetupIntent
      };
    } catch (error) {
      console.error(`❌ [${requestId}] Error al confirmar SetupIntent:`, error);
      throw error;
    }
  }
} 