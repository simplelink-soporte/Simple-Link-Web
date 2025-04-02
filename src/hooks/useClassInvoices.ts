import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { Invoice } from '@/services/billingService';

interface UseClassInvoicesParams {
  empresaId?: string;
  branchId?: string;
  status?: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void' | 'deposit' | 'guarantee' | 'pending';
  limit?: number;
  customerId?: string;
  classId?: string;
  enabled?: boolean;
}

/**
 * Hook personalizado para obtener facturas de Stripe relacionadas con registros de clases
 * 
 * @param params - Parámetros para filtrar las facturas
 * @returns UseQueryResult con los datos de facturas y estado de la petición
 */
export const useClassInvoices = (params: UseClassInvoicesParams = {}): UseQueryResult<Invoice[], Error> => {
  const { 
    empresaId = process.env.NEXT_PUBLIC_DEFAULT_EMPRESA_ID,
    branchId,
    status,
    limit = 100,
    customerId,
    classId,
    enabled = true 
  } = params;

  return useQuery<Invoice[], Error>({
    queryKey: ['class-invoices', empresaId, branchId, status, limit, customerId, classId],
    queryFn: async () => {
      try {
        // Construir la URL con los parámetros de consulta
        const queryParams = new URLSearchParams();
        
        if (empresaId) queryParams.append('empresaId', empresaId);
        if (limit) queryParams.append('limit', limit.toString());
        if (status && status.trim() !== '') queryParams.append('status', status);
        if (customerId) queryParams.append('customer', customerId);
        
        // Añadir el parámetro específico para filtrar facturas de clases
        queryParams.append('type', 'class');
        if (classId) queryParams.append('classId', classId);

        // Llamar al endpoint de la API existente
        const response = await fetch(`/api/stripe/invoices?${queryParams.toString()}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al obtener facturas de Stripe para clases');
        }
        
        const data = await response.json();
        const invoices = data.invoices || [];
        
        console.log(`📊 Total de facturas de clases recibidas: ${invoices.length}`);
        
        // Filtrar por metadatos específicos de clases 
        // (complementando el filtrado que ya podría haber en el endpoint)
        const classInvoices = invoices.filter((invoice: any) => 
          invoice.metadata?.is_class_booking === 'true' || 
          invoice.metadata?.class_id ||
          invoice.metadata?.resource_type === 'class' ||
          invoice.metadata?.invoice_origin === 'manual_class_booking'
        );
        
        console.log(`📊 Facturas de clases después del filtrado: ${classInvoices.length}`);
        
        // Aplicar filtro de branch si corresponde
        const filteredInvoices = branchId
          ? classInvoices.filter((invoice: Invoice) => invoice.branch_id === branchId)
          : classInvoices;
          
        console.log(`📊 Facturas después del filtrado por branch: ${filteredInvoices.length}`);
        
        return filteredInvoices;
      } catch (error) {
        console.error('Error al obtener facturas de clases:', error);
        throw error;
      }
    },
    enabled: !!empresaId && enabled,
  });
};
