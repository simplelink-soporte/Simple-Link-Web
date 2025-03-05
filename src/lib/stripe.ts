import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('La clave secreta de Stripe no está configurada');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
  telemetry: false,
  appInfo: {
    name: 'Padel Court Admin',
    version: '1.0.0'
  }
}); 