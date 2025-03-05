# Guía de Desarrollo: Sistema de Pagos en la Aplicación de Reservas de Pádel

## Introducción

Esta guía describe la arquitectura, flujos y mejores prácticas para el desarrollo y mantenimiento del sistema de pagos de la aplicación de reservas de pádel. Su objetivo es proporcionar un entendimiento completo del sistema para facilitar futuras implementaciones y modificaciones.

## Arquitectura del Sistema de Pagos

### Componentes Principales

1. **Frontend (Next.js/React)**
   - Componentes de UI para selección de tipo y método de pago
   - Validación de formularios
   - Comunicación con servicios de pago

2. **Servicios de Cliente**
   - `paymentService.ts`: Gestiona comunicación con APIs de pago
   - `full-payment.service.ts`: Procesa pagos completos

3. **APIs y Endpoints**
   - `/api/stripe/process-full-payment`: Procesa pagos completos
   - `/api/stripe/charge-no-show`: Gestiona cargos por no presentarse

4. **Integración con Stripe**
   - Manejo de PaymentIntents
   - Procesamiento de pagos con tarjeta
   - Gestión de clientes y métodos de pago

### Diagrama de Flujo de Datos

```
Usuario -> Interfaz de Pago -> Servicio de Pago -> API -> Stripe -> Base de Datos
```

## Tipos de Pago Soportados

| Tipo UI     | Tipo BD      | Descripción                               | Método Predeterminado |
|-------------|--------------|-------------------------------------------|----------------------|
| full        | booking      | Pago completo inmediato                   | stripe               |
| guarantee   | guarantee    | Tarjeta como garantía (cobro si no asiste)| stripe               |
| deposit     | deposit      | Pago parcial (seña)                       | cash/stripe          |
| booking     | booking      | Pago estándar de reserva                  | cash                 |

### Mapeo de Tipos

La aplicación utiliza un sistema de mapeo para transformar los tipos de UI en tipos compatibles con la base de datos:

```typescript
const PAYMENT_TYPE_MAPPING: Record<string, string> = {
  'full': 'booking',
  'guarantee': 'guarantee',
  'deposit': 'deposit',
  'remaining': 'remaining',
  'no_show_charge': 'no_show_charge'
};
```

Este mapeo es crucial para mantener la compatibilidad entre la interfaz de usuario y la base de datos.

## Flujos de Pago

### 1. Flujo de Pago Completo con Stripe

1. Usuario selecciona "Pago completo" en MobilePaymentContainer
2. Se pasan datos a handleNext en SummaryPreview con shouldChargeFullAmount=true
3. Se procesa el pago con Stripe mediante paymentService.processFullPayment
4. Si el pago es exitoso, se actualiza el estado global y se avanza al siguiente paso
5. Si falla, se muestra error y no se avanza
6. La reserva se crea con tipo 'booking' y método 'stripe'

```typescript
// Ejemplo simplificado del flujo
if (paymentData?.shouldChargeFullAmount) {
  const result = await paymentService.processFullPayment({
    bookingId: tempBookingId,
    paymentMethodId: paymentData.stripePaymentMethodId,
    amount: paymentData.amount,
    paymentType: 'full'
  });
  
  if (result.success) {
    // Actualizar estado y avanzar
  } else {
    // Mostrar error
  }
}
```

### 2. Flujo de Pago con Garantía

1. Usuario selecciona "Garantía" en la interfaz
2. Se guarda la información de la tarjeta sin realizar cobro
3. La reserva se crea con tipo 'guarantee'
4. Si el usuario no asiste, se puede cobrar la penalización mediante /api/stripe/charge-no-show

### 3. Flujo de Pago en Efectivo o Transferencia

1. Usuario selecciona método de pago correspondiente
2. No se procesa pago inmediato con Stripe
3. La reserva se crea con el tipo y método seleccionado
4. El pago se registrará manualmente posteriormente

## Gestión de Errores

### Principios Generales

1. **Validación temprana**: Validar datos antes de iniciar el proceso de pago
2. **Manejo explícito**: Cada tipo de error debe ser capturado y manejado específicamente
3. **Feedback al usuario**: Comunicar claramente los errores

### Códigos de Error Comunes

| Código | Significado | Acción Recomendada |
|--------|-------------|-------------------|
| CARD_DECLINED | Tarjeta rechazada | Sugerir otra tarjeta |
| AUTHENTICATION_REQUIRED | Requiere autenticación | Redireccionar a 3DS |
| STRIPE_DATA_NOT_FOUND | Datos de Stripe no encontrados | Verificar configuración |

### Ejemplo de Manejo de Errores

```typescript
try {
  const result = await paymentService.processFullPayment({...});
  // Manejar éxito
} catch (error) {
  // Log detallado para debugging
  console.error('[SummaryPreview] Error al procesar pago:', error);
  
  // Mensaje amigable para el usuario
  toast.error(`Error al procesar el pago: ${error.message || 'Error desconocido'}`);
  
  // No avanzar al siguiente paso
}
```

## Mejores Prácticas

### Desarrollo

1. **Tipado estricto**: Utilizar TypeScript con tipos explícitos para todos los objetos de pago
2. **Logs detallados**: Incluir información contextual en los logs para facilitar debugging
3. **Estado idempotente**: Diseñar para evitar procesamiento duplicado de pagos

```typescript
// Ejemplo de log detallado
console.log(`🔄 [${requestId}] Iniciando proceso de cobro:`, {
  bookingId: params.bookingId,
  amount: params.amount,
  paymentType: params.paymentType,
  timestamp: new Date().toISOString()
});
```

### Seguridad

1. **Validación en capas**: Validar datos tanto en cliente como en servidor
2. **Tokens seguros**: Nunca almacenar tokens de tarjetas, utilizar referencias de Stripe
3. **HTTPS**: Asegurar todas las comunicaciones con APIs de pago

### Experiencia de Usuario

1. **Indicadores de progreso**: Mostrar estados de carga claros durante procesamiento
2. **Mensajes descriptivos**: Errores y confirmaciones específicos y útiles
3. **Reversibilidad**: Permitir al usuario cancelar o corregir antes de confirmar

## Extensión del Sistema

Para añadir un nuevo tipo de pago:

1. Actualizar la enumeración `PaymentTypeEnum`
2. Añadir entrada en `PAYMENT_TYPE_MAPPING`
3. Crear configuración en `PAYMENT_TYPE_MAPPINGS`
4. Implementar lógica específica en `paymentService.ts`
5. Actualizar la interfaz en componentes relevantes

## Pruebas Recomendadas

### Pruebas Unitarias

1. Mapeo correcto de tipos de pago
2. Validación de datos de entrada
3. Transformación de respuestas de API

### Pruebas de Integración

1. Flujo completo de pagos para cada tipo
2. Escenarios de error (tarjeta rechazada, conexión fallida)
3. Concurrencia y estrés

### Pruebas E2E

1. Proceso completo de reserva con distintos tipos de pago
2. Cancelación de reservas con reembolso/cargo
3. Verifiación de datos en base de datos

## Consideraciones para Futuras Mejoras

1. **Sistema de reembolsos**: Implementar lógica para procesamiento de reembolsos
2. **Pagos recurrentes**: Soporte para membresías o planes de pago
3. **Métodos adicionales**: Integración con otros proveedores de pago (PayPal, Apple Pay)
4. **Webhooks**: Implementar webhooks de Stripe para actualizaciones asíncronas
5. **Analytics**: Métricas detalladas de conversión y abandono en proceso de pago

## Recursos Útiles

- [Documentación de Stripe](https://stripe.com/docs)
- [Best Practices para Checkout](https://stripe.com/docs/payments/checkout/best-practices)
- [Manejo de Disputas](https://stripe.com/docs/disputes)

---

Esta guía debe actualizarse cuando se realicen cambios significativos en el sistema de pagos para mantener su relevancia y precisión. 