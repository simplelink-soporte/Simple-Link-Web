interface SubscriptionPlan {
  plan_id: string | undefined
  price: number
}

interface PayPalConfig {
  SUBSCRIPTION_PLANS: {
    PRO_MONTHLY: SubscriptionPlan
    PRO_QUARTERLY: SubscriptionPlan
  }
  CLIENT_ID: string | undefined
  CURRENCY: string
  INTENT: 'subscription'
}

if (!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID) {
  console.error('PayPal Client ID no está configurado en las variables de entorno');
}

if (!process.env.NEXT_PUBLIC_PAYPAL_MONTHLY_PLAN_ID || !process.env.NEXT_PUBLIC_PAYPAL_QUARTERLY_PLAN_ID) {
  console.error('Los IDs de los planes de PayPal no están configurados en las variables de entorno');
}

export const PAYPAL_CONFIG: PayPalConfig = {
  SUBSCRIPTION_PLANS: {
    PRO_MONTHLY: {
      plan_id: process.env.NEXT_PUBLIC_PAYPAL_MONTHLY_PLAN_ID,
      price: 24.70
    },
    PRO_QUARTERLY: {
      plan_id: process.env.NEXT_PUBLIC_PAYPAL_QUARTERLY_PLAN_ID,
      price: 69.69
    }
  },
  CLIENT_ID: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
  CURRENCY: 'EUR',
  INTENT: 'subscription'
} as const 