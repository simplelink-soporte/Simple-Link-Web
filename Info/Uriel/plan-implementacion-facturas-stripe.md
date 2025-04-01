# Plan de Implementación: Envío Automático de Facturas con Stripe

## 1. Análisis del Flujo Actual

### 1.1 Proceso de Pago Actual

El sistema actualmente maneja dos tipos de pagos con Stripe:

1. **Pagos Completos**:
   - Cliente → `full-payment-client.service.ts` → API `/api/stripe/process-full-payment` → Stripe
   - Se procesa el pago completo de una reserva

2. **Pagos de Seña**:
   - Cliente → `deposit-payment-client.service.ts` → API `/api/stripe/process-deposit-payment` → Stripe
   - Se procesa un porcentaje del pago total como seña

3. **Confirmación de Pago**:
   - Ambos flujos devuelven un `paymentIntentId` y `chargeStatus` para confirmar el éxito del pago
   - No hay generación ni envío automático de facturas actualmente

## 2. Requisitos para Implementación de Facturas Automáticas

### 2.1 Objetivos

- Generar automáticamente facturas después de pagos exitosos
- Enviar las facturas por email al cliente sin intervención manual
- Diferenciar entre facturas de pagos completos y facturas de señas
- Implementar solución sin costos adicionales ni intervención del cliente

### 2.2 Casos de Uso

1. **Caso 1**: Pago completo → Factura por el monto total → Envío por email
2. **Caso 2**: Pago de seña → Factura/recibo por el monto de la seña → Envío por email
3. **Caso 3**: Manejo de errores si no se puede generar la factura

## 3. Arquitectura Propuesta

### 3.1 Componentes a Implementar

1. **Sistema de Webhooks de Stripe**:
   - Capturar eventos `payment_intent.succeeded` para detectar pagos exitosos
   - Permitirá procesar pagos sin intervención manual

2. **Servicio de Facturación**:
   - Generar facturas usando la API de Invoices de Stripe
   - Almacenar referencias a las facturas generadas

3. **Servicio de Envío de Emails**:
   - Enviar automáticamente las facturas generadas por email
   - Utilizar las plantillas de email predefinidas de Stripe

### 3.2 Diagrama de Flujo

```
[Pago Exitoso] → [Webhook payment_intent.succeeded] → [Extraer Datos del Pago] 
→ [Generar Factura] → [Finalizar Factura] → [Enviar Factura por Email]
```

## 4. Plan de Implementación Detallado

### 4.1 Crear Servicio de Webhook para Pagos Exitosos

**1. Crear Endpoint de Webhook**:

```typescript
// src/app/api/stripe/webhooks/route.ts
import { createId } from '@paralleldrive/cuid2';
import { Stripe } from 'stripe';
import { createInvoiceService } from '@/services/stripe-invoice.service';

export async function POST(request: Request) {
  const requestId = createId();
  console.log(`🔄 [${requestId}] Webhook de Stripe recibido`);

  try {
    // Verificar la firma del webhook
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      return Response.json({ error: 'Falta la firma del webhook' }, { status: 400 });
    }

    const body = await request.text();
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
    
    // Verificar que el evento es válido
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET as string
      );
    } catch (err: any) {
      console.error(`❌ [${requestId}] Error de verificación del webhook:`, err.message);
      return Response.json({ error: `Error de firma: ${err.message}` }, { status: 400 });
    }

    // Procesar sólo eventos de pago exitoso
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log(`✅ [${requestId}] Pago exitoso detectado:`, {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
      });

      // Extraer el ID de cuenta de Stripe desde los metadatos
      const stripeAccountId = paymentIntent.metadata?.empresa_stripe_id || '';
      
      // Procesar la factura automáticamente
      if (stripeAccountId) {
        await createInvoiceService.createAndSendInvoice({
          paymentIntentId: paymentIntent.id,
          stripeAccountId,
          customerId: paymentIntent.customer as string,
          amount: paymentIntent.amount / 100,
          description: paymentIntent.description || 'Pago de reserva',
          metadata: paymentIntent.metadata
        });
      } else {
        console.warn(`⚠️ [${requestId}] No se encontró ID de cuenta Stripe en metadatos`);
      }
    }

    return Response.json({ received: true });
  } catch (error: any) {
    console.error(`❌ [${requestId}] Error al procesar webhook:`, error);
    return Response.json(
      { error: 'Error al procesar el webhook' },
      { status: 500 }
    );
  }
}
```

**2. Configurar el Webhook en el Dashboard de Stripe**:
- Añadir un nuevo endpoint de webhook en el Dashboard de Stripe
- Escuchar al evento `payment_intent.succeeded`
- Guardar el secreto del webhook como variable de entorno `STRIPE_WEBHOOK_SECRET`

### 4.2 Crear Servicio de Generación de Facturas

**1. Implementar servicio para crear y enviar facturas**:

```typescript
// src/services/stripe-invoice.service.ts
import { createId } from '@paralleldrive/cuid2';
import { Stripe } from 'stripe';

interface CreateInvoiceParams {
  paymentIntentId: string;
  stripeAccountId: string;
  customerId: string;
  amount: number;
  description: string;
  metadata?: Record<string, string>;
}

class StripeInvoiceService {
  /**
   * Crea y envía una factura automáticamente después de un pago exitoso
   */
  async createAndSendInvoice(params: CreateInvoiceParams): Promise<{ success: boolean, invoiceId?: string, error?: any }> {
    const requestId = createId();
    console.log(`🔄 [${requestId}] Iniciando creación de factura para PaymentIntent:`, params.paymentIntentId);

    try {
      // 1. Configurar Stripe con la cuenta correcta
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
        stripeAccount: params.stripeAccountId
      });

      // 2. Determinar el tipo de pago (completo o seña)
      const isDepositPayment = params.metadata?.payment_type === 'deposit';
      const invoiceDescription = isDepositPayment 
        ? `Factura de Seña (${params.metadata?.deposit_percentage || '30'}%): ${params.description}`
        : `Factura: ${params.description}`;

      // 3. Crear factura
      console.log(`🧾 [${requestId}] Creando factura para cliente:`, params.customerId);
      const invoice = await stripe.invoices.create({
        customer: params.customerId,
        auto_advance: true, // Finaliza automáticamente la factura
        collection_method: 'charge_automatically',
        description: invoiceDescription,
        metadata: {
          payment_intent_id: params.paymentIntentId,
          created_by: 'webhook_automatic',
          ...params.metadata
        }
      });

      // 4. Agregar el ítem a la factura
      await stripe.invoiceItems.create({
        customer: params.customerId,
        invoice: invoice.id,
        amount: Math.round(params.amount * 100), // Convertir a centavos
        currency: 'eur',
        description: isDepositPayment 
          ? `Seña (${params.metadata?.deposit_percentage || '30'}%): ${params.description}`
          : params.description
      });

      // 5. Finalizar la factura (aunque auto_advance=true lo hace automáticamente)
      await stripe.invoices.finalizeInvoice(invoice.id);

      // 6. Enviar por email
      console.log(`📧 [${requestId}] Enviando factura ${invoice.id} por email`);
      await stripe.invoices.sendInvoice(invoice.id);

      console.log(`✅ [${requestId}] Factura creada y enviada exitosamente:`, {
        invoiceId: invoice.id,
        amount: params.amount,
        customer: params.customerId.substring(0, 10) + '...',
        isDeposit: isDepositPayment
      });

      return {
        success: true,
        invoiceId: invoice.id
      };
    } catch (error: any) {
      console.error(`❌ [${requestId}] Error al crear/enviar factura:`, error);
      return {
        success: false,
        error: {
          message: error.message,
          code: error.code,
          type: error.type
        }
      };
    }
  }
}

// Exportar una instancia única del servicio
export const createInvoiceService = new StripeInvoiceService();
```

### 4.3 Modificar Endpoints de Pago Existentes

**1. Modificar el endpoint de pago completo** para añadir metadatos necesarios:

```typescript
// src/app/api/stripe/process-full-payment/route.ts (modificación)

// Añadir en la sección donde se crea el PaymentIntent
const paymentIntentConfig: Stripe.PaymentIntentCreateParams = {
  // Configuración existente...
  metadata: {
    request_id: requestId,
    payment_type: data.paymentType,
    description: data.description || 'Pago completo de reserva',
    empresa_id: data.empresaId || '',
    // Añadir estos campos adicionales para facturación
    empresa_stripe_id: data.stripeAccountId, // Importante para el webhook
    invoice_auto_generate: 'true',           // Flag para generar factura
    customer_email: data.customerEmail || '' // Email para factura si está disponible
  },
  // Resto de la configuración...
};
```

**2. Modificar el endpoint de pago con seña** de forma similar:

```typescript
// src/app/api/stripe/process-deposit-payment/route.ts (modificación)

// Añadir en la sección donde se crea el PaymentIntent
const paymentIntentConfig: Stripe.PaymentIntentCreateParams = {
  // Configuración existente...
  metadata: {
    request_id: requestId,
    payment_type: 'deposit',
    deposit_percentage: data.depositPercentage.toString(),
    total_amount: (data.totalAmount * 100).toString(),
    description: data.description || 'Pago de seña para reserva',
    empresa_id: data.empresaId || '',
    // Añadir estos campos adicionales para facturación
    empresa_stripe_id: data.stripeAccountId, // Importante para el webhook
    invoice_auto_generate: 'true',           // Flag para generar factura
    customer_email: data.customerEmail || '' // Email para factura si está disponible
  },
  // Resto de la configuración...
};
```

### 4.4 Modificar Servicios Cliente para Incluir Email del Cliente

**1. Actualizar la interfaz `FullPaymentRequest`**:

```typescript
// src/services/full-payment-client.service.ts

interface FullPaymentRequest {
  // Campos existentes...
  paymentMethodId: string;
  amount: number;
  empresaId: string;
  description?: string;
  stripeCustomerId?: string;
  stripeAccountId?: string;
  // Nuevo campo
  customerEmail?: string; // Email para facturación
}
```

**2. Actualizar la interfaz `DepositPaymentParams`**:

```typescript
// src/services/deposit-payment-client.service.ts

interface DepositPaymentParams {
  // Campos existentes...
  paymentMethodId: string;
  amount: number;
  totalAmount?: number;
  depositPercentage?: number;
  empresaId: string;
  description?: string;
  stripeCustomerId: string;
  stripeAccountId: string;
  off_session?: boolean;
  // Nuevo campo
  customerEmail?: string; // Email para facturación
}
```

**3. Actualizar el parámetro en la llamada al API**:

```typescript
// En ambos servicios, pasar el email del cliente al endpoint
// Ejemplo para full-payment-client.service.ts
const response = await fetch('/api/stripe/process-full-payment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    // Campos existentes...
    customerEmail: params.customerEmail || '', // Pasar el email si está disponible
  })
});
```

## 5. Integración con el Componente SummaryStep

En `SummaryStep.tsx`, debemos capturar el email del usuario para pasarlo a los servicios de pago:

```typescript
// src/components/shifts-registration/steps/summary/SummaryStep.tsx

// En la función handleCreateReservation, modificar la parte donde se realiza el pago

if (selectedPaymentMethod === 'deposit') {
  paymentResult = await depositPaymentService.processPayment({
    // Parámetros existentes...
    customerEmail: user?.email || '', // Añadir el email del usuario
  });
} else {
  paymentResult = await fullPaymentService.processPayment({
    // Parámetros existentes...
    customerEmail: user?.email || '', // Añadir el email del usuario
  });
}
```

## 6. Configuración del Dashboard de Stripe

El club o negocio deberá configurar algunos aspectos en su Dashboard de Stripe:

1. **Personalización de Facturas**:
   - Logo de la empresa
   - Información fiscal (NIF/CIF)
   - Dirección de la empresa
   - Plantilla de emails de factura

2. **Webhook**:
   - Configurar un webhook que apunte a `/api/stripe/webhooks`
   - Seleccionar el evento `payment_intent.succeeded`
   - Obtener y configurar el secreto del webhook como variable de entorno

## 7. Consideraciones Adicionales

### 7.1 Variables de Entorno

Añadir las siguientes variables de entorno:
```
STRIPE_WEBHOOK_SECRET=<secreto_del_webhook>
STRIPE_INVOICE_ENABLED=true
```

### 7.2 Manejo de Errores

Implementar un sistema de reintentos para la creación de facturas en caso de error:
- Almacenar en una tabla los intentos fallidos 
- Crear un proceso programado que reintente la creación de facturas fallidas

### 7.3 Pruebas

1. **Pruebas de Integración**:
   - Realizar pagos de prueba en modo de desarrollo
   - Verificar la recepción del webhook
   - Comprobar la creación y envío de la factura

2. **Pruebas de Producción**:
   - Realizar pagos reales para verificar el proceso completo
   - Comprobar el formato y contenido de las facturas generadas

## 8. Cronograma de Implementación

1. **Fase 1** (1-2 días):
   - Implementación del endpoint de webhook
   - Desarrollo del servicio de facturación

2. **Fase 2** (1 día):
   - Modificación de los endpoints y servicios existentes
   - Integración con el componente SummaryStep

3. **Fase 3** (1 día):
   - Configuración del Dashboard de Stripe
   - Pruebas y ajustes finales

4. **Fase 4** (1 día):
   - Despliegue en producción
   - Monitorización y validación

## 9. Conclusión

Esta implementación permitirá generar y enviar facturas automáticamente a través de Stripe sin costo adicional ni intervención manual. El proceso es completamente transparente para el cliente y se integra naturalmente con el flujo de pago existente.

La solución propuesta:
- Es escalable y mantenible
- No requiere intervención manual
- Diferencia entre pagos completos y señas
- Aprovecha las capacidades nativas de Stripe
- Sigue las mejores prácticas de desarrollo y seguridad
