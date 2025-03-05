-- Eliminar TODAS las versiones existentes de la función
DROP FUNCTION IF EXISTS public.cancel_booking_v1(uuid, text, boolean);
DROP FUNCTION IF EXISTS public.cancel_booking_v1(uuid, text, boolean, numeric, text, text);
DROP FUNCTION IF EXISTS public.cancel_booking_v1(uuid, text, boolean, numeric, text, text, text);

-- Luego creamos la nueva versión
CREATE OR REPLACE FUNCTION public.cancel_booking_v1(
  p_booking_id UUID,
  p_reason TEXT,
  p_should_charge BOOLEAN DEFAULT FALSE,
  p_charge_amount NUMERIC DEFAULT NULL,
  p_stripe_payment_intent_id TEXT DEFAULT NULL,
  p_stripe_payment_method_id TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking RECORD;
  v_payment_id UUID;
  v_result JSONB;
  v_error_details JSONB;
BEGIN
  -- 1. Obtener y validar la reserva
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    v_error_details := jsonb_build_object(
      'code', 'BOOKING_NOT_FOUND',
      'message', 'Reserva no encontrada',
      'details', jsonb_build_object('booking_id', p_booking_id)
    );
    RETURN jsonb_build_object('success', false, 'error', v_error_details);
  END IF;

  IF v_booking.cancelled_at IS NOT NULL THEN
    v_error_details := jsonb_build_object(
      'code', 'BOOKING_ALREADY_CANCELLED',
      'message', 'La reserva ya está cancelada',
      'details', jsonb_build_object(
        'booking_id', p_booking_id,
        'cancelled_at', v_booking.cancelled_at
      )
    );
    RETURN jsonb_build_object('success', false, 'error', v_error_details);
  END IF;

  -- 2. Si hay cargo, registrar el pago
  IF p_should_charge AND p_charge_amount IS NOT NULL THEN
    INSERT INTO payments (
      booking_id,
      deposit_amount,
      total_price,
      payment_method,
      payment_status,
      stripe_payment_method_id,
      stripe_payment_intent_id,
      notes
    ) VALUES (
      p_booking_id,
      p_charge_amount,
      p_charge_amount,
      'stripe',
      'completed',
      p_stripe_payment_method_id,
      p_stripe_payment_intent_id,
      'Cargo por no-show: ' || COALESCE(p_reason, 'No especificado')
    )
    RETURNING id INTO v_payment_id;
  END IF;

  -- 3. Actualizar la reserva
  UPDATE bookings
  SET 
    cancelled_at = NOW(),
    cancellation_reason = p_reason,
    payment_status = 'cancelled',
    updated_at = NOW()
  WHERE id = p_booking_id;

  -- 4. Preparar respuesta exitosa
  v_result := jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'booking_id', v_booking.id,
      'cancelled_at', NOW(),
      'reason', p_reason,
      'payment_id', v_payment_id,
      'charge_applied', p_should_charge,
      'charge_amount', p_charge_amount
    )
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  -- Manejo de errores sin dependencia de tabla error_logs
  v_error_details := jsonb_build_object(
    'code', SQLSTATE,
    'message', SQLERRM,
    'details', jsonb_build_object(
      'booking_id', p_booking_id,
      'error_detail', SQLERRM,
      'error_hint', SQLSTATE
    )
  );

  RETURN jsonb_build_object('success', false, 'error', v_error_details);
END;
$$;

-- Establecer los permisos necesarios
REVOKE ALL ON FUNCTION public.cancel_booking_v1(UUID, TEXT, BOOLEAN, NUMERIC, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_booking_v1(UUID, TEXT, BOOLEAN, NUMERIC, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking_v1(UUID, TEXT, BOOLEAN, NUMERIC, TEXT, TEXT) TO service_role; 