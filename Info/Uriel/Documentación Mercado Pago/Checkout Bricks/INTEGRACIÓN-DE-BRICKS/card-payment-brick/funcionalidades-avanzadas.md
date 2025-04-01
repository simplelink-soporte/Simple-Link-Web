# Documento Detallado: Funcionalidades Avanzadas del Card Payment Brick de Checkout Bricks

**Fecha**: 29 de marzo de 2025 
**Propósito**: Proporcionar una guía exhaustiva y práctica sobre las funcionalidades avanzadas del *Card Payment Brick* de Checkout Bricks, basada en las páginas oficiales de la documentación para desarrolladores de Mercado Pago, para facilitar su implementación.

---

## Índice
1. [Inicializar Datos en el Brick](#1-inicializar-datos-en-el-brick)  
2. [Actualizar Datos](#2-actualizar-datos)  
3. [Configurar Cuotas](#3-configurar-cuotas)  
4. [Configurar Métodos de Pago](#4-configurar-métodos-de-pago)  
5. [Datos Adicionales](#5-datos-adicionales)  
6. [Callbacks Adicionales](#6-callbacks-adicionales)  
7. [Consideraciones Generales](#7-consideraciones-generales)  

---

## 1. Inicializar Datos en el Brick
**URL**: [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/card-payment-brick/advanced-features/initialize-data-on-the-bricks](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/card-payment-brick/advanced-features/initialize-data-on-the-bricks)

### Descripción
Permite **precargar datos del pagador** en el formulario del *Card Payment Brick* al inicializarlo, reduciendo la cantidad de información que el usuario debe ingresar manualmente.

### Configuración
- **Ubicación**: `initialization.payer`.
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
await bricksBuilder.create('cardPayment', 'card-payment-brick_container', settings);
```

### Notas
- Los datos son opcionales y editables por el usuario.
- Útil para usuarios autenticados o recurrentes.

---

## 2. Actualizar Datos
**URL**: [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/card-payment-brick/advanced-features/update-data](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/card-payment-brick/advanced-features/update-data)

### Descripción
Permite **actualizar dinámicamente el monto** del *Card Payment Brick* después de renderizarlo, adaptándose a cambios en el carrito de compra u otros valores.

### Configuración
- **Método**: `update()` en el controlador del Brick (`cardPaymentBrickController`).
- **Campo Actualizable**: `amount` (Number).

### Ejemplo
```javascript
const mp = new MercadoPago('PUBLIC_KEY');
const bricksBuilder = mp.bricks();
const settings = { 
  initialization: { amount: 1000 }, 
  callbacks: {/* ... */} 
};
const cardPaymentBrickController = await bricksBuilder.create('cardPayment', 'card-payment-brick_container', settings);

// Actualizar monto
cardPaymentBrickController.update({ amount: 2000 });
```

### Notas
- Requiere almacenar el controlador al crear el Brick.
- Ideal para flujos dinámicos como carritos de compra.

---

## 3. Configurar Cuotas
**URL**: [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/card-payment-brick/advanced-features/configure-installments](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/card-payment-brick/advanced-features/configure-installments)

### Descripción
Permite **controlar las opciones de cuotas** mostradas en el formulario para pagos con tarjeta.

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
await bricksBuilder.create('cardPayment', 'card-payment-brick_container', settings);
```

### Notas
- Si no se configura, muestra todas las cuotas disponibles según el emisor.
- `installments` en `onSubmit` reflejará la selección del usuario.

---

## 4. Configurar Métodos de Pago
**URL**: [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/card-payment-brick/advanced-features/configure-payment-methods](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/card-payment-brick/advanced-features/configure-payment-methods)

### Descripción
Permite **filtrar los tipos de tarjetas** aceptados (crédito, débito) y excluir marcas específicas.

### Configuración
- **Ubicación**: `customization.paymentMethods`.
- **Campos**:
  - `types` (Object):
    - `excluded` (Array): Tipos a excluir (ej. `["credit_card"]`).
  - `ids` (Object):
    - `excluded` (Array): IDs de marcas a excluir (ej. `["visa"]`).

### Ejemplo
```javascript
const settings = {
  initialization: { amount: 1000 },
  customization: {
    paymentMethods: {
      types: { excluded: ["debit_card"] }, // Solo crédito
      ids: { excluded: ["visa"] }          // Excluir Visa
    }
  },
  callbacks: { onSubmit: async (data) => {/* Procesar */} }
};
await bricksBuilder.create('cardPayment', 'card-payment-brick_container', settings);
```

### Notas
- Tipos: `"credit_card"`, `"debit_card"`.
- IDs: Consultar `/v1/payment_methods` para marcas disponibles (ej. `"visa"`, `"master"`).
- Afecta solo la UI; el back-end debe validar el método.

---

## 5. Datos Adicionales
**URL**: [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/card-payment-brick/advanced-features/additional-data](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/card-payment-brick/advanced-features/additional-data)

### Descripción
Permite **solicitar datos adicionales** al usuario, como la dirección, en el formulario.

### Configuración
- **Ubicación**: `customization.additionalData`.
- **Campo**:
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
await bricksBuilder.create('cardPayment', 'card-payment-brick_container', settings);
```

### Notas
- Los datos de dirección se incluyen en `onSubmit` bajo `formData.address`.
- Útil para envíos o cumplimiento normativo.

---

## 6. Callbacks Adicionales
**URL**: [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/card-payment-brick/advanced-features/additional-callbacks](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/card-payment-brick/advanced-features/additional-callbacks)

### Descripción
Añade **callbacks adicionales** para manejar eventos específicos del formulario.

### Configuración
- **Ubicación**: `callbacks`.
- **Callbacks Soportados**:
  - `onPaymentMethodSelected` (Function): Ejecutado al detectar el tipo de tarjeta.
  - `onFormInteraction` (Function): Ejecutado al interactuar con el formulario.

### Ejemplo
```javascript
const settings = {
  initialization: { amount: 1000 },
  callbacks: {
    onSubmit: async (data) => {/* Procesar */},
    onPaymentMethodSelected: (paymentMethod) => {
      console.log('Método:', paymentMethod.id); // Ej. "visa"
    },
    onFormInteraction: (event) => {
      console.log('Interacción:', event.type, event.field); // Ej. "change", "cardNumber"
    }
  }
};
await bricksBuilder.create('cardPayment', 'card-payment-brick_container', settings);
```

### Notas
- `onPaymentMethodSelected`: Detecta la marca tras ingresar los primeros dígitos.
- `onFormInteraction`: Útil para validaciones en tiempo real o UX dinámica.

---

## 7. Consideraciones Generales

- **Integración Combinada**: Estas funcionalidades pueden usarse juntas (ej. precargar datos y filtrar cuotas).
- **Seguridad**: El Brick tokeniza los datos sensibles; el back-end solo recibe el `token`.
- **Pruebas**: Usa el entorno sandbox con tarjetas de prueba para validar cada funcionalidad.
- **Back-end Requerido**: El procesamiento final siempre necesita una API con el *Access Token*.
- **Flexibilidad**: Estas opciones permiten adaptar el Brick a necesidades específicas sin alterar su enfoque en tarjetas.

---
