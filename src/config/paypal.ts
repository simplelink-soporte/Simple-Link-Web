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
    PRO_MONTHLY: 'P-8UD61442NR388412KM7WLTBQ',
    PRO_QUARTERLY: 'P-4XT04013X4523154JM7WLT4Y',
    PRO_ANNUALLY: 'P-4D075066SM592694CM7WLUGQ'
  },
  development: {
    // IDs para el entorno de desarrollo/sandbox
    // Si son los mismos, simplemente usa los mismos valores
    PRO_MONTHLY: 'P-8UD61442NR388412KM7WLTBQ',
    PRO_QUARTERLY: 'P-4XT04013X4523154JM7WLT4Y',
    PRO_ANNUALLY: 'P-4D075066SM592694CM7WLUGQ'
  }
}

export const PAYPAL_CONFIG: PayPalConfig = {
  SUBSCRIPTION_PLANS: {
    PRO_MONTHLY: {
      plan_id: PLAN_IDS[isProduction ? 'production' : 'development'].PRO_MONTHLY,
      price: 32
    },
    PRO_QUARTERLY: {
      plan_id: PLAN_IDS[isProduction ? 'production' : 'development'].PRO_QUARTERLY,
      price: 86.40
    },
    PRO_ANNUALLY: {
      plan_id: PLAN_IDS[isProduction ? 'production' : 'development'].PRO_ANNUALLY,
      price: 249
    }
  },
  CLIENT_ID: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
  CURRENCY: 'USD',
  INTENT: 'subscription'
} as const