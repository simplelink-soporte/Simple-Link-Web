import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { Invoice } from '@/services/billingService';

interface UseStripeInvoicesParams {
  empresaId?: string;
  branchId?: string;
  status?: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
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
        // Construir la URL con los paru00e1metros de consulta
        const queryParams = new URLSearchParams();
        if (empresaId) queryParams.append('empresaId', empresaId);
        if (limit) queryParams.append('limit', limit.toString());
        if (status) queryParams.append('status', status);
        if (customerId) queryParams.append('customer', customerId);

        // Llamar al endpoint de la API
        const response = await fetch(`/api/stripe/invoices?${queryParams.toString()}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al obtener facturas de Stripe');
        }
        
        const data = await response.json();
        const invoices = data.invoices;
        
        // Filtrar por branchId si es necesario (suponiendo que este dato estu00e1 en los metadatos)
        const filteredInvoices = branchId
          ? invoices.filter((invoice: Invoice) => invoice.branch_id === branchId)
          : invoices;
          
        return filteredInvoices;
      } catch (error) {
        console.error('Error al obtener facturas de Stripe:', error);
        throw error;
      }
    },
    enabled: !!empresaId && enabled,
  });
};
