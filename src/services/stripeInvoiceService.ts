import { Stripe } from 'stripe';
import { Invoice } from './billingService';

/**
 * Parámetros para listar facturas
 */
export interface ListInvoicesParams {
  limit?: number;
  status?: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  customer?: string;
  starting_after?: string;
  ending_before?: string;
}

/**
 * Servicio para interactuar con las facturas de Stripe
 * Permite obtener, listar y gestionar las facturas asociadas a la cuenta del club
 */
class StripeInvoiceService {
  private stripe: Stripe | null = null;

  /**
   * Determina si estamos en el cliente (browser) o en el servidor
   * @returns true si estamos en el cliente
   */
  private isClient(): boolean {
    return typeof window !== 'undefined';
  }

  /**
   * Inicializa la instancia de Stripe - solo debe usarse en el servidor
   * @param stripeAccountId ID de la cuenta de Stripe del club (Connect)
   * @returns Una instancia configurada de Stripe
   */
  private getStripeInstance(stripeAccountId?: string): Stripe {
    // Si estamos en el cliente, no deberíamos llamar a este método
    if (this.isClient()) {
      console.warn('⚠️ Intento de inicializar Stripe directamente en el cliente. Las operaciones de Stripe deben realizarse a través de endpoints API.');
      throw new Error('Las operaciones de Stripe no deben iniciarse directamente en el cliente. Usa los endpoints API.');
    }
    
    if (!this.stripe) {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      
      if (!stripeSecretKey) {
        throw new Error('No se ha configurado la clave secreta de Stripe en el servidor');
      }
      
      const config: Stripe.StripeConfig = {
        apiVersion: '2025-02-24.acacia',
      };
      
      if (stripeAccountId) {
        config.stripeAccount = stripeAccountId;
      }
      
      this.stripe = new Stripe(stripeSecretKey, config);
    }
    
    return this.stripe;
  }

  /**
   * Obtiene una lista de todas las facturas asociadas a la cuenta del club
   * @param accountId ID de la cuenta de Stripe (Connect) del club
   * @param params Parámetros para filtrar las facturas
   * @returns Lista de facturas de Stripe
   */
  async listInvoices(accountId: string, params?: ListInvoicesParams): Promise<Stripe.Invoice[]> {
    try {
      const stripe = this.getStripeInstance(accountId);
      
      const response = await stripe.invoices.list({
        limit: params?.limit || 100,
        status: params?.status,
        customer: params?.customer,
        starting_after: params?.starting_after,
        ending_before: params?.ending_before
      });
      
      return response.data;
    } catch (error) {
      console.error('Error al obtener facturas de Stripe:', error);
      throw error;
    }
  }

  /**
   * Obtiene los detalles de una factura específica
   * @param accountId ID de la cuenta de Stripe del club
   * @param invoiceId ID de la factura a obtener
   * @returns Detalles de la factura
   */
  async getInvoice(accountId: string, invoiceId: string): Promise<Stripe.Invoice> {
    try {
      const stripe = this.getStripeInstance(accountId);
      return await stripe.invoices.retrieve(invoiceId);
    } catch (error) {
      console.error(`Error al obtener la factura ${invoiceId}:`, error);
      throw error;
    }
  }

  /**
   * Convierte una factura de Stripe al formato interno de la aplicación
   * @param stripeInvoice Factura original de Stripe
   * @returns Factura en formato de la aplicación
   */
  mapStripeInvoiceToAppInvoice(stripeInvoice: Stripe.Invoice): Invoice {
    // Determinar el estado de la factura
    let status: Invoice['status'] = 'pending';
    
    switch (stripeInvoice.status) {
      case 'paid':
        status = 'paid';
        break;
      case 'open':
        status = 'pending';
        break;
      case 'uncollectible':
        status = 'overdue';
        break;
      case 'void':
        status = 'cancelled';
        break;
      case 'draft':
        // Para señas o garantías usamos metadatos si están disponibles
        if (stripeInvoice.metadata?.payment_type === 'deposit') {
          status = 'deposit';
        } else if (stripeInvoice.metadata?.payment_type === 'guarantee') {
          status = 'guarantee';
        } else {
          status = 'pending';
        }
        break;
    }

    // Extraer información sobre la pista o clase (si existe en metadatos)
    const courtType = stripeInvoice.metadata?.court_type;
    const courtTime = stripeInvoice.metadata?.court_time;
    const classType = stripeInvoice.metadata?.class_type;

    // Extraer nombre del cliente
    let customerName = 'Cliente';
    if (typeof stripeInvoice.customer === 'object' && stripeInvoice.customer && 'name' in stripeInvoice.customer && stripeInvoice.customer.name) {
      customerName = stripeInvoice.customer.name;
    } else if (stripeInvoice.customer_name) {
      customerName = stripeInvoice.customer_name;
    } else if (stripeInvoice.customer_email) {
      customerName = stripeInvoice.customer_email;
    }

    return {
      id: stripeInvoice.id,
      invoice_number: stripeInvoice.number || `FAC-${stripeInvoice.created.toString().slice(-8)}`,
      customer_id: typeof stripeInvoice.customer === 'string' ? stripeInvoice.customer : '',
      customer_name: customerName,
      date: new Date(stripeInvoice.created * 1000).toISOString(),
      due_date: stripeInvoice.due_date 
        ? new Date(stripeInvoice.due_date * 1000).toISOString() 
        : new Date(stripeInvoice.created * 1000 + 30 * 24 * 60 * 60 * 1000).toISOString(),
      amount: stripeInvoice.total / 100, // Convertir de centavos a unidades
      status,
      branch_id: stripeInvoice.metadata?.branch_id || '',
      created_at: new Date(stripeInvoice.created * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      court_type: courtType,
      court_time: courtTime,
      class_type: classType,
    };
  }

  /**
   * Obtiene todas las facturas y las convierte al formato de la aplicación
   * @param accountId ID de la cuenta de Stripe del club
   * @param params Parámetros para filtrar las facturas
   * @returns Lista de facturas en el formato de la aplicación
   */
  async getAppInvoices(accountId: string, params?: ListInvoicesParams): Promise<Invoice[]> {
    try {
      const stripeInvoices = await this.listInvoices(accountId, params);
      return stripeInvoices.map(invoice => this.mapStripeInvoiceToAppInvoice(invoice));
    } catch (error) {
      console.error('Error al obtener y convertir facturas:', error);
      throw error;
    }
  }
}

// Exportar una instancia única del servicio
export const stripeInvoiceService = new StripeInvoiceService();
