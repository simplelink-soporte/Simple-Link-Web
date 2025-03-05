'use client'

import { PayPalScriptProvider } from "@paypal/react-paypal-js"
import { PAYPAL_CONFIG } from "@/config/paypal"

const initialOptions = {
  "client-id": PAYPAL_CONFIG.CLIENT_ID!,
  currency: PAYPAL_CONFIG.CURRENCY,
  intent: "subscription",
  vault: true,
  "enable-funding": "paypal",
  "disable-funding": "card,paylater",
  components: "buttons,marks",
  commit: false,
}

export function PayPalProvider({
  children,
}: {
  children: React.ReactNode
}) {
  if (!PAYPAL_CONFIG.CLIENT_ID) {
    console.error('PayPal Client ID no está configurado');
    return (
      <div className="w-full p-4 text-sm text-red-500 bg-red-50 rounded-md">
        Error: PayPal no está configurado correctamente
      </div>
    );
  }

  return (
    <PayPalScriptProvider 
      options={initialOptions}
    >
      {children}
    </PayPalScriptProvider>
  )
} 