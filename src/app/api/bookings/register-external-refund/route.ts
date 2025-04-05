import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

// Este endpoint es similar al de process-refund pero no interactúa con Stripe
// Solo registra el reembolso en nuestra base de datos para fines de seguimiento

export async function POST(req: Request) {
  try {
    // Parseamos el body de la request
    const body = await req.json();
    logger.info('📝 [API] Registrando reembolso externo:', {
      bookingId: body.bookingId,
      amount: body.amount,
      isFullRefund: body.isFullRefund
    });

    const { 
      bookingId, 
      amount,            // Monto reembolsado
      reason,            // Razón del reembolso
      isFullRefund,      // Si es reembolso total o parcial
      percentage = 100,  // Porcentaje reembolsado (solo para reembolsos parciales)
      notes              // Notas adicionales
    } = body;

    if (!bookingId || amount === undefined) {
      logger.error('❌ [API] Error: Datos faltantes para registrar reembolso externo', {
        hasBookingId: Boolean(bookingId),
        hasAmount: amount !== undefined
      });
      return NextResponse.json({ 
        success: false, 
        error: { message: 'Faltan datos requeridos para registrar el reembolso' } 
      }, { status: 400 });
    }

    // Registramos el reembolso externo en nuestra base de datos
    const { data, error } = await supabase
      .from('booking_refunds')
      .insert({
        booking_id: bookingId,
        amount: amount,
        refund_method: 'external',
        refund_type: isFullRefund ? 'full' : 'partial',
        percentage: isFullRefund ? 100 : percentage,
        reason: reason || 'Cancelación de reserva',
        status: 'succeeded', // Asumimos que el reembolso externo ya fue completado
        notes: notes || 'Reembolso procesado externamente',
        metadata: {
          registered_by: 'admin',
          registered_at: new Date().toISOString()
        }
      })
      .select();

    if (error) {
      logger.error('❌ [API] Error al registrar reembolso externo en la BD:', { error });
      return NextResponse.json({ 
        success: false, 
        error: { message: error.message || 'Error al registrar el reembolso en la base de datos' } 
      }, { status: 500 });
    }

    logger.info('✅ [API] Reembolso externo registrado correctamente:', { 
      refundId: data?.[0]?.id, 
      bookingId
    });

    return NextResponse.json({ 
      success: true, 
      refund: data?.[0],
      message: `Reembolso externo de ${amount} registrado correctamente`
    });
  } catch (error: any) {
    logger.error('❌ [API] Error al registrar reembolso externo:', { error });
    return NextResponse.json({ 
      success: false, 
      error: { message: error.message || 'Error desconocido al registrar el reembolso' } 
    }, { status: 500 });
  }
}
