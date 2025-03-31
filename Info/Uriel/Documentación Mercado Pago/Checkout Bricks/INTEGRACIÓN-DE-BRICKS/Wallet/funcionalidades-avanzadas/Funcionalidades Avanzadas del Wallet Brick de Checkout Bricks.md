# Documento Detallado: Funcionalidades Avanzadas del Wallet Brick de Checkout Bricks

**Fecha**: 29 de marzo de 2025  
**Propósito**: Proporcionar una guía exhaustiva y práctica sobre las funcionalidades avanzadas del *Wallet Brick* de Checkout Bricks, basada en las páginas oficiales de la documentación para desarrolladores de Mercado Pago, para facilitar su implementación.

---

## Índice
1. [Preferencias](#1-preferencias)  
   - [Descripción General](#11-descripción-general)  
   - [Configuración](#12-configuración)  
   - [Ejemplo de Código](#13-ejemplo-de-código)  
   - [Notas Prácticas](#14-notas-prácticas)  
2. [Envío de Preferencia](#2-envío-de-preferencia)  
   - [Descripción General](#21-descripción-general)  
   - [Configuración](#22-configuración)  
   - [Ejemplo de Código](#23-ejemplo-de-código)  
   - [Notas Prácticas](#24-notas-prácticas)  
3. [Modo de Apertura](#3-modo-de-apertura)  
   - [Descripción General](#31-descripción-general)  
   - [Configuración](#32-configuración)  
   - [Ejemplo de Código](#33-ejemplo-de-código)  
   - [Notas Prácticas](#34-notas-prácticas)  
4. [Callbacks Adicionales](#4-callbacks-adicionales)  
   - [Descripción General](#41-descripción-general)  
   - [Configuración](#42-configuración)  
   - [Ejemplo de Código](#43-ejemplo-de-código)  
   - [Notas Prácticas](#44-notas-prácticas)  
5. [Consideraciones Generales](#5-consideraciones-generales)  

---

## 1. Preferencias
**URL**: [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/wallet-brick/advanced-features/preferences](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/wallet-brick/advanced-features/preferences)

### 1.1 Descripción General
Esta funcionalidad permite **usar una preferencia de pago** creada en el back-end para preconfigurar el *Wallet Brick*, en lugar de pasar un monto directamente. Una preferencia es un objeto que define detalles de la transacción (ítems, monto, pagador) y se genera mediante la API de Mercado Pago.

- **Propósito**: Añadir flexibilidad y control al flujo de pago, permitiendo configuraciones avanzadas como descuentos o ítems múltiples.

### 1.2 Configuración
- **Ubicación**: `initialization.preferenceId`.
- **preferenceId** (String): ID de la preferencia generada en el back-end con la API `/checkout/preferences`.

### 1.3 Ejemplo de Código
- **Back-end (Node.js)**: Crear la preferencia.
```javascript
const mercadopago = require('mercadopago');
mercadopago.configure({ access_token: 'TEST-4599*********755-11221*********d497ae962*********ecf8d85-1*********' });

async function createPreference() {
  const preference = await mercadopago.preferences.create({
    items: [{ title: 'Producto', unit_price: 1000, quantity: 1 }],
    payer: { email: 'test_user@example.com' }
  });
  return preference.body.id; // Ej. "PREF_123456789"
}

// Llamar desde una ruta para obtener el ID
```

- **Front-end**: Usar el `preferenceId`.
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Wallet Brick - Preferencias</title>
  <script src="https://sdk.mercadopago.com/js/v2"></script>
</head>
<body>
  <div id="wallet-brick_container"></div>
  <script>
    const mp = new MercadoPago('TEST-7843*********755-11221*********d497ae962*********ecf8d85-1*********');
    const bricksBuilder = mp.bricks();

    const renderWalletBrick = async (bricksBuilder) => {
      const preferenceId = await fetch('/create-preference').then(res => res.json()).then(data => data.id);
      const settings = {
        initialization: {
          preferenceId: preferenceId // Ej. "PREF_123456789"
        },
        callbacks: {
          onSubmit: async (walletData) => {
            const response = await fetch('/process-wallet-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(walletData)
            });
            return response.json();
          }
        }
      };
      await bricksBuilder.create('wallet', 'wallet-brick_container', settings);
    };

    renderWalletBrick(bricksBuilder);
  </script>
</body>
</html>
```

### 1.4 Notas Prácticas
- **Ventaja**: Permite incluir detalles como ítems, descuentos o configuraciones específicas del pagador.
- **Requisito**: El back-end debe generar el `preferenceId` antes de renderizar el Brick.
- **Alternativa**: Si se usa `preferenceId`, no se necesita `amount`.

---

## 2. Envío de Preferencia
**URL**: [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/wallet-brick/advanced-features/preference-submit](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/wallet-brick/advanced-features/preference-submit)

### 2.1 Descripción General
Esta funcionalidad detalla cómo **procesar un pago** usando el *Wallet Brick* con una preferencia, enfocándose en el flujo de envío desde el front-end al back-end tras la interacción del usuario con la billetera de Mercado Pago.

### 2.2 Configuración
- **Callback**: `onSubmit` recibe los datos del pago y requiere una Promise para procesarlos.
- **Datos Recibidos**: 
  - `paymentMethodId` (String): Método seleccionado (ej. `"account_money"`).
  - `payer` (Object): Información del pagador.
  - Otros campos según el método usado.

### 2.3 Ejemplo de Código
- **Front-end**:
```javascript
const settings = {
  initialization: { preferenceId: 'PREF_123456789' },
  callbacks: {
    onSubmit: async (walletData) => {
      try {
        const response = await fetch('/process-wallet-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(walletData)
        });
        const result = await response.json();
        console.log('Pago procesado:', result);
        return result;
      } catch (error) {
        console.error('Error:', error);
        throw error;
      }
    }
  }
};
await bricksBuilder.create('wallet', 'wallet-brick_container', settings);
```

- **Back-end (Node.js)**:
```javascript
const express = require('express');
const mercadopago = require('mercadopago');
const app = express();

app.use(express.json());
mercadopago.configure({ access_token: 'TEST-4599*********755-11221*********d497ae962*********ecf8d85-1*********' });

app.post('/process-wallet-payment', async (req, res) => {
  try {
    const walletData = req.body;
    const payment = await mercadopago.payment.create({
      transaction_amount: 1000, // Monto derivado de la preferencia
      payment_method_id: walletData.paymentMethodId,
      payer: { email: walletData.payer.email }
    });
    res.json({ id: payment.body.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('Servidor en puerto 3000'));
```

### 2.4 Notas Prácticas
- **Flujo**: El usuario autentica en la billetera, confirma el pago, y el Brick envía los datos a `onSubmit`.
- **Back-end**: Usa el *Access Token* para procesar el pago con la API `/v1/payments`.
- **Validación**: Verifica que el `preferenceId` coincida con la transacción.

---

## 3. Modo de Apertura
**URL**: [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/wallet-brick/advanced-features/opening-mode](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/wallet-brick/advanced-features/opening-mode)

### 3.1 Descripción General
Permite **controlar cómo se abre la interfaz de autenticación** de Mercado Pago en el *Wallet Brick* cuando el usuario no está logueado.

### 3.2 Configuración
- **Ubicación**: `initialization.redirectMode`.
- **Opciones**:
  - `"modal"`: Abre un modal (default).
  - `"blank"`: Abre una nueva pestaña.
  - `"self"`: Redirige la misma pestaña.

### 3.3 Ejemplo de Código
```javascript
const settings = {
  initialization: {
    amount: 1000,
    redirectMode: 'blank' // Nueva pestaña
  },
  callbacks: {
    onSubmit: async (walletData) => {/* Procesar */}
  }
};
await bricksBuilder.create('wallet', 'wallet-brick_container', settings);
```

### 3.4 Notas Prácticas
- **Modal**: Ideal para mantener al usuario en la misma página.
- **Blank**: Útil para flujos separados, pero requiere manejo de retorno.
- **Self**: Redirige completamente, perdiendo el contexto original.

---

## 4. Callbacks Adicionales
**URL**: [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/wallet-brick/advanced-features/additional-callbacks](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/wallet-brick/advanced-features/additional-callbacks)

### 4.1 Descripción General
Añade **callbacks adicionales** para manejar eventos específicos del *Wallet Brick*, mejorando la interacción y el control del flujo.

### 4.2 Configuración
- **Ubicación**: `callbacks`.
- **Callbacks Soportados**:
  - `onReadyForCheckout` (Function): Ejecutado cuando el Brick está listo para procesar el checkout.

### 4.3 Ejemplo de Código
```javascript
const settings = {
  initialization: { amount: 1000 },
  callbacks: {
    onSubmit: async (walletData) => {/* Procesar */},
    onReadyForCheckout: () => {
      console.log('Wallet Brick listo para checkout');
      document.getElementById('loading').style.display = 'none';
    },
    onError: (error) => console.error('Error:', error)
  }
};
await bricksBuilder.create('wallet', 'wallet-brick_container', settings);
```

### 4.4 Notas Prácticas
- **Uso**: `onReadyForCheckout` es útil para mostrar/hide elementos UI (ej. un spinner).
- **Parámetros**: No recibe datos específicos, solo indica que el Brick está funcional.
- **Combinación**: Se puede usar junto con `onSubmit` y `onError`.

---

## 5. Consideraciones Generales

- **Integración Combinada**: Estas funcionalidades pueden usarse juntas (ej. preferencia con modo de apertura específico).
- **Back-end Esencial**: Preferencias y envío requieren lógica en el servidor con el *Access Token*.
- **Pruebas**: Usa cuentas sandbox y credenciales de prueba para validar cada funcionalidad.
- **Flexibilidad**: El *Wallet Brick* se adapta a diferentes flujos, pero está optimizado para usuarios de Mercado Pago.
- **Dependencias**: Asegúrate de que el SDK esté inicializado correctamente antes de aplicar estas configuraciones.

---
