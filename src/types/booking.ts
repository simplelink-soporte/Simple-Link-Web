/**
 * Definición de tipos para Bookings (reservas)
 */

export interface Booking {
  id: string;
  title?: string;
  start_time: string;
  end_time: string;
  status: string;
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  resource_id?: string;
  resource_name?: string;
  payment_type?: string;
  payment_status?: string;
  amount?: number;
  currency?: string;
  date_created?: string;
  date_updated?: string;
  metadata?: Record<string, any>;
}
