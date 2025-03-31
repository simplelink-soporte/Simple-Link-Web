# Documento Detallado: Personalizaciones Visuales del Payment Brick de Checkout Bricks

**Fecha**: 29 de marzo de 2025  
**Propósito**: Proporcionar una guía exhaustiva y práctica sobre las personalizaciones visuales del *Payment Brick* de Checkout Bricks, específicamente para ocultar elementos y cambiar textos, basada en las páginas oficiales de la documentación para desarrolladores de Mercado Pago.

---

## Índice
1. [Ocultar Elementos en el Payment Brick](#1-ocultar-elementos-en-el-payment-brick)  
   - [Descripción General](#11-descripción-general)  
   - [Configuración](#12-configuración)  
   - [Ejemplos de Código](#13-ejemplos-de-código)  
   - [Notas Prácticas](#14-notas-prácticas)  
2. [Cambiar Textos en el Payment Brick](#2-cambiar-textos-en-el-payment-brick)  
   - [Descripción General](#21-descripción-general)  
   - [Configuración](#22-configuración)  
   - [Ejemplos de Código](#23-ejemplos-de-código)  
   - [Notas Prácticas](#24-notas-prácticas)  
3. [Consideraciones Generales](#3-consideraciones-generales)  

---

## 1. Ocultar Elementos en el Payment Brick
**URL**: [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/payment-brick/visual-customizations/hide-element](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/payment-brick/visual-customizations/hide-element)

### 1.1 Descripción General
La funcionalidad de *Hide Element* permite **ocultar elementos específicos** del *Payment Brick* para personalizar la interfaz de usuario según las necesidades del comercio. Esto es útil cuando ciertos componentes del formulario o flujo de pago no son relevantes o deseados en un caso de uso particular, como ocultar el botón de guardado de tarjetas o el selector de métodos de pago en escenarios específicos.

- **Propósito**: Simplificar o ajustar visualmente el Brick eliminando elementos innecesarios.
- **Alcance**: Afecta solo la presentación visual, no la funcionalidad subyacente del procesamiento de pagos.

### 1.2 Configuración
La personalización se realiza a través del objeto `customization.visual` en la configuración del *Payment Brick*. Los elementos que se pueden ocultar incluyen:

- **`hidePaymentButton`** (Boolean):
  - Oculta el botón principal de "Pagar".
  - Default: `false`.
  - Uso: Permite manejar el envío del formulario manualmente (ej. con un botón externo).

- **`hideFormTitle`** (Boolean):
  - Oculta el título del formulario (ej. "Medios de pago").
  - Default: `false`.
  - Uso: Para interfaces minimalistas.

- **`hideSaveCardCheckbox`** (Boolean):
  - Oculta la casilla de verificación para guardar la tarjeta.
  - Default: `false`.
  - Uso: Cuando no se desea ofrecer esta opción al usuario.

### 1.3 Ejemplos de Código

#### Ejemplo Básico: Ocultar el Botón de Pago
- **Descripción**: Oculta el botón predeterminado y permite controlarlo externamente.
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Payment Brick - Ocultar Botón</title>
  <script src="https://sdk.mercadopago.com/js/v2"></script>
</head>
<body>
  <div id="payment-brick_container"></div>
  <button id="custom-submit">Pagar Ahora</button>
  <script>
    const mp = new MercadoPago('TEST-7843*********755-11221*********d497ae962*********ecf8d85-1*********');
    const bricksBuilder = mp.bricks();

    const renderPaymentBrick = async (bricksBuilder) => {
      const settings = {
        initialization: { amount: 1000 },
        customization: {
          visual: {
            hidePaymentButton: true // Ocultar botón de pago
          }
        },
        callbacks: {
          onSubmit: async (paymentData) => {
            const response = await fetch('/process-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(paymentData)
            });
            return response.json();
          }
        }
      };
      const paymentBrickController = await bricksBuilder.create('payment', 'payment-brick_container', settings);

      // Controlar envío con botón externo
      document.getElementById('custom-submit').addEventListener('click', () => {
        paymentBrickController.submit();
      });
    };

    renderPaymentBrick(bricksBuilder);
  </script>
</body>
</html>
```

#### Ejemplo Completo: Ocultar Múltiples Elementos
- **Descripción**: Oculta el título y la opción de guardar tarjeta.
```javascript
const settings = {
  initialization: { amount: 1000, payer: { email: 'test_user@example.com' } },
  customization: {
    visual: {
      hideFormTitle: true,        // Sin título
      hideSaveCardCheckbox: true  // Sin opción de guardar tarjeta
    }
  },
  callbacks: {
    onSubmit: async (paymentData) => {/* Procesar pago */}
  }
};
await bricksBuilder.create('payment', 'payment-brick_container', settings);
```

### 1.4 Notas Prácticas
- **Control Manual**: Si `hidePaymentButton` es `true`, usa `paymentBrickController.submit()` para enviar el formulario manualmente.
- **Casos de Uso**: 
  - Ocultar el botón para integrarlo en un flujo personalizado.
  - Ocultar el título para un diseño más limpio.
  - Ocultar la casilla de guardar tarjeta si no se permite esta funcionalidad.
- **Limitaciones**: No todos los elementos son configurables para ocultarse; opciones adicionales requieren personalización avanzada.

---

## 2. Cambiar Textos en el Payment Brick
**URL**: [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/payment-brick/visual-customizations/change-texts](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/payment-brick/visual-customizations/change-texts)

### 2.1 Descripción General
La funcionalidad de *Change Texts* permite **modificar los textos predeterminados** del *Payment Brick* para adaptarlos al idioma, tono o branding del comercio. Esto incluye etiquetas, placeholders y mensajes visibles en el formulario, ofreciendo mayor control sobre la experiencia del usuario.

- **Propósito**: Personalizar la comunicación visual del Brick para alinearla con la identidad del comercio.
- **Alcance**: Afecta solo los textos renderizados, no la lógica funcional.

### 2.2 Configuración
La personalización se realiza a través del objeto `customization.texts` en la configuración del *Payment Brick*. Los textos que se pueden modificar incluyen:

- **`formTitle`** (Object):
  - `value` (String): Texto del título del formulario.
  - Default: `"Medios de pago"`.

- **`actionButton`** (Object):
  - `pay` (Object):
    - `value` (String): Texto del botón de pago.
    - Default: `"Pagar"`.
  - `payWithCardSaved` (Object):
    - `value` (String): Texto para pagar con tarjeta guardada.
    - Default: `"Pagar con tarjeta guardada"`.

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
    - `value` (String): Etiqueta del campo de identificación.
    - Default: `"Documento"`.

- **`placeholders`** (Object):
  - Campos similares a `inputLabels`, pero para los textos de ejemplo dentro de los campos (ej. `"1234 5678 9012 3456"` para `cardNumber`).

### 2.3 Ejemplos de Código

#### Ejemplo Básico: Cambiar el Título y el Botón
- **Descripción**: Modifica el título del formulario y el texto del botón de pago.
```javascript
const settings = {
  initialization: { amount: 1000 },
  customization: {
    texts: {
      formTitle: { value: "Elige tu método de pago" },
      actionButton: { pay: { value: "Confirmar Pago" } }
    }
  },
  callbacks: {
    onSubmit: async (paymentData) => {/* Procesar pago */}
  }
};
await bricksBuilder.create('payment', 'payment-brick_container', settings);
```

#### Ejemplo Completo: Personalizar Etiquetas y Placeholders
- **Descripción**: Cambia etiquetas y placeholders para un formulario más descriptivo.
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Payment Brick - Cambiar Textos</title>
  <script src="https://sdk.mercadopago.com/js/v2"></script>
</head>
<body>
  <div id="payment-brick_container"></div>
  <script>
    const mp = new MercadoPago('TEST-7843*********755-11221*********d497ae962*********ecf8d85-1*********');
    const bricksBuilder = mp.bricks();

    const renderPaymentBrick = async (bricksBuilder) => {
      const settings = {
        initialization: { amount: 1000 },
        customization: {
          texts: {
            formTitle: { value: "Opciones de Pago" },
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
          onSubmit: async (paymentData) => {
            const response = await fetch('/process-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(paymentData)
            });
            return response.json();
          }
        }
      };
      await bricksBuilder.create('payment', 'payment-brick_container', settings);
    };

    renderPaymentBrick(bricksBuilder);
  </script>
</body>
</html>
```

### 2.4 Notas Prácticas
- **Consistencia**: Asegúrate de que los textos reflejen el idioma configurado en `locale` (ej. `es-AR`).
- **Casos de Uso**: 
  - Ajustar el tono (formal/informal) del comercio.
  - Traducir a dialectos específicos no cubiertos por `locale`.
- **Limitaciones**: No todos los textos son personalizables (ej. mensajes de error internos); consulta la documentación para más detalles.

---

## 3. Consideraciones Generales

- **Compatibilidad**: Ambas personalizaciones se aplican dentro del objeto `customization` y pueden combinarse con otras opciones (ej. temas visuales o filtrado de métodos).
- **Impacto Visual**: Estas modificaciones no afectan la lógica de procesamiento, solo la presentación.
- **Pruebas**: Renderiza el Brick en un entorno de prueba para verificar cómo se ven los cambios antes de pasar a producción.
- **Flexibilidad**: Aunque potente, la personalización tiene límites; ajustes más profundos podrían requerir CSS avanzado o un Brick completamente personalizado.
- **Dependencia del SDK**: Asegúrate de que el SDK esté correctamente inicializado con una *Public Key* válida antes de aplicar estas configuraciones.

---
