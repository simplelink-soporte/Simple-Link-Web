import { NextResponse } from 'next/server';
import { Stripe } from 'stripe';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

/**
 * Endpoint para actualizar los metadatos de facturas en Stripe
 * Este endpoint se usa principalmente para añadir el booking_id a las facturas
 * después de que la reserva ha sido creada exitosamente.
 */
export async function POST(request: Request) {
  try {
    // 1. Verificar autenticación con Supabase
    const cookieStore = cookies();
    const supabaseServerClient = createServerComponentClient<Database>({ 
      cookies: () => cookieStore
    });
    const { data: { session } } = await supabaseServerClient.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ 
        success: false, 
        error: { message: 'No autorizado' } 
      }, { status: 401 });
    }
    
    // 2. Obtener el cuerpo de la solicitud
    const requestBody = await request.json();
    const requestId = `umd_${Date.now().toString(36)}`;
    
    console.log(`🔄 [${requestId}] Iniciando actualización de metadatos de factura:`, {
      paymentIntentId: requestBody.paymentIntentId?.substring(0, 10) + '...',
      stripeAccountId: requestBody.stripeAccountId?.substring(0, 10) + '...',
      metadata: requestBody.metadata
    });
    
    const {
      paymentIntentId,
      stripeAccountId,
      metadata
    } = requestBody;
    
    // 3. Validar parámetros obligatorios
    if (!paymentIntentId) {
      return NextResponse.json({ 
        success: false, 
        error: { message: 'Se requiere paymentIntentId' } 
      }, { status: 400 });
    }
    
    if (!stripeAccountId) {
      return NextResponse.json({ 
        success: false, 
        error: { message: 'Se requiere stripeAccountId' } 
      }, { status: 400 });
    }
    
    if (!metadata || typeof metadata !== 'object') {
      return NextResponse.json({ 
        success: false, 
        error: { message: 'Se requieren metadatos válidos' } 
      }, { status: 400 });
    }
    
    // 4. Inicializar Stripe con la clave secreta del servidor
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      console.error(`❌ [${requestId}] STRIPE_SECRET_KEY no está configurada en las variables de entorno`);
      return NextResponse.json({ 
        success: false, 
        error: { message: 'Error de configuración del servidor' } 
      }, { status: 500 });
    }
    
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-02-24.acacia',
      stripeAccount: stripeAccountId
    });
    
    // 5. Obtener el PaymentIntent para verificar y encontrar las facturas asociadas
    let paymentIntent;
    try {
      console.log(`🔍 [${requestId}] Obteniendo PaymentIntent:`, paymentIntentId);
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (!paymentIntent) {
        console.error(`❌ [${requestId}] No se encontró el PaymentIntent:`, paymentIntentId);
        return NextResponse.json({ 
          success: false, 
          error: { message: 'PaymentIntent no encontrado' } 
        }, { status: 404 });
      }
      
      // Verificar si el pago es de tipo "garantia" a través de los metadatos
      const isGuaranteePay = 
        paymentIntent.metadata?.payment_type === 'guarantee' ||
        (typeof paymentIntent.description === 'string' && 
         paymentIntent.description.toLowerCase().includes('garantía'));
      
      console.log(`🔍 [${requestId}] Verificando tipo de pago:`, {
        paymentType: paymentIntent.metadata?.payment_type,
        description: paymentIntent.description,
        isGuaranteePay
      });
      
      // Si es un pago de garantía, no actualizamos ninguna factura
      if (isGuaranteePay) {
        console.log(`ℹ️ [${requestId}] Pago de tipo GARANTÍA detectado. No se actualizarán facturas.`);
        return NextResponse.json({ 
          success: true, 
          message: 'Los pagos de tipo garantía no requieren actualización de facturas',
          skipped: true,
          paymentIntentId
        });
      }
      
      console.log(`✅ [${requestId}] PaymentIntent encontrado:`, {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        customerId: paymentIntent.customer,
        paymentType: paymentIntent.metadata?.payment_type || 'no especificado'
      });
    } catch (error: any) {
      console.error(`❌ [${requestId}] Error al obtener PaymentIntent:`, error);
      return NextResponse.json({ 
        success: false, 
        error: { 
          message: `Error al obtener PaymentIntent: ${error.message}`,
          code: error.code || 'payment_intent_error'
        } 
      }, { status: 500 });
    }
    
    // 6. Buscar facturas asociadas a este PaymentIntent
    try {
      console.log(`🔍 [${requestId}] Buscando facturas para el PaymentIntent:`, paymentIntentId);
      
      // Primero buscamos facturas que tengan este PaymentIntent directamente
      let invoices = await stripe.invoices.list({
        limit: 10 // Limitamos la búsqueda para evitar problemas de rendimiento
      });
      
      // Filtramos las facturas que tengan el PaymentIntent en sus metadatos
      const matchingInvoices = invoices.data.filter(invoice => {
        return invoice.metadata?.payment_intent_id === paymentIntentId;
      });
      
      if (matchingInvoices.length === 0) {
        console.log(`⚠️ [${requestId}] No se encontraron facturas con el PaymentIntent en metadatos, buscando por cliente...`);
        
        // Si no encontramos facturas directamente, buscamos por ID de cliente recientes
        if (typeof paymentIntent.customer === 'string') {
          const recentInvoices = await stripe.invoices.list({
            customer: paymentIntent.customer,
            limit: 5 // Limitamos a las 5 facturas más recientes
          });
          
          // Ordenamos por fecha de creación descendente
          const sortedInvoices = recentInvoices.data.sort((a, b) => 
            (b.created || 0) - (a.created || 0)
          );
          
          if (sortedInvoices.length > 0) {
            // Tomamos la factura más reciente
            matchingInvoices.push(sortedInvoices[0]);
            console.log(`✅ [${requestId}] Se encontró la factura más reciente para el cliente:`, {
              invoiceId: sortedInvoices[0].id,
              created: new Date(sortedInvoices[0].created * 1000).toISOString()
            });
          }
        }
      }
      
      if (matchingInvoices.length === 0) {
        console.error(`❌ [${requestId}] No se encontraron facturas asociadas al PaymentIntent:`, paymentIntentId);
        return NextResponse.json({ 
          success: false, 
          error: { message: 'No se encontraron facturas para este pago' },
          paymentIntentId
        });
      }
      
      // 7. Actualizar metadatos de cada factura encontrada
      const updateResults = [];
      
      for (const invoice of matchingInvoices) {
        console.log(`🔄 [${requestId}] Actualizando metadatos de factura:`, invoice.id);
        
        // Mantener metadatos existentes y añadir/actualizar los nuevos
        const updatedMetadata = {
          ...invoice.metadata,
          ...metadata,
          payment_intent_id: paymentIntentId, // Asegurar que siempre tengamos este vínculo
          updated_at: new Date().toISOString() // Añadir timestamp de actualización
        };
        
        const updatedInvoice = await stripe.invoices.update(invoice.id, {
          metadata: updatedMetadata
        });
        
        updateResults.push({
          invoiceId: updatedInvoice.id,
          success: true
        });
        
        console.log(`✅ [${requestId}] Metadatos actualizados para factura:`, {
          invoiceId: updatedInvoice.id,
          metadata: updatedInvoice.metadata
        });
      }
      
      return NextResponse.json({ 
        success: true, 
        message: `Metadatos actualizados en ${updateResults.length} facturas`,
        results: updateResults,
        updatedInvoices: matchingInvoices.length
      });
      
    } catch (error: any) {
      console.error(`❌ [${requestId}] Error al actualizar metadatos de facturas:`, error);
      return NextResponse.json({ 
        success: false, 
        error: { 
          message: `Error al actualizar metadatos: ${error.message}`,
          code: error.code || 'metadata_update_error'
        } 
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('❌ Error inesperado al actualizar metadatos de factura:', error);
    return NextResponse.json({ 
      success: false, 
      error: { 
        message: `Error inesperado: ${error.message}`,
        code: 'unexpected_error'
      } 
    }, { status: 500 });
  }
}

export const GET = () => {
  return NextResponse.json({ 
    error: 'Método no permitido', 
    message: 'Este endpoint solo acepta solicitudes POST' 
  }, { status: 405 });
};
