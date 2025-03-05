-- 1. Verificar si el procedimiento existe y recrearlo
CREATE OR REPLACE FUNCTION public.create_booking_v2(
    p_court_id uuid,
    p_date date,
    p_start_time time without time zone,
    p_end_time time without time zone,
    p_total_price numeric,
    p_payment_method payment_method_enum,
    p_payment_status payment_status_type,
    p_deposit_amount numeric DEFAULT 0,
    p_title text DEFAULT NULL::text,
    p_description text DEFAULT NULL::text,
    p_participants jsonb DEFAULT '[]'::jsonb,
    p_rental_items jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_booking_id uuid;
    v_participant jsonb;
    v_rental jsonb;
BEGIN
    -- Insertar la reserva
    INSERT INTO public.bookings (
        court_id,
        date,
        start_time,
        end_time,
        total_price,
        payment_method,
        payment_status,
        deposit_amount,
        title,
        description
    ) VALUES (
        p_court_id,
        p_date,
        p_start_time,
        p_end_time,
        p_total_price,
        p_payment_method,
        p_payment_status,
        COALESCE(p_deposit_amount, 0),
        p_title,
        p_description
    )
    RETURNING id INTO v_booking_id;

    -- Insertar participantes
    FOR v_participant IN SELECT * FROM jsonb_array_elements(p_participants)
    LOOP
        INSERT INTO public.booking_participants (
            booking_id,
            member_id,
            role
        ) VALUES (
            v_booking_id,
            (v_participant->>'member_id')::uuid,
            COALESCE(v_participant->>'role', 'player')
        );
    END LOOP;

    -- Insertar items rentados
    FOR v_rental IN SELECT * FROM jsonb_array_elements(p_rental_items)
    LOOP
        INSERT INTO public.booking_rental_items (
            booking_id,
            item_id,
            quantity,
            price_per_unit
        ) VALUES (
            v_booking_id,
            (v_rental->>'item_id')::uuid,
            COALESCE((v_rental->>'quantity')::integer, 1),
            COALESCE((v_rental->>'price_per_unit')::numeric, 0)
        );
    END LOOP;

    RETURN v_booking_id;
END;
$function$; 