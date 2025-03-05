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
      empresaId: payload.empresaId
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