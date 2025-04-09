import { createInvoiceService } from './stripe-invoice.service';

interface ClassInvoiceParams {
  paymentIntentId: string;
  stripeAccountId: string;
  customerId: string;
  amount: number;
  description: string;
  customerEmail: string;
  empresaId: string;
  classId?: string;
  branchId?: string;
  paymentType: 'full' | 'deposit'; // Tipo de pago: completo o seña
  metadata?: Record<string, string>;
  bookingId?: string; // Añadir booking_id como parámetro opcional
}

/**
 * Servicio de cliente para crear y enviar facturas profesionales para registros de clases
 * Usa un enfoque API-first, llamando al endpoint de facturación en lugar de inicializar Stripe en el cliente
 */
export class ClassInvoiceService {
  /**
   * Crea y envía una factura profesional para una reserva de clase
   * @param params Parámetros necesarios para crear la factura
   * @returns Resultado de la operación
   */
  async createAndSendInvoice(params: ClassInvoiceParams) {
    console.log(`🔄 [ClassInvoiceService:Client] Iniciando creación de factura para registro de clase:`, {
      paymentIntentId: params.paymentIntentId,
      classId: params.classId,
      paymentType: params.paymentType,
      bookingId: params.bookingId || 'no proporcionado'
    });

    try {
      // Preparar metadatos mejorados que incluyan booking_id si está disponible
      const enhancedMetadata = {
        ...params.metadata,
        // Incluir booking_id en los metadatos si está disponible
        ...(params.bookingId ? { booking_id: params.bookingId } : {})
      };

      // Llamar al endpoint de API en lugar de inicializar Stripe directamente
      const response = await fetch('/api/stripe/class-invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...params,
          metadata: enhancedMetadata
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`❌ [ClassInvoiceService:Client] Error en respuesta de API: ${response.status}`, errorData);
        return {
          success: false,
          error: errorData.error || { message: `Error ${response.status} al crear factura` }
        };
      }
      
      const result = await response.json();
      
      if (!result.success) {
        console.error(`❌ [ClassInvoiceService:Client] Error al crear factura:`, result.error);
        return {
          success: false,
          error: result.error || { message: 'Error desconocido al crear factura' }
        };
      }

      console.log(`✅ [ClassInvoiceService:Client] Factura creada exitosamente:`, {
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
      console.error(`❌ [ClassInvoiceService:Client] Error inesperado al crear factura:`, error);
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
   * Crea una factura simplificada para reservas manuales de clases
   * @param params Parámetros básicos para crear la factura
   * @returns Resultado de la operación
   */
  async createInvoice(params: {
    customerId: string;
    amount: number;
    description: string;
    metadata: Record<string, string>;
    customerEmail?: string; 
    customerName?: string;  
    branchId?: string;
    classId?: string;
    paymentType?: 'full' | 'deposit';
    empresaId?: string;
    stripeAccountId: string; 
    bookingId?: string;
  }) {
    console.log(`🔄 [ClassInvoiceService:Client] Iniciando creación de factura manual para clase:`, {
      customerId: params.customerId,
      amount: params.amount,
      description: params.description,
      customerEmail: params.customerEmail,
      branchId: params.branchId,
      classId: params.classId,
      paymentType: params.paymentType || 'full',
      empresaId: params.empresaId, 
      country: params.metadata?.country,
      bookingId: params.bookingId || 'no proporcionado'
    });

    try {
      // Determinar si es pago de seña o completo
      const isDepositPayment = params.paymentType === 'deposit';
      const depositPercentage = params.metadata?.deposit_percentage || '30';
      
      // Crear metadatos estandarizados igual que en las facturas normales de clase
      const enhancedMetadata = {
        ...params.metadata,
        // Información de tipo de recurso
        resource_type: 'class',
        is_class_booking: 'true',
        is_manual_booking: 'true',
        
        // Mantener el tipo de pago consistente
        payment_type: params.paymentType || 'full',
        
        // Información descriptiva sobre el tipo de pago
        payment_description: isDepositPayment 
          ? `Seña (${depositPercentage}%)`
          : 'Pago completo',
        
        // Otros metadatos útiles, exactamente igual que en las facturas normales
        class_id: params.classId || 'no-class-id',
        branch_id: params.branchId || 'no-branch-id',
        empresa_id: params.empresaId || '',
        customer_email: params.customerEmail || '',
        customer_name: params.customerName || '',
        payment_date: new Date().toISOString(),
        booking_id: params.bookingId || 'no proporcionado',
        
        // Asegurarse de que país está siempre en los metadatos si fue proporcionado
        country: params.metadata?.country || ''
      };

      // Asignar un ID de solicitud único para seguimiento
      const requestId = `${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
      console.log(`🟢 [${requestId}] Nueva solicitud de factura de clase recibida`);

      // Llamar al endpoint de API con parámetros simplificados
      const response = await fetch('/api/stripe/class-invoices', {
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
          branchId: params.branchId,
          classId: params.classId,
          paymentType: params.paymentType || 'full',
          empresaId: params.empresaId,
          stripeAccountId: params.stripeAccountId,
          metadata: enhancedMetadata
        })
      });
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: `Error de respuesta HTTP ${response.status}` };
        }
        
        console.error(`❌ [ClassInvoiceService:Client] Error en respuesta de API: ${response.status}`, errorData);
        
        let errorMessage = errorData.error?.message || `Error ${response.status} al crear factura manual`;
        if (response.status === 401) {
          errorMessage = "No estás autorizado para crear facturas. Por favor, inicia sesión nuevamente.";
        } else if (response.status === 400) {
          errorMessage = errorData.error || "Faltan datos requeridos para crear la factura";
        } else if (response.status === 500) {
          errorMessage = "Error en el servidor al procesar la factura. Contacta con soporte.";
        }
        
        return {
          success: false,
          error: errorMessage
        };
      }
      
      const result = await response.json();
      
      if (!result.success) {
        console.error(`❌ [ClassInvoiceService:Client] Error al crear factura manual:`, result.error);
        return {
          success: false,
          error: result.error || { message: 'Error desconocido al crear factura manual' }
        };
      }

      console.log(`✅ [ClassInvoiceService:Client] Factura manual creada exitosamente:`, {
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
      console.error(`❌ [ClassInvoiceService:Client] Error inesperado al crear factura manual:`, error);
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

// Exportar una instancia del servicio para ser utilizada en la aplicación
export const classInvoiceService = new ClassInvoiceService();
