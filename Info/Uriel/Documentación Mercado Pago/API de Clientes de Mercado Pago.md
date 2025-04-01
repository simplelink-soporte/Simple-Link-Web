# Documento Detallado: Referencia Completa de la API de Clientes de Mercado Pago

**Fecha**: 29 de marzo de 2025  
**Propósito**: Proporcionar una explicación exhaustiva de las funcionalidades de la API de Mercado Pago relacionadas con la gestión de clientes, basada en las referencias oficiales de la documentación para desarrolladores.

---

## Índice
1. [POST /v1/customers](#1-post-v1customers)  
2. [GET /v1/customers/search](#2-get-v1customerssearch)  
3. [GET /v1/customers/{id}](#3-get-v1customersid)  
4. [PUT /v1/customers/{id}](#4-put-v1customersid)  
5. [Consideraciones Generales](#5-consideraciones-generales)  

---

## 1. POST /v1/customers
**URL**: [https://www.mercadopago.com.ar/developers/es/reference/customers/_customers/post](https://www.mercadopago.com.ar/developers/es/reference/customers/_customers/post)

### Descripción General
Este endpoint permite **crear un nuevo cliente** en Mercado Pago. Los clientes son entidades que representan a los compradores o usuarios que realizan pagos, y su creación es un paso previo para asociarles tarjetas u otros métodos de pago. Este endpoint es esencial para integraciones que requieren gestionar perfiles de clientes de manera recurrente.

### Método HTTP
- **POST**: Indica la creación de un nuevo recurso (en este caso, un cliente).

### URL y Estructura
- **Base URL**: `https://api.mercadopago.com/v1`
- **Ruta**: `/customers`
- No hay parámetros dinámicos en la URL.

### Encabezados Requeridos
- `Content-Type: application/json`: Especifica que el cuerpo de la solicitud está en formato JSON.
- `Authorization: Bearer {access_token}`: Token de acceso para autenticar la solicitud. Ejemplo: `Bearer TEST-4599*********755-11221*********d497ae962*********ecf8d85-1*********`.

### Cuerpo de la Solicitud
- **Formato**: JSON
- **Campos** (todos son opcionales, pero se recomienda incluir al menos `email`):
  - `email` (String): Correo electrónico del cliente. Útil como identificador único en muchas integraciones.
    - Ejemplo: `"test_user_123@testuser.com"`.
  - `first_name` (String): Nombre del cliente.
    - Ejemplo: `"John"`.
  - `last_name` (String): Apellido del cliente.
    - Ejemplo: `"Doe"`.
  - `phone` (Object): Teléfono del cliente.
    - `area_code` (String): Código de área.
      - Ejemplo: `"11"`.
    - `number` (String): Número de teléfono.
      - Ejemplo: `"4444-4444"`.
  - `identification` (Object): Identificación del cliente.
    - `type` (String): Tipo de documento (ej. "DNI", "CPF").
      - Ejemplo: `"DNI"`.
    - `number` (String): Número del documento.
      - Ejemplo: `"12345678"`.
  - `default_address` (String): ID de la dirección predeterminada (si se creó previamente).
  - `address` (Object): Dirección del cliente.
    - `zip_code` (String): Código postal.
      - Ejemplo: `"12312-123"`.
    - `street_name` (String): Nombre de la calle.
      - Ejemplo: `"Av. Siempreviva"`.
    - `street_number` (Number): Número de la calle.
      - Ejemplo: `1234`.
  - `description` (String): Descripción adicional del cliente.
    - Ejemplo: `"Cliente VIP"`.

### Ejemplo de Solicitud
```bash
curl -X POST \
  'https://api.mercadopago.com/v1/customers' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer TEST-4599*********755-11221*********d497ae962*********ecf8d85-1*********' \
  -d '{
    "email": "test_user_123@testuser.com",
    "first_name": "John",
    "last_name": "Doe",
    "phone": {
      "area_code": "11",
      "number": "4444-4444"
    },
    "identification": {
      "type": "DNI",
      "number": "12345678"
    },
    "description": "Cliente VIP"
  }'
```

### Respuesta Exitosa
- **Código HTTP**: 201 (Created)
- **Cuerpo de la respuesta**: JSON con los detalles del cliente creado.
- **Campos de la respuesta**:
  - `id` (String): Identificador único del cliente.
  - `email` (String): Correo del cliente.
  - `first_name` (String): Nombre.
  - `last_name` (String): Apellido.
  - `phone` (Object): Teléfono.
  - `identification` (Object): Identificación.
  - `default_address` (String): ID de dirección predeterminada (si aplica).
  - `address` (Object): Dirección (si se proporcionó).
  - `date_registered` (String): Fecha de registro (ISO 8601).
  - `description` (String): Descripción.
  - `date_created` (String): Fecha de creación.
  - `date_last_updated` (String): Fecha de última actualización.
  - `default_card` (String): ID de la tarjeta predeterminada (si aplica).
  - `cards` (Array): Lista de tarjetas asociadas (inicialmente vacía).
  - `addresses` (Array): Lista de direcciones asociadas (inicialmente vacía).
  - `live_mode` (Boolean): Indica si es un entorno real (true) o de prueba (false).

- **Ejemplo**:
```json
{
  "id": "123456789-jxOV430go9fx2e",
  "email": "test_user_123@testuser.com",
  "first_name": "John",
  "last_name": "Doe",
  "phone": {
    "area_code": "11",
    "number": "4444-4444"
  },
  "identification": {
    "type": "DNI",
    "number": "12345678"
  },
  "default_address": null,
  "address": null,
  "date_registered": "2021-03-16T16:08:20.592-04:00",
  "description": "Cliente VIP",
  "date_created": "2021-03-16T16:08:20.592-04:00",
  "date_last_updated": "2021-03-16T16:08:20.592-04:00",
  "default_card": null,
  "cards": [],
  "addresses": [],
  "live_mode": false
}
```

### Posibles Errores
- **400 Bad Request**: Formato JSON inválido o datos incorrectos (ej. `email` mal formado).
  - Ejemplo: `{"message": "invalid email format"}`
- **401 Unauthorized**: Token de acceso inválido o ausente.

### Notas Adicionales
- Aunque todos los campos son opcionales, incluir un `email` mejora la trazabilidad.
- El `id` generado es único y se usará en otras operaciones (como asociar tarjetas).

---

## 2. GET /v1/customers/search
**URL**: [https://www.mercadopago.com.ar/developers/es/reference/customers/_customers_search/get](https://www.mercadopago.com.ar/developers/es/reference/customers/_customers_search/get)

### Descripción General
Este endpoint permite **buscar clientes** registrados en Mercado Pago utilizando filtros como correo electrónico u otros parámetros. Es útil para encontrar clientes existentes sin conocer su `id` exacto.

### Método HTTP
- **GET**: Consulta de recursos existentes con filtros.

### URL y Estructura
- **Base URL**: `https://api.mercadopago.com/v1`
- **Ruta**: `/customers/search`
- **Parámetros de consulta** (Query Parameters, opcionales):
  - `email` (String): Filtra por correo electrónico exacto.
    - Ejemplo: `test_user_123@testuser.com`.
  - `limit` (Number): Límite de resultados por página (máximo 100).
    - Ejemplo: `10`.
  - `offset` (Number): Desplazamiento para paginación.
    - Ejemplo: `0`.

### Encabezados Requeridos
- `Content-Type: application/json`
- `Authorization: Bearer {access_token}`

### Ejemplo de Solicitud
```bash
curl -X GET \
  'https://api.mercadopago.com/v1/customers/search?email=test_user_123@testuser.com&limit=10&offset=0' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer TEST-4599*********755-11221*********d497ae962*********ecf8d85-1*********'
```

### Respuesta Exitosa
- **Código HTTP**: 200 (OK)
- **Cuerpo de la respuesta**: JSON con una estructura de paginación y una lista de clientes.
- **Campos de la respuesta**:
  - `paging` (Object): Información de paginación.
    - `total` (Number): Total de resultados.
    - `limit` (Number): Límite aplicado.
    - `offset` (Number): Desplazamiento aplicado.
  - `results` (Array): Lista de clientes encontrados, cada uno con los mismos campos que en POST (ver arriba).

- **Ejemplo**:
```json
{
  "paging": {
    "total": 1,
    "limit": 10,
    "offset": 0
  },
  "results": [
    {
      "id": "123456789-jxOV430go9fx2e",
      "email": "test_user_123@testuser.com",
      "first_name": "John",
      "last_name": "Doe",
      "phone": {
        "area_code": "11",
        "number": "4444-4444"
      },
      "identification": {
        "type": "DNI",
        "number": "12345678"
      },
      "default_address": null,
      "address": null,
      "date_registered": "2021-03-16T16:08:20.592-04:00",
      "description": "Cliente VIP",
      "date_created": "2021-03-16T16:08:20.592-04:00",
      "date_last_updated": "2021-03-16T16:08:20.592-04:00",
      "default_card": null,
      "cards": [],
      "addresses": [],
      "live_mode": false
    }
  ]
}
```

### Posibles Errores
- **400 Bad Request**: Parámetros de búsqueda inválidos (ej. `limit` mayor a 100).
- **401 Unauthorized**: Token inválido.

### Notas Adicionales
- Si no se especifican filtros, devuelve todos los clientes (con paginación).
- Ideal para buscar un cliente por email antes de crearlo, evitando duplicados.

---

## 3. GET /v1/customers/{id}
**URL**: [https://www.mercadopago.com.ar/developers/es/reference/customers/_customers_id/get](https://www.mercadopago.com.ar/developers/es/reference/customers/_customers_id/get)

### Descripción General
Este endpoint permite **consultar los detalles de un cliente específico** identificado por su `id`. Es útil para obtener toda la información asociada a un cliente, incluyendo tarjetas y direcciones.

### Método HTTP
- **GET**: Consulta de un recurso específico.

### URL y Estructura
- **Base URL**: `https://api.mercadopago.com/v1`
- **Ruta**: `/customers/{id}`
- **Parámetro dinámico**:
  - `{id}` (String, Requerido): Identificador único del cliente.

### Encabezados Requeridos
- `Content-Type: application/json`
- `Authorization: Bearer {access_token}`

### Ejemplo de Solicitud
```bash
curl -X GET \
  'https://api.mercadopago.com/v1/customers/123456789-jxOV430go9fx2e' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer TEST-4599*********755-11221*********d497ae962*********ecf8d85-1*********'
```

### Respuesta Exitosa
- **Código HTTP**: 200 (OK)
- **Cuerpo de la respuesta**: Objeto JSON con los detalles del cliente.
- **Ejemplo**:
```json
{
  "id": "123456789-jxOV430go9fx2e",
  "email": "test_user_123@testuser.com",
  "first_name": "John",
  "last_name": "Doe",
  "phone": {
    "area_code": "11",
    "number": "4444-4444"
  },
  "identification": {
    "type": "DNI",
    "number": "12345678"
  },
  "default_address": null,
  "address": null,
  "date_registered": "2021-03-16T16:08:20.592-04:00",
  "description": "Cliente VIP",
  "date_created": "2021-03-16T16:08:20.592-04:00",
  "date_last_updated": "2021-03-16T16:08:20.592-04:00",
  "default_card": null,
  "cards": [],
  "addresses": [],
  "live_mode": false
}
```

### Posibles Errores
- **404 Not Found**: El `id` del cliente no existe.
- **401 Unauthorized**: Token inválido.

### Notas Adicionales
- Devuelve un solo objeto, a diferencia del endpoint de búsqueda.

---

## 4. PUT /v1/customers/{id}
**URL**: [https://www.mercadopago.com.ar/developers/es/reference/customers/_customers_id/put](https://www.mercadopago.com.ar/developers/es/reference/customers/_customers_id/put)

### Descripción General
Este endpoint permite **actualizar los datos de un cliente existente** identificado por su `id`. Se pueden modificar campos como el nombre, teléfono, identificación, etc.

### Método HTTP
- **PUT**: Actualización de un recurso existente.

### URL y Estructura
- **Base URL**: `https://api.mercadopago.com/v1`
- **Ruta**: `/customers/{id}`
- **Parámetro dinámico**:
  - `{id}` (String, Requerido): Identificador único del cliente.

### Encabezados Requeridos
- `Content-Type: application/json`
- `Authorization: Bearer {access_token}`

### Cuerpo de la Solicitud
- **Formato**: JSON
- **Campos**: Solo se envían los campos que se desean actualizar (ver POST para la lista completa).
- **Ejemplo**:
```json
{
  "first_name": "Johnny",
  "description": "Cliente VIP Actualizado"
}
```

### Ejemplo de Solicitud
```bash
curl -X PUT \
  'https://api.mercadopago.com/v1/customers/123456789-jxOV430go9fx2e' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer TEST-4599*********755-11221*********d497ae962*********ecf8d85-1*********' \
  -d '{
    "first_name": "Johnny",
    "description": "Cliente VIP Actualizado"
  }'
```

### Respuesta Exitosa
- **Código HTTP**: 200andt (OK)
- **Cuerpo de la respuesta**: Detalles actualizados del cliente.
- **Ejemplo**:
```json
{
  "id": "123456789-jxOV430go9fx2e",
  "email": "test_user_123@testuser.com",
  "first_name": "Johnny",
  "last_name": "Doe",
  "phone": {
    "area_code": "11",
    "number": "4444-4444"
  },
  "identification": {
    "type": "DNI",
    "number": "12345678"
  },
  "default_address": null,
  "address": null,
  "date_registered": "2021-03-16T16:08:20.592-04:00",
  "description": "Cliente VIP Actualizado",
  "date_created": "2021-03-16T16:08:20.592-04:00",
  "date_last_updated": "2021-03-16T16:14:40.962-04:00",
  "default_card": null,
  "cards": [],
  "addresses": [],
  "live_mode": false
}
```

### Posibles Errores
- **400 Bad Request**: Datos inválidos (ej. formato de teléfono incorrecto).
- **404 Not Found**: El `id` no existe.
- **401 Unauthorized**: Token inválido.

### Notas Adicionales
- Solo se actualizan los campos enviados; los no incluidos permanecen sin cambios.

---

## 5. Consideraciones Generales
- **Autenticación**: Todas las solicitudes requieren un token de acceso válido.
- **Seguridad**: Los datos sensibles (como identificación) deben manejarse con cuidado.
- **Entorno**: El campo `live_mode` indica si la operación es en producción o prueba.
- **Paginación**: Solo el endpoint `/search` utiliza paginación explícita.
- **Errores comunes**: Verificar siempre el formato de los datos y la existencia de los recursos (`id`).

---
