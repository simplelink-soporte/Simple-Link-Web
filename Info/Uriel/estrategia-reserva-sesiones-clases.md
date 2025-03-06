# Estrategia para la Implementación de Reservas de Sesiones de Clases

## 1. Resumen Ejecutivo

Este documento presenta una estrategia detallada para implementar la funcionalidad de reserva de sesiones de clases, aprovechando la infraestructura existente de reservas de pistas. Se detalla cómo integrar ambos sistemas de manera eficiente, reutilizando componentes y procesos ya establecidos, para minimizar la duplicación de código y mantener la coherencia del sistema.

## 2. Análisis de la Situación Actual

### 2.1 Estructura de datos existente
La tabla `bookings` ha sido modificada para incluir:
- `reservation_type`: Tipo de reserva ('booking' o 'class')
- `class_id`: Referencia opcional a una clase

### 2.2 Componentes y flujos existentes
El sistema actualmente cuenta con:
- Un flujo completo para reservas regulares
- Un sistema de clases con su propio contexto (`ClassRegistrationContext`)
- Componentes UI para selección de clases y sesiones
- Servicios para gestionar clases (`ClassService`)

## 3. Objetivos de la Implementación

1. Implementar un flujo de reserva de sesiones de clases que sea consistente con el flujo existente
2. Reutilizar la mayor cantidad posible de código y lógica existente
3. Mantener separadas las responsabilidades entre los diferentes módulos
4. Registrar correctamente la información relacionada a la clase en la reserva

## 4. Plan de Implementación

### 4.1 Modificaciones a la Base de Datos

#### 4.1.1 Añadir columnas para precio de sesión de clase [✅ COMPLETADO]
```sql
-- Añadir columna para precio de sesión de clase a la tabla bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS class_session_price NUMERIC(10,2) DEFAULT 0;

-- Añadir columna para precio de sesión de clase a la tabla payments
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS class_session_price NUMERIC(10,2) DEFAULT 0;

-- Actualizar comentarios para documentar los nuevos campos
COMMENT ON COLUMN public.bookings.class_session_price IS 'Precio específico de la sesión de clase cuando reservation_type es "class"';
COMMENT ON COLUMN public.payments.class_session_price IS 'Precio específico de la sesión de clase cuando está relacionado con una reserva de tipo class';
```

### 4.2 Modificaciones al Servicio de Reservas

#### 4.2.1 Extender `bookingService.ts` [✅ COMPLETADO]
Se ha añadido funcionalidad para manejar reservas de tipo clase:

```typescript
// Actualización de la interfaz BookingCreationData con los nuevos campos
export interface BookingCreationData {
  // ... campos existentes
  reservationType?: ReservationTypeEnum; // 'booking' | 'class'
  classId?: string;
  classSessionPrice?: number;
}

// Modificación de la llamada RPC para incluir los nuevos parámetros
const bookingParams = {
  // ... parámetros existentes
  p_reservation_type: data.reservationType || 'booking',
  p_class_id: data.classId || null,
  p_class_session_price: data.classSessionPrice || 0
};
```

#### 4.2.2 Modificación al Procedimiento RPC de Creación de Reservas [✅ COMPLETADO]

Se ha actualizado el procedimiento `create_booking_v2` para manejar el tipo de reserva, el ID de clase y el precio de sesión:

```sql
-- Nueva definición de la función con soporte para reservas de clase
CREATE OR REPLACE FUNCTION public.create_booking_v2(
  -- Parámetros existentes
  p_reservation_type reservation_type_enum DEFAULT 'booking'::reservation_type_enum,
  p_class_id UUID DEFAULT NULL,
  p_class_session_price NUMERIC(10,2) DEFAULT 0
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_booking_id UUID;
  v_total_price NUMERIC(10,2);
BEGIN
  -- Calcular precio total (incluir precio de sesión de clase si aplica)
  IF p_reservation_type = 'class' THEN
    v_total_price := p_court_price + p_rental_items_price + p_class_session_price;
  ELSE
    v_total_price := p_court_price + p_rental_items_price;
  END IF;

  -- Insertar booking con los nuevos campos
  INSERT INTO public.bookings (
    -- campos existentes
    reservation_type, class_id, class_session_price
  ) VALUES (
    -- valores existentes
    p_reservation_type, p_class_id, 
    CASE WHEN p_reservation_type = 'class' THEN p_class_session_price ELSE 0 END
  );
  
  -- Insertar pago con el nuevo campo class_session_price
  INSERT INTO public.payments (
    -- campos existentes
    class_session_price
  ) VALUES (
    -- valores existentes
    CASE WHEN p_reservation_type = 'class' THEN p_class_session_price ELSE 0 END
  );
END;
$$;
```

### 4.3 Creación de un Servicio de Transformación de Datos de Clase [✅ COMPLETADO]

Para mantener una clara separación de responsabilidades y seguir el principio de responsabilidad única, se ha creado un nuevo servicio dedicado a la transformación de datos de sesiones de clase para el sistema de reservas:

```typescript
// src/services/classBookingTransformService.ts

/**
 * Servicio para transformar datos de sesiones de clase en datos de reserva
 */
export class ClassBookingTransformService {
  /**
   * Transforma los datos de una sesión de clase seleccionada en datos de reserva
   * compatibles con bookingService.createBooking()
   */
  static transformSessionToBookingData(
    classData: PublicClass, 
    session: ClassSession, 
    options: ClassBookingTransformOptions = {}
  ): BookingCreationData {
    /* Implementación completada */
  }
  
  /**
   * Calcula el precio total para una lista de sesiones seleccionadas
   */
  static calculateTotalPrice(sessions: ClassSession[]): number {
    /* Implementación completada */
  }
  
  /**
   * Genera un resumen de las sesiones seleccionadas
   */
  static generateSessionsSummary(classData: PublicClass, sessionIds: string[]): any {
    /* Implementación completada */
  }
  
  /**
   * Valida si los datos de clase y sesión son aptos para crear una reserva
   */
  static validateSessionsForBooking(classData: PublicClass, sessionIds: string[]): {isValid: boolean, errors: string[]} {
    /* Implementación completada */
  }
}
```

### 4.4 Integración con el Contexto de Registro de Clases [✅ COMPLETADO]

Se ha creado un hook para conectar el contexto de registro de clases con el sistema de reservas, utilizando el nuevo servicio de transformación:

```typescript
// src/hooks/useClassBooking.ts

/**
 * Hook para el proceso de reserva de sesiones de clase
 */
export function useClassBooking() {
  const { state, organization, user, updateState } = useClassRegistration();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Utilizamos el hook de creación de reservas existente
  const { createBooking } = useBookingCreation({
    // Opciones por defecto, que serán sobrescritas por los datos de clase
    rentals: [],
    rentalItemsPrice: 0,
    paymentMethod: 'cash',
    paymentType: 'class',
    /* ... otras opciones ... */
  });
  
  /**
   * Procesa la reserva de todas las sesiones seleccionadas
   */
  const submitClassBooking = async (options = {}) => {
    /* Implementación completada */
  };
  
  /**
   * Genera un resumen de las sesiones seleccionadas
   */
  const getSessionsSummary = () => {
    /* Implementación completada */
  };
  
  /**
   * Calcula el precio total de todas las sesiones seleccionadas
   */
  const calculateTotalPrice = () => {
    /* Implementación completada */
  };
  
  return {
    submitClassBooking,
    getSessionsSummary,
    calculateTotalPrice,
    isSubmitting,
    bookingStatus: state.bookingStatus,
    bookingError: state.bookingError,
    bookingIds: state.bookingIds,
    validateClassData
  };
}
```

### 4.5 Componente de Confirmación de Reserva de Clase [✅ COMPLETADO]

Se han creado los componentes necesarios para el flujo de confirmación y éxito de la reserva:

```typescript
// src/components/classes-registration/components/ClassBookingConfirmation.tsx
export function ClassBookingConfirmation() {
  /* Implementación completada */
}

// src/components/classes-registration/components/ClassBookingSuccess.tsx
export function ClassBookingSuccess() {
  /* Implementación completada */
}
```

## 5. Consideraciones para el Frontend

### 5.1 Adaptación del contexto de registro de clases

Extender el `ClassRegistrationContext` para incluir información de la reserva:

```typescript
// Añadir a RegistrationState
interface RegistrationState {
  // ... propiedades existentes
  bookingIds: string[]; // IDs de las reservas creadas
  bookingStatus: 'idle' | 'submitting' | 'success' | 'error';
  bookingError: string | null;
}

// Añadir acciones
type RegistrationAction = 
  // ... acciones existentes
  | { type: 'SET_BOOKING_IDS'; payload: string[] }
  | { type: 'SET_BOOKING_STATUS'; payload: 'idle' | 'submitting' | 'success' | 'error' }
  | { type: 'SET_BOOKING_ERROR'; payload: string | null };
```

### 5.2 Implementación de UI para el proceso

Crear/adaptar componentes para:
1. Selección de sesiones de clase
2. Resumen y confirmación
3. Pantalla de éxito/error
4. Integración con la navegación existente

### 5.3 Flujo de procesamiento de reserva [✅ COMPLETADO]

Se ha implementado un flujo mejorado para el proceso de reserva de sesiones de clase:

1. **Selección de método de pago**: El usuario selecciona un método de pago en el paso `PaymentStep`.

2. **Procesamiento de reserva en tiempo real**: Al hacer clic en "Confirmar pago", se procesan las reservas inmediatamente:
   - Se utiliza el hook `useClassBooking` para transformar y crear las reservas
   - Se muestra un indicador de carga durante el procesamiento
   - Se maneja adecuadamente los errores y se muestran notificaciones

3. **Avance condicionado**: Solo se avanza al paso de confirmación si la reserva se ha creado exitosamente.

4. **Confirmación con validación**: El paso `ConfirmationStep` verifica que existan reservas creadas antes de mostrar la confirmación.

Este enfoque proporciona varias ventajas:

- **Flujo lógico**: El usuario confirma primero su método de pago, luego se procesa la reserva y finalmente se muestra la confirmación.
- **Mayor fiabilidad**: Se evita mostrar una confirmación para reservas que no se han creado realmente.
- **Mejor experiencia de usuario**: El usuario recibe retroalimentación en tiempo real sobre el estado de su reserva.
- **Trazabilidad**: Se muestra el ID de la reserva creada en la pantalla de confirmación.

```typescript
// Fragmento de código en PaymentStep que implementa esta lógica
const handleNext = async () => {
  if (isProcessing) return
  
  setIsProcessing(true)
  
  try {
    // Procesar la creación de reservas con el método de pago seleccionado
    const result = await submitClassBooking({
      paymentMethod: state.selectedPayment
    })
    
    if (result.error) {
      toast({ /* Mostrar error */ })
      return
    }
    
    // Solo avanzar al paso de confirmación si la reserva fue exitosa
    goToStep('confirmation')
  } catch (error) {
    toast({ /* Mostrar error */ })
  } finally {
    setIsProcessing(false)
  }
}
```

### 5.4 Solución al Error "useForm must be used within a FormProvider" [✅ COMPLETADO]

Para resolver el error de dependencia del `FormProvider`, se ha implementado una arquitectura más desacoplada y robusta:

#### 5.4.1 Creación de un Servicio Independiente 

Se ha desarrollado un nuevo servicio `ClassBookingService` que maneja la creación de reservas de clase sin depender de hooks de formulario:

```typescript
// src/services/classBookingService.ts
export class ClassBookingService {
  private supabase = createSupabaseClient();

  /**
   * Crea una reserva de clase a partir de los datos de clase y sesión
   */
  async createClassBooking(
    classData: PublicClass,
    session: ClassSession,
    options: BookingOptions
  ): Promise<BookingResult> {
    // Implementación que llama directamente al RPC sin dependencia de hooks
  }

  /**
   * Crea múltiples reservas de clase para sesiones seleccionadas
   */
  async createMultipleClassBookings(
    classData: PublicClass,
    sessionIds: string[],
    options: BookingOptions
  ): Promise<{
    success: boolean;
    bookingIds: string[];
    errors: string[];
  }> {
    // Implementación que maneja múltiples reservas atómicamente
  }
}
```

#### 5.4.2 Refactorización del Hook `useClassBooking`

El hook `useClassBooking` ha sido refactorizado para utilizar el nuevo servicio en lugar de depender de hooks de formulario:

```typescript
export function useClassBooking() {
  const { state, organization, user, updateState } = useClassRegistration();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const submitClassBooking = async (options = {}) => {
    // Usa classBookingService en lugar de useBookingCreation
    const result = await classBookingService.createMultipleClassBookings(
      state.selectedClass,
      state.selectedSessions,
      {
        userId: user.id,
        empresaId: organization.id,
        // Otras opciones...
      }
    );
    
    // Manejo de resultado y estado...
  };
  
  // Otros métodos...
}
```

#### 5.4.3 Actualización del Contexto

Se ha actualizado `ClassRegistrationContext` para manejar adecuadamente la selección del método de pago:

```typescript
// Añadido a RegistrationState
selectedPayment: PaymentMethod | null

// Añadido a RegistrationAction
| { type: 'SELECT_PAYMENT'; payload: PaymentMethod | null }

// Implementado en el reducer
case 'SELECT_PAYMENT':
  return { ...state, selectedPayment: action.payload }

// Añadido a ClassRegistrationContextType
selectPayment: (method: PaymentMethod | null) => void
```

#### 5.4.4 Beneficios de esta Solución

1. **Desacoplamiento**: El servicio no depende de hooks de React, eliminando errores como "useForm must be used within a FormProvider"
2. **Testabilidad**: Al separar la lógica de negocio de los hooks de React, es más fácil probar el servicio
3. **Mantenibilidad**: Cada componente tiene una responsabilidad única y clara
4. **Reutilización**: El servicio puede ser utilizado en diferentes partes de la aplicación
5. **Rendimiento**: Reducción de re-renderizados innecesarios al separar la lógica de estado

Con esta arquitectura, el proceso de creación de reservas de clase es más robusto y menos propenso a errores relacionados con el ciclo de vida de los componentes o la jerarquía de contextos.

## 6. Pruebas y Validación

### 6.1 Casos de prueba esenciales
1. Reserva exitosa de una sesión de clase
2. Reserva de múltiples sesiones en una sola transacción
3. Cancelación de reserva de sesión de clase
4. Visualización correcta de reservas de clase en el panel de administración

### 6.2 Manejo de errores y escenarios de borde
1. Intentar reservar una sesión pasada
2. Intentar reservar una sesión cancelada/inactiva
3. Reservar con usuario sin autenticación
4. Problemas de conectividad durante la reserva

## 7. Seguridad y Permisos

Asegurar que las políticas RLS existentes en Supabase se extiendan para manejar las reservas de tipo clase, verificando que los usuarios solo puedan:
1. Ver sus propias reservas de clase
2. Crear reservas solo para clases públicas o a las que tienen acceso
3. Cancelar sus propias reservas de clase

## 8. Consideraciones Futuras

### 8.1 Integración con pagos
1. Adaptar la funcionalidad existente de pagos para reservas de clase
2. Manejar pagos por paquetes de múltiples sesiones
3. Considerar descuentos para reservas de múltiples sesiones

### 8.2 Notificaciones
Implementar notificaciones para:
1. Confirmación de reserva de clase
2. Recordatorio antes de la sesión
3. Cancelaciones o cambios en la programación

### 8.3 Validación de capacidad
Implementar posteriormente el sistema de validación de capacidad según el plan específico a desarrollar en el futuro.

## 9. Resumen

Esta estrategia aprovecha al máximo la infraestructura existente para implementar un sistema de reserva de sesiones de clase que sea coherente con el flujo de reservas normal, minimizando la duplicación de código y asegurando la integridad de los datos. El nuevo servicio de transformación proporciona una clara separación de responsabilidades, facilitando el mantenimiento y la extensión del sistema en el futuro. 