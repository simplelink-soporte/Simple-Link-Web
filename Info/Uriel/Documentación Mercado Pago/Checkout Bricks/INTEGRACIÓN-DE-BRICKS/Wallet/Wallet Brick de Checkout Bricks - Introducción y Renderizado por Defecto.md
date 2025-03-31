# Documento Detallado: Wallet Brick de Checkout Bricks - Introducción y Renderizado por Defecto

**Fecha**: 29 de marzo de 2025  
**Propósito**: Proporcionar una guía exhaustiva y práctica sobre el *Wallet Brick* de Checkout Bricks, incluyendo su introducción y el proceso de renderizado por defecto, basada en las páginas oficiales de la documentación para desarrolladores de Mercado Pago.

---

## Índice
1. [Introducción al Wallet Brick](#1-introducción-al-wallet-brick)  
   - [Descripción General](#11-descripción-general)  
   - [Características Clave](#12-características-clave)  
   - [Casos de Uso](#13-casos-de-uso)  
2. [Renderizado por Defecto del Wallet Brick](#2-renderizado-por-defecto-del-wallet-brick)  
   - [Descripción General](#21-descripción-general)  
   - [Pasos para el Renderizado](#22-pasos-para-el-renderizado)  
   - [Configuración Básica](#23-configuración-básica)  
   - [Ejemplos de Código](#24-ejemplos-de-código)  
   - [Callbacks y Manejo de Eventos](#25-callbacks-y-manejo-de-eventos)  
3. [Consideraciones Generales](#3-consideraciones-generales)  

---

## 1. Introducción al Wallet Brick
**URL**: [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/wallet-brick/introduction](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/wallet-brick/introduction)

### 1.1 Descripción General
El *Wallet Brick* es un módulo de Checkout Bricks diseñado para **integrar pagos rápidos mediante la billetera de Mercado Pago**. Este componente permite a los usuarios autenticados en Mercado Pago realizar pagos utilizando los fondos disponibles en su cuenta (dinero en cuenta o créditos), así como acceder a métodos de pago guardados en su billetera, sin necesidad de ingresar datos adicionales en cada transacción.

- **Propósito**: Ofrecer una experiencia de pago simplificada y segura para usuarios recurrentes de Mercado Pago.
- **Integración**: Se basa en el SDK de Mercado Pago y requiere una inicialización previa (similar al *Payment Brick*).
- **Audiencia**: Desarrolladores y comercios que buscan aprovechar la base de usuarios de Mercado Pago para agilizar el checkout.

La página destaca que el *Wallet Brick* es ideal para mejorar la conversión al reducir la fricción en el proceso de pago, especialmente para clientes ya registrados en la plataforma.

### 1.2 Características Clave
La documentación resalta las siguientes características del *Wallet Brick*:

- **Pago Rápido**: Permite a los usuarios pagar directamente con su saldo de Mercado Pago o métodos guardados (tarjetas, etc.) con un solo clic.
- **Autenticación Integrada**: Incluye un flujo de inicio de sesión para usuarios no autenticados, manejado automáticamente por el Brick.
- **Seguridad**: Los datos sensibles y la autenticación son gestionados por Mercado Pago, cumpliendo con estándares como PCI DSS.
- **Personalización**: Aunque optimizado por defecto, permite ajustes visuales y de comportamiento.
- **Responsividad**: Se adapta al tamaño del contenedor, funcionando en dispositivos móviles y de escritorio.

### 1.3 Casos de Uso
El *Wallet Brick* es ideal para los siguientes escenarios:
- **Usuarios Recurrentes**: Comercios con clientes frecuentes que ya usan Mercado Pago.
- **Checkout Simplificado**: Situaciones donde se prioriza la velocidad sobre la flexibilidad de métodos de pago.
- **Integración con Billetera**: Proyectos que desean aprovechar la billetera digital de Mercado Pago como método principal.

La página menciona una **demostración interactiva** para probar el *Wallet Brick*, lo que sugiere que los desarrolladores pueden explorar su funcionalidad antes de implementarlo.

---

## 2. Renderizado por Defecto del Wallet Brick
**URL**: [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/wallet-brick/default-rendering](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/wallet-brick/default-rendering)

### 2.1 Descripción General
La página de *Default Rendering* explica cómo implementar el *Wallet Brick* con su configuración básica, conocida como "renderizado por defecto". Este enfoque utiliza un diseño predefinido por Mercado Pago, optimizado para mostrar un botón o interfaz que conecta al usuario con su billetera de Mercado Pago. La implementación requiere el SDK de Mercado Pago inicializado y sigue un proceso estandarizado.

- **Objetivo**: Permitir a los desarrolladores integrar rápidamente el *Wallet Brick* con un esfuerzo mínimo.
- **Requisitos Previos**: Haber cumplido con los prerrequisitos (credenciales, entorno) y la inicialización común del SDK (ver *Common Initialization*).

### 2.2 Pasos para el Renderizado
La documentación describe tres pasos principales:

1. **Instalar el SDK de Mercado Pago**:
   - Incluir el script `<script src="https://sdk.mercadopago.com/js/v2"></script>` en el HTML.
   - Este paso ya debería estar completo si se siguió la inicialización común.

2. **Inicializar el SDK**:
   - Usar la función `new MercadoPago()` con la *Public Key* para crear una instancia del SDK.
   - Ejemplo: `const mp = new MercadoPago('TEST-7843*********755-11221*********d497ae962*********ecf8d85-1*********');`.

3. **Renderizar el Wallet Brick**:
   - Crear un contenedor HTML (ej. `<div id="wallet-brick_container">`) donde se renderizará el Brick.
   - Utilizar el método `bricks()` del objeto SDK para configurar y montar el *Wallet Brick* con parámetros específicos.

### 2.3 Configuración Básica
La configuración mínima del *Wallet Brick* requiere un objeto con las siguientes propiedades:

- **`initialization`** (Object, Requerido):
  - `amount` (Number): Monto total del pago en la moneda local (sin decimales si es en centavos). Ejemplo: `1000` ($10.00 en Argentina).
  - `preferenceId` (String, Alternativo): ID de una preferencia de pago creada en el back-end (reemplaza `amount` si se usa).
  - `redirectMode` (String, Opcional): Define cómo se maneja la autenticación:
    - `"blank"`: Abre una nueva pestaña.
    - `"self"`: Redirige la misma pestaña.
    - `"modal"`: Muestra un modal (default).

- **`callbacks`** (Object, Opcional pero recomendado):
  - `onSubmit` (Function): Callback ejecutado al confirmar el pago desde la billetera. Recibe un objeto con los datos del pago y debe devolver una Promise para procesar el pago en el back-end.
  - `onReady` (Function): Callback ejecutado cuando el Brick está completamente renderizado.
  - `onError` (Function): Callback ejecutado si ocurre un error.

### 2.4 Ejemplos de Código

#### Ejemplo Básico con Monto
- **Descripción**: Renderiza el *Wallet Brick* con un monto fijo y autenticación en modal.
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Wallet Brick - Renderizado Básico</title>
  <script src="https://sdk.mercadopago.com/js/v2"></script>
</head>
<body>
  <div id="wallet-brick_container"></div>
  <script>
    // Inicializar el SDK
    const mp = new MercadoPago('TEST-7843*********755-11221*********d497ae962*********ecf8d85-1*********');
    const bricksBuilder = mp.bricks();

    // Renderizar el Wallet Brick
    const renderWalletBrick = async (bricksBuilder) => {
      const settings = {
        initialization: {
          amount: 1000 // $10.00
        },
        callbacks: {
          onSubmit: async (walletData) => {
            console.log(walletData);
            return new Promise((resolve, reject) => {
              fetch('/process-wallet-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(walletData)
              })
              .then(response => response.json())
              .then(data => resolve(data))
              .catch(error => reject(error));
            });
          },
          onReady: () => console.log('Wallet Brick listo'),
          onError: (error) => console.error('Error en Wallet Brick:', error)
        }
      };
      window.walletBrickController = await bricksBuilder.create('wallet', 'wallet-brick_container', settings);
    };

    renderWalletBrick(bricksBuilder);
  </script>
</body>
</html>
```

#### Ejemplo con Preferencia y Redirección
- **Descripción**: Usa una preferencia de pago y redirige en una nueva pestaña.
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Wallet Brick - Con Preferencia</title>
  <script src="https://sdk.mercadopago.com/js/v2"></script>
</head>
<body>
  <div id="wallet-brick_container"></div>
  <script>
    const mp = new MercadoPago('TEST-7843*********755-11221*********d497ae962*********ecf8d85-1*********');
    const bricksBuilder = mp.bricks();

    const renderWalletBrick = async (bricksBuilder) => {
      const settings = {
        initialization: {
          preferenceId: 'PREF_123456789', // Generado en el back-end
          redirectMode: 'blank' // Nueva pestaña
        },
        callbacks: {
          onSubmit: async (walletData) => {
            const response = await fetch('/process-wallet-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(walletData)
            });
            return response.json();
          },
          onReady: () => console.log('Brick cargado'),
          onError: (error) => console.error('Error:', error)
        }
      };
      window.walletBrickController = await bricksBuilder.create('wallet', 'wallet-brick_container', settings);
    };

    renderWalletBrick(bricksBuilder);
  </script>
</body>
</html>
```

- **Back-end (Node.js)** para generar `preferenceId`:
```javascript
const mercadopago = require('mercadopago');
mercadopago.configure({ access_token: 'TEST-4599*********755-11221*********d497ae962*********ecf8d85-1*********' });

async function createPreference() {
  const preference = await mercadopago.preferences.create({
    items: [{ title: 'Producto', unit_price: 1000, quantity: 1 }],
    payer: { email: 'test_user@example.com' }
  });
  return preference.body.id; // "PREF_123456789"
}
```

### 2.5 Callbacks y Manejo de Eventos
Los *callbacks* son esenciales para interactuar con el *Wallet Brick*:

- **`onSubmit`**:
  - **Parámetro**: Objeto `walletData` con propiedades como:
    - `paymentMethodId` (String): Ej. `"account_money"` para saldo de billetera.
    - `payer` (Object): Información del pagador (ej. `{ email: 'test_user@example.com' }`).
    - `token` (String, Opcional): Si se usa una tarjeta guardada.
  - **Retorno**: Debe devolver una Promise que resuelva con el resultado del procesamiento en el back-end (ej. `{ id: 'payment_id' }`).

- **`onReady`**:
  - Ejecutado cuando el Brick está visible (útil para indicadores de carga).

- **`onError`**:
  - Recibe un objeto de error (ej. `{ message: 'Authentication failed' }`).

- **Controlador**: El objeto `walletBrickController` permite:
  - `unmount()`: Elimina el Brick del DOM.
  - Ejemplo: `window.walletBrickController.unmount();`.

---

## 3. Consideraciones Generales

- **Autenticación**: Si el usuario no está logueado, el Brick abre una interfaz de login de Mercado Pago. El `redirectMode` define cómo se presenta.
- **Dependencia del Back-end**: Aunque el Brick opera en el front-end, el procesamiento final requiere una solicitud al back-end con el *Access Token*.
- **Preferencia vs. Monto**: Usar `preferenceId` permite configuraciones más avanzadas (ítems, descuentos), mientras que `amount` es más simple.
- **Seguridad**: Los datos sensibles son manejados por Mercado Pago, no por el comercio.
- **Pruebas**: Usa credenciales de prueba y cuentas sandbox de Mercado Pago para simular pagos con billetera.

---
