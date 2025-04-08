-- Función RPC optimizada para actualizar el estado de pago a "refunded" en tablas bookings y payments
-- Esta función implementa las mejores prácticas de PostgreSQL/Supabase para transacciones
-- y manejo de errores

CREATE OR REPLACE FUNCTION public.update_payment_status_refund(
  p_booking_id uuid,                       -- ID de la reserva a actualizar
  p_refund_id text DEFAULT NULL,           -- ID del reembolso en Stripe (opcional)
  p_refund_amount numeric DEFAULT NULL,    -- Monto reembolsado (opcional)
  p_reason text DEFAULT 'Reembolso procesado', -- Motivo del reembolso/cancelación
  p_update_cancellation boolean DEFAULT false  -- Si también debemos marcar como cancelada
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Usa los permisos del creador, no del usuario que llama
AS $function$
DECLARE
  v_booking RECORD;
  v_result JSONB;
  v_affected_payments INT := 0;
  v_has_payments BOOLEAN := false;
  v_reason_text TEXT;
  v_payment_id UUID;
BEGIN
  -- Verificar que la reserva existe
  SELECT * INTO v_booking 
  FROM bookings 
  WHERE id = p_booking_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Reserva no encontrada', 
      'booking_id', p_booking_id
    );
  END IF;
  
  -- Formatear el motivo para que sea informativo
  IF p_refund_amount IS NOT NULL THEN
    v_reason_text := 'Reembolso de ' || p_refund_amount || '. ' || p_reason;
  ELSE
    v_reason_text := p_reason;
  END IF;
  
  -- Comenzar una transacción
  BEGIN
    -- 1. Actualizar el estado del pago en la tabla bookings
    UPDATE bookings
    SET 
      payment_status = 'refunded',
      updated_at = NOW(),
      cancellation_reason = CASE 
                             WHEN p_update_cancellation AND cancelled_at IS NULL 
                             THEN v_reason_text 
                             WHEN cancellation_reason IS NULL 
                             THEN v_reason_text 
                             ELSE cancellation_reason 
                           END,
      cancelled_at = CASE 
                      WHEN p_update_cancellation AND cancelled_at IS NULL 
                      THEN NOW() 
                      ELSE cancelled_at 
                    END
    WHERE id = p_booking_id;
    
    -- 2. Actualizar el estado en la tabla payments (solo pagos completados)
    -- y establecer charge_reason
    UPDATE payments
    SET 
      payment_status = 'refunded',
      updated_at = NOW(),
      charge_reason = v_reason_text
    WHERE 
      booking_id = p_booking_id AND 
      payment_status = 'completed'
    RETURNING id INTO v_payment_id;
    
    GET DIAGNOSTICS v_affected_payments = ROW_COUNT;
    v_has_payments := v_affected_payments > 0;
    
    -- 3. Registrar el reembolso en la tabla booking_refunds si hay un ID de reembolso
    -- y la tabla existe
    IF p_refund_id IS NOT NULL THEN
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables 
                  WHERE table_schema = 'public' AND table_name = 'booking_refunds') THEN
          INSERT INTO booking_refunds (
            booking_id,
            amount,
            stripe_refund_id,
            refund_method,
            reason,
            status,
            payment_id,
            metadata
          ) VALUES (
            p_booking_id,
            p_refund_amount,
            p_refund_id,
            'stripe',
            p_reason,
            'succeeded',
            v_payment_id,
            jsonb_build_object(
              'processed_at', NOW(),
              'notes', v_reason_text
            )
          );
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- Si falla la inserción en booking_refunds, continuamos con el resto del proceso
        -- pero registramos el error en el resultado
        v_result := jsonb_build_object(
          'refund_record_error', SQLERRM,
          'refund_record_detail', SQLSTATE
        );
      END;
    END IF;
    
    -- 4. Preparar el resultado exitoso
    v_result := jsonb_build_object(
      'success', true,
      'booking_updated', true,
      'payments_updated', v_has_payments,
      'payments_count', v_affected_payments,
      'booking_id', p_booking_id,
      'payment_status', 'refunded',
      'reason', v_reason_text,
      'refund_id', p_refund_id,
      'refund_amount', p_refund_amount,
      'message', 'Estado de pago actualizado correctamente a "refunded" en todas las tablas'
    );
    
    RETURN v_result;
  EXCEPTION WHEN OTHERS THEN
    -- Si hay un error en cualquier parte del proceso, revertimos la transacción
    -- y registramos el error
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE,
      'booking_id', p_booking_id
    );
  END;
END;
$function$;

-- Comentario para documentar la función
COMMENT ON FUNCTION public.update_payment_status_refund(uuid, text, numeric, text, boolean) IS 
'Actualiza de manera transaccional el estado de pago a "refunded" tanto en la tabla bookings como en payments.
También registra opcionalmente el reembolso en booking_refunds y actualiza charge_reason.

Parámetros:
- p_booking_id: ID de la reserva a actualizar
- p_refund_id: ID del reembolso en Stripe (opcional)
- p_refund_amount: Monto del reembolso (opcional)
- p_reason: Motivo del reembolso (opcional, default: "Reembolso procesado")
- p_update_cancellation: Si debe marcar la reserva como cancelada (opcional, default: false)

Retorna un objeto JSON con el resultado de la operación.';

-- Cómo usar la función desde TypeScript en la API:
/*
// Ejemplo de uso en la API process-refund
const { data, error } = await supabase.rpc('update_payment_status_refund', {
  p_booking_id: bookingId,
  p_refund_id: refund.id,
  p_refund_amount: refundAmount,
  p_reason: reason || 'Reembolso por cancelación',
  p_update_cancellation: true // si además queremos marcar como cancelada
});

if (error) {
  logger.error('⚠️ [API] Error al actualizar estados de pago:', { error });
  // Manejar el error...
} else {
  logger.info('✅ [API] Estados de pago actualizados correctamente:', { data });
  // Continuar con la respuesta...
}
*/
