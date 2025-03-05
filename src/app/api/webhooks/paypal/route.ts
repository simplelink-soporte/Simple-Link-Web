import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'
import crypto from 'crypto'

function verifyPayPalWebhookSignature(
  payload: any,
  headers: Headers
): boolean {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID
  const actualSignature = headers.get('paypal-transmission-sig')
  const transmissionId = headers.get('paypal-transmission-id')
  const timestamp = headers.get('paypal-transmission-time')

  const data = `${transmissionId}|${timestamp}|${webhookId}|${JSON.stringify(payload)}`
  const expectedSignature = crypto
    .createHmac('sha256', process.env.PAYPAL_WEBHOOK_SECRET!)
    .update(data)
    .digest('hex')

  return actualSignature === expectedSignature
}

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    
    // Verificar la firma del webhook
    if (!verifyPayPalWebhookSignature(payload, request.headers)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    const eventType = payload.event_type
    const resourceId = payload.resource.id // ID de la suscripción de PayPal

    const supabase = createRouteHandlerClient<Database>({ cookies })

    // Buscar la suscripción por subscription_id
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('subscription_id', resourceId)
      .single()

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      )
    }

    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await supabase
          .from('subscriptions')
          .update({
            plan_status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id)

        // También actualizamos el plan de la empresa a Free
        await supabase
          .from('empresas')
          .update({
            plan_type: 'Free',
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.empresa_id)
        break

      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        await supabase
          .from('subscriptions')
          .update({
            plan_status: 'suspended',
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id)
        break

      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
        await supabase
          .from('subscriptions')
          .update({
            payment_status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id)
        break

      case 'BILLING.SUBSCRIPTION.RENEWED':
      case 'BILLING.SUBSCRIPTION.PAYMENT.SUCCEEDED':
        // Calculamos la nueva fecha de expiración
        const expiresAt = new Date()
        if (subscription.payment_amount === 24.70) { // Plan mensual
          expiresAt.setMonth(expiresAt.getMonth() + 1)
        } else { // Plan trimestral
          expiresAt.setMonth(expiresAt.getMonth() + 3)
        }

        await supabase
          .from('subscriptions')
          .update({
            payment_status: 'paid',
            last_payment_date: new Date().toISOString(),
            next_payment_date: expiresAt.toISOString(),
            subscription_expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id)
        break
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error processing PayPal webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 