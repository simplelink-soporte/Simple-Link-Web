// MercadoPago SDK configuración para Next.js (Server Components)
// Basado en la documentación oficial para versión 2.3.0
// https://www.mercadopago.com.ar/developers/es/reference/customers/_customers/post

// Para versión 2.3.0 debemos importar el módulo específico para clientes
import { MercadoPagoConfig, Customer } from 'mercadopago';

// Validación del token de acceso
if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
  console.error('⚠️ ERROR CRÍTICO: MERCADOPAGO_ACCESS_TOKEN no está definido en las variables de entorno');
}

// Crear client con el token de acceso como se especifica en la documentación actual
const client = new MercadoPagoConfig({ 
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '' 
});

try {
  console.log('✅ MercadoPago SDK: Cliente configurado correctamente');
} catch (error) {
  console.error('❌ Error al configurar cliente de MercadoPago:', error);
}

// Añadimos logs para diagnóstico
console.log('🔑 Access Token configurado:', 
  process.env.MERCADOPAGO_ACCESS_TOKEN ? 
  `${process.env.MERCADOPAGO_ACCESS_TOKEN.substring(0, 10)}...` : 
  'No disponible');

// Crear instancia de la API de clientes utilizando el cliente configurado
const customerClient = new Customer(client);

// Exportamos la API de clientes y el cliente principal
export const mercadopago = {
  customers: customerClient,
  client
};
