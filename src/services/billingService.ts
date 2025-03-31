import { supabase } from "@/lib/supabase";
import { PostgrestError } from "@supabase/supabase-js";

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  date: string;
  due_date: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue' | 'cancelled' | 'deposit' | 'guarantee';
  branch_id: string;
  created_at: string;
  updated_at: string;
  court_type?: string; // Tipo de pista (opcional)
  court_time?: string; // Horario (opcional)
  class_type?: string; // Tipo de clase (opcional)
  stripe_hosted_url?: string; // URL para ver la factura en Stripe
  stripe_pdf_url?: string; // URL para descargar la factura en PDF
  payment_type?: 'full' | 'deposit' | 'guarantee'; // Tipo de pago: completo, seña o garantía
  payment_description?: string; // Descripción del tipo de pago
}

export interface CreateInvoiceData {
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  date: string;
  due_date: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue' | 'cancelled' | 'deposit' | 'guarantee';
  branch_id: string;
  court_type?: string;
  court_time?: string;
  class_type?: string;
}

export interface UpdateInvoiceData {
  invoice_number?: string;
  customer_id?: string;
  customer_name?: string;
  date?: string;
  due_date?: string;
  amount?: number;
  status?: 'paid' | 'pending' | 'overdue' | 'cancelled' | 'deposit' | 'guarantee';
  branch_id?: string;
  court_type?: string;
  court_time?: string;
  class_type?: string;
}

export const billingService = {
  // Obtener todas las facturas para una sucursal
  async getInvoices(branchId: string) {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { data: data as Invoice[], error: null };
    } catch (error) {
      console.error('Error al obtener facturas:', error);
      return { data: [], error: error as PostgrestError };
    }
  },

  // Crear una nueva factura
  async createInvoice(invoiceData: CreateInvoiceData) {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .insert([invoiceData])
        .select()
        .single();

      if (error) throw error;

      return { data: data as Invoice, error: null };
    } catch (error) {
      console.error('Error al crear factura:', error);
      return { data: null, error: error as PostgrestError };
    }
  },

  // Actualizar una factura existente
  async updateInvoice(invoiceId: string, invoiceData: UpdateInvoiceData) {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .update(invoiceData)
        .eq('id', invoiceId)
        .select()
        .single();

      if (error) throw error;

      return { data: data as Invoice, error: null };
    } catch (error) {
      console.error('Error al actualizar factura:', error);
      return { data: null, error: error as PostgrestError };
    }
  },

  // Eliminar una factura
  async deleteInvoice(invoiceId: string) {
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('Error al eliminar factura:', error);
      return { error: error as PostgrestError };
    }
  },

  // Cambiar el estado de una factura
  async updateInvoiceStatus(invoiceId: string, status: Invoice['status']) {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .update({ status })
        .eq('id', invoiceId)
        .select()
        .single();

      if (error) throw error;

      return { data: data as Invoice, error: null };
    } catch (error) {
      console.error('Error al actualizar estado de factura:', error);
      return { data: null, error: error as PostgrestError };
    }
  }
};
