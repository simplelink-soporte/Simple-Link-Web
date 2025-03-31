import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { Invoice } from '@/services/billingService';

interface UseStripeInvoicesParams {
  empresaId?: string;
  branchId?: string;
  status?: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void' | 'deposit' | 'guarantee' | 'pending';
  limit?: number;
  customerId?: string;
  enabled?: boolean;
}

/**
 * Hook personalizado para obtener facturas reales de Stripe mediante la API
 * 
 * @param params - Paru00e1metros para filtrar las facturas
 * @returns UseQueryResult con los datos de facturas y estado de la peticiu00f3n
 */
export const useStripeInvoices = (params: UseStripeInvoicesParams = {}): UseQueryResult<Invoice[], Error> => {
  const { 
    empresaId = process.env.NEXT_PUBLIC_DEFAULT_EMPRESA_ID,
    branchId,
    status,
    limit = 100,
    customerId,
    enabled = true 
  } = params;

  return useQuery<Invoice[], Error>({
    queryKey: ['stripe-invoices', empresaId, branchId, status, limit, customerId],
    queryFn: async () => {
      try {
        // Construir la URL con los parámetros de consulta
        const queryParams = new URLSearchParams();
        
        if (empresaId) queryParams.append('empresaId', empresaId);
        if (limit) queryParams.append('limit', limit.toString());
        // Sólo añadir el status si tiene un valor válido (no undefined, null o cadena vacía)
        if (status && status.trim() !== '') queryParams.append('status', status);
        if (customerId) queryParams.append('customer', customerId);

        // Llamar al endpoint de la API
        const response = await fetch(`/api/stripe/invoices?${queryParams.toString()}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al obtener facturas de Stripe');
        }
        
        const data = await response.json();
        const invoices = data.invoices;
        
        console.log(`📊 Total de facturas recibidas de Stripe: ${invoices.length}`);
        console.log(`📊 Branch ID actual: "${branchId || 'no especificado'}"`);
        
        // Inspeccionar los branch_id de las facturas
        if (invoices.length > 0) {
          const branchIds = invoices.map((inv: Invoice) => inv.branch_id).filter(Boolean);
          const uniqueBranchIds = Array.from(new Set(branchIds));
          console.log(`📊 Branch IDs en las facturas: ${uniqueBranchIds.length ? JSON.stringify(uniqueBranchIds) : 'ninguno'}`);
          
          // Verificar el primer elemento para depuración
          console.log('📊 Muestra de la primera factura:', {
            id: invoices[0].id,
            branch_id: invoices[0].branch_id || 'no definido',
            invoice_number: invoices[0].invoice_number
          });
        }
        
        const filteredInvoices = branchId
          ? invoices.filter((invoice: Invoice) => invoice.branch_id === branchId)
          : invoices;
          
        console.log(`📊 Facturas después del filtrado: ${filteredInvoices.length}`);
        
        return filteredInvoices;
      } catch (error) {
        console.error('Error al obtener facturas de Stripe:', error);
        throw error;
      }
    },
    enabled: !!empresaId && enabled,
  });
};
