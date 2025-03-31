---

# Documento Detallado: Envío de Pagos con Card Payment Brick de Checkout Bricks

**Fecha**: 29 de marzo de 2025
**Propósito**: Proporcionar una guía exhaustiva y práctica sobre el proceso de envío de pagos con el *Card Payment Brick* de Checkout Bricks, basada en la página oficial de la documentación para desarrolladores de Mercado Pago.

---

## Índice
1. [Envío de Pagos con Card Payment Brick](#1-envío-de-pagos-con-card-payment-brick)  
   - [Descripción General](#11-descripción-general)  
   - [Flujo de Trabajo](#12-flujo-de-trabajo)  
   - [Configuración del Callback](#13-configuración-del-callback)  
   - [Ejemplos de Código](#14-ejemplos-de-código)  
   - [Datos del Pago](#15-datos-del-pago)  
2. [Consideraciones Generales](#2-consideraciones-generales)  

---

## 1. Envío de Pagos con Card Payment Brick
**URL**: [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/card-payment-brick/payment-submission](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/card-payment-brick/payment-submission)

### 1.1 Descripción General
La página de *Payment Submission* detalla el proceso para **enviar un pago con tarjeta** utilizando el *Card Payment Brick*. Este módulo captura los datos de la tarjeta en el front-end, los tokeniza y los envía al back-end del comercio para su procesamiento final mediante la API de Mercado Pago. El flujo asegura que los datos sensibles sean manejados de forma segura y que el comercio pueda completar la transacción sin complicaciones.

- **Propósito**: Facilitar el procesamiento de pagos con tarjetas de crédito o débito de manera segura y eficiente.
- **Dependencias**: Requiere el SDK de Mercado Pago inicializado y el *Card Payment Brick* renderizado (ver *Default Rendering*).

### 1.2 Flujo de Trabajo
El envío de pagos con el *Card Payment Brick* sigue estos pasos:

1. **Carga del Brick**:
   - El *Card Payment Brick* se renderiza en el front-end con una configuración que incluye el monto (`amount`) y el callback `onSubmit`.

2. **Ingreso de Datos**:
   - El usuario completa el formulario con los datos de la tarjeta (número, fecha de vencimiento, CVV, nombre del titular) y, opcionalmente, selecciona cuotas.

3. **Envío del Formulario**:
   - Al hacer clic en "Pagar", el SDK tokeniza los datos y activa el callback `onSubmit`, enviando un objeto con la información del pago al código del desarrollador.

4. **Procesamiento en el Back-end**:
   - El front-end envía los datos recibidos en `onSubmit` al back-end mediante una solicitud HTTP (ej. POST).
   - El back-end usa el *Access Token* para crear el pago a través de la API de Mercado Pago (`/v1/payments`).

5. **Respuesta al Front-end**:
   - El back-end devuelve el resultado del pago (ej. `{ id: 'payment_id' }`) al front-end, que puede mostrar una confirmación al usuario.

### 1.3 Configuración del Callback
El callback `onSubmit` es el núcleo del proceso de envío:
- **Ubicación**: Dentro del objeto `callbacks` en la configuración del Brick.
- **Parámetro**: Recibe un objeto (`cardData`) con los datos del pago.
- **Retorno**: Debe devolver una Promise que resuelva con el resultado del procesamiento en el back-end o rechace con un error.

### 1.4 Ejemplos de Código

#### Ejemplo Completo: Front-end y Back-end
- **Front-end**: Configuración del *Card Payment Brick* con `onSubmit`.
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Card Payment Brick - Envío de Pago</title>
  <script src="https://sdk.mercadopago.com/js/v2"></script>
</head>
<body>
  <div id="card-payment-brick_container"></div>
  <script>
    const mp = new MercadoPago('TEST-7843*********755-11221*********d497ae962*********ecf8d85-1*********');
    const bricksBuilder = mp.bricks();

    const renderCardPaymentBrick = async (bricksBuilder) => {
      const settings = {
        initialization: {
          amount: 1000, // $10.00
          payer: { email: 'test_user@example.com' }
        },
        callbacks: {
          onSubmit: async (cardData) => {
            try {
              const response = await fetch('/process-card-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cardData)
              });
              const result = await response.json();
              console.log('Pago procesado:', result);
              return result;
            } catch (error) {
              console.error('Error al procesar:', error);
              throw error;
            }
          },
          onReady: () => console.log('Brick listo'),
          onError: (error) => console.error('Error:', error)
        }
      };
      window.cardPaymentBrickController = await bricksBuilder.create('cardPayment', 'card-payment-brick_container', settings);
    };

    renderCardPaymentBrick(bricksBuilder);
  </script>
</body>
</html>
```

- **Back-end (Node.js con Express)**: Procesamiento del pago.
```javascript
const express = require('express');
const mercadopago = require('mercadopago');
const app = express();

app.use(express.json());

mercadopago.configure({
  access_token: 'TEST-4599*********755-11221*********d497ae962*********ecf8d85-1*********'
});

app.post('/process-card-payment', async (req, res) => {
  try {
    const cardData = req.body;
    const payment = await mercadopago.payment.create({
      transaction_amount: 1000,
      token: cardData.token,
      payment_method_id: cardData.paymentMethodId,
      installments: cardData.installments || 1,
      payer: { email: cardData.payer.email }
    });
    res.json({ id: payment.body.id });
  } catch (error) {
    console.error('Error en el back-end:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('Servidor en puerto 3000'));
```

### 1.5 Datos del Pago
El objeto recibido en `onSubmit` (`cardData`) incluye las siguientes propiedades clave:
- **`token`** (String): Token generado por Mercado Pago que representa los datos de la tarjeta de forma segura. Ejemplo: `"abc123xyz789"`.
- **`paymentMethodId`** (String): Identificador del método de pago (ej. `"visa"`, `"master"`, `"amex"`).
- **`installments`** (Number): Número de cuotas seleccionadas por el usuario (ej. `1`, `3`, `6`). Puede ser `null` si no aplica.
- **`payer`** (Object): Información del pagador.
  - `email` (String): Correo electrónico del pagador (requerido).
  - Otros campos como `identification` pueden estar presentes si se configuraron en `initialization.payer`.

Ejemplo de `cardData`:
```json
{
  "token": "abc123xyz789",
  "paymentMethodId": "visa",
  "installments": 3,
  "payer": {
    "email": "test_user@example.com"
  }
}
```

### Notas sobre el Proceso
- **Tokenización**: El `token` reemplaza los datos sensibles de la tarjeta, asegurando que el comercio no los maneje directamente.
- **Cuotas**: El Brick muestra opciones de cuotas según el monto y el emisor de la tarjeta; el usuario las selecciona antes de enviar.
- **Errores**: Si el formulario tiene datos inválidos (ej. CVV incorrecto), el Brick no llama a `onSubmit` y muestra un error al usuario.

---

## 2. Consideraciones Generales

- **Seguridad**: El *Card Payment Brick* delega la tokenización y el manejo de datos sensibles a Mercado Pago, cumpliendo con PCI DSS.
- **Dependencia del Back-end**: Aunque el Brick captura los datos en el front-end, el procesamiento final requiere una integración segura con el back-end usando el *Access Token*.
- **Pruebas**: Usa tarjetas de prueba proporcionadas por Mercado Pago (disponibles en la documentación) y credenciales de prueba para simular pagos en el entorno sandbox.
- **Limitación**: Este Brick está diseñado exclusivamente para tarjetas; otros métodos (efectivo, billetera) requieren el *Payment Brick* o *Wallet Brick*.
- **Flexibilidad**: El flujo básico se puede personalizar con funcionalidades avanzadas (ej. cuotas específicas, datos precargados) detalladas en otras secciones.

---
