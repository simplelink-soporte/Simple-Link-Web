# Implementación de Cobro Stripe para "Pago Completo"

## Contexto del Problema

En el sistema actual, cuando un usuario selecciona "Pago completo" como tipo de pago:

1. No se está realizando correctamente la llamada a Stripe para procesar el pago
2. Se está creando la reserva con método de pago 'cash' en lugar de 'stripe'
3. No hay sincronización entre el procesamiento del pago y la creación de la reserva

## Solución Implementada

Basándonos en el proceso funcional de cancelación de reservas con cobro por Stripe, se implementó una solución que garantiza:

1. El procesamiento correcto del pago con Stripe cuando se selecciona "Pago completo"
2. La creación de la reserva con el método de pago 'stripe' y tipo 'booking'
3. La sincronización adecuada entre ambos procesos

## Detalles de la Implementación

### 1. Modificaciones en `MobilePaymentContainer.tsx`

```typescript
// Cuando se selecciona tipo de pago 'full'
if (localSelectedType === 'full' && localSelectedMethod) {
  // Asegurar que todos los datos necesarios estén incluidos
  const paymentData = {
    paymentType: localSelectedType,
    paymentMethod: localSelectedMethod,
    amount: calculations.total,
    itemsTotal: calculations.itemsTotal,
    courtPrice: calculations.courtPrice,
    discount: calculations.discount,
    selectedItems: calculations.selectedItems,
    shouldChargeFullAmount: true,
    stripePaymentMethodId: localSelectedMethod.id,
    empresaId: empresaId
  };

  console.log('[MobilePaymentContainer] Preparando cobro total:', paymentData);
  onNext(paymentData);
  return;
}
```

### 2. Modificaciones en `SummaryPreview.tsx`

```typescript
const handleNext = useCallback((paymentData?: any) => {
  console.log('[SummaryPreview] Intentando avanzar:', {
    isValid,
    hasWarnings,
    selectedPaymentType,
    selectedPaymentMethod,
    hasPaymentData: !!paymentData,
    shouldChargeFullAmount: paymentData?.shouldChargeFullAmount
  });

  // Validaciones generales (mantener código existente)...

  // Verificar si debemos procesar un pago completo
  if (paymentData?.shouldChargeFullAmount) {
    console.log('[SummaryPreview] Procesando pago completo:', paymentData);
    
    // Mostrar indicador de carga
    toast.loading('Procesando pago...');
    
    // Importar dinámicamente el servicio de pago para evitar errores de SSR
    import('@/services/paymentService').then(async ({ paymentService }) => {
      try {
        // Crear un ID temporal para la reserva (será reemplazado por el real)
        const tempBookingId = `temp_${Date.now()}`;
        
        // Procesar el pago usando el servicio
        const result = await paymentService.processFullPayment({
          bookingId: tempBookingId,
          paymentMethodId: paymentData.stripePaymentMethodId || paymentData.paymentMethod.id,
          amount: paymentData.amount,
          description: 'Pago completo de reserva',
          paymentType: 'full'
        });
        
        // Limpiar toast de carga
        toast.dismiss();
        
        if (result.success) {
          // Guardar ID del PaymentIntent para referencia en la creación de la reserva
          setPaymentIntent(result.paymentIntentId);
          
          // Actualizar el estado global para garantizar que se use 'stripe' como método
          setPayment(prevState => ({
            ...prevState,
            method: 'stripe',
            type: 'full',
            processed: true,
            paymentIntentId: result.paymentIntentId
          }));
          
          toast.success('Pago procesado correctamente');
          console.log('[SummaryPreview] Pago exitoso, avanzando:', result);
          onNext();
        } else {
          // Si el pago falla, mostrar error y no avanzar
          toast.error(`Error al procesar el pago: ${result.message}`);
          console.error('[SummaryPreview] Error en el pago:', result);
        }
      } catch (error: any) {
        // Limpiar toast de carga
        toast.dismiss();
        
        console.error('[SummaryPreview] Error al procesar pago:', error);
        toast.error(`Error al procesar el pago: ${error.message || 'Error desconocido'}`);
      }
    }).catch(err => {
      toast.dismiss();
      console.error('[SummaryPreview] Error al cargar el servicio de pago:', err);
      toast.error('Error al inicializar el proceso de pago');
    });
    
    // Importante: detener la ejecución aquí para no avanzar automáticamente
    return;
  }

  // Para otros tipos de pago, continuar con el flujo normal
  console.log('[SummaryPreview] Configuración válida, permitiendo navegación');
  onNext();
}, [
  isValid,
  validationErrors,
  hasWarnings,
  selectedPaymentType,
  selectedPaymentMethod,
  onNext,
  setPayment
]);
```

### 3. Modificaciones en `paymentService.ts`

```typescript
async processFullPayment(params: {
  bookingId: string;
  paymentMethodId: string;
  amount: number;
  description?: string;
  paymentType?: string;
}): Promise<{
  success: boolean;
  paymentIntentId?: string;
  message?: string;
  error?: any;
}> {
  try {
    const { bookingId, paymentMethodId, amount, description, paymentType = 'full' } = params;
    
    console.log('🔄 Iniciando procesamiento de pago completo:', {
      bookingId,
      paymentMethodId,
      amount,
      paymentType,
      timestamp: new Date().toISOString()
    });

    // 1. Obtener los datos necesarios para procesar el pago con Stripe
    const stripeData = await this.getStripePaymentData(bookingId);
    
    if (!stripeData) {
      console.error('❌ No se pudieron obtener los datos de Stripe para la reserva:', bookingId);
      return {
        success: false,
        message: 'No se pudieron obtener los datos de pago'
      };
    }

    // 2. Mapear explícitamente 'full' a 'booking' para compatibilidad con BD
    const dbPaymentType = paymentType === 'full' ? 'booking' : paymentType;

    console.log('🔄 Tipo de pago mapeado para API:', {
      original: paymentType,
      mapped: dbPaymentType
    });

    // 3. Procesar el pago a través de la API
    const response = await fetch('/api/stripe/process-full-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId,
        amount,
        stripePaymentMethodId: paymentMethodId,
        stripeAccountId: stripeData.accountId,
        stripeCustomerId: stripeData.customerId,
        description: description || 'Pago completo de reserva',
        paymentType: dbPaymentType
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error('❌ Error al procesar el pago completo:', result.error);
      return {
        success: false,
        message: result.error?.message || 'Error al procesar el pago',
        error: result.error
      };
    }

    console.log('✅ Pago completo procesado exitosamente:', {
      bookingId,
      paymentIntentId: result.paymentIntentId,
      status: result.chargeStatus,
      type: dbPaymentType
    });

    return {
      success: true,
      paymentIntentId: result.paymentIntentId,
      message: 'Pago procesado exitosamente'
    };
  } catch (error: any) {
    console.error('❌ Error inesperado al procesar pago completo:', error);
    return {
      success: false,
      message: error.message || 'Error inesperado al procesar el pago',
      error
    };
  }
}
```

### 4. Modificaciones en `full-payment.service.ts`

```typescript
// Mapeo de tipos de pago de UI a tipos válidos en la base de datos
const PAYMENT_TYPE_MAPPING: Record<string, string> = {
  'full': 'booking',  // Mapeo explícito de "full" a "booking"
  'guarantee': 'guarantee',
  'deposit': 'deposit',
  'remaining': 'remaining',
  'no_show_charge': 'no_show_charge'
};

async processFullPayment(params: FullPaymentRequest): Promise<PaymentResult> {
  const requestId = createId();
  console.log(`🔄 [${requestId}] Iniciando proceso de cobro completo:`, {
    bookingId: params.bookingId,
    amount: params.amount,
    empresaId: params.empresaId,
    paymentType: params.paymentType || 'full',
    timestamp: new Date().toISOString()
  });

  try {
    // Determinar el tipo de pago a usar en la BD
    const dbPaymentType = params.paymentType 
      ? (PAYMENT_TYPE_MAPPING[params.paymentType] || 'booking')
      : 'booking';
      
    console.log(`🔄 [${requestId}] Tipo de pago mapeado:`, {
      original: params.paymentType || 'full',
      mapped: dbPaymentType
    });
    
    // Continuar con el procesamiento...
  }
  // Resto del código...
}
```

### 5. Modificaciones en `use-summary-booking.ts`

```typescript
// Obtener la configuración del tipo de pago
const paymentType = state.payment.type;
if (!paymentType) {
  throw new Error('Tipo de pago no seleccionado');
}

// Mapear 'full' a 'booking' si es necesario
const normalizedPaymentType = paymentType === 'full' as any ? 'booking' : paymentType as PaymentTypeEnum;

// Buscar configuración basada en el tipo normalizado
const paymentConfig = PAYMENT_TYPE_MAPPINGS[normalizedPaymentType as PaymentTypeEnum];
if (!paymentConfig) {
  console.error('Configuración de tipo de pago no válida:', {
    originalType: paymentType,
    normalizedType: normalizedPaymentType,
    availableMappings: Object.keys(PAYMENT_TYPE_MAPPINGS)
  });
  throw new Error('Configuración de tipo de pago no válida');
}

// Determinar el método de pago correcto
// Si es 'full', usar siempre 'stripe', de lo contrario usar el defaultMethod de la configuración
const paymentMethod = paymentType === 'full' ? 'stripe' : paymentConfig.defaultMethod;

// Preparación de datos para crear la reserva
const bookingData = {
  // ...campos existentes
  paymentMethod: paymentMethod, // Forzar 'stripe' para 'full'
  paymentType: normalizedPaymentType, // 'booking' para compatibilidad con BD
  paymentStatus: paymentType === 'full' ? 'completed' : paymentConfig.defaultStatus,
  // ...resto de campos
};
```

### 6. Modificaciones en `/api/stripe/process-full-payment/route.ts`

```typescript
// Esquema de validación para la solicitud
const fullPaymentSchema = z.object({
  bookingId: z.string(),
  amount: z.number().positive(),
  stripePaymentMethodId: z.string(),
  stripeAccountId: z.string(),
  stripeCustomerId: z.string().optional(),
  empresaId: z.string().optional(),
  description: z.string().optional(),
  paymentType: z.string().optional().default('booking') // Añadir campo para tipo de pago
});

export async function POST(request: Request) {
  const requestId = createId();

  try {
    // Obtener y validar el body de la solicitud
    const body = await request.json();
    console.log(`[${requestId}] Recibida solicitud de pago completo:`, body);

    // Validación y procesamiento...

    // Log de la información antes de procesar el pago
    console.log(`[${requestId}] Procesando pago con tipo "${data.paymentType}":`, {
      bookingId: data.bookingId,
      paymentType: data.paymentType,
      amount: data.amount
    });

    // Procesar el pago
    const paymentResult = await paymentService.processFullPayment({
      bookingId: data.bookingId,
      amount: data.amount,
      stripePaymentMethodId: data.stripePaymentMethodId,
      stripeAccountId: data.stripeAccountId,
      stripeCustomerId: data.stripeCustomerId || '',
      empresaId: data.empresaId || '',
      description: data.description,
      paymentType: data.paymentType // Asegurar que se pase el tipo de pago
    });

    // Manejo de respuesta...
  }
  // Resto del código...
}
```

## Flujo Completo del Proceso

1. **Usuario selecciona "Pago completo" en `MobilePaymentContainer.tsx`**
   - Se prepara objeto `paymentData` con la información necesaria
   - Se establece `shouldChargeFullAmount: true`

2. **Se llama a `handleNext` en `SummaryPreview.tsx` con los datos del pago**
   - Detecta `paymentData?.shouldChargeFullAmount` y procesa el pago
   - Importa dinámicamente `paymentService`
   - Llama a `processFullPayment` con los datos necesarios

3. **`paymentService.processFullPayment` procesa el pago**
   - Obtiene los datos de Stripe necesarios
   - Mapea el tipo 'full' a 'booking' para compatibilidad con BD
   - Envía solicitud a la API `/api/stripe/process-full-payment`

4. **API procesa el pago con Stripe**
   - Valida la solicitud
   - Llama a `full-payment.service.ts` para procesar el pago
   - La función `processFullPayment` crea y confirma el PaymentIntent
   - Se registra el pago en la base de datos

5. **Respuesta y manejo en cliente**
   - Si el pago es exitoso:
     - Se guarda el ID del PaymentIntent en estado/context
     - Se actualiza el estado global del pago
     - Se muestra mensaje de éxito y se avanza al siguiente paso
   - Si el pago falla:
     - Se muestra mensaje de error
     - No se avanza al siguiente paso

6. **Creación de reserva en `use-summary-booking.ts`**
   - Normaliza el tipo 'full' a 'booking'
   - Fuerza método 'stripe' para tipo 'full'
   - Establece estado 'completed' para pagos completos
   - Crea la reserva con los datos correctos

## Consideraciones de Seguridad y UX

1. **Seguridad**
   - Implementación de idempotencia para evitar cobros duplicados
   - Validación de datos antes de enviar a Stripe
   - Manejo adecuado de errores en todas las capas

2. **Experiencia de Usuario**
   - Indicadores de carga durante el procesamiento
   - Mensajes claros de éxito o error
   - No avanzar al siguiente paso si el pago falla

3. **Robustez**
   - Registros detallados en cada paso para facilitar debugging
   - Mapeo explícito de tipos para garantizar compatibilidad
   - Manejo adecuado de casos borde

## Conclusión

Esta implementación resuelve el problema identificado siguiendo el patrón similar al usado en la cancelación de reservas con Stripe. El enfoque garantiza que:

1. Se realice correctamente el cobro a través de Stripe cuando se selecciona "Pago completo"
2. La reserva se cree con el método 'stripe' y tipo 'booking'
3. Se muestre feedback adecuado al usuario durante todo el proceso
4. Solo se avance al siguiente paso si el pago es exitoso

La solución es robusta, mantiene la coherencia con el resto del sistema y proporciona una experiencia de usuario fluida y confiable. 