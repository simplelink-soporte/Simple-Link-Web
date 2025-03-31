# Documento Detallado: Payment Brick de Checkout Bricks - Introducción y Renderizado por Defecto

**Fecha**: 29 de marzo de 2025  
**Propósito**: Proporcionar una explicación exhaustiva del *Payment Brick* de Checkout Bricks, incluyendo su introducción y el proceso de renderizado por defecto, basada en las páginas oficiales de la documentación para desarrolladores de Mercado Pago.

---

## Índice
1. [Introducción al Payment Brick](#1-introducción-al-payment-brick)  
   - [Descripción General](#11-descripción-general)  
   - [Características Clave](#12-características-clave)  
   - [Casos de Uso](#13-casos-de-uso)  
2. [Renderizado por Defecto del Payment Brick](#2-renderizado-por-defecto-del-payment-brick)  
   - [Descripción General](#21-descripción-general)  
   - [Pasos para el Renderizado](#22-pasos-para-el-renderizado)  
   - [Configuración Básica](#23-configuración-básica)  
   - [Ejemplos de Código](#24-ejemplos-de-código)  
   - [Opciones de Personalización](#25-opciones-de-personalización)  
   - [Callbacks y Manejo de Eventos](#26-callbacks-y-manejo-de-eventos)  
3. [Consideraciones Generales](#3-consideraciones-generales)  

---

## 1. Introducción al Payment Brick
**URL**: [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/payment-brick/introduction](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/payment-brick/introduction)

### 1.1 Descripción General
El *Payment Brick* es uno de los módulos principales de Checkout Bricks, diseñado para **facilitar la integración de un flujo completo de pagos en el lado del cliente**. Este componente permite a los usuarios realizar pagos utilizando diversos métodos (tarjetas de crédito/débito, efectivo, transferencias, etc.) directamente desde una interfaz preconfigurada y optimizada por Mercado Pago. La página de introducción lo presenta como una solución integral que simplifica el procesamiento de pagos al combinar usabilidad, seguridad y flexibilidad.

- **Propósito**: Ofrecer una experiencia de pago transparente y eficiente sin necesidad de que los desarrolladores creen formularios personalizados desde cero.
- **Integración**: Se basa en el SDK de Mercado Pago y requiere una inicialización previa (ver *Common Initialization*).
- **Audiencia**: Desarrolladores que buscan una implementación rápida y confiable de pagos en línea.

### 1.2 Características Clave
La documentación destaca las siguientes características del *Payment Brick*:

- **Soporte Multi-Método**: Permite a los compradores elegir entre diferentes medios de pago disponibles en el país del comercio (ej. tarjetas, efectivo, billetera de Mercado Pago).
- **Guardado de Tarjetas**: Incluye la opción de almacenar datos de tarjetas para compras futuras, mejorando la experiencia del usuario recurrente.
- **Seguridad**: Los datos sensibles (como números de tarjeta) son procesados directamente por Mercado Pago, cumpliendo con estándares como PCI DSS.
- **Personalización**: Aunque viene con un diseño por defecto optimizado, permite ajustes en estilos y comportamiento para adaptarse a la tienda.
- **Responsividad**: Se adapta automáticamente al tamaño del contenedor en el que se renderiza, funcionando en dispositivos móviles y de escritorio.

### 1.3 Casos de Uso
El *Payment Brick* es ideal para los siguientes escenarios:
- **Tiendas en Línea**: Comercios que necesitan un checkout completo sin desarrollar interfaces personalizadas.
- **Pagos Recurrentes**: Integraciones donde los usuarios pueden guardar tarjetas para compras posteriores.
- **Experiencia Unificada**: Proyectos que buscan una solución estandarizada que soporte múltiples métodos de pago sin configuraciones complejas.

La página también menciona una **demostración interactiva** para probar el *Payment Brick* antes de integrarlo, lo que sugiere que los desarrolladores pueden explorar su funcionalidad en un entorno controlado.

---

## 2. Renderizado por Defecto del Payment Brick
**URL**: [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/payment-brick/default-rendering](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/payment-brick/default-rendering)

### 2.1 Descripción General
La página de *Default Rendering* explica cómo implementar el *Payment Brick* con su configuración básica, conocida como "renderizado por defecto". Este enfoque utiliza el diseño y comportamiento predefinidos por Mercado Pago, optimizados para alta conversión y usabilidad. La implementación requiere el SDK de Mercado Pago inicializado y sigue un proceso estandarizado para renderizar el Brick en una página web.

- **Objetivo**: Permitir a los desarrolladores integrar rápidamente el *Payment Brick* con un esfuerzo mínimo.
- **Requisitos Previos**: Haber cumplido con los prerrequisitos (credenciales, entorno) y la inicialización común del SDK.

### 2.2 Pasos para el Renderizado
La documentación describe tres pasos principales:

1. **Instalar el SDK de Mercado Pago**:
   - Incluir el script `<script src="https://sdk.mercadopago.com/js/v2"></script>` en el HTML.
   - Este paso ya debería estar completo si se siguió la inicialización común.

2. **Inicializar el SDK**:
   - Usar la función `new MercadoPago()` con la *Public Key* para crear una instancia del SDK.
   - Ejemplo: `const mp = new MercadoPago('TEST-7843*********755-11221*********d497ae962*********ecf8d85-1*********');`.

3. **Renderizar el Payment Brick**:
   - Crear un contenedor HTML (ej. `<div id="payment-brick_container">`) donde se renderizará el Brick.
   - Utilizar el método `bricks()` del objeto SDK para configurar y montar el *Payment Brick* con parámetros específicos.

### 2.3 Configuración Básica
La configuración mínima del *Payment Brick* requiere un objeto con las siguientes propiedades:

- **`initialization`** (Object, Requerido):
  - `amount` (Number): Monto total del pago en la moneda local (sin decimales si es en centavos). Ejemplo: `1000` (equivalente a $10.00 en Argentina).
  - `payer` (Object, Opcional):
    - `email` (String): Correo del pagador, necesario para ciertas funcionalidades como guardar tarjetas. Ejemplo: `"test_user@example.com"`.

- **`callbacks`** (Object, Opcional pero recomendado):
  - `onSubmit` (Function): Callback ejecutado al enviar el formulario de pago. Recibe un objeto con los datos del pago y debe devolver una Promise para procesar el pago en el back-end.
  - `onReady` (Function): Callback ejecutado cuando el Brick está completamente renderizado.
  - `onError` (Function): Callback ejecutado si ocurre un error durante el renderizado o procesamiento.

### 2.4 Ejemplos de Código

#### Ejemplo Básico
- **Descripción**: Renderizado mínimo con un monto fijo.
- **Código**:
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Payment Brick - Renderizado Básico</title>
  <script src="https://sdk.mercadopago.com/js/v2"></script>
</head>
<body>
  <div id="payment-brick_container"></div>
  <script>
    // Inicializar el SDK
    const mp = new MercadoPago('TEST-7843*********755-11221*********d497ae962*********ecf8d85-1*********');
    const bricksBuilder = mp.bricks();

    // Renderizar el Payment Brick
    const renderPaymentBrick = async (bricksBuilder) => {
      const settings = {
        initialization: {
          amount: 1000, // Monto en centavos ($10.00)
        },
        callbacks: {
          onSubmit: async (paymentData) => {
            console.log(paymentData);
            // Llamada al back-end para procesar el pago
            return new Promise((resolve, reject) => {
              fetch('/procesar-pago', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(paymentData)
              })
              .then(response => response.json())
              .then(data => resolve(data))
              .catch(error => reject(error));
            });
          },
          onReady: () => {
            console.log('Payment Brick listo');
          },
          onError: (error) => {
            console.error('Error en Payment Brick:', error);
          }
        }
      };
      window.paymentBrickController = await bricksBuilder.create('payment', 'payment-brick_container', settings);
    };

    renderPaymentBrick(bricksBuilder);
  </script>
</body>
</html>
```

#### Ejemplo con Email del Pagador
- **Descripción**: Incluye el correo del pagador para habilitar el guardado de tarjetas.
- **Código**:
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Payment Brick - Con Email</title>
  <script src="https://sdk.mercadopago.com/js/v2"></script>
</head>
<body>
  <div id="payment-brick_container"></div>
  <script>
    const mp = new MercadoPago('TEST-7843*********755-11221*********d497ae962*********ecf8d85-1*********');
    const bricksBuilder = mp.bricks();

    const renderPaymentBrick = async (bricksBuilder) => {
      const settings = {
        initialization: {
          amount: 1500, // $15.00
          payer: {
            email: 'test_user@example.com'
          }
        },
        callbacks: {
          onSubmit: async (paymentData) => {
            console.log('Datos enviados:', paymentData);
            return fetch('/procesar-pago', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(paymentData)
            }).then(response => response.json());
          },
          onReady: () => console.log('Brick cargado'),
          onError: (error) => console.error('Error:', error)
        }
      };
      window.paymentBrickController = await bricksBuilder.create('payment', 'payment-brick_container', settings);
    };

    renderPaymentBrick(bricksBuilder);
  </script>
</body>
</html>
```

### 2.5 Opciones de Personalización
Aunque esta sección se centra en el renderizado por defecto, la documentación menciona que el *Payment Brick* permite personalización básica a través del objeto `settings`:

- **`customization`** (Object, Opcional):
  - `visual` (Object):
    - `style` (Object): Define estilos CSS para el Brick.
      - `theme` (String): `"default"`, `"dark"`, o `"flat"`. Ejemplo: `"dark"`.
      - `customVariables` (Object): Variables CSS específicas (ej. `textPrimaryColor: '#ffffff'`).
  - Ejemplo:
```javascript
customization: {
  visual: {
    style: {
      theme: 'dark',
      customVariables: {
        textPrimaryColor: '#ffffff',
        buttonBackgroundColor: '#009EE3'
      }
    }
  }
}
```

- **Notas**: La personalización avanzada (como métodos de pago específicos o campos adicionales) se detalla en otras secciones de la documentación.

### 2.6 Callbacks y Manejo de Eventos
Los *callbacks* son fundamentales para interactuar con el *Payment Brick*:

- **`onSubmit`**:
  - **Parámetro**: Objeto `paymentData` con propiedades como:
    - `paymentMethodId` (String): Identificador del método de pago (ej. `"visa"`).
    - `cardId` (String, Opcional): ID de la tarjeta guardada (si aplica).
    - `formData` (Object): Datos del formulario (ej. número de tarjeta, CVV).
  - **Retorno**: Debe devolver una Promise que resuelva con el resultado del procesamiento en el back-end (ej. `{ id: 'payment_id' }`).

- **`onReady`**:
  - Ejecutado cuando el Brick está visible y funcional. Útil para mostrar indicadores de carga o habilitar botones.

- **`onError`**:
  - Recibe un objeto de error con detalles del problema (ej. `{ message: 'Invalid amount' }`).

- **Controlador**: El objeto retornado por `bricksBuilder.create()` (almacenado en `window.paymentBrickController`) permite manipular el Brick:
  - `unmount()`: Elimina el Brick del DOM.
  - Ejemplo: `window.paymentBrickController.unmount();`.

---

## 3. Consideraciones Generales

- **Dependencia del Back-end**: Aunque el *Payment Brick* opera en el front-end, el procesamiento final del pago requiere una integración con el back-end usando el *Access Token*.
- **Seguridad**: Los datos sensibles nunca se almacenan localmente; se envían directamente a Mercado Pago a través del SDK.
- **Pruebas**: Usa credenciales de prueba y montos ficticios para validar la integración antes de pasar a producción.
- **Limitaciones del Renderizado por Defecto**: No permite filtrar métodos de pago ni agregar campos personalizados sin configuraciones adicionales (detalladas en otras secciones).
- **Compatibilidad**: Funciona con JavaScript vanilla, pero también es compatible con frameworks como React mediante bibliotecas específicas.