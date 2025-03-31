# Documento Detallado: Card Payment Brick de Checkout Bricks - Introducción y Renderizado por Defecto

**Fecha**: 29 de marzo de 2025  
**Propósito**: Proporcionar una guía exhaustiva y práctica sobre el *Card Payment Brick* de Checkout Bricks, incluyendo su introducción y el proceso de renderizado por defecto, basada en las páginas oficiales de la documentación para desarrolladores de Mercado Pago.

---

## Índice
1. [Introducción al Card Payment Brick](#1-introducción-al-card-payment-brick)  
   - [Descripción General](#11-descripción-general)  
   - [Características Clave](#12-características-clave)  
   - [Casos de Uso](#13-casos-de-uso)  
2. [Renderizado por Defecto del Card Payment Brick](#2-renderizado-por-defecto-del-card-payment-brick)  
   - [Descripción General](#21-descripción-general)  
   - [Pasos para el Renderizado](#22-pasos-para-el-renderizado)  
   - [Configuración Básica](#23-configuración-básica)  
   - [Ejemplos de Código](#24-ejemplos-de-código)  
   - [Callbacks y Manejo de Eventos](#25-callbacks-y-manejo-de-eventos)  
3. [Consideraciones Generales](#3-consideraciones-generales)  

---

## 1. Introducción al Card Payment Brick
**URL**: [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/card-payment-brick/introduction](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/card-payment-brick/introduction)

### 1.1 Descripción General
El *Card Payment Brick* es un módulo de Checkout Bricks diseñado específicamente para **procesar pagos con tarjetas de crédito y débito** de manera sencilla y segura. Este componente ofrece un formulario preconfigurado que captura los datos de la tarjeta (número, fecha de vencimiento, código de seguridad, etc.) y los tokeniza para su procesamiento, integrándose directamente con la infraestructura de Mercado Pago.

- **Propósito**: Simplificar la integración de pagos con tarjeta, eliminando la necesidad de construir formularios personalizados desde cero.
- **Integración**: Se basa en el SDK de Mercado Pago y requiere una inicialización previa (ver *Common Initialization*).
- **Audiencia**: Desarrolladores y comercios que buscan una solución optimizada para aceptar pagos con tarjeta.

La página destaca que el *Card Payment Brick* está enfocado en una experiencia de usuario fluida y segura, ideal para quienes desean limitar el checkout a tarjetas exclusivamente.

### 1.2 Características Clave
La documentación resalta las siguientes características del *Card Payment Brick*:

- **Formulario Específico**: Incluye campos optimizados para tarjetas (número, vencimiento, CVV, titular), con validación automática.
- **Tokenización**: Convierte los datos sensibles en un token seguro, manejado por Mercado Pago, cumpliendo con PCI DSS.
- **Soporte de Cuotas**: Permite a los usuarios seleccionar opciones de financiamiento según el emisor de la tarjeta y el país.
- **Personalización**: Admite ajustes visuales y de comportamiento para alinearse con el comercio.
- **Responsividad**: Se adapta al tamaño del contenedor, funcionando en dispositivos móviles y de escritorio.

### 1.3 Casos de Uso
El *Card Payment Brick* es ideal para los siguientes escenarios:
- **Pagos Exclusivos con Tarjeta**: Comercios que solo aceptan tarjetas como método de pago.
- **Checkout Rápido**: Situaciones donde se necesita un formulario simple y directo para pagos con tarjeta.
- **Seguridad Prioritaria**: Proyectos que requieren cumplimiento estricto de normativas de seguridad sin manejar datos sensibles localmente.

La página menciona una **demostración interactiva** para probar el Brick, sugiriendo que los desarrolladores pueden evaluar su funcionalidad antes de implementarlo.

---

## 2. Renderizado por Defecto del Card Payment Brick
**URL**: [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/card-payment-brick/default-rendering](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/card-payment-brick/default-rendering)

### 2.1 Descripción General
La página de *Default Rendering* explica cómo implementar el *Card Payment Brick* con su configuración básica, conocida como "renderizado por defecto". Este enfoque utiliza un formulario predefinido por Mercado Pago, optimizado para capturar y procesar datos de tarjetas. La implementación requiere el SDK de Mercado Pago inicializado y sigue un proceso estandarizado.

- **Objetivo**: Permitir a los desarrolladores integrar rápidamente el *Card Payment Brick* con un esfuerzo mínimo.
- **Requisitos Previos**: Haber cumplido con los prerrequisitos (credenciales, entorno) y la inicialización común del SDK.

### 2.2 Pasos para el Renderizado
La documentación describe tres pasos principales:

1. **Instalar el SDK de Mercado Pago**:
   - Incluir el script `<script src="https://sdk.mercadopago.com/js/v2"></script>` en el HTML.
   - Este paso ya debería estar completo si se siguió la inicialización común.

2. **Inicializar el SDK**:
   - Usar la función `new MercadoPago()` con la *Public Key* para crear una instancia del SDK.
   - Ejemplo: `const mp = new MercadoPago('TEST-7843*********755-11221*********d497ae962*********ecf8d85-1*********');`.

3. **Renderizar el Card Payment Brick**:
   - Crear un contenedor HTML (ej. `<div id="card-payment-brick_container">`) donde se renderizará el Brick.
   - Utilizar el método `bricks()` del objeto SDK para configurar y montar el *Card Payment Brick* con parámetros específicos.

### 2.3 Configuración Básica
La configuración mínima del *Card Payment Brick* requiere un objeto con las siguientes propiedades:

- **`initialization`** (Object, Requerido):
  - `amount` (Number): Monto total del pago en la moneda local (sin decimales si es en centavos). Ejemplo: `1000` ($10.00 en Argentina).
  - `payer` (Object, Opcional):
    - `email` (String): Correo del pagador, necesario para ciertas funcionalidades como guardar tarjetas. Ejemplo: `"test_user@example.com"`.

- **`callbacks`** (Object, Opcional pero recomendado):
  - `onSubmit` (Function): Callback ejecutado al enviar el formulario. Recibe un objeto con los datos del pago (incluyendo el `token`) y debe devolver una Promise para procesar el pago en el back-end.
  - `onReady` (Function): Callback ejecutado cuando el Brick está completamente renderizado.
  - `onError` (Function): Callback ejecutado si ocurre un error.

### 2.4 Ejemplos de Código

#### Ejemplo Básico
- **Descripción**: Renderiza el Brick con un monto fijo.
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Card Payment Brick - Renderizado Básico</title>
  <script src="https://sdk.mercadopago.com/js/v2"></script>
</head>
<body>
  <div id="card-payment-brick_container"></div>
  <script>
    // Inicializar el SDK
    const mp = new MercadoPago('TEST-7843*********755-11221*********d497ae962*********ecf8d85-1*********');
    const bricksBuilder = mp.bricks();

    // Renderizar el Card Payment Brick
    const renderCardPaymentBrick = async (bricksBuilder) => {
      const settings = {
        initialization: {
          amount: 1000 // $10.00
        },
        callbacks: {
          onSubmit: async (cardData) => {
            console.log(cardData);
            return new Promise((resolve, reject) => {
              fetch('/process-card-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cardData)
              })
              .then(response => response.json())
              .then(data => resolve(data))
              .catch(error => reject(error));
            });
          },
          onReady: () => console.log('Card Payment Brick listo'),
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

#### Ejemplo con Email del Pagador
- **Descripción**: Incluye el correo para habilitar opciones como guardar tarjetas.
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Card Payment Brick - Con Email</title>
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
          amount: 1500, // $15.00
          payer: { email: 'test_user@example.com' }
        },
        callbacks: {
          onSubmit: async (cardData) => {
            const response = await fetch('/process-card-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(cardData)
            });
            return response.json();
          },
          onReady: () => console.log('Brick cargado'),
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

- **Back-end (Node.js)** para procesar el pago:
```javascript
const express = require('express');
const mercadopago = require('mercadopago');
const app = express();

app.use(express.json());
mercadopago.configure({ access_token: 'TEST-4599*********755-11221*********d497ae962*********ecf8d85-1*********' });

app.post('/process-card-payment', async (req, res) => {
  const { token, paymentMethodId, installments, payer } = req.body;
  try {
    const payment = await mercadopago.payment.create({
      transaction_amount: 1500,
      token: token,
      payment_method_id: paymentMethodId,
      installments: installments || 1,
      payer: { email: payer.email }
    });
    res.json({ id: payment.body.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('Servidor en puerto 3000'));
```

### 2.5 Callbacks y Manejo de Eventos
Los *callbacks* son clave para interactuar con el *Card Payment Brick*:

- **`onSubmit`**:
  - **Parámetro**: Objeto `cardData` con propiedades como:
    - `token` (String): Token generado para la tarjeta.
    - `paymentMethodId` (String): Identificador del método (ej. `"visa"`).
    - `installments` (Number): Número de cuotas seleccionadas.
    - `payer` (Object): Datos del pagador (ej. `{ email: 'test_user@example.com' }`).
  - **Retorno**: Debe devolver una Promise con el resultado del back-end (ej. `{ id: 'payment_id' }`).

- **`onReady`**:
  - Ejecutado cuando el formulario está visible y funcional.

- **`onError`**:
  - Recibe un objeto de error (ej. `{ message: 'Invalid card number' }`).

- **Controlador**: El objeto `cardPaymentBrickController` permite:
  - `unmount()`: Elimina el Brick del DOM.
  - Ejemplo: `window.cardPaymentBrickController.unmount();`.

---

## 3. Consideraciones Generales

- **Diferencia con Payment Brick**: A diferencia del *Payment Brick*, el *Card Payment Brick* está limitado a tarjetas, excluyendo otros métodos como efectivo o billetera.
- **Seguridad**: Los datos de la tarjeta se tokenizan directamente por Mercado Pago, evitando que el comercio los maneje.
- **Dependencia del Back-end**: El procesamiento final requiere una solicitud al back-end con el *Access Token*.
- **Pruebas**: Usa credenciales de prueba y tarjetas sandbox (disponibles en la documentación de Mercado Pago) para simular pagos.
- **Flexibilidad**: El renderizado por defecto es un punto de partida; funcionalidades avanzadas (como personalización o cuotas) se detallan en otras secciones.
