interface SubscriptionPlan {
  plan_id: string
  price: number
}

interface PayPalConfig {
  SUBSCRIPTION_PLANS: {
    PRO_MONTHLY: SubscriptionPlan
    PRO_QUARTERLY: SubscriptionPlan
    PRO_ANNUALLY: SubscriptionPlan
  }
  CLIENT_ID: string | undefined
  CURRENCY: string
  INTENT: 'subscription'
}

if (!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID) {
  console.error('PayPal Client ID no está configurado en las variables de entorno');
}

export const PAYPAL_CONFIG: PayPalConfig = {
  SUBSCRIPTION_PLANS: {
    PRO_MONTHLY: {
      plan_id: 'P-955286686J182661EM53OPXY',
      price: 24.70
    },
    PRO_QUARTERLY: {
      plan_id: 'P-63U48172X4193282XM53OQ5Y',
      price: 69.69
    },
    PRO_ANNUALLY: {
      plan_id: 'P-1PF98802FS266405HM6X3NSA',
      price: 192.66
    }
  },
  CLIENT_ID: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
  CURRENCY: 'EUR',
  INTENT: 'subscription'
} as const 