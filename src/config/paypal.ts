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
      plan_id: 'P-0N2995358Y537620XM7EH2GY',
      price: 24.70
    },
    PRO_QUARTERLY: {
      plan_id: 'P-3VP556308G528934UM7EH2ZI',
      price: 69.69
    },
    PRO_ANNUALLY: {
      plan_id: 'P-4DN15863T7613990EM7EH3EY',
      price: 192.66
    }
  },
  CLIENT_ID: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
  CURRENCY: 'EUR',
  INTENT: 'subscription'
} as const 