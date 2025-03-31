# Documento Detallado: Referencia Completa de la API de Tarjetas de Mercado Pago

**Fecha**: 29 de marzo de 2025  
**Propósito**: Proporcionar una explicación exhaustiva de las funcionalidades de la API de Mercado Pago relacionadas con la gestión de tarjetas de clientes, basada en las referencias oficiales de la documentación para desarrolladores.

---

## Índice
1. [POST /v1/customers/{customer_id}/cards](#1-post-v1customerscustomer_idcards)  
2. [GET /v1/customers/{customer_id}/cards](#2-get-v1customerscustomer_idcards)  
3. [GET /v1/customers/{customer_id}/cards/{id}](#3-get-v1customerscustomer_idcardsid)  
4. [PUT /v1/customers/{customer_id}/cards/{id}](#4-put-v1customerscustomer_idcardsid)  
5. [DELETE /v1/customers/{customer_id}/cards/{id}](#5-delete-v1customerscustomer_idcardsid)  
6. [Consideraciones Generales](#6-consideraciones-generales)  

---

## 1. POST /v1/customers/{customer_id}/cards
**URL**: [https://www.mercadopago.com.ar/developers/es/reference/cards/_customers_customer_id_cards/post](https://www.mercadopago.com.ar/developers/es/reference/cards/_customers_customer_id_cards/post)

### Descripción General
Este endpoint permite **crear y guardar una nueva tarjeta** asociada a un cliente en los servidores de Mercado Pago. Su propósito principal es facilitar pagos recurrentes al almacenar de manera segura los datos de la tarjeta, evitando que el usuario deba ingresarlos repetidamente. Este proceso utiliza un `token` previamente generado para garantizar la seguridad y cumplir con normativas como PCI DSS.

### Método HTTP
- **POST**: Indica la creación de un nuevo recurso (en este caso, una tarjeta).

### URL y Estructura
- **Base URL**: `https://api.mercadopago.com/v1`
- **Ruta**: `/customers/{customer_id}/cards`
- **Parámetro dinámico**:
  - `{customer_id}` (String, Requerido): Identificador único del cliente en Mercado Pago, generado al crear un cliente mediante la API de Customers.

### Encabezados Requeridos
- `Content-Type: application/json`: Especifica que el cuerpo de la solicitud está en formato JSON.
- `Authorization: Bearer {access_token}`: Token de acceso para autenticar la solicitud. Ejemplo: `Bearer TEST-4599*********755-11221*********d497ae962*********ecf8d85-1*********`.

### Cuerpo de la Solicitud
- **Formato**: JSON
- **Campos**:
  - `token` (String, Requerido): Token único generado para la tarjeta mediante el SDK de Mercado Pago o la API de tokenización (`/v1/card_tokens`). Representa los datos sensibles de la tarjeta (número, fecha de vencimiento, etc.) de forma segura.
    - Ejemplo: `"9b2d63e00d66a8c721607214ceda233a"`.

### Ejemplo de Solicitud
```bash
curl -X POST \
  'https://api.mercadopago.com/v1/customers/448870796-7ZjwhKGxILixxN/cards' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer TEST-4599*********755-11221*********d497ae962*********ecf8d85-1*********' \
  -d '{
    "token": "9b2d63e00d66a8c721607214ceda233a"
  }'
```

### Respuesta Exitosa
- **Código HTTP**: 201 (Created)
- **Cuerpo de la respuesta**: JSON con los detalles de la tarjeta creada.
- **Campos de la respuesta**:
  - `id` (Number): Identificador único de la tarjeta en Mercado Pago.
  - `expiration_month` (Number): Mes de vencimiento (1-12).
  - `expiration_year` (Number): Año de vencimiento (ej. 2023).
  - `first_six_digits` (String): Primeros 6 dígitos de la tarjeta (BIN).
  - `last_four_digits` (String): Últimos 4 dígitos de la tarjeta.
  - `payment_method` (Object): Detalles del método de pago.
    - `id` (String): Identificador del método (ej. "visa").
    - `name` (String): Nombre legible (ej. "Visa").
    - `payment_type_id` (String): Tipo de pago (ej. "credit_card").
    - `thumbnail` (String): URL de la imagen del método de pago.
    - `secure_thumbnail` (String): URL segura de la imagen.
  - `security_code` (Object): Información del código de seguridad.
    - `length` (Number): Longitud del código (ej. 3).
    - `card_location` (String): Ubicación en la tarjeta (ej. "back").
  - `issuer` (Object): Emisor de la tarjeta.
    - `id` (String): Identificador del emisor.
    - `name` (String): Nombre del emisor (ej. "Visa").
  - `cardholder` (Object): Datos del titular.
    - `name` (String): Nombre del titular.
    - `identification` (Object): Identificación del titular.
      - `number` (String): Número de documento.
      - `type` (String): Tipo de documento (ej. "CPF").
  - `date_created` (String): Fecha de creación (ISO 8601).
  - `date_last_updated` (String): Fecha de última actualización.
  - `customer_id` (String): ID del cliente asociado.
  - `user_id` (Number): ID del usuario en Mercado Pago.
  - `live_mode` (Boolean): Indica si es un entorno real (true) o de prueba (false).

- **Ejemplo**:
```json
{
  "id": 1562188766852,
  "expiration_month": 6,
  "expiration_year": 2023,
  "first_six_digits": "423564",
  "last_four_digits": "5682",
  "payment_method": {
    "id": "visa",
    "name": "visa",
    "payment_type_id": "credit_card",
    "thumbnail": "http://img.mlstatic.com/org-img/MP3/API/logos/visa.gif",
    "secure_thumbnail": "https://www.mercadopago.com/org-img/MP3/API/logos/visa.gif"
  },
  "security_code": {
    "length": 3,
    "card_location": "back"
  },
  "issuer": {
    "id": "25",
    "name": "Visa"
  },
  "cardholder": {
    "name": "APRO",
    "identification": {
      "number": "19119119100",
      "type": "CPF"
    }
  },
  "date_created": "2019-07-03T21:15:35.000Z",
  "date_last_updated": "2019-07-03T21:19:18.000Z",
  "customer_id": "448870796-7ZjwhKGxILixxN",
  "user_id": 448870796,
  "live_mode": true
}
```

### Posibles Errores
- **400 Bad Request**: Token inválido o faltante.
  - Ejemplo: `{"message": "invalid parameter 'token'"}`
- **401 Unauthorized**: Token de acceso inválido o ausente.
- **404 Not Found**: El `customer_id` no existe.

### Notas Adicionales
- El `token` debe generarse previamente con el SDK de Mercado Pago o la API `/v1/card_tokens`.
- Este endpoint no almacena datos sensibles directamente; el `token` actúa como una referencia segura.

---

## 2. GET /v1/customers/{customer_id}/cards
**URL**: [https://www.mercadopago.com.ar/developers/es/reference/cards/_customers_customer_id_cards/get](https://www.mercadopago.com.ar/developers/es/reference/cards/_customers_customer_id_cards/get)

### Descripción General
Este endpoint permite **obtener una lista de todas las tarjetas asociadas a un cliente específico**. Es útil para mostrar al usuario sus métodos de pago guardados durante un proceso de checkout.

### Método HTTP
- **GET**: Consulta de recursos existentes.

### URL y Estructura
- **Base URL**: `https://api.mercadopago.com/v1`
- **Ruta**: `/customers/{customer_id}/cards`
- **Parámetro dinámico**:
  - `{customer_id}` (String, Requerido): Identificador único del cliente.

### Encabezados Requeridos
- `Content-Type: application/json`
- `Authorization: Bearer {access_token}`

### Cuerpo de la Solicitud
- No se requiere cuerpo; es una solicitud GET.

### Ejemplo de Solicitud
```bash
curl -X GET \
  'https://api.mercadopago.com/v1/customers/329653963-byLEdchVPhPc4H/cards' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer TEST-4599*********755-11221*********d497ae962*********ecf8d85-1*********'
```

### Respuesta Exitosa
- **Código HTTP**: 200 (OK)
- **Cuerpo de la respuesta**: Lista de objetos JSON, cada uno representando una tarjeta.
- **Campos**: Ver desglose en la sección anterior (POST). Cada tarjeta incluye los mismos campos.
- **Ejemplo**:
```json
[
  {
    "id": "277090284",
    "date_created": "2018-07-18T13:28:32.000-04:00",
    "date_last_updated": "2018-08-07T12:21:32.243-04:00",
    "customer_id": "329653963-byLEdchVPhPc4H",
    "expiration_month": 11,
    "expiration_year": 2020,
    "first_six_digits": "423564",
    "last_four_digits": "5682",
    "payment_method": {
      "id": "visa",
      "name": "Visa",
      "payment_type_id": "credit_card",
      "thumbnail": "http://img.mlstatic.com/org-img/MP3/API/logos/visa.gif",
      "secure_thumbnail": "https://www.mercadopago.com/org-img/MP3/API/logos/visa.gif"
    },
    "security_code": {
      "length": 3,
      "card_location": "back"
    },
    "issuer": {
      "id": "25",
      "name": "Visa"
    },
    "cardholder": {
      "name": "APRO",
      "identification": {
        "number": "19119119100",
        "type": "CPF"
      }
    },
    "user_id": "12123adfasdf123u4u",
    "live_mode": true
  }
]
```

### Posibles Errores
- **401 Unauthorized**: Token inválido o ausente.
- **404 Not Found**: El cliente no existe.
- **Respuesta vacía**: Si el cliente no tiene tarjetas, se devuelve `[]`.

### Notas Adicionales
- No hay paginación explícita en este endpoint; devuelve todas las tarjetas en una sola respuesta.
- Ideal para integraciones donde se necesita mostrar opciones de pago al usuario.

---

## 3. GET /v1/customers/{customer_id}/cards/{id}
**URL**: [https://www.mercadopago.com.ar/developers/es/reference/cards/_customers_customer_id_cards_id/get](https://www.mercadopago.com.ar/developers/es/reference/cards/_customers_customer_id_cards_id/get)

### Descripción General
Este endpoint permite **consultar los detalles de una tarjeta específica** asociada a un cliente, identificada por su `id`. Es útil para verificar o mostrar información detallada de una tarjeta en particular.

### Método HTTP
- **GET**: Consulta de un recurso específico.

### URL y Estructura
- **Base URL**: `https://api.mercadopago.com/v1`
- **Ruta**: `/customers/{customer_id}/cards/{id}`
- **Parámetros dinámicos**:
  - `{customer_id}` (String, Requerido): ID del cliente.
  - `{id}` (String, Requerido): ID de la tarjeta.

### Encabezados Requeridos
- `Content-Type: application/json`
- `Authorization: Bearer {access_token}`

### Ejemplo de Solicitud
```bash
curl -X GET \
  'https://api.mercadopago.com/v1/customers/470183340-cpunOI7UsIHlHr/cards/8987269652' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer TEST-4599*********755-11221*********d497ae962*********ecf8d85-1*********'
```

### Respuesta Exitosa
- **Código HTTP**: 200 (OK)
- **Cuerpo de la respuesta**: Objeto JSON con los detalles de la tarjeta.
- **Ejemplo**:
```json
{
  "id": "8987269652",
  "date_created": "2021-03-16T16:08:20.592-04:00",
  "date_last_updated": "2021-03-16T16:08:20.592-04:00",
  "customer_id": "470183340-cpunOI7UsIHlHr",
  "expiration_month": 6,
  "expiration_year": 2023,
  "first_six_digits": "503143",
  "last_four_digits": "6351",
  "payment_method": {
    "id": "master",
    "name": "Mastercard",
    "payment_type_id": "credit_card",
    "thumbnail": "http://img.mlstatic.com/org-img/MP3/API/logos/master.gif",
    "secure_thumbnail": "https://www.mercadopago.com/org-img/MP3/API/logos/master.gif"
  },
  "security_code": {
    "length": 3,
    "card_location": "back"
  },
  "issuer": {
    "id": "24",
    "name": "Mastercard"
  },
  "cardholder": {
    "name": "APRO",
    "identification": {
      "number": "19119119100",
      "type": "CPF"
    }
  },
  "user_id": "470183340",
  "live_mode": true
}
```

### Posibles Errores
- **404 Not Found**: La tarjeta o el cliente no existen.
- **401 Unauthorized**: Token inválido.

### Notas Adicionales
- Este endpoint es más específico que el GET de lista y devuelve un solo objeto.

---

## 4. PUT /v1/customers/{customer_id}/cards/{id}
**URL**: [https://www.mercadopago.com.ar/developers/es/reference/cards/_customers_customer_id_cards_id/put](https://www.mercadopago.com.ar/developers/es/reference/cards/_customers_customer_id_cards_id/put)

### Descripción General
Este endpoint permite **actualizar los datos de una tarjeta existente** asociada a un cliente, como renovar un token en caso de que la tarjeta haya cambiado (por ejemplo, por vencimiento o reemisión).

### Método HTTP
- **PUT**: Actualización de un recurso existente.

### URL y Estructura
- **Base URL**: `https://api.mercadopago.com/v1`
- **Ruta**: `/customers/{customer_id}/cards/{id}`
- **Parámetros dinámicos**:
  - `{customer_id}` (String, Requerido): ID del cliente.
  - `{id}` (String, Requerido): ID de la tarjeta.

### Encabezados Requeridos
- `Content-Type: application/json`
- `Authorization: Bearer {access_token}`

### Cuerpo de la Solicitud
- **Formato**: JSON
- **Campos**:
  - `token` (String, Requerido): Nuevo token para actualizar la tarjeta.
    - Ejemplo: `"9b2d63e00d66a8c721607214ceda233a"`.

### Ejemplo de Solicitud
```bash
curl -X PUT \
  'https://api.mercadopago.com/v1/customers/470183340-cpunOI7UsIHlHr/cards/8987269652' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer TEST-4599*********755-11221*********d497ae962*********ecf8d85-1*********' \
  -d '{
    "token": "9b2d63e00d66a8c721607214ceda233a"
  }'
```

### Respuesta Exitosa
- **Código HTTP**: 200 (OK)
- **Cuerpo de la respuesta**: Detalles actualizados de la tarjeta.
- **Ejemplo**:
```json
{
  "id": "8987269652",
  "expiration_month": 7,
  "expiration_year": 2023,
  "first_six_digits": "503143",
  "last_four_digits": "6351",
  "payment_method": {
    "id": "master",
    "name": "Mastercard",
    "payment_type_id": "credit_card",
    "thumbnail": "http://img.mlstatic.com/org-img/MP3/API/logos/master.gif",
    "secure_thumbnail": "https://www.mercadopago.com/org-img/MP3/API/logos/master.gif"
  },
  "security_code": {
    "length": 3,
    "card_location": "back"
  },
  "issuer": {
    "id": "24",
    "name": "Mastercard"
  },
  "cardholder": {
    "name": "APRO",
    "identification": {
      "number": "19119119100",
      "type": "CPF"
    }
  },
  "date_created": "2021-03-16T16:08:21.000-04:00",
  "date_last_updated": "2021-03-16T16:11:54.294-04:00",
  "customer_id": "470183340-cpunOI7UsIHlHr",
  "user_id": "470183340",
  "live_mode": true
}
```

### Posibles Errores
- **400 Bad Request**: Token inválido.
- **404 Not Found**: Tarjeta o cliente no encontrados.

### Notas Adicionales
- Solo permite actualizar el token; otros campos como `cardholder` no son modificables directamente aquí.

---

## 5. DELETE /v1/customers/{customer_id}/cards/{id}
**URL**: [https://www.mercadopago.com.ar/developers/es/reference/cards/_customers_customer_id_cards_id/delete](https://www.mercadopago.com.ar/developers/es/reference/cards/_customers_customer_id_cards_id/delete)

### Descripción General
Este endpoint permite **eliminar una tarjeta específica** asociada a un cliente, útil para cuando el usuario desea desvincular un método de pago.

### Método HTTP
- **DELETE**: Eliminación de un recurso.

### URL y Estructura
- **Base URL**: `https://api.mercadopago.com/v1`
- **Ruta**: `/customers/{customer_id}/cards/{id}`
- **Parámetros dinámicos**:
  - `{customer_id}` (String, Requerido): ID del cliente.
  - `{id}` (String, Requerido): ID de la tarjeta.

### Encabezados Requeridos
- `Content-Type: application/json`
- `Authorization: Bearer {access_token}`

### Ejemplo de Solicitud
```bash
curl -X DELETE \
  'https://api.mercadopago.com/v1/customers/470183340-cpunOI7UsIHlHr/cards/8987269652' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer TEST-4599*********755-11221*********d497ae962*********ecf8d85-1*********'
```

### Respuesta Exitosa
- **Código HTTP**: 200 (OK)
- **Cuerpo de la respuesta**: Detalles de la tarjeta eliminada.
- **Ejemplo**:
```json
{
  "id": "8987269652",
  "expiration_month": 7,
  "expiration_year": 2023,
  "first_six_digits": "503143",
  "last_four_digits": "6351",
  "payment_method": {
    "id": "master",
    "name": "Mastercard",
    "payment_type_id": "credit_card",
    "thumbnail": "http://img.mlstatic.com/org-img/MP3/API/logos/master.gif",
    "secure_thumbnail": "https://www.mercadopago.com/org-img/MP3/API/logos/master.gif"
  },
  "security_code": {
    "length": 3,
    "card_location": "back"
  },
  "issuer": {
    "id": "24",
    "name": "Mastercard"
  },
  "cardholder": {
    "name": "APRO",
    "identification": {
      "number": "19119119100",
      "type": "CPF"
    }
  },
  "date_created": "2021-03-16T16:08:21.000-04:00",
  "date_last_updated": "2021-03-16T16:14:40.962-04:00",
  "customer_id": "470183340-cpunOI7UsIHlHr",
  "user_id": "470183340",
  "live_mode": true
}
```

### Posibles Errores
- **404 Not Found**: Tarjeta o cliente no encontrados.
- **401 Unauthorized**: Token inválido.

### Notas Adicionales
- La eliminación es irreversible.

---

## 6. Consideraciones Generales
- **Autenticación**: Todas las solicitudes requieren un token de acceso válido.
- **Seguridad**: Los datos sensibles de la tarjeta nunca se envían directamente; se utiliza un `token`.
- **Entorno**: El campo `live_mode` indica si la operación es en producción o prueba.
- **Errores comunes**: Verificar siempre el `customer_id`, `id` y el token para evitar errores 400/404.

---