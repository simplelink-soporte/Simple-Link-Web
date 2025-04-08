CREATE OR REPLACE FUNCTION public.cancel_booking_v1(
  p_booking_id uuid, 
  p_reason text, 
  p_should_charge boolean DEFAULT false, 
  p_charge_amount numeric DEFAULT NULL::numeric, 
  p_stripe_payment_intent_id text DEFAULT NULL::text, 
  p_stripe_payment_method_id text DEFAULT NULL::text,
  p_has_refund boolean DEFAULT false, -- Nuevo parámetro para indicar si hubo reembolso
  p_refund_amount numeric DEFAULT NULL::numeric, -- Monto opcional del reembolso
  p_stripe_refund_id text DEFAULT NULL::text -- ID opcional del reembolso en Stripe
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_booking RECORD;
  v_payment_id UUID;
  v_result JSONB;
  v_error_details JSONB;
  v_payment_status TEXT;
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

  -- 3. Determinar el estado de pago según si hubo reembolso
  IF p_has_refund THEN
    v_payment_status := 'refunded';
  ELSE
    v_payment_status := 'cancelled';
  END IF;

  -- 4. Actualizar la reserva
  UPDATE bookings
  SET 
    cancelled_at = NOW(),
    cancellation_reason = p_reason,
    payment_status = v_payment_status,
    updated_at = NOW()
  WHERE id = p_booking_id;

  -- 5. Si hay reembolso, registrarlo en la tabla booking_refunds si existe
  -- Verificar si la tabla existe antes de intentar insertar
  IF p_has_refund AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'booking_refunds') THEN
    BEGIN
      INSERT INTO booking_refunds (
        booking_id,
        amount,
        stripe_refund_id,
        refund_method,
        reason,
        status,
        metadata
      ) VALUES (
        p_booking_id,
        p_refund_amount,
        p_stripe_refund_id,
        'stripe',
        p_reason,
        'succeeded',
        jsonb_build_object(
          'processed_at', NOW(),
          'payment_intent_id', p_stripe_payment_intent_id
        )
      );
    EXCEPTION WHEN OTHERS THEN
      -- Ignorar error si no se puede insertar, pero registrar en el log
      RAISE NOTICE 'Error al registrar reembolso: %', SQLERRM;
    END;
  END IF;

  -- 6. Preparar respuesta exitosa
  v_result := jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'booking_id', v_booking.id,
      'cancelled_at', NOW(),
      'reason', p_reason,
      'payment_id', v_payment_id,
      'charge_applied', p_should_charge,
      'charge_amount', p_charge_amount,
      'payment_status', v_payment_status,
      'has_refund', p_has_refund,
      'refund_amount', p_refund_amount,
      'stripe_refund_id', p_stripe_refund_id
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
$function$;

-- Comentario sobre la función
COMMENT ON FUNCTION public.cancel_booking_v1(uuid, text, boolean, numeric, text, text, boolean, numeric, text) IS 
'Cancela una reserva y opcionalmente procesa un cargo o registra un reembolso.
Parámetros:
- p_booking_id: ID de la reserva a cancelar
- p_reason: Motivo de la cancelación
- p_should_charge: Indica si se debe realizar un cargo (ej. por no-show)
- p_charge_amount: Monto a cargar si p_should_charge es true
- p_stripe_payment_intent_id: ID del payment intent de Stripe (para cargo o reembolso)
- p_stripe_payment_method_id: ID del método de pago para el cargo
- p_has_refund: Indica si se procesó un reembolso para esta cancelación
- p_refund_amount: Monto reembolsado si p_has_refund es true
- p_stripe_refund_id: ID del reembolso procesado en Stripe

Cuando p_has_refund es true, el payment_status se establece como "refunded".
Cuando p_has_refund es false, el payment_status se establece como "cancelled".';
