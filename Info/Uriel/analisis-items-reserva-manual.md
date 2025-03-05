# Análisis del Flujo de Items en Reservas Manuales

## 1. Estructura de Datos

### 1.1 Tipos de Datos Base
```typescript
// Tipo base para un item rentado
interface RentalSelection {
  itemId: string;
  quantity: number;
  duration: number;
  price: number;
  pricePerUnit: number;
  totalPrice: number;
}

// Formato para la base de datos
interface RentalItemDB {
  item_id: string;
  quantity: number;
  price_per_unit: number;
  total_price: number;
}
```

### 1.2 Estados y Contextos
- `RentalContext`: Mantiene el estado global de los items seleccionados
- `FormContext`: Almacena el estado del formulario completo
- `BookingCreationData`: Estructura final para la creación de la reserva

## 2. Flujo de Datos

### 2.1 Selección Inicial (RentalStep)
```typescript
// Cuando el usuario selecciona un item
1. Usuario selecciona cantidad
2. Se calcula precio basado en duración
3. Se actualiza el RentalContext
```

### 2.2 Transformación de Datos
Basado en los logs, el proceso es:

1. **Selección Inicial**:
```json
{
  "itemId": "19380ce9-78cc-473c-a9e0-b6c422415158",
  "quantity": 2,
  "duration": 90,
  "price": 32,
  "pricePerUnit": 16,
  "totalPrice": 32
}
```

2. **Validación**:
```json
{
  "itemId": "19380ce9-78cc-473c-a9e0-b6c422415158",
  "quantity": 2,
  "pricePerUnit": 16,
  "calculatedTotal": 32,
  "duration": 90,
  "totalPrice": 32
}
```

3. **Formato Final para DB**:
```json
{
  "item_id": "19380ce9-78cc-473c-a9e0-b6c422415158",
  "quantity": 2,
  "price_per_unit": 16,
  "total_price": 32
}
```

## 3. Proceso de Validación

### 3.1 Verificación de Stock
```typescript
1. Obtener stock base del item
2. Verificar reservas existentes
3. Calcular stock disponible
4. Validar cantidad solicitada
```

### 3.2 Validación de Precios
1. Validación de precio unitario
2. Cálculo de precio total
3. Verificación de consistencia

## 4. Propagación de Datos

### 4.1 Cadena de Componentes
```
RentalStep 
→ SimpleShiftBooking 
→ SimpleShiftBookingModal 
→ BookingService 
→ RPC
```

### 4.2 Transformaciones en cada Nivel
1. **RentalStep**: 
   - Maneja la UI y selección inicial
   - Actualiza el RentalContext

2. **SimpleShiftBooking**:
   - Coordina entre pasos
   - Mantiene estado local de selecciones

3. **SimpleShiftBookingModal**:
   - Prepara datos para creación
   - Maneja validaciones finales

4. **BookingService**:
   - Transforma al formato DB
   - Realiza validaciones de negocio

## 5. Verificaciones de Stock

### 5.1 Proceso de Verificación
```typescript
// Ejemplo basado en los logs
1. Obtener stock base
2. Verificar disponibilidad
3. Calcular stock reservado
4. Determinar stock final disponible
```

### 5.2 Ejemplo de Verificación
```json
{
  "itemId": "19380ce9-78cc-473c-a9e0-b6c422415158",
  "baseStock": 50,
  "availableStock": 48,
  "reservedUnits": 2
}
```

## 6. Creación Final de la Reserva

### 6.1 Estructura Final
```json
{
  "courtId": "1ff82367-757c-4812-96b7-daee3238d6cd",
  "date": "2025-02-16",
  "startTime": "08:00",
  "endTime": "09:30",
  "rentalItems": [
    {
      "itemId": "19380ce9-78cc-473c-a9e0-b6c422415158",
      "quantity": 2,
      "duration": 90,
      "price": 32,
      "pricePerUnit": 16,
      "totalPrice": 32
    }
  ]
}
```

### 6.2 Proceso de Guardado
1. Transformación final de datos
2. Validación de disponibilidad
3. Creación de la reserva
4. Creación de registros de items rentados

## 7. Manejo de Errores

### 7.1 Puntos de Validación
1. Selección inicial (UI)
2. Transformación de datos
3. Verificación de stock
4. Creación en DB

### 7.2 Tipos de Errores Manejados
- Stock insuficiente
- Datos inválidos
- Errores de cálculo
- Errores de DB

## 8. Mejores Prácticas Implementadas

### 8.1 Validación
- Validación temprana en UI
- Validación de negocio en servicio
- Validación en DB

### 8.2 Performance
- Uso de contextos para estado global
- Transformaciones eficientes
- Validaciones en batch

### 8.3 Mantenibilidad
- Tipos fuertemente tipados
- Separación de responsabilidades
- Logs detallados

## 9. Recomendaciones

1. Implementar cache de stock
2. Agregar validaciones adicionales
3. Mejorar manejo de errores
4. Optimizar consultas de stock
5. Implementar retry logic para validaciones 