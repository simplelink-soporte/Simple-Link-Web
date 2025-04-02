import { NextResponse } from 'next/server';
import { createId } from '@paralleldrive/cuid2';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { stripe } from '@/lib/stripe';
import { NoShowService } from '@/services/NoShowService';
import { ValidationService } from '@/services/ValidationService';
import type { NoShowChargeRequest, NoShowChargeResponse } from '@/types/api';

export async function POST(request: Request): Promise<NextResponse<NoShowChargeResponse>> {
  const requestId = createId();
  console.log(`🔄 [${requestId}] Iniciando proceso de cargo por no-show`);

  try {
    const payload = await request.json() as NoShowChargeRequest;
    
    // Verificar si se incluye información de stripe directamente en el payload
    if (payload.stripeData) {
      console.log(`✅ [${requestId}] Usando datos Stripe proporcionados por el cliente:`, {
        bookingId: payload.bookingId,
        hasPaymentMethodId: Boolean(payload.stripeData.paymentMethodId),
        hasAccountId: Boolean(payload.stripeData.accountId)
      });
    }
    
    // Obtener el país de la organización si no está disponible
    if (payload.empresaId && !payload.country) {
      try {
        console.log(`🔍 [${requestId}] Intentando obtener país de la organización:`, payload.empresaId);
        const { data: org } = await supabaseAdmin
          .from('organizations')
          .select('country, name')
          .eq('id', payload.empresaId)
          .single();
          
        if (org?.country) {
          payload.country = org.country;
          console.log(`🌎 [${requestId}] País obtenido de la base de datos:`, payload.country);
        } else if (org?.name) {
          // Intentar inferir el país por el nombre
          const name = org.name.toLowerCase();
          if (name.includes('mexico') || name.includes('méxico')) {
            payload.country = 'MX';
            console.log(`🌎 [${requestId}] País inferido del nombre:`, payload.country);
          } else if (name.includes('argentina')) {
            payload.country = 'AR';
            console.log(`🌎 [${requestId}] País inferido del nombre:`, payload.country);
          } else if (name.includes('españa') || name.includes('espana')) {
            payload.country = 'ES';
            console.log(`🌎 [${requestId}] País inferido del nombre:`, payload.country);
          }
        }
      } catch (error) {
        console.warn(`⚠️ [${requestId}] Error al obtener país de la organización:`, error);
      }
    } else if (payload.country) {
      console.log(`🌎 [${requestId}] País recibido directamente del cliente:`, payload.country);
    }
    
    // Si no se proporcionaron datos del cliente, intentar obtenerlos de la reserva
    if (!payload.customerEmail || !payload.customerName) {
      console.log(`🔍 [${requestId}] Buscando datos del cliente en la reserva:`, payload.bookingId);
      
      const { data: booking } = await supabaseAdmin
        .from('bookings')
        .select('*, customer:customer_id(*)')
        .eq('id', payload.bookingId)
        .single();
      
      if (booking) {
        console.log(`✅ [${requestId}] Datos de reserva encontrados`);
        // Extraer datos del cliente de la reserva
        payload.customerEmail = booking.customer?.email || booking.customer_email || payload.customerEmail;
        payload.customerName = booking.customer?.name || booking.customer_name || payload.customerName;
        
        console.log(`👤 [${requestId}] Datos de cliente extraídos:`, {
          hasEmail: Boolean(payload.customerEmail),
          hasName: Boolean(payload.customerName),
          customerId: booking.customer_id || 'N/A'
        });
      } else {
        console.warn(`⚠️ [${requestId}] No se encontraron datos de la reserva:`, payload.bookingId);
      }
    }
    
    // Crear instancia del servicio
    const validationService = new ValidationService(supabaseAdmin);
    const noShowService = new NoShowService({
      stripe,
      supabase: supabaseAdmin,
      validationService
    });

    // Procesar el no-show
    const result = await noShowService.processNoShow({
      bookingId: payload.bookingId,
      amount: payload.amount,
      reason: payload.reason,
      empresaId: payload.empresaId,
      country: payload.country, // Pasar el país de forma explícita
      stripeData: payload.stripeData, // Pasar los datos de Stripe si están disponibles
      customerEmail: payload.customerEmail,
      customerName: payload.customerName
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });

  } catch (error: any) {
    console.error(`❌ [${requestId}] Error general:`, error);
    return NextResponse.json(
      { 
        success: false,
        error: {
          message: 'Error interno al procesar la solicitud',
          code: 'INTERNAL_ERROR',
          details: error.message
        }
      },
      { status: 500 }
    );
  }
}