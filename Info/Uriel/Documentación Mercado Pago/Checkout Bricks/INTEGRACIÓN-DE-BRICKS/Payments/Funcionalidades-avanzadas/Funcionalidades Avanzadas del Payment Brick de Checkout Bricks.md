# Documento Detallado: Funcionalidades Avanzadas del Payment Brick de Checkout Bricks

**Fecha**: 29 de marzo de 2025  
**Propósito**: Proporcionar una guía exhaustiva y práctica de las funcionalidades avanzadas del *Payment Brick* de Checkout Bricks, basada en las páginas oficiales de la documentación para desarrolladores de Mercado Pago, para facilitar su implementación.

---

## Índice
1. [Inicializar Datos en los Bricks](#1-inicializar-datos-en-los-bricks)  
2. [Preferencias](#2-preferencias)  
3. [Tarjetas de Clientes](#3-tarjetas-de-clientes)  
4. [Agregar Paso de Confirmación](#4-agregar-paso-de-confirmación)  
5. [Actualizar Datos](#5-actualizar-datos)  
6. [Gestionar Métodos de Pago](#6-gestionar-métodos-de-pago)  
7. [Configurar Cuotas](#7-configurar-cuotas)  
8. [Método de Pago Predeterminado](#8-método-de-pago-predeterminado)  
9. [Datos Adicionales](#9-datos-adicionales)  
10. [Callbacks Adicionales](#10-callbacks-adicionales)  
11. [Consideraciones Generales](#11-consideraciones-generales)  

---

## 1. Inicializar Datos en los Bricks
**URL**: [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/payment-brick/advanced-features/initialize-data-on-the-bricks](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/payment-brick/advanced-features/initialize-data-on-the-bricks)

### Descripción
Permite **precargar datos del pagador** en el *Payment Brick* al inicializarlo, mejorando la experiencia del usuario al evitar que tenga que reingresar información conocida.

### Configuración
- **Ubicación**: Dentro del objeto `initialization.payer`.
- **Campos Soportados**:
  - `email` (String): Correo del pagador.
  - `identification` (Object):
    - `type` (String): Tipo de documento (ej. `"DNI"`).
    - `number` (String): Número del documento.
  - `firstName` (String): Nombre.
  - `lastName` (String): Apellido.

### Ejemplo
```javascript
const settings = {
  initialization: {
    amount: 1000,
    payer: {
      email: "test_user@example.com",
      identification: { type: "DNI", number: "12345678" },
      firstName: "Juan",
      lastName: "Pérez"
    }
  },
  callbacks: { onSubmit: async (data) => {/* Procesar */} }
};
await bricksBuilder.create('payment', 'payment-brick_container', settings);
```

### Notas
- Los datos precargados son opcionales y se pueden sobrescribir por el usuario.
- Útil para usuarios autenticados en el comercio.

---

## 2. Preferencias
**URL**: [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/payment-brick/advanced-features/preferences](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/payment-brick/advanced-features/preferences)

### Descripción
Permite **usar una preferencia de pago** creada en el back-end para preconfigurar el *Payment Brick*, en lugar de pasar el monto directamente.

### Configuración
- **Ubicación**: Reemplaza `amount` por `preferenceId` en `initialization`.
- **preferenceId** (String): ID de la preferencia generada con la API de Mercado Pago (`/checkout/preferences`).

### Flujo
1. Crear preferencia en el back-end:
```javascript
const preference = await mercadopago.preferences.create({
  items: [{ title: "Producto", unit_price: 1000, quantity: 1 }],
  payer: { email: "test_user@example.com" }
});
const preferenceId = preference.body.id;
```

2. Usar en el front-end:
```javascript
const settings = {
  initialization: {
    preferenceId: "PREF_123456789"
  },
  callbacks: { onSubmit: async (data) => {/* Procesar */} }
};
await bricksBuilder.create('payment', 'payment-brick_container', settings);
```

### Notas
- La preferencia puede incluir ítems, descuentos y configuraciones avanzadas.
- El monto se deriva de la preferencia, ignorando `amount` si está presente.

---

## 3. Tarjetas de Clientes
**URL**: [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/payment-brick/advanced-features/customers-cards](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/payment-brick/advanced-features/customers-cards)

### Descripción
Permite **mostrar y usar tarjetas guardadas** de un cliente registrado en Mercado Pago, identificado por su `customerId`.

### Configuración
- **Ubicación**: `initialization.customer`.
- **Campos**:
  - `id` (String): ID del cliente (obtenido de la API `/v1/customers`).
  - `cards` (Object, Opcional):
    - `show` (Boolean): Mostrar tarjetas guardadas (default: `true`).

### Flujo
1. Obtener `customerId` del back-end (crear o buscar cliente).
2. Pasar al Brick:
```javascript
const settings = {
  initialization: {
    amount: 1000,
    customer: {
      id: "123456789-jxOV430go9fx2e",
      cards: { show: true }
    }
  },
  callbacks: { onSubmit: async (data) => {/* Procesar con cardId */} }
};
await bricksBuilder.create('payment', 'payment-brick_container', settings);
```

### Notas
- Si el usuario selecciona una tarjeta guardada, `onSubmit` devuelve `cardId` en lugar de `token`.
- Requiere que el cliente haya guardado tarjetas previamente.

---

## 4. Agregar Paso de Confirmación
**URL**: [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/payment-brick/advanced-features/add-confirmation-step](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/payment-brick/advanced-features/add-confirmation-step)

### Descripción
Añade un **paso de confirmación** antes de enviar el pago, permitiendo al usuario revisar los datos.

### Configuración
- **Ubicación**: `customization.paymentConfirmation`.
- **Campos**:
  - `enabled` (Boolean): Activa el paso (default: `false`).

### Ejemplo
```javascript
const settings = {
  initialization: { amount: 1000 },
  customization: {
    paymentConfirmation: { enabled: true }
  },
  callbacks: { onSubmit: async (data) => {/* Procesar */} }
};
await bricksBuilder.create('payment', 'payment-brick_container', settings);
```

### Notas
- Muestra una pantalla de revisión con los datos ingresados.
- El usuario debe confirmar explícitamente antes de `onSubmit`.

---

## 5. Actualizar Datos
**URL**: [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/payment-brick/advanced-features/update-data](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/payment-brick/advanced-features/update-data)

### Descripción
Permite **actualizar dinámicamente datos** del *Payment Brick* (ej. monto) después de renderizarlo.

### Configuración
- **Método**: `update()` en el controlador del Brick (`paymentBrickController`).
- **Campos Actualizables**: `amount`, `preferenceId`.

### Ejemplo
```javascript
const mp = new MercadoPago('PUBLIC_KEY');
const bricksBuilder = mp.bricks();
const settings = { initialization: { amount: 1000 }, callbacks: {/* ... */} };
const paymentBrickController = await bricksBuilder.create('payment', 'payment-brick_container', settings);

// Actualizar monto
paymentBrickController.update({ amount: 2000 });
```

### Notas
- Requiere almacenar el controlador al crear el Brick.
- Útil para carritos de compra dinámicos.

---

## 6. Gestionar Métodos de Pago
**URL**: [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/payment-brick/advanced-features/manage-payment-methods](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/payment-brick/advanced-features/manage-payment-methods)

### Descripción
Permite **filtrar o excluir métodos de pago** mostrados en el *Payment Brick*.

### Configuración
- **Ubicación**: `customization.paymentMethods`.
- **Campos**:
  - `types` (Object):
    - `excluded` (Array): Tipos a excluir (ej. `["credit_card"]`).
  - `ids` (Object):
    - `excluded` (Array): IDs específicos a excluir (ej. `["visa"]`).

### Ejemplo
```javascript
const settings = {
  initialization: { amount: 1000 },
  customization: {
    paymentMethods: {
      types: { excluded: ["ticket"] }, // Excluir efectivo
      ids: { excluded: ["visa"] } // Excluir Visa
    }
  },
  callbacks: { onSubmit: async (data) => {/* Procesar */} }
};
await bricksBuilder.create('payment', 'payment-brick_container', settings);
```

### Notas
- Tipos: `"credit_card"`, `"debit_card"`, `"ticket"`, `"bank_transfer"`, `"account_money"`.
- IDs dependen del país (consultar API `/v1/payment_methods`).

---

## 7. Configurar Cuotas
**URL**: [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/payment-brick/advanced-features/configure-installments](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/payment-brick/advanced-features/configure-installments)

### Descripción
Permite **controlar las opciones de cuotas** mostradas para pagos con tarjeta.

### Configuración
- **Ubicación**: `customization.paymentMethods.installments`.
- **Campos**:
  - `options` (Array): Lista de cuotas permitidas (ej. `[1, 3, 6]`).
  - `default` (Number): Cuota predeterminada.

### Ejemplo
```javascript
const settings = {
  initialization: { amount: 1000 },
  customization: {
    paymentMethods: {
      installments: {
        options: [1, 3, 6], // Solo 1, 3 o 6 cuotas
        default: 1
      }
    }
  },
  callbacks: { onSubmit: async (data) => {/* Procesar */} }
};
await bricksBuilder.create('payment', 'payment-brick_container', settings);
```

### Notas
- Si no se especifica, muestra todas las cuotas disponibles según el emisor.

---

## 8. Método de Pago Predeterminado
**URL**: [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/payment-brick/advanced-features/default-payment-method](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/payment-brick/advanced-features/default-payment-method)

### Descripción
Define un **método de pago predeterminado** al cargar el Brick.

### Configuración
- **Ubicación**: `customization.paymentMethods.default`.
- **Campos**:
  - `type` (String): Tipo de método (ej. `"credit_card"`).
  - `id` (String, Opcional): ID específico (ej. `"visa"`).

### Ejemplo
```javascript
const settings = {
  initialization: { amount: 1000 },
  customization: {
    paymentMethods: {
      default: { type: "credit_card", id: "visa" }
    }
  },
  callbacks: { onSubmit: async (data) => {/* Procesar */} }
};
await bricksBuilder.create('payment', 'payment-brick_container', settings);
```

### Notas
- El método debe estar disponible en el país del comercio.

---

## 9. Datos Adicionales
**URL**: [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/payment-brick/advanced-features/additional-data](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/payment-brick/advanced-features/additional-data)

### Descripción
Permite **solicitar datos adicionales** al usuario (ej. dirección) en el formulario.

### Configuración
- **Ubicación**: `customization.additionalData`.
- **Campos**:
  - `address` (Boolean): Solicitar dirección (default: `false`).

### Ejemplo
```javascript
const settings = {
  initialization: { amount: 1000 },
  customization: {
    additionalData: { address: true }
  },
  callbacks: { onSubmit: async (data) => {/* Procesar */} }
};
await bricksBuilder.create('payment', 'payment-brick_container', settings);
```

### Notas
- Los datos se incluyen en `onSubmit` bajo `formData.address`.

---

## 10. Callbacks Adicionales
**URL**: [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/payment-brick/advanced-features/additional-callbacks](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/payment-brick/advanced-features/additional-callbacks)

### Descripción
Añade **callbacks adicionales** para manejar eventos específicos del Brick.

### Configuración
- **Ubicación**: `callbacks`.
- **Callbacks Soportados**:
  - `onPaymentMethodSelected` (Function): Ejecutado al seleccionar un método de pago.
  - `onFormInteraction` (Function): Ejecutado al interactuar con el formulario.

### Ejemplo
```javascript
const settings = {
  initialization: { amount: 1000 },
  callbacks: {
    onSubmit: async (data) => {/* Procesar */},
    onPaymentMethodSelected: (paymentMethod) => {
      console.log('Método seleccionado:', paymentMethod.id);
    },
    onFormInteraction: (event) => {
      console.log('Interacción:', event.type, event.field);
    }
  }
};
await bricksBuilder.create('payment', 'payment-brick_container', settings);
```

### Notas
- `onPaymentMethodSelected` recibe `id` y `type`.
- `onFormInteraction` incluye `type` (ej. `"change"`) y `field` (ej. `"cardNumber"`.

---

## 11. Consideraciones Generales

- **Integración Combinada**: Estas funcionalidades pueden combinarse en un solo Brick (ej. precargar datos y filtrar métodos).
- **Back-end Requerido**: Algunas opciones (como preferencias o tarjetas de clientes) necesitan lógica en el servidor.
- **Pruebas**: Usa el entorno sandbox con credenciales de prueba para validar cada funcionalidad.
- **Documentación Adicional**: Consulta la API de Mercado Pago para detalles sobre IDs de métodos, preferencias, etc.
- **Flexibilidad**: Las configuraciones avanzadas permiten adaptar el Brick a necesidades específicas del comercio.

---