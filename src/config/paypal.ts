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

// Determinar el entorno
const isProduction = process.env.NODE_ENV === 'production';
console.log(`Configurando PayPal para entorno: ${isProduction ? 'Producción' : 'Desarrollo'}`);

// IDs de planes para producción y desarrollo
const PLAN_IDS = {
  production: {
    PRO_MONTHLY: 'P-0N2995358Y537620XM7EH2GY',
    PRO_QUARTERLY: 'P-3VP556308G528934UM7EH2ZI',
    PRO_ANNUALLY: 'P-4DN15863T7613990EM7EH3EY'
  },
  development: {
    // IDs para el entorno de desarrollo/sandbox
    // Si son los mismos, simplemente usa los mismos valores
    PRO_MONTHLY: 'P-0N2995358Y537620XM7EH2GY',
    PRO_QUARTERLY: 'P-3VP556308G528934UM7EH2ZI',
    PRO_ANNUALLY: 'P-4DN15863T7613990EM7EH3EY'
  }
}

export const PAYPAL_CONFIG: PayPalConfig = {
  SUBSCRIPTION_PLANS: {
    PRO_MONTHLY: {
      plan_id: PLAN_IDS[isProduction ? 'production' : 'development'].PRO_MONTHLY,
      price: 64
    },
    PRO_QUARTERLY: {
      plan_id: PLAN_IDS[isProduction ? 'production' : 'development'].PRO_QUARTERLY,
      price: 172
    },
    PRO_ANNUALLY: {
      plan_id: PLAN_IDS[isProduction ? 'production' : 'development'].PRO_ANNUALLY,
      price: 499
    }
  },
  CLIENT_ID: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
  CURRENCY: 'EUR',
  INTENT: 'subscription'
} as const