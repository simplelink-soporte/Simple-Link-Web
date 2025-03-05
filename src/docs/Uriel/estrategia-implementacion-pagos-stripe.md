# Estrategia de Implementación: Procesamiento de Pagos Stripe en "Pago Completo"

## 1. Análisis del Problema

Actualmente, al seleccionar "Pago completo" en el proceso de reserva, ocurren dos fallos críticos:

1. **Método de pago incorrecto**: Se está asignando 'cash' como método de pago predeterminado cuando debería ser 'stripe'.
2. **Falta de procesamiento**: No se está realizando la llamada a la API de Stripe para procesar el pago completo.

El flujo correcto debería ser:
- Al seleccionar "Pago completo" y hacer clic en "Continuar", se debe procesar inmediatamente el pago con Stripe
- Solo avanzar al siguiente paso (FarewellPreview) si el pago fue exitoso
- Mostrar un error adecuado si el pago falla

## 2. Diagnóstico de Causas Raíz

### 2.1. Problema en el Flujo de Datos

Aunque en `MobilePaymentContainer.tsx` se prepara un objeto con la información necesaria para el pago:

```typescript
const paymentData = {
  paymentType: localSelectedType, // 'full'
  paymentMethod: localSelectedMethod,
  amount: calculations.total,
  shouldChargeFullAmount: true,
  stripePaymentMethodId: localSelectedMethod.id,
  empresaId: empresaId
};
```

Y en `SummaryPreview.tsx` existe la lógica para procesar este pago:

```typescript
if (paymentData?.shouldChargeFullAmount) {
  import('@/services/paymentService').then(async ({ paymentService }) => {
    const result = await paymentService.processFullPayment({...});
    // Manejar resultado...
  });
}
```

El problema principal parece estar en la integración entre el flujo de procesamiento inmediato con Stripe y la posterior creación de la reserva en la base de datos.

### 2.2. Inconsistencia en los Mapeos de Tipos de Pago

En `PAYMENT_TYPE_MAPPINGS`, el tipo 'full' está correctamente mapeado a:

```typescript
full: {
  type: 'booking', // Para compatibilidad con backend
  defaultMethod: 'stripe',
  defaultStatus: 'completed'
}
```

Sin embargo, este mapeo no se está aplicando correctamente durante la creación de la reserva.

### 2.3. Falta de Sincronización entre Procesos

El proceso de pago y creación de reserva no están sincronizados adecuadamente:

1. El procesamiento del pago con Stripe ocurre en `SummaryPreview.tsx`
2. La creación de la reserva ocurre más tarde en `FarewellPreview.tsx` o `use-summary-booking.ts`
3. No existe una conexión que garantice que la reserva use los datos del pago ya procesado

## 3. Estrategia de Solución

Implementaremos un enfoque similar al utilizado en la cancelación de reservas, que está funcionando correctamente. La estrategia consistirá en:

### 3.1. Mejorar el Flujo de Datos en el Procesamiento de Pagos

1. **Modificar `SummaryPreview.tsx`:**
   - Asegurar que `handleNext` procese correctamente el pago cuando recibe `shouldChargeFullAmount: true`
   - Guardar el ID del PaymentIntent generado para referencia posterior

2. **Actualizar `MobilePaymentContainer.tsx`:**
   - Asegurar que todos los datos necesarios del pago se incluyan en `paymentData`
   - Incluir el tipo 'full' y garantizar que se mapee a 'stripe' como método

### 3.2. Garantizar el Correcto Mapeo de Tipos

1. **Validar en `use-summary-booking.ts`:**
   - Asegurar que el tipo 'full' se normalice correctamente a 'booking' para la BD
   - Verificar que `paymentMethod` siempre sea 'stripe' para pagos tipo 'full'

2. **Actualizar servicios de pago:**
   - Modificar `paymentService.ts` para manejar explícitamente el tipo 'full'
   - Asegurar en `full-payment.service.ts` que 'full' se mapee a 'booking'

### 3.3. Sincronizar Procesos de Pago y Creación de Reserva

1. **Implementar procesamiento condicional:**
   - Si es tipo 'full', primero procesar el pago con Stripe y solo avanzar si es exitoso
   - Para otros tipos, seguir con el flujo normal de creación de reserva

2. **Almacenar resultado del pago:**
   - Guardar el ID del PaymentIntent y estado en context/estado global
   - Usar estos datos al crear la reserva en la base de datos

### 3.4. Implementar Manejo de Errores Robusto

1. **Mostrar feedback claro al usuario:**
   - Indicadores de carga durante el procesamiento
   - Mensajes de error específicos si el pago falla
   - Confirmación clara si el pago es exitoso

2. **Implementar reintentos y recuperación:**
   - Permitir reintentar el pago si falla
   - No avanzar al siguiente paso hasta confirmar éxito

## 4. Implementación Técnica

### 4.1. Modificaciones en `paymentService.ts`

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
  // Asegurar que el tipo de pago siempre sea mapeado correctamente
  const dbPaymentType = params.paymentType === 'full' ? 'booking' : params.paymentType;
  
  // Procesar el pago con método 'stripe'...
}
```

### 4.2. Modificaciones en `SummaryPreview.tsx`

```typescript
const handleNext = useCallback((paymentData?: any) => {
  // Si es pago completo, procesar primero con Stripe
  if (paymentData?.shouldChargeFullAmount) {
    toast.loading('Procesando pago...');
    
    import('@/services/paymentService').then(async ({ paymentService }) => {
      try {
        const result = await paymentService.processFullPayment({
          bookingId: tempBookingId,
          paymentMethodId: paymentData.stripePaymentMethodId,
          amount: paymentData.amount,
          description: 'Pago completo de reserva',
          paymentType: 'full'
        });
        
        if (result.success) {
          // Guardar ID del PaymentIntent en estado/context
          setPaidPaymentIntentId(result.paymentIntentId);
          // Avanzar al siguiente paso
          onNext();
        } else {
          // Mostrar error y no avanzar
          toast.error(`Error: ${result.message}`);
        }
      } catch (error) {
        // Manejar error y no avanzar
        toast.error(`Error al procesar el pago: ${error.message}`);
      }
    });
    return; // Importante: no avanzar automáticamente
  }
  
  // Para otros tipos de pago, continuar con el flujo normal
  onNext();
}, [/* dependencias */]);
```

### 4.3. Modificaciones en `use-summary-booking.ts`

```typescript
// En la preparación de datos para crear la reserva
const normalizedPaymentType = paymentType === 'full' as any ? 'booking' : paymentType as PaymentTypeEnum;

// Asegurar que se use el método correcto
const paymentMethod = normalizedPaymentType === 'booking' && paymentType === 'full' 
  ? 'stripe' // Forzar 'stripe' para pagos tipo 'full'
  : paymentConfig.defaultMethod;

const bookingData = {
  // ...otros datos
  paymentMethod,
  paymentType: normalizedPaymentType,
  paymentStatus: paymentConfig.defaultStatus,
  // ...resto de datos
};
```

### 4.4. Modificaciones en APIs y Servicios Backend

```typescript
// En route.ts de process-full-payment
const fullPaymentSchema = z.object({
  // ...otros campos
  paymentType: z.string().optional().default('booking')
});

// En la API, mapear explícitamente 'full' a 'booking'
const dbPaymentType = data.paymentType === 'full' ? 'booking' : data.paymentType;
```

## 5. Pruebas y Validación

### 5.1. Escenarios de Prueba

1. **Pago completo exitoso:**
   - Seleccionar "Pago completo" y tarjeta válida
   - Verificar que el pago se procese correctamente
   - Confirmar que la reserva se crea con método 'stripe' y tipo 'booking'

2. **Pago completo rechazado:**
   - Usar tarjeta inválida o insuficiente
   - Verificar mensaje de error adecuado
   - Confirmar que no se avanza al siguiente paso

3. **Cambio entre tipos de pago:**
   - Seleccionar "Pago completo" y luego cambiar a otro tipo
   - Verificar que no se procese pago con Stripe
   - Confirmar que se usa el método correcto para cada tipo

### 5.2. Verificaciones en BD

1. Confirmar que las reservas con "Pago completo" tienen:
   - `payment_method: 'stripe'`
   - `payment_type: 'booking'`
   - `payment_status: 'completed'`

2. Verificar la existencia de registros en tabla `payments` vinculados a la reserva

## 6. Consideraciones Adicionales

1. **Experiencia de Usuario:**
   - Mostrar indicadores de carga claros durante el procesamiento
   - Proporcionar mensajes descriptivos en caso de error
   - Ofrecer opción para reintentar el pago si falla

2. **Seguridad:**
   - Implementar idempotencia para evitar cobros duplicados
   - Validar montos y datos antes de enviar a Stripe
   - Securizar tokens y datos sensibles

3. **Mantenibilidad:**
   - Documentar el flujo de pagos claramente
   - Centralizar lógica de mapeo de tipos en un solo lugar
   - Usar constantes para valores como 'full', 'booking', 'stripe'

## 7. Conclusión

Este enfoque aborda de manera integral los problemas identificados en el procesamiento de pagos tipo "Pago completo", asegurando que:

1. El pago se procese correctamente a través de Stripe
2. Solo se avance al siguiente paso si el pago es exitoso
3. La reserva se cree con los datos correctos (método 'stripe', tipo 'booking')
4. La experiencia del usuario sea fluida y proporcione feedback adecuado

La implementación propuesta respeta la lógica y estructura existente, añadiendo solo las modificaciones necesarias para corregir los problemas específicos identificados. 