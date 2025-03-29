/**
 * Datos de un cliente de MercadoPago almacenado en nuestra base de datos
 */
export interface MercadoPagoCustomerData {
  id: string;
  user_id: string;
  mercadopago_customer_id: string;
  empresa_id: string;
  status: 'active' | 'inactive';
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  last_used?: string;
  payment_methods_count?: number;
  last_payment_error?: string;
}

/**
 * Versión simplificada para el caché/respuesta de API
 */
export interface MercadoPagoCustomerCache {
  mercadoPagoCustomerId: string;
  empresaId: string;
  userId: string;
  lastUsed?: string;
  status: 'active' | 'inactive';
}

/**
 * Estructura de una tarjeta almacenada en MercadoPago
 */
export interface MercadoPagoCard {
  id: string;
  customer_id: string;
  issuer: {
    id: string;
    name: string;
  };
  last_four_digits: string;
  expiration_month: number;
  expiration_year: number;
  status: string;
  payment_method: {
    id: string;
    name: string;
    thumbnail: string;
    secure_thumbnail: string;
  };
}

/**
 * Estructura de la respuesta cuando se crea una tarjeta
 */
export interface MercadoPagoCardCreationResponse {
  id: string;
  customer_id: string;
  user_id?: string;
  status: string;
}
