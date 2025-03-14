# Análisis del Flujo de "Pago Completo" y Plan de Implementación en Vista Desktop

## Análisis Detallado del Flujo en Vista Mobile

### 1. Componentes y Estructura
El flujo de pago completo en la vista mobile está estructurado principalmente en el componente `MobilePaymentContainer.tsx`, que maneja:
- Selección del tipo de pago (full, deposit, guarantee)
- Selección del método de pago (tarjetas guardadas)
- Procesamiento del pago a través de Stripe
- Actualización del contexto global de la aplicación

### 2. Flujo de "Pago Completo" en Mobile

#### 2.1 Inicialización
- El usuario selecciona el tipo de pago "full" (pago completo)
- El componente actualiza el estado local `localSelectedType`
- Se muestra la interfaz para seleccionar un método de pago (tarjeta)

#### 2.2 Selección de Método de Pago
- El usuario selecciona una tarjeta guardada
- El componente actualiza el estado local `localSelectedMethod`
- Se validan los datos seleccionados para habilitar el botón de continuar

#### 2.3 Procesamiento del Pago
Cuando el usuario hace clic en "Continuar", se ejecuta la función `handleNext` que:

1. Valida que el tipo de pago seleccionado sea "full" y exista un método de pago
2. Muestra un indicador de carga (toast)
3. Verifica y obtiene información crítica:
   - `stripeCustomerId`: ID del cliente en Stripe
   - `stripeAccountId`: ID de la cuenta de Stripe
4. Importa dinámicamente el servicio `fullPaymentService`
5. Procesa el pago a través del método `processPayment` con los parámetros:
   - `paymentMethodId`: ID del método de pago seleccionado
   - `amount`: Monto total a pagar
   - `empresaId`: ID de la empresa
   - `description`: Descripción del pago
   - `stripeCustomerId`: ID del cliente en Stripe
   - `stripeAccountId`: ID de la cuenta de Stripe
6. Maneja la respuesta del servicio:
   - Si es exitosa, actualiza el estado global con el `paymentIntentId`
   - Si hay error, muestra un mensaje y detiene el flujo

#### 2.4 Actualización del Estado Global
Tras un pago exitoso:

1. Actualiza el estado local y elimina datos previos:
   ```javascript
   onRemovePaymentType();
   onRemovePaymentMethod();
   onSelectPaymentMethod(localSelectedMethod);
   ```

2. Actualiza el contexto global con la información del pago:
   ```javascript
   setPayment({
     method: 'card',
     type: 'full',
     processed: true,
     paymentIntentId: result.paymentIntentId,
     status: 'completed',
     selectedPaymentMethod: localSelectedMethod
   });
   ```

3. Guarda el `paymentIntentId` en localStorage como respaldo:
   ```javascript
   localStorage.setItem('lastPaymentIntentId', result.paymentIntentId);
   localStorage.setItem('lastPaymentTimestamp', new Date().toISOString());
   ```

4. Avanza al siguiente paso con los datos del pago:
   ```javascript
   onNext({
     paymentType: localSelectedType,
     paymentMethod: localSelectedMethod,
     paymentIntentId: result.paymentIntentId,
     processed: true
   });
   ```

### 3. Servicio de Pago (FullPaymentClientService)

El servicio `FullPaymentClientService` en `full-payment-client.service.ts` es responsable de:

1. Validar los parámetros recibidos:
   - `paymentMethodId` (obligatorio)
   - `amount` (obligatorio, > 0)
   - `stripeCustomerId` (obligatorio)
   - `stripeAccountId` (obligatorio, debe comenzar con "acct_")

2. Realizar la llamada a la API de Stripe:
   ```javascript
   const response = await fetch('/api/stripe/process-full-payment', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       amount: params.amount,
       stripePaymentMethodId: params.paymentMethodId,
       stripeAccountId: stripeData.accountId,
       stripeCustomerId: stripeData.customerId,
       empresaId: params.empresaId,
       description: params.description || 'Pago completo de reserva',
       paymentType: 'booking',
       off_session: false // El cliente está presente (on-session)
     })
   });
   ```

3. Procesar la respuesta:
   - Verificar que `response.ok` sea `true`
   - Verificar que `result.success` sea `true`
   - Extraer `paymentIntentId` y `chargeStatus` del resultado

4. Manejar errores con información detallada para facilitar depuración

### 4. Optimización de Datos en el Flujo Mobile

El flujo de pago en mobile está diseñado para maximizar la eficiencia mediante la reutilización de datos disponibles:

#### 4.1 Obtención y Reutilización de Datos Críticos
- **Datos de Stripe (customerId y accountId):**
  - Se obtienen una sola vez a través de hooks especializados: 
    - `useStoredCards()`: Proporciona `customerInfo` que contiene `customerId`
    - `useStripe()`: Proporciona `stripeAccountId`
  - Se almacenan en estados locales para evitar múltiples consultas:
    ```javascript
    const [stripeData, setStripeData] = useState({
      customerId: null,
      loaded: false
    });
    ```
  - Se implementa un sistema de múltiples fuentes con fallbacks:
    ```javascript
    const effectiveCustomerId = 
      stripeData.customerId || 
      customerInfo?.customerId || 
      customerInfo?.stripeCustomerId;
    ```

#### 4.2 Capa de Abstracción con FullPaymentClientService
- Recibe todos los datos necesarios desde el componente, evitando hacer consultas adicionales
- Valida los datos críticos antes de realizar llamadas a la API:
  ```javascript
  if (!params.stripeCustomerId) {
    return {
      success: false,
      message: 'Se requiere el ID de cliente de Stripe para procesar pagos'
    };
  }
  ```
- Estructura los datos para la API de manera optimizada, enviando solo lo necesario

#### 4.3 API Optimizada (process-full-payment/route.ts)
- Utiliza el esquema Zod para validación estricta de datos:
  ```javascript
  const fullPaymentSchema = z.object({
    amount: z.number().positive(),
    stripePaymentMethodId: z.string(),
    stripeAccountId: z.string(),
    stripeCustomerId: z.string(),
    // Campos opcionales con valores predeterminados
    empresaId: z.string().optional(),
    description: z.string().optional(),
    paymentType: z.string().optional().default('booking'),
    off_session: z.boolean().optional().default(true)
  });
  ```
- Crea el Stripe PaymentIntent directamente con confirm=true (procesamiento en un solo paso)
- Evita consultas adicionales a bases de datos y servicios externos
- Usa el modo `off_session: false` cuando el cliente está presente, optimizando la interacción con Stripe

#### 4.4 Notificaciones y Seguimiento del Estado
- Implementa un sistema de logs detallados con identificadores de solicitud únicos (`requestId`)
- Guarda información crítica (como `paymentIntentId`) en localStorage como respaldo:
  ```javascript
  localStorage.setItem('lastPaymentIntentId', result.paymentIntentId);
  localStorage.setItem('lastPaymentTimestamp', new Date().toISOString());
  ```
- Actualiza el estado global inmediatamente después del procesamiento exitoso para asegurar consistencia

## Análisis del Flujo Actual en Vista Desktop

### 1. Componentes y Estructura
La vista desktop utiliza el componente `SummaryPreview.tsx` que:
- Renderiza el layout específico para desktop con `DesktopSummaryLayout`
- Implementa funciones para selección de método y tipo de pago
- Contiene lógica para validación y avance entre pasos

### 2. Flujo Actual en Desktop

#### 2.1 Selección de Tipo de Pago
- Se presenta un selector de tipo de pago con `PaymentTypeSection`
- Al seleccionar, se actualiza el estado `selectedPaymentType`
- Se llama a `handleSelectPaymentType` para actualizar el estado

#### 2.2 Selección de Método de Pago
- Se presenta un selector de método de pago con `PaymentSection`
- Al seleccionar, se actualiza el estado `selectedPaymentMethod`
- Se llama a `handleSelectPaymentMethod` para actualizar el estado

#### 2.3 Validación y Avance
- La función `validateStep` verifica que existan tipo y método de pago seleccionados
- El botón "Completar Reserva" se habilita cuando la validación es exitosa
- Al hacer clic, se llama a `handleReservar` que avanza al siguiente paso

#### 2.4 Procesamiento de Pago (Incompleto)
La vista desktop puede recibir datos de pago procesados desde mobile, pero **no implementa** la lógica para procesar pagos directamente:

```javascript
// Verificar si el pago ya fue procesado por MobilePaymentContainer
if (paymentData?.paymentIntentId && paymentData?.processed) {
  console.log('[SummaryPreview] Pago ya procesado en MobilePaymentContainer:', {
    paymentIntentId: paymentData.paymentIntentId,
    status: paymentData.status
  });
  
  // Actualizar estado con el PaymentIntent recibido
  setPaymentIntent(paymentData.paymentIntentId);
  
  // Actualizar el estado global del pago - CRUCIAL para la validación
  const paymentStateData: PaymentState = {
    method: 'card' as PaymentMethodEnum,
    type: 'full' as unknown as PaymentTypeEnum,
    processed: true,
    paymentIntentId: paymentData.paymentIntentId,
    status: 'completed',
    selectedPaymentMethod: selectedPaymentMethod
  };
  setPayment(paymentStateData);
  
  // Avanzar al siguiente paso
  onNext();
  return;
}
```

Existe un código parcial para procesar pagos completos, pero no parece ser utilizado:

```javascript
// 3. Si tenemos shouldChargeFullAmount, procesar el pago aquí
if (paymentData?.shouldChargeFullAmount === true) {
  console.log('[SummaryPreview] Procesando pago completo localmente');
  
  // Mostrar indicador de carga
  toast.loading('Procesando pago...', { id: 'payment-processing' });
  
  try {
    // Importar dinámicamente el servicio de pago
    const { fullPaymentService } = await import('@/services/full-payment-client.service');
    
    // Procesar el pago
    const result = await fullPaymentService.processPayment({
      paymentMethodId: paymentData.stripePaymentMethodId,
      amount: paymentData.amount,
      empresaId: empresaId || '',
      description: 'Pago completo de reserva'
    });
    
    // Código para manejar la respuesta...
  } catch (error) {
    // Manejo de errores...
  }
}
```

### 3. Diferencias Clave entre Mobile y Desktop

1. **Procesamiento de Pago**:
   - Mobile: Implementación completa del flujo de procesamiento de pago
   - Desktop: Sin implementación completa, solo puede recibir datos procesados

2. **Interacción con Stripe**:
   - Mobile: Llama directamente al servicio `fullPaymentService`
   - Desktop: No realiza llamadas directas a Stripe para "full payment"

3. **Actualización del Estado Global**:
   - Mobile: Actualiza el estado global con todos los detalles del pago, incluyendo `paymentIntentId`
   - Desktop: Solo actualiza el estado global con tipo y método de pago, sin procesar el pago completo

4. **Layout y Componentes**:
   - Mobile: Usa `MobilePaymentContainer` y componentes específicos para mobile
   - Desktop: Usa `DesktopSummaryLayout` con componentes adaptados

5. **Optimización de Datos**:
   - Mobile: Implementa una estrategia para obtener y reutilizar datos de Stripe de manera eficiente
   - Desktop: No implementa la estrategia completa de optimización de datos para pagos

## Plan Detallado para Implementar el Flujo en Desktop

### 1. Enfoque y Consideraciones

Basado en el análisis, el enfoque más eficiente es mejorar el componente `SummaryPreview.tsx` para que pueda manejar el procesamiento de pagos completos en la vista desktop, sin necesidad de crear un nuevo archivo.

El código existente en `SummaryPreview.tsx` ya tiene una estructura parcial para manejar pagos, pero necesita actualizaciones para implementar completamente el flujo y la optimización de datos que existe en mobile.

### 2. Plan de Implementación Paso a Paso

#### Paso 1: Implementar Estrategia de Optimización de Datos

Agregar al componente `SummaryPreview.tsx` los hooks y estados necesarios para la optimización de datos:

```typescript
// 1. Importar hooks necesarios para acceder a los datos de Stripe
import { useStoredCards } from '@/hooks/use-stored-cards';
import { useStripe } from '@/hooks/use-stripe';

// 2. Estado para datos de Stripe (customerId) con sistema de caché
const [stripeData, setStripeData] = useState<{
  customerId?: string | null;
  loaded: boolean;
}>({ 
  customerId: null,
  loaded: false 
});

// 3. Obtener datos de tarjetas guardadas que incluyen el customerId
const { cards, isLoading: cardsLoading, customerInfo } = useStoredCards();

// 4. Obtener el stripeAccountId directamente del contexto de Stripe
const stripeContext = useStripe();
const stripeAccountId = stripeContext?.stripeAccountId;

// 5. Efecto para sincronizar el customerId con sistema de fuentes múltiples
useEffect(() => {
  console.log('[SummaryPreview] Estado de customerInfo:', customerInfo);
  
  if (customerInfo?.customerId && !stripeData.loaded) {
    console.log('[SummaryPreview] Usando customerId desde useStoredCards:', customerInfo.customerId);
    setStripeData({
      customerId: customerInfo.customerId,
      loaded: true
    });
  } else if (customerInfo?.stripeCustomerId && !stripeData.loaded) {
    // Usar stripeCustomerId como fallback
    console.log('[SummaryPreview] Usando stripeCustomerId como fallback:', customerInfo.stripeCustomerId);
    setStripeData({
      customerId: customerInfo.stripeCustomerId,
      loaded: true
    });
  }
}, [customerInfo, stripeData.loaded]);
```

#### Paso 2: Mejorar la función `handleReservar` en `SummaryPreview.tsx`

Actualizar la función para procesar el pago cuando el tipo seleccionado es "full", implementando la estrategia de optimización de datos:

```typescript
const handleReservar = async () => {
  if (!isValid) {
    console.warn('Formulario inválido, no se puede proceder');
    return;
  }

  if (!selectedPaymentMethod || !selectedPaymentType) {
    toast.error('Por favor, completa la configuración de pago');
    return;
  }

  // Si el tipo de pago es "full", procesar el pago antes de avanzar
  if (selectedPaymentType === 'full' && selectedPaymentMethod) {
    console.log('[SummaryPreview] Iniciando procesamiento de pago completo');
    
    try {
      // 1. Mostrar indicador de carga
      toast.loading('Procesando pago...', { id: 'payment-processing' });
      
      // 2. Implementar sistema de fuentes múltiples para stripeCustomerId (OPTIMIZACIÓN)
      // Buscar el customerId en todas las fuentes posibles para evitar consultas adicionales
      const effectiveCustomerId = 
        stripeData?.customerId || 
        customerInfo?.customerId || 
        customerInfo?.stripeCustomerId;
      
      // Log detallado para seguimiento del flujo de datos
      console.log('[SummaryPreview] Datos de customerId recolectados:', {
        fromState: stripeData?.customerId,
        fromHook: customerInfo?.customerId,
        fromHookAlt: customerInfo?.stripeCustomerId,
        effective: effectiveCustomerId
      });
      
      if (!effectiveCustomerId) {
        console.error('[SummaryPreview] No se encontró customer_id en ninguna de las fuentes disponibles');
        throw new Error('No se encontró información del cliente de Stripe necesaria para procesar el pago');
      }
      
      // 3. Importar el servicio de pago dinámicamente (OPTIMIZACIÓN)
      // Solo se carga cuando es necesario para mejorar rendimiento inicial
      const { fullPaymentService } = await import('@/services/full-payment-client.service');
      
      // 4. Procesar el pago con datos recolectados
      setIsProcessing(true);
      
      console.log('Procesando pago on-session con tarjeta guardada:', {
        cardId: selectedPaymentMethod.id,
        last4: selectedPaymentMethod.last4,
        brand: selectedPaymentMethod.brand,
        amount: calculations.total,
        stripeCustomerId: effectiveCustomerId,
        stripeAccountId: stripeAccountId
      });
      
      // 5. Llamada al servicio con todos los datos necesarios en un solo paso
      const result = await fullPaymentService.processPayment({
        paymentMethodId: selectedPaymentMethod.id,
        amount: calculations.total,
        empresaId: empresaId || '',
        description: 'Pago completo de reserva',
        stripeCustomerId: effectiveCustomerId,
        stripeAccountId: stripeAccountId as string
      });
      
      // 6. Limpiar indicador de carga
      toast.dismiss('payment-processing');
      
      // 7. Manejar el resultado
      if (!result.success) {
        console.error('[SummaryPreview] Error al procesar pago:', result.error);
        toast.error(result.message || 'Error al procesar el pago');
        setIsProcessing(false);
        return; // No avanzar si hay error
      }
      
      console.log('[SummaryPreview] Pago procesado exitosamente:', {
        paymentIntentId: result.paymentIntentId,
        status: result.chargeStatus
      });
      
      // 8. Notificar éxito
      toast.success('Pago procesado correctamente');
      
      // 9. Guardar el paymentIntentId en localStorage como respaldo (OPTIMIZACIÓN)
      // Esto permite recuperar el pago en caso de errores o recargas
      if (result.paymentIntentId) {
        try {
          localStorage.setItem('lastPaymentIntentId', result.paymentIntentId);
          localStorage.setItem('lastPaymentTimestamp', new Date().toISOString());
          console.log('[SummaryPreview] PaymentIntentId guardado en localStorage como respaldo');
        } catch (storageError) {
          console.warn('[SummaryPreview] No se pudo guardar en localStorage:', storageError);
        }
      }
      
      // 10. Actualizar el estado global con el paymentIntentId (OPTIMIZACIÓN)
      // Actualización inmediata para asegurar consistencia en todo el flujo
      setPayment({
        method: 'card',
        type: 'full' as unknown as PaymentTypeEnum,
        processed: true,
        paymentIntentId: result.paymentIntentId,
        status: 'completed',
        selectedPaymentMethod: selectedPaymentMethod
      });
      
      setIsProcessing(false);
      
      // 11. Avanzar al siguiente paso
      console.log('[SummaryPreview] Avanzando al siguiente paso con pago procesado:', {
        paymentIntentId: result.paymentIntentId
      });
      
      onNext();
      return;
    } catch (error: any) {
      // Manejar errores
      toast.dismiss('payment-processing');
      console.error('[SummaryPreview] Error procesando pago:', error);
      
      toast.error(`Error al procesar el pago: ${error.message || 'Error desconocido'}`);
      setIsProcessing(false);
      return;
    }
  }

  console.log('Formulario válido, procediendo a farewell');
  await onNext();
};
```

#### Paso 3: Agregar Estados Necesarios

Agregar al componente `SummaryPreview.tsx` el estado para gestionar el proceso de pago:

```typescript
// Estado para el proceso de pago
const [isProcessing, setIsProcessing] = useState(false);
```

#### Paso 4: Actualizar las Dependencias en useCallback

Asegurarse de que la función `handleReservar` tenga todas las dependencias necesarias:

```typescript
}, [
  isValid, 
  selectedPaymentMethod, 
  selectedPaymentType, 
  onNext, 
  calculations, 
  empresaId,
  setPayment,
  stripeData,
  customerInfo,
  stripeAccountId,
  setIsProcessing,
  toast
]);
```

#### Paso 5: Agregar Indicador de Procesamiento al Botón

Actualizar el botón "Completar Reserva" para mostrar un indicador de carga cuando `isProcessing` es true:

```jsx
<Button 
  onClick={handleReservar}
  disabled={!isValid || isProcessing}
  className="w-full py-3 mt-4 text-sm"
>
  {isProcessing ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...
    </>
  ) : (
    "Completar Reserva"
  )}
</Button>
```

#### Paso 6: Importar Componentes y Hooks Necesarios

Asegurarse de que se importen todos los componentes y hooks necesarios:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useStoredCards } from '@/hooks/use-stored-cards';
import { useStripe } from '@/hooks/use-stripe';
```

### 3. Pruebas y Validación

Después de implementar los cambios, se deben realizar las siguientes pruebas:

1. **Prueba de Eficiencia de Datos**:
   - Verificar mediante logs que el flujo está utilizando los datos de Stripe ya disponibles
   - Comprobar que no se realizan consultas redundantes al servidor o a Stripe
   - Validar que el sistema de múltiples fuentes para `stripeCustomerId` funciona correctamente

2. **Prueba de Flujo Completo**:
   - Seleccionar tipo de pago "full"
   - Seleccionar una tarjeta guardada
   - Hacer clic en "Completar Reserva"
   - Verificar que el pago se procese correctamente
   - Verificar que se reciba un `paymentIntentId` válido
   - Verificar que se avance al siguiente paso

3. **Prueba de Manejo de Errores**:
   - Validar que se muestren mensajes de error apropiados
   - Verificar que el botón se desactive durante el procesamiento
   - Comprobar que el estado global se actualice correctamente

4. **Prueba de Consistencia**:
   - Verificar que los datos del pago se actualicen correctamente en el estado global
   - Asegurarse de que el `paymentIntentId` se guarde en localStorage

### 4. Consideraciones Adicionales

1. **Seguridad**: Asegurarse de que información sensible como IDs de Stripe no se exponga en logs de producción
2. **Rendimiento**: Utilizar importaciones dinámicas para el servicio de pago para mejorar el tiempo de carga inicial
3. **Experiencia de Usuario**: Mostrar indicadores de carga y mensajes claros durante todo el proceso
4. **Coherencia**: Mantener una experiencia coherente entre las vistas mobile y desktop
5. **Optimización de Datos**: Implementar todas las estrategias de optimización de datos que se utilizan en mobile

## Conclusiones

La implementación propuesta permite replicar el flujo de "Pago completo" de la vista mobile en la vista desktop sin necesidad de crear nuevos archivos, aprovechando la estructura existente en `SummaryPreview.tsx`. Los cambios se enfocan en:

1. Agregar la lógica de procesamiento de pago que existe en mobile
2. Implementar la estrategia de optimización de datos para evitar consultas redundantes
3. Sincronizar los datos necesarios para realizar el pago (customerId, accountId)
4. Actualizar correctamente el estado global con la información del pago procesado
5. Proporcionar una experiencia de usuario coherente y clara

Esta implementación mantiene la integridad de los datos, sigue el mismo patrón que la vista mobile para garantizar consistencia y facilidad de mantenimiento, y aprovecha la optimización de datos para un flujo más eficiente. 