CREATE OR REPLACE FUNCTION public.cancel_booking_v1(
    p_booking_id uuid,
    p_reason text DEFAULT NULL,
    p_should_charge boolean DEFAULT false,
    p_charge_amount numeric DEFAULT NULL,
    p_stripe_payment_method_id text DEFAULT NULL,
    p_stripe_account_id text DEFAULT NULL,
    p_stripe_customer_id text DEFAULT NULL  -- Nuevo parámetro
)
RETURNS public.cancel_booking_response
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result public.cancel_booking_response;
    v_payment_id uuid;
    v_booking_data record;
    v_payment_status booking_payment_status;
BEGIN
    -- 1. Validar parámetros requeridos para cargo
    IF p_should_charge THEN
        IF p_stripe_customer_id IS NULL OR 
           p_stripe_payment_method_id IS NULL OR 
           p_stripe_account_id IS NULL OR 
           p_charge_amount IS NULL THEN
            RAISE EXCEPTION 'Faltan datos requeridos para el cargo'
                USING ERRCODE = 'CHRG_01';
        END IF;
    END IF;

    -- 2. Verificar existencia y estado de la reserva
    SELECT * INTO v_booking_data
    FROM public.bookings
    WHERE id = p_booking_id
    AND cancelled_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reserva no encontrada o ya cancelada'
            USING ERRCODE = 'BOOK_01';
    END IF;

    -- 3. Determinar el estado del pago
    v_payment_status := CASE 
        WHEN p_should_charge THEN 'pending_charge'::booking_payment_status
        ELSE 'cancelled'::booking_payment_status
    END;

    -- 4. Si hay cargo, crear registro de pago primero
    IF p_should_charge THEN
        INSERT INTO public.payments (
            booking_id,
            deposit_amount,
            total_price,
            payment_method,
            payment_status,
            notes,
            stripe_payment_method_id,
            stripe_account_id,
            stripe_customer_id,  -- Añadido
            charge_reason,
            created_at,
            updated_at
        ) VALUES (
            p_booking_id,
            0,
            p_charge_amount,
            'stripe',
            'pending'::booking_payment_status,
            'Cargo por no-show: ' || COALESCE(p_reason, 'Sin razón especificada'),
            p_stripe_payment_method_id,
            p_stripe_account_id,
            p_stripe_customer_id,  -- Añadido
            'no_show',
            NOW(),
            NOW()
        )
        RETURNING 
            id,
            payment_status::text
        INTO 
            v_payment_id,
            v_result.payment_status;

        v_result.payment_id := v_payment_id;
        v_result.charge_status := 'pending';
    END IF;

    -- 5. Actualizar la reserva
    UPDATE public.bookings
    SET 
        cancelled_at = NOW(),
        cancellation_reason = p_reason,
        payment_status = v_payment_status,
        updated_at = NOW()
    WHERE id = p_booking_id
    RETURNING 
        id,
        cancelled_at
    INTO
        v_result.booking_id,
        v_result.cancelled_at;

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    -- Log detallado del error
    INSERT INTO trigger_logs (
        trigger_name,
        booking_data,
        error_message
    ) VALUES (
        'cancel_booking_v1',
        jsonb_build_object(
            'booking_id', p_booking_id,
            'should_charge', p_should_charge,
            'has_customer_id', p_stripe_customer_id IS NOT NULL,
            'has_payment_method', p_stripe_payment_method_id IS NOT NULL,
            'error_detail', SQLERRM,
            'error_hint', SQLSTATE
        ),
        'Error en cancel_booking_v1: ' || SQLERRM
    );
    
    RAISE;
END;
$$;