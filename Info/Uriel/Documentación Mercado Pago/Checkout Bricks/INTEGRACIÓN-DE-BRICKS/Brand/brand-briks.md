Este documento está estructurado para ofrecer una visión clara y organizada de la información contenida en cada enlace, con un enfoque en los aspectos técnicos y funcionales relevantes para desarrolladores.

---

# Documento Detallado sobre Brand Brick de Checkout Bricks (Mercado Pago)

Fecha: 29 de marzo de 2025  

## 1. Introducción al Brand Brick
**Fuente:** [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/brand-brick/introduction](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/brand-brick/introduction)

El **Brand Brick** es un componente de la suite **Checkout Bricks** de Mercado Pago diseñado para comunicar ventajas, conveniencias e información clave a los usuarios en una tienda en línea. Su propósito principal es transmitir mensajes relacionados con los métodos de pago disponibles a través de Mercado Pago, como las tarjetas aceptadas, opciones de pago en cuotas (con o sin tarjeta de crédito) y la credibilidad asociada a la marca. Este componente busca:

- **Incrementar la confianza del usuario:** Al destacar la seguridad y respaldo de Mercado Pago.
- **Fomentar las compras:** Al resaltar beneficios que pueden influir en la decisión de compra.
- **Aumentar el engagement:** Al integrar mensajes claros y visualmente atractivos en cualquier página de la tienda.

El Brand Brick se compone de **banners altamente personalizables** que incluyen una estructura básica con:
- Una imagen.
- Texto informativo.
- Un enlace opcional que abre un pop-up con detalles adicionales sobre las condiciones de compra.

Estos banners son flexibles y pueden adaptarse a diferentes secciones de un sitio web, permitiendo a los desarrolladores construir experiencias visuales en tiempo real y luego descargar o copiar el código generado para su integración.

---

## 2. Renderizado por Defecto del Brand Brick
**Fuente:** [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/brand-brick/default-rendering](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/brand-brick/default-rendering)

El renderizado por defecto del Brand Brick establece cómo se muestra el componente sin personalizaciones adicionales. Antes de renderizarlo, es necesario completar los **pasos de inicialización compartidos** entre todos los Bricks de Checkout Bricks. Posteriormente, se procede con la configuración específica del Brand Brick.

### Pasos para Renderizar el Brand Brick
1. **Inicialización:**
   - No requiere parámetros específicos en la inicialización básica, ya que el enfoque está en la presentación visual y no en datos transaccionales como otros Bricks (e.g., Payment Brick).

2. **Código de Renderizado:**
   ```javascript
   const renderBrandBrick = async (bricksBuilder) => {
       const settings = {};
       window.brandBrickController = await bricksBuilder.create(
           "brand",
           "brandBrick_container",
           settings
       );
   };
   renderBrandBrick(bricksBuilder);
   ```
   - **"brand":** Identificador del tipo de Brick.
   - **"brandBrick_container":** ID del contenedor HTML donde se renderizará el Brick.
   - **settings:** Objeto de configuración (vacío por defecto en este caso).

3. **Contenedor HTML:**
   ```html
   <div id="brandBrick_container"></div>
   ```
   - El ID del `<div>` debe coincidir con el valor pasado en el método `create()`.

4. **Resultado Visual:**
   - El Brick se muestra como un banner con un diseño predeterminado que incluye un mensaje genérico sobre los beneficios de pagar con Mercado Pago (e.g., métodos de pago disponibles y seguridad).

### Notas
- La documentación técnica proporciona detalles sobre los parámetros y respuestas de las funciones del Brick.
- El renderizado por defecto es un punto de partida que puede personalizarse según las necesidades del desarrollador (ver secciones siguientes).

---

## 3. Configuración de Métodos de Pago
**Fuente:** [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/brand-brick/settings/payment-methods](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/brand-brick/settings/payment-methods)

El Brand Brick permite configurar los métodos de pago que se comunicarán al usuario a través del banner. Estas configuraciones se pasan en el objeto `settings` bajo la propiedad `customization.paymentMethods`.

### Opciones de Configuración
- **excludedPaymentMethods:** Lista de métodos de pago excluidos.
  - Tipo: `string[]` (opcional, por defecto `[]`).
  - Opciones: `["master", "visa", "amex", "naranja", "maestro", "cabal", "cencosud", "cordobesa", "argencard", "diners", "tarshop", "cmr", "rapipago", "pagofacil", "mercadopago"]`.
  - Ejemplo: Excluir Mastercard:
    ```javascript
    customization: {
        paymentMethods: {
            excludedPaymentMethods: ["master"]
        }
    }
    ```

- **excludedPaymentTypes:** Tipos de pago excluidos.
  - Tipo: `string[]` (opcional, por defecto `[]`).
  - Opciones: `["credit_card", "debit_card", "ticket", "account_money", "mercado_credito"]`.
  - Ejemplo: Excluir pagos en efectivo:
    ```javascript
    customization: {
        paymentMethods: {
            excludedPaymentTypes: ["ticket"]
        }
    }
    ```

- **maxInstallments:** Número máximo de cuotas permitidas.
  - Tipo: `number` (opcional, mínimo 2, máximo 12).
  - Ejemplo: Limitar a 6 cuotas:
    ```javascript
    customization: {
        paymentMethods: {
            maxInstallments: 6
        }
    }
    ```

- **interestFreeInstallments:** Habilitar cuotas sin interés.
  - Tipo: `boolean` (opcional, por defecto `false`).
  - Ejemplo: Activar cuotas sin interés:
    ```javascript
    customization: {
        paymentMethods: {
            interestFreeInstallments: true
        }
    }
    ```

### Ejemplo Completo
```javascript
const settings = {
    customization: {
        paymentMethods: {
            excludedPaymentMethods: ["master"],
            excludedPaymentTypes: ["ticket"],
            maxInstallments: 12,
            interestFreeInstallments: true
        }
    }
};
window.brandBrickController = await bricksBuilder.create("brand", "brandBrick_container", settings);
```

### Impacto
Estas configuraciones determinan qué métodos de pago se destacan o excluyen en el mensaje del banner, adaptándolo a las políticas comerciales de la tienda.

---

## 4. Configuración del Renderizado por Defecto
**Fuente:** [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/brand-brick/settings/default-rendering](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/brand-brick/settings/default-rendering)

Esta sección detalla cómo personalizar el contenido textual del banner mediante la propiedad `valueProp` en el objeto `customization.text`. El texto mostrado depende de la propuesta de valor seleccionada.

### Opciones de `valueProp`
- **"payment_methods":** Muestra los métodos de pago disponibles.
- **"installments":** Enfatiza las opciones de pago en cuotas.
- **"security":** Resalta la seguridad de pagar con Mercado Pago.
- **"payment_methods_logos":** Destaca los logotipos de los métodos de pago.
- **"credits":** Promociona el uso de Mercado Crédito.

### Ejemplo de Configuración
```javascript
const settings = {
    customization: {
        text: {
            valueProp: "security"
        }
    }
};
window.brandBrickController = await bricksBuilder.create("brand", "brandBrick_container", settings);
```
- Resultado: El banner mostrará un mensaje sobre la seguridad de Mercado Pago (e.g., "Paga con tranquilidad, protegido por Mercado Pago").

### Notas
- La elección de `valueProp` afecta tanto el banner como el pop-up (si aplica).
- Puedes combinar esta configuración con las opciones de métodos de pago para un mensaje coherente.

---

## 5. Personalizaciones Visuales
**Fuente:** [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/brand-brick/visual-customizations](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/brand-brick/visual-customizations)

El Brand Brick permite personalizar su apariencia para alinearse con la identidad visual de la tienda. Estas personalizaciones se aplican mediante el objeto `customization` en el `settings`.

### Opciones de Personalización Visual
- **text.valueProp:** Define el mensaje principal (ver sección anterior).
- **Otros ajustes:** Aunque la documentación específica no detalla más propiedades visuales en este enlace, menciona la capacidad de construir y probar experiencias visuales en tiempo real, sugiriendo que ajustes como colores, fuentes o tamaños podrían estar disponibles en herramientas interactivas de Mercado Pago.

### Ejemplo Básico
```javascript
const settings = {
    customization: {
        text: {
            valueProp: "payment_methods"
        }
    }
};
window.brandBrickController = await bricksBuilder.create("brand", "brandBrick_container", settings);
```

### Herramienta de Prueba
- Los desarrolladores pueden usar la interfaz de Mercado Pago para diseñar el Brick en tiempo real, descargar el código generado y ajustarlo manualmente si es necesario.

---

## 6. Callbacks
**Fuente:** [https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/brand-brick/callbacks](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/brand-brick/callbacks)

Los **callbacks** permiten ejecutar funciones en respuesta a eventos específicos del Brand Brick. Estos se definen en el objeto `settings.callbacks`.

### Callbacks Disponibles
1. **onReady:**
   - Se ejecuta cuando el Brick está completamente cargado y listo.
   - Útil para ocultar loadings o realizar ajustes iniciales.
   ```javascript
   onReady: () => {
       console.log("Brand Brick está listo");
   }
   ```

2. **onError:**
   - Se ejecuta ante cualquier error en el Brick.
   - Recibe un parámetro `error` con detalles del problema.
   ```javascript
   onError: (error) => {
       console.error("Error en Brand Brick:", error);
   }
   ```

### Ejemplo Completo
```javascript
const settings = {
    callbacks: {
        onReady: () => {
            console.log("Brand Brick cargado exitosamente");
        },
        onError: (error) => {
            console.error("Ocurrió un error:", error);
        }
    }
};
window.brandBrickController = await bricksBuilder.create("brand", "brandBrick_container", settings);
```

### Notas
- A diferencia de otros Bricks (como Payment Brick), el Brand Brick no incluye un callback `onSubmit`, ya que su función es informativa y no transaccional.
- Los callbacks son opcionales pero recomendados para monitorear el estado del componente.

---

## Conclusión
El **Brand Brick** es una herramienta poderosa dentro de Checkout Bricks para comunicar ventajas de pago y reforzar la confianza del usuario en una tienda en línea. Su implementación es sencilla, con un renderizado por defecto funcional que puede personalizarse ampliamente en términos de métodos de pago, mensajes textuales y comportamiento mediante callbacks. Este componente es ideal para desarrolladores que buscan mejorar la experiencia de usuario sin sacrificar facilidad de integración.

Para una implementación exitosa:
1. Configura los pasos de inicialización generales de Checkout Bricks.
2. Define el contenedor HTML y el código de renderizado básico.
3. Personaliza según las necesidades de tu tienda (métodos de pago, texto, callbacks).
4. Prueba y ajusta en tiempo real utilizando las herramientas de Mercado Pago.

Este documento proporciona una base sólida para trabajar con el Brand Brick, basada en la documentación oficial al 29 de marzo de 2025.

--- 