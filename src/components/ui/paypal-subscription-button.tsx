"use client"

import { PayPalButtons } from "@paypal/react-paypal-js"
import type { 
  CreateSubscriptionActions, 
  OnApproveData,
  OnApproveActions
} from "@paypal/paypal-js"
import { PAYPAL_CONFIG } from '@/config/paypal'
import { useState } from 'react'

interface PayPalSubscriptionButtonProps {
  planType: 'monthly' | 'quarterly' | 'annually'
  onSuccess?: (data: OnApproveData) => void
  onError?: (error: unknown) => void
}

const IGNORED_ERROR_MESSAGES = [
  'Window closed',
  'Detected popup close',
  'popup close',
  'popup_close'
];

export function PayPalSubscriptionButton({ 
  planType, 
  onSuccess, 
  onError 
}: PayPalSubscriptionButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const plan = 
    planType === 'quarterly' 
      ? PAYPAL_CONFIG.SUBSCRIPTION_PLANS.PRO_QUARTERLY 
      : planType === 'annually'
        ? PAYPAL_CONFIG.SUBSCRIPTION_PLANS.PRO_ANNUALLY
        : PAYPAL_CONFIG.SUBSCRIPTION_PLANS.PRO_MONTHLY;

  const shouldIgnoreError = (error: unknown) => {
    if (error instanceof Error) {
      return IGNORED_ERROR_MESSAGES.some(msg => 
        error.message.toLowerCase().includes(msg.toLowerCase())
      );
    }
    return false;
  };

  if (!PAYPAL_CONFIG.CLIENT_ID || !plan.plan_id) {
    console.error('Error de configuración:', {
      clientId: PAYPAL_CONFIG.CLIENT_ID,
      planId: plan.plan_id
    });
    return (
      <div className="w-full p-2 text-sm text-red-500 bg-red-50 rounded-md">
        Error de configuración. Por favor, contacta con soporte.
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-2 text-sm text-red-500 bg-red-50 rounded-md">
        {error}
      </div>
    );
  }

  return (
    <div className="w-full">
      {isProcessing && (
        <div className="text-center text-sm text-muted-foreground mb-1">
          Procesando tu suscripción...
        </div>
      )}
      <PayPalButtons
        forceReRender={[planType]}
        fundingSource="paypal"
        style={{ 
          shape: 'pill',
          color: 'black',
          layout: 'horizontal',
          label: 'subscribe',
          height: 45,
          tagline: false
        }}
        disabled={isProcessing}
        createSubscription={async (_data: unknown, actions: CreateSubscriptionActions) => {
          try {
            setIsProcessing(true);
            console.log('Entorno PayPal:', process.env.NODE_ENV === 'production' ? 'Producción' : 'Desarrollo');
            console.log('Iniciando suscripción con:', {
              plan_id: plan.plan_id,
              planType,
              client_id: PAYPAL_CONFIG.CLIENT_ID
            });

            // Verificación adicional para debug
            if (!plan.plan_id || plan.plan_id.trim() === '') {
              throw new Error('ID de plan inválido o vacío');
            }

            return actions.subscription.create({
              plan_id: plan.plan_id!,
              application_context: {
                shipping_preference: "NO_SHIPPING",
                user_action: "SUBSCRIBE_NOW",
                brand_name: "Simple Link",
                locale: "es-ES",
                return_url: window.location.href,
                cancel_url: window.location.href
              }
            });
          } catch (error) {
            if (!shouldIgnoreError(error)) {
              console.error('Error al crear la suscripción:', error);
              onError?.(error);
            }
            setIsProcessing(false);
            throw error;
          }
        }}
        onApprove={(data: OnApproveData, _actions: OnApproveActions) => {
          console.log("Suscripción aprobada:", data);
          setIsProcessing(false);
          onSuccess?.(data);
        }}
        onError={(error: Error) => {
          if (!shouldIgnoreError(error)) {
            console.error("Error en PayPal:", error);
            setIsProcessing(false);
            setError('Error al procesar el pago');
            onError?.(error);
          } else {
            console.log("Operación cancelada por el usuario");
            setIsProcessing(false);
          }
        }}
        onCancel={() => {
          console.log("Suscripción cancelada por el usuario");
          setIsProcessing(false);
        }}
      />
    </div>
  )
} 