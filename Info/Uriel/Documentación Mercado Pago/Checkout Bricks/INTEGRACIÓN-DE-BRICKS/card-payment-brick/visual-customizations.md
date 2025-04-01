# Documento Detallado: Personalizaciones Visuales del Card Payment Brick de Checkout Bricks

**Fecha**: 29 de marzo de 2025  
**Propósito**: Proporcionar una guía exhaustiva y práctica sobre las personalizaciones visuales del *Card Payment Brick* de Checkout Bricks, específicamente para ocultar elementos y cambiar textos, basada en las páginas oficiales de la documentación para desarrolladores de Mercado Pago.

---

## Índice
1. [Ocultar Elementos en el Card Payment Brick](#1-ocultar-elementos-en-el-card-payment-brick)  
   - [Descripción General](#11-descripción-general)  
   - [Configuración](#12-configuración)  
   - [Ejemplos de Código](#13-ejemplos-de-código)  
   - [Notas Prácticas](#14-notas-prácticas)  
2. [Cambiar Textos en el Card Payment Brick](#2-cambiar-textos-en-el-card-payment-brick)  
   - [Descripción General](#21-descripción-general)  
   - [Configuración](#22-configuración)  
   - [Ejemplos de Código](#23-ejemplos-de-código)  
   - [Notas Prácticas](#24-notas-prácticas)  
3. [Consideraciones Generales](#3-consideraciones-generales)  

---

## 1. Ocultar Elementos en el Card Payment Brick
**URL**: [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/card-payment-brick/visual-customizations/hide-element](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/card-payment-brick/visual-customizations/hide-element)

### 1.1 Descripción General
La funcionalidad de *Hide Element* permite **ocultar elementos específicos** del *Card Payment Brick* para personalizar la interfaz según las necesidades del comercio. Esto es útil para simplificar el formulario o adaptarlo a flujos específicos, como ocultar el botón de pago o el título del formulario.

- **Propósito**: Ajustar la presentación visual del Brick eliminando elementos no deseados.
- **Alcance**: Afecta solo la interfaz, no la lógica de procesamiento de pagos.

### 1.2 Configuración
La personalización se realiza a través del objeto `customization.visual` en la configuración del *Card Payment Brick*. Los elementos que se pueden ocultar son:

- **`hidePaymentButton`** (Boolean):
  - Oculta el botón principal de "Pagar".
  - Default: `false`.
  - Uso: Permite manejar el envío manualmente con un botón externo.

- **`hideFormTitle`** (Boolean):
  - Oculta el título del formulario (ej. "Datos de la tarjeta").
  - Default: `false`.
  - Uso: Para un diseño más minimalista.

### 1.3 Ejemplos de Código

#### Ejemplo Básico: Ocultar el Botón de Pago
- **Descripción**: Oculta el botón predeterminado y usa un botón personalizado.
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Card Payment Brick - Ocultar Botón</title>
  <script src="https://sdk.mercadopago.com/js/v2"></script>
</head>
<body>
  <div id="card-payment-brick_container"></div>
  <button id="custom-submit">Pagar Ahora</button>
  <script>
    const mp = new MercadoPago('TEST-7843*********755-11221*********d497ae962*********ecf8d85-1*********');
    const bricksBuilder = mp.bricks();

    const renderCardPaymentBrick = async (bricksBuilder) => {
      const settings = {
        initialization: { amount: 1000 },
        customization: {
          visual: {
            hidePaymentButton: true // Ocultar botón de pago
          }
        },
        callbacks: {
          onSubmit: async (cardData) => {
            const response = await fetch('/process-card-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(cardData)
            });
            return response.json();
          }
        }
      };
      const cardPaymentBrickController = await bricksBuilder.create('cardPayment', 'card-payment-brick_container', settings);

      // Enviar con botón externo
      document.getElementById('custom-submit').addEventListener('click', () => {
        cardPaymentBrickController.submit();
      });
    };

    renderCardPaymentBrick(bricksBuilder);
  </script>
</body>
</html>
```

#### Ejemplo Completo: Ocultar Título
- **Descripción**: Oculta el título del formulario.
```javascript
const settings = {
  initialization: { amount: 1000 },
  customization: {
    visual: {
      hideFormTitle: true // Sin título
    }
  },
  callbacks: { onSubmit: async (cardData) => {/* Procesar */} }
};
await bricksBuilder.create('cardPayment', 'card-payment-brick_container', settings);
```

### 1.4 Notas Prácticas
- **Control Manual**: Con `hidePaymentButton: true`, usa `cardPaymentBrickController.submit()` para enviar el formulario.
- **Casos de Uso**: 
  - Ocultar el botón para integrarlo en un flujo personalizado.
  - Ocultar el título para un diseño más limpio.
- **Limitaciones**: No todos los elementos son configurables; opciones adicionales podrían requerir personalización avanzada.

---

## 2. Cambiar Textos en el Card Payment Brick
**URL**: [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/card-payment-brick/visual-customizations/change-texts](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/card-payment-brick/visual-customizations/change-texts)

### 2.1 Descripción General
La funcionalidad de *Change Texts* permite **modificar los textos predeterminados** del *Card Payment Brick* para adaptarlos al idioma, tono o branding del comercio. Esto incluye el título del formulario, el texto del botón de pago y las etiquetas de los campos, ofreciendo mayor control sobre la experiencia del usuario.

- **Propósito**: Personalizar la comunicación visual del Brick para alinearla con la identidad del comercio.
- **Alcance**: Afecta solo los textos renderizados, no la lógica funcional.

### 2.2 Configuración
La personalización se realiza a través del objeto `customization.texts` en la configuración del *Card Payment Brick*. Los textos modificables son:

- **`formTitle`** (Object):
  - `value` (String): Texto del título del formulario.
  - Default: `"Datos de la tarjeta"`.

- **`actionButton`** (Object):
  - `pay` (Object):
    - `value` (String): Texto del botón de pago.
    - Default: `"Pagar"`.

- **`inputLabels`** (Object):
  - `cardNumber` (Object):
    - `value` (String): Etiqueta del campo de número de tarjeta.
    - Default: `"Número de tarjeta"`.
  - `expirationDate` (Object):
    - `value` (String): Etiqueta del campo de fecha de vencimiento.
    - Default: `"Fecha de vencimiento"`.
  - `securityCode` (Object):
    - `value` (String): Etiqueta del campo de código de seguridad.
    - Default: `"Código de seguridad"`.
  - `cardholderName` (Object):
    - `value` (String): Etiqueta del campo de nombre del titular.
    - Default: `"Nombre del titular"`.
  - `identification` (Object):
    - `value` (String): Etiqueta del campo de identificación (si aplica).
    - Default: `"Documento"`.

- **`placeholders`** (Object):
  - Campos similares a `inputLabels`, pero para los textos de ejemplo dentro de los campos (ej. `"1234 5678 9012 3456"` para `cardNumber`).

### 2.3 Ejemplos de Código

#### Ejemplo Básico: Cambiar Título y Botón
- **Descripción**: Modifica el título y el texto del botón.
```javascript
const settings = {
  initialization: { amount: 1000 },
  customization: {
    texts: {
      formTitle: { value: "Ingresa tu tarjeta" },
      actionButton: { pay: { value: "Confirmar Pago" } }
    }
  },
  callbacks: { onSubmit: async (cardData) => {/* Procesar */} }
};
await bricksBuilder.create('cardPayment', 'card-payment-brick_container', settings);
```

#### Ejemplo Completo: Personalizar Etiquetas y Placeholders
- **Descripción**: Cambia etiquetas y placeholders para un formulario más descriptivo.
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Card Payment Brick - Cambiar Textos</title>
  <script src="https://sdk.mercadopago.com/js/v2"></script>
</head>
<body>
  <div id="card-payment-brick_container"></div>
  <script>
    const mp = new MercadoPago('TEST-7843*********755-11221*********d497ae962*********ecf8d85-1*********');
    const bricksBuilder = mp.bricks();

    const renderCardPaymentBrick = async (bricksBuilder) => {
      const settings = {
        initialization: { amount: 1000 },
        customization: {
          texts: {
            formTitle: { value: "Completa los datos de tu tarjeta" },
            actionButton: { pay: { value: "Realizar Pago" } },
            inputLabels: {
              cardNumber: { value: "Número de la Tarjeta" },
              expirationDate: { value: "Vencimiento" },
              securityCode: { value: "Código CVV" },
              cardholderName: { value: "Titular de la Tarjeta" }
            },
            placeholders: {
              cardNumber: { value: "XXXX XXXX XXXX XXXX" },
              expirationDate: { value: "MM/AA" },
              securityCode: { value: "123" },
              cardholderName: { value: "Ej: Juan Pérez" }
            }
          }
        },
        callbacks: {
          onSubmit: async (cardData) => {
            const response = await fetch('/process-card-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(cardData)
            });
            return response.json();
          }
        }
      };
      await bricksBuilder.create('cardPayment', 'card-payment-brick_container', settings);
    };

    renderCardPaymentBrick(bricksBuilder);
  </script>
</body>
</html>
```

### 2.4 Notas Prácticas
- **Consistencia**: Asegúrate de que los textos coincidan con el idioma del `locale` (ej. `es-AR`).
- **Casos de Uso**: 
  - Ajustar el tono (formal/informal) del comercio.
  - Personalizar placeholders para guiar al usuario.
- **Limitaciones**: No cubre mensajes de error internos; solo textos estáticos del formulario.

---

## 3. Consideraciones Generales

- **Combinación**: Puedes usar `visual` y `texts` juntos para una personalización completa.
  - Ejemplo:
  ```javascript
  customization: {
    visual: { hidePaymentButton: true },
    texts: { actionButton: { pay: { value: "Procesar Pago" } } }
  }
  ```
- **Impacto Visual**: Estas modificaciones no afectan el procesamiento del pago, solo la presentación.
- **Pruebas**: Renderiza el Brick en un entorno sandbox para verificar los cambios antes de producción.
- **Flexibilidad**: Aunque potente, la personalización tiene límites; ajustes más profundos podrían requerir CSS avanzado.
- **Dependencia del SDK**: Asegúrate de que el SDK esté inicializado con una *Public Key* válida.

---
