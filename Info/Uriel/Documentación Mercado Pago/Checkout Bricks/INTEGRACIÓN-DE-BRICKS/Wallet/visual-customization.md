# Documento Detallado: Personalizaciones Visuales del Wallet Brick de Checkout Bricks

**Fecha**: 29 de marzo de 2025  
**Autor**: Grok 3, creado por xAI  
**Propósito**: Proporcionar una guía exhaustiva y práctica sobre las personalizaciones visuales del *Wallet Brick* de Checkout Bricks, específicamente para cambiar textos y apariencia, basada en las páginas oficiales de la documentación para desarrolladores de Mercado Pago.

---

## Índice
1. [Cambiar Textos en el Wallet Brick](#1-cambiar-textos-en-el-wallet-brick)  
   - [Descripción General](#11-descripción-general)  
   - [Configuración](#12-configuración)  
   - [Ejemplos de Código](#13-ejemplos-de-código)  
   - [Notas Prácticas](#14-notas-prácticas)  
2. [Cambiar Apariencia en el Wallet Brick](#2-cambiar-apariencia-en-el-wallet-brick)  
   - [Descripción General](#21-descripción-general)  
   - [Configuración](#22-configuración)  
   - [Ejemplos de Código](#23-ejemplos-de-código)  
   - [Notas Prácticas](#24-notas-prácticas)  
3. [Consideraciones Generales](#3-consideraciones-generales)  

---

## 1. Cambiar Textos en el Wallet Brick
**URL**: [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/wallet-brick/visual-customizations/change-texts](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/wallet-brick/visual-customizations/change-texts)

### 1.1 Descripción General
La funcionalidad de *Change Texts* permite **modificar los textos predeterminados** del *Wallet Brick* para adaptarlos al tono, idioma o branding del comercio. Esto incluye el texto del botón principal que inicia el flujo de pago con la billetera de Mercado Pago, ofreciendo control sobre la comunicación visual presentada al usuario.

- **Propósito**: Personalizar la interfaz para alinearla con la identidad del comercio y mejorar la experiencia del usuario.
- **Alcance**: Afecta solo los textos visibles, no la funcionalidad subyacente del Brick.

### 1.2 Configuración
La personalización se realiza a través del objeto `customization.texts` en la configuración del *Wallet Brick*. El único texto personalizable mencionado específicamente es:

- **`actionButton`** (Object):
  - `value` (String): Texto del botón que inicia el flujo de pago con la billetera.
  - Default: `"Pagar con Mercado Pago"`.

### 1.3 Ejemplos de Código

#### Ejemplo Básico: Cambiar el Texto del Botón
- **Descripción**: Modifica el texto predeterminado del botón.
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Wallet Brick - Cambiar Texto</title>
  <script src="https://sdk.mercadopago.com/js/v2"></script>
</head>
<body>
  <div id="wallet-brick_container"></div>
  <script>
    const mp = new MercadoPago('TEST-7843*********755-11221*********d497ae962*********ecf8d85-1*********');
    const bricksBuilder = mp.bricks();

    const renderWalletBrick = async (bricksBuilder) => {
      const settings = {
        initialization: { amount: 1000 },
        customization: {
          texts: {
            actionButton: { value: "Pagar con mi Billetera" }
          }
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

#### Ejemplo con Contexto: Tono Informal
- **Descripción**: Usa un tono más amigable.
```javascript
const settings = {
  initialization: { amount: 1000 },
  customization: {
    texts: {
      actionButton: { value: "Pagá fácil con Mercado Pago" }
    }
  },
  callbacks: { onSubmit: async (data) => {/* Procesar */} }
};
await bricksBuilder.create('wallet', 'wallet-brick_container', settings);
```

### 1.4 Notas Prácticas
- **Limitación**: Solo el botón principal es personalizable según esta sección; otros textos (ej. en la ventana de autenticación) dependen de Mercado Pago.
- **Idioma**: Asegúrate de que el texto coincida con el `locale` del SDK (ej. `es-AR`).
- **Casos de Uso**: Ajustar el mensaje para reflejar promociones (ej. "Pagar con Saldo Gratis") o el estilo del comercio.
- **Pruebas**: Verifica cómo se ve el texto en el botón renderizado para evitar cortes o desbordamientos.

---

## 2. Cambiar Apariencia en el Wallet Brick
**URL**: [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/wallet-brick/visual-customizations/change-appearance](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/wallet-brick/visual-customizations/change-appearance)

### 2.1 Descripción General
La funcionalidad de *Change Appearance* permite **personalizar la apariencia visual** del *Wallet Brick*, específicamente el botón que inicia el flujo de pago. Esto incluye cambiar colores y estilos para alinearlo con la estética del sitio del comercio, mejorando la integración visual.

- **Propósito**: Ajustar el diseño del Brick para que se integre armoniosamente con el branding del comercio.
- **Alcance**: Afecta solo el estilo visual del botón, no su funcionalidad ni la interfaz de Mercado Pago posterior.

### 2.2 Configuración
La personalización se realiza a través del objeto `customization.visual` en la configuración del *Wallet Brick*. Los parámetros disponibles son:

- **`button`** (Object):
  - `background` (String): Color de fondo del botón (formato HEX). Default: `"#009EE3"` (azul de Mercado Pago).
  - `text` (String): Color del texto (formato HEX). Default: `"#FFFFFF"` (blanco).
  - `border` (String): Color del borde (formato HEX). Default: `"#009EE3"`.
  - `borderRadius` (String): Radio del borde (ej. `"4px"`). Default: `"4px"`.
  - `height` (String): Altura del botón (ej. `"48px"`). Default: `"48px"`.

### 2.3 Ejemplos de Código

#### Ejemplo Básico: Cambiar Colores
- **Descripción**: Cambia el fondo y el texto del botón.
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Wallet Brick - Cambiar Apariencia</title>
  <script src="https://sdk.mercadopago.com/js/v2"></script>
</head>
<body>
  <div id="wallet-brick_container"></div>
  <script>
    const mp = new MercadoPago('TEST-7843*********755-11221*********d497ae962*********ecf8d85-1*********');
    const bricksBuilder = mp.bricks();

    const renderWalletBrick = async (bricksBuilder) => {
      const settings = {
        initialization: { amount: 1000 },
        customization: {
          visual: {
            button: {
              background: '#28A745', // Verde
              text: '#FFFFFF'        // Blanco
            }
          }
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

#### Ejemplo Completo: Personalización Total
- **Descripción**: Ajusta todos los parámetros visuales.
```javascript
const settings = {
  initialization: { amount: 1000 },
  customization: {
    visual: {
      button: {
        background: '#FF5733',   // Naranja
        text: '#000000',         // Negro
        border: '#000000',       // Borde negro
        borderRadius: '8px',     // Bordes más redondeados
        height: '56px'           // Botón más alto
      }
    }
  },
  callbacks: { onSubmit: async (data) => {/* Procesar */} }
};
await bricksBuilder.create('wallet', 'wallet-brick_container', settings);
```

### 2.4 Notas Prácticas
- **Consistencia**: Elige colores que contrasten bien (ej. texto claro sobre fondo oscuro).
- **Limitación**: Solo afecta el botón inicial; la interfaz de autenticación de Mercado Pago no es personalizable.
- **Casos de Uso**: 
  - Alinear el botón con la paleta de colores del sitio.
  - Aumentar la altura para mayor visibilidad.
- **Pruebas**: Renderiza el Brick en diferentes dispositivos para asegurar que el diseño sea responsive.

---

## 3. Consideraciones Generales

- **Combinación**: Puedes usar `texts` y `visual` juntos para una personalización completa del botón.
  - Ejemplo:
  ```javascript
  customization: {
    texts: { actionButton: { value: "Usar Billetera" } },
    visual: { button: { background: '#007BFF', text: '#FFFFFF' } }
  }
  ```
- **Impacto**: Estas personalizaciones son puramente estéticas y no afectan el flujo de pago.
- **Pruebas**: Usa el entorno sandbox para verificar cómo se ven los cambios antes de producción.
- **Flexibilidad**: Aunque limitada al botón, permite una integración visual efectiva con el diseño del comercio.
- **Dependencia del SDK**: Asegúrate de que el SDK esté inicializado con una *Public Key* válida.

---
