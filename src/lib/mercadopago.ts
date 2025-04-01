// MercadoPago SDK configuración para Next.js (Server Components)
// Basado en la documentación oficial para versión 2.3.0
// https://www.mercadopago.com.ar/developers/es/reference/customers/_customers/post

// Para versión 2.3.0 debemos importar el módulo específico para clientes
import { MercadoPagoConfig, Customer } from 'mercadopago';
import axios from 'axios';

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

// Implementación de API de tarjetas con axios
const cardClient = {
  // Obtener todas las tarjetas de un cliente
  all: async (options: { customer_id: string }) => {
    try {
      const response = await axios.get(
        `https://api.mercadopago.com/v1/customers/${options.customer_id}/cards`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
      // Devolver en formato compatible con el SDK anterior
      return {
        response: response.data,
        status: response.status
      };
    } catch (error: any) {
      console.error('Error al obtener tarjetas del cliente:', error.message);
      throw error;
    }
  },
  
  // Crear una nueva tarjeta
  create: async (options: { token: string, customer_id: string }) => {
    try {
      const response = await axios.post(
        `https://api.mercadopago.com/v1/customers/${options.customer_id}/cards`,
        { token: options.token },
        {
          headers: {
            'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
      // Devolver en formato compatible con el SDK anterior
      return {
        response: response.data,
        status: response.status
      };
    } catch (error: any) {
      console.error('Error al crear tarjeta:', error.message);
      throw error;
    }
  },
  
  // Eliminar una tarjeta
  delete: async (options: { id: string, customer_id: string }) => {
    try {
      const response = await axios.delete(
        `https://api.mercadopago.com/v1/customers/${options.customer_id}/cards/${options.id}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
      // Devolver en formato compatible con el SDK anterior
      return {
        response: response.data,
        status: response.status
      };
    } catch (error: any) {
      console.error('Error al eliminar tarjeta:', error.message);
      throw error;
    }
  }
};

// Exportamos la API de clientes y el cliente principal
export const mercadopago = {
  customers: customerClient,
  card: cardClient,
  client
};
