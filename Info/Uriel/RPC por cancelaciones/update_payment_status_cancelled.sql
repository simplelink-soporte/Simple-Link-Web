-- Función RPC optimizada para actualizar el estado de pago a "cancelled" en tablas bookings y payments
-- Esta función implementa las mejores prácticas de PostgreSQL/Supabase para transacciones
-- y manejo de errores en el caso de cancelaciones sin reembolso

CREATE OR REPLACE FUNCTION public.update_payment_status_cancelled(
  p_booking_id uuid,                         -- ID de la reserva a actualizar
  p_reason text DEFAULT 'Reserva cancelada', -- Motivo de la cancelación
  p_charge_amount numeric DEFAULT NULL,      -- Monto del cargo por cancelación (si aplica)
  p_stripe_payment_intent_id text DEFAULT NULL, -- ID del payment intent (si se hizo cargo)
  p_stripe_payment_method_id text DEFAULT NULL  -- ID del método de pago (si se hizo cargo)
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
  v_should_charge BOOLEAN := p_charge_amount IS NOT NULL AND p_charge_amount > 0;
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
  
  -- Verificar si la reserva ya está cancelada
  IF v_booking.cancelled_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'La reserva ya está cancelada', 
      'booking_id', p_booking_id,
      'cancelled_at', v_booking.cancelled_at
    );
  END IF;
  
  -- Formatear el motivo para que sea informativo
  IF v_should_charge THEN
    v_reason_text := 'Cancelación con cargo de ' || p_charge_amount || '. ' || p_reason;
  ELSE
    v_reason_text := p_reason;
  END IF;
  
  -- Comenzar una transacción
  BEGIN
    -- 1. Actualizar el estado del pago en la tabla bookings
    UPDATE bookings
    SET 
      payment_status = 'cancelled',
      updated_at = NOW(),
      cancelled_at = NOW(),
      cancellation_reason = v_reason_text
    WHERE id = p_booking_id;
    
    -- 2. Actualizar el estado en la tabla payments (solo pagos completados o pendientes)
    UPDATE payments
    SET 
      payment_status = 'cancelled',
      updated_at = NOW(),
      charge_reason = v_reason_text
    WHERE 
      booking_id = p_booking_id AND 
      payment_status IN ('completed', 'pending')
    RETURNING id INTO v_payment_id;
    
    GET DIAGNOSTICS v_affected_payments = ROW_COUNT;
    v_has_payments := v_affected_payments > 0;
    
    -- 3. Si hay que hacer un cargo por cancelación, registrarlo como un nuevo pago
    IF v_should_charge THEN
      INSERT INTO payments (
        booking_id,
        deposit_amount,
        total_price,
        payment_method,
        payment_status,
        stripe_payment_method_id,
        stripe_payment_intent_id,
        notes,
        charge_reason
      ) VALUES (
        p_booking_id,
        p_charge_amount,
        p_charge_amount,
        'stripe',
        'completed',
        p_stripe_payment_method_id,
        p_stripe_payment_intent_id,
        'Cargo por cancelación',
        v_reason_text
      )
      RETURNING id INTO v_payment_id;
    END IF;
    
    -- 4. Preparar el resultado exitoso
    v_result := jsonb_build_object(
      'success', true,
      'booking_updated', true,
      'payments_updated', v_has_payments,
      'payments_count', v_affected_payments,
      'booking_id', p_booking_id,
      'payment_status', 'cancelled',
      'reason', v_reason_text,
      'charge_applied', v_should_charge,
      'charge_amount', p_charge_amount,
      'payment_id', v_payment_id,
      'message', 'Reserva cancelada correctamente con estado de pago "cancelled" en todas las tablas'
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
COMMENT ON FUNCTION public.update_payment_status_cancelled(uuid, text, numeric, text, text) IS 
'Actualiza de manera transaccional el estado de pago a "cancelled" tanto en la tabla bookings como en payments.
También registra un cargo por cancelación si es aplicable y actualiza charge_reason.

Parámetros:
- p_booking_id: ID de la reserva a cancelar
- p_reason: Motivo de la cancelación (opcional, default: "Reserva cancelada")
- p_charge_amount: Monto del cargo por cancelación, si aplica (opcional)
- p_stripe_payment_intent_id: ID del payment intent de Stripe, si se hizo cargo (opcional)
- p_stripe_payment_method_id: ID del método de pago, si se hizo cargo (opcional)

Retorna un objeto JSON con el resultado de la operación.';

-- Cómo usar la función desde TypeScript en la API:
/*
// Ejemplo 1: Cancelación simple sin cargo
const { data, error } = await supabase.rpc('update_payment_status_cancelled', {
  p_booking_id: bookingId,
  p_reason: 'Cancelación solicitada por el cliente'
});

// Ejemplo 2: Cancelación con cargo por política de cancelación
const { data, error } = await supabase.rpc('update_payment_status_cancelled', {
  p_booking_id: bookingId,
  p_reason: 'Cancelación con menos de 24 horas',
  p_charge_amount: 50.00, // cargo de 50.00
  p_stripe_payment_intent_id: paymentIntent.id,
  p_stripe_payment_method_id: paymentMethod.id
});

if (error) {
  logger.error('⚠️ [API] Error al cancelar reserva:', { error });
  // Manejar el error...
} else {
  logger.info('✅ [API] Reserva cancelada correctamente:', { data });
  // Continuar con la respuesta...
}
*/
