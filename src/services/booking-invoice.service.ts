import { Stripe } from 'stripe';
import { stripeInvoiceService } from './stripeInvoiceService';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';

interface BookingInvoiceParams {
  bookingId: string;
  stripeAccountId: string;
  customerId: string;
  amount: number;
  description: string;
  customerEmail?: string;
  customerName?: string;
  empresaId?: string;
  metadata?: Record<string, string>;
}

/**
 * Servicio para gestionar facturas asociadas a reservas
 * Proporciona funcionalidades para buscar, crear y eliminar facturas relacionadas con bookings
 */
class BookingInvoiceService {
  /**
   * Busca facturas asociadas a una reserva específica
   * @param stripeAccountId ID de la cuenta de Stripe del club
   * @param bookingId ID de la reserva
   * @returns Facturas asociadas a la reserva (si existen)
   */
  async findInvoicesByBookingId(stripeAccountId: string, bookingId: string) {
    console.log(`🔍 [BookingInvoiceService] BÚSQUEDA DE FACTURAS - Parámetros:`, {
      metodo: 'findInvoicesByBookingId',
      stripeAccountId,
      bookingId,
      timestamp: new Date().toISOString()
    });
    
    try {
      // Usamos el endpoint API para buscar facturas en lugar de acceder directamente a Stripe
      console.log(`📡 [BookingInvoiceService] Consultando endpoint API para buscar facturas de reserva ${bookingId}`);
      
      // Construimos la URL del endpoint
      const apiUrl = `/api/stripe/booking-invoices?accountId=${encodeURIComponent(stripeAccountId)}&bookingId=${encodeURIComponent(bookingId)}`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Error al consultar API: ${errorData}`);
      }
      
      const result = await response.json();
      console.log(`✅ [BookingInvoiceService] Respuesta de API para booking_id=${bookingId}:`, {
        success: result.success,
        facturas_encontradas: result.invoices?.length || 0
      });
      
      // Si no hay facturas, devolvemos un resultado vacío pero exitoso
      if (!result.invoices || result.invoices.length === 0) {
        console.log(`ℹ️ [BookingInvoiceService] No se encontraron facturas para esta reserva`);
        return {
          success: true,
          invoices: [],
          count: 0
        };
      }
      
      // Si hay facturas, las devolvemos
      return {
        success: true,
        invoices: result.invoices,
        count: result.invoices.length
      };
    } catch (error) {
      console.error(`❌ [BookingInvoiceService] Error al buscar facturas:`, error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Error inesperado al buscar facturas',
          code: 'invoice_search_error'
        },
        count: 0
      };
    }
  }

  /**
   * Crea una factura como contraparte de una cancelación
   * @param params Parámetros necesarios para crear la factura
   * @returns Resultado de la operación con los datos de la factura creada
   */
  async createCancellationInvoice(params: BookingInvoiceParams) {
    console.log(`🔄 [BookingInvoiceService] Iniciando creación de factura contraparte para cancelación:`, {
      bookingId: params.bookingId,
      customerId: params.customerId,
      amount: params.amount
    });

    try {
      // Crear metadatos mejorados para la factura
      const enhancedMetadata = {
        booking_id: params.bookingId,
        invoice_type: 'cancellation_counterpart',
        invoice_origin: 'booking_cancellation',
        resource_type: 'booking',
        payment_date: new Date().toISOString(),
        ...params.metadata
      };
      
      // Llamar al endpoint de API para crear la factura
      const response = await fetch('/api/stripe/create-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: params.customerId,
          amount: params.amount,
          description: params.description,
          customerEmail: params.customerEmail,
          customerName: params.customerName,
          empresaId: params.empresaId,
          stripeAccountId: params.stripeAccountId,
          metadata: enhancedMetadata
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`❌ [BookingInvoiceService] Error en respuesta de API: ${response.status}`, errorData);
        return {
          success: false,
          error: errorData.error || { message: `Error ${response.status} al crear factura de cancelación` }
        };
      }
      
      const result = await response.json();
      
      if (!result.success) {
        console.error(`❌ [BookingInvoiceService] Error al crear factura de cancelación:`, result.error);
        return {
          success: false,
          error: result.error || { message: 'Error desconocido al crear factura de cancelación' }
        };
      }

      console.log(`✅ [BookingInvoiceService] Factura de cancelación creada exitosamente:`, {
        invoiceId: result.invoiceId,
        invoiceUrl: result.invoiceUrl
      });

      return {
        success: true,
        invoiceId: result.invoiceId,
        invoiceUrl: result.invoiceUrl,
        pdfUrl: result.pdfUrl
      };
    } catch (error) {
      console.error(`❌ [BookingInvoiceService] Error inesperado al crear factura de cancelación:`, error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Error inesperado',
          code: 'unexpected_error'
        }
      };
    }
  }

  /**
   * Elimina una factura de Stripe
   * @param stripeAccountId ID de la cuenta de Stripe del club
   * @param invoiceId ID de la factura a eliminar
   * @returns Resultado de la operación
   */
  async deleteInvoice(stripeAccountId: string, invoiceId: string) {
    console.log(`🗑️ [BookingInvoiceService] Eliminando factura: ${invoiceId}`);
    
    try {
      const response = await fetch(`/api/stripe/delete-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceId,
          stripeAccountId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`❌ [BookingInvoiceService] Error al eliminar factura: ${response.status}`, errorData);
        return {
          success: false,
          error: errorData.error || { message: `Error ${response.status} al eliminar factura` }
        };
      }
      
      const result = await response.json();
      
      console.log(`✅ [BookingInvoiceService] Factura eliminada exitosamente:`, {
        invoiceId
      });

      return {
        success: true,
        result
      };
    } catch (error) {
      console.error(`❌ [BookingInvoiceService] Error inesperado al eliminar factura:`, error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Error inesperado',
          code: 'unexpected_error'
        }
      };
    }
  }
}

// Exportar una instancia única del servicio
export const bookingInvoiceService = new BookingInvoiceService();
