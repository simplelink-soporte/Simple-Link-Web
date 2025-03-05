-- Script para mejorar la función create_booking_v2
-- Fecha: 27/12/2023

-- 1. Recrear la función con mejor manejo de errores
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
    v_error_message text;
BEGIN
    -- Log inicio de operación con todos los parámetros
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('create_booking_v2', 
        jsonb_build_object(
            'court_id', p_court_id,
            'date', p_date,
            'start_time', p_start_time,
            'end_time', p_end_time,
            'total_price', p_total_price,
            'payment_method', p_payment_method,
            'payment_status', p_payment_status,
            'deposit_amount', p_deposit_amount,
            'participants', p_participants,
            'rental_items', p_rental_items
        ),
        'Iniciando creación de reserva'
    );

    -- Validaciones iniciales
    IF p_court_id IS NULL THEN
        RAISE EXCEPTION 'El ID de la cancha es requerido';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM courts WHERE id = p_court_id) THEN
        RAISE EXCEPTION 'La cancha especificada no existe';
    END IF;

    IF p_date IS NULL THEN
        RAISE EXCEPTION 'La fecha es requerida';
    END IF;

    IF p_start_time IS NULL OR p_end_time IS NULL THEN
        RAISE EXCEPTION 'Las horas de inicio y fin son requeridas';
    END IF;

    IF p_total_price IS NULL OR p_total_price <= 0 THEN
        RAISE EXCEPTION 'El precio total debe ser mayor a 0';
    END IF;

    IF p_deposit_amount > p_total_price THEN
        RAISE EXCEPTION 'El depósito no puede ser mayor al precio total';
    END IF;

    -- Validar que no haya solapamiento de reservas
    IF EXISTS (
        SELECT 1 
        FROM bookings 
        WHERE court_id = p_court_id 
        AND date = p_date 
        AND (
            (start_time, end_time) OVERLAPS (p_start_time, p_end_time)
        )
    ) THEN
        RAISE EXCEPTION 'Ya existe una reserva para este horario';
    END IF;

    -- Insertar la reserva
    BEGIN
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

        -- Log después de insertar la reserva
        INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
        VALUES ('create_booking_v2', 
            jsonb_build_object(
                'step', 'post_insert',
                'booking_id', v_booking_id
            ),
            'Reserva insertada exitosamente'
        );

    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
        RAISE EXCEPTION 'Error al insertar la reserva: %', v_error_message;
    END;

    -- Insertar participantes
    IF jsonb_array_length(p_participants) > 0 THEN
        BEGIN
            FOR v_participant IN SELECT * FROM jsonb_array_elements(p_participants)
            LOOP
                -- Validar que el miembro existe
                IF NOT EXISTS (
                    SELECT 1 
                    FROM members 
                    WHERE id = (v_participant->>'member_id')::uuid
                ) THEN
                    RAISE EXCEPTION 'El miembro con ID % no existe', (v_participant->>'member_id');
                END IF;

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

        EXCEPTION WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
            -- Eliminar la reserva si falla la inserción de participantes
            DELETE FROM public.bookings WHERE id = v_booking_id;
            RAISE EXCEPTION 'Error al insertar participantes: %', v_error_message;
        END;
    END IF;

    -- Insertar items rentados
    IF jsonb_array_length(p_rental_items) > 0 THEN
        BEGIN
            FOR v_rental IN SELECT * FROM jsonb_array_elements(p_rental_items)
            LOOP
                -- Validar que el item existe
                IF NOT EXISTS (
                    SELECT 1 
                    FROM rental_items 
                    WHERE id = (v_rental->>'item_id')::uuid
                ) THEN
                    RAISE EXCEPTION 'El item rentado con ID % no existe', (v_rental->>'item_id');
                END IF;

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

        EXCEPTION WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
            -- Eliminar la reserva si falla la inserción de items rentados
            DELETE FROM public.bookings WHERE id = v_booking_id;
            RAISE EXCEPTION 'Error al insertar items rentados: %', v_error_message;
        END;
    END IF;

    -- Log final exitoso
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('create_booking_v2', 
        jsonb_build_object(
            'booking_id', v_booking_id,
            'status', 'completed'
        ),
        'Proceso completado exitosamente'
    );

    RETURN v_booking_id;

EXCEPTION WHEN OTHERS THEN
    -- Log detallado del error
    GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('create_booking_v2', 
        jsonb_build_object(
            'error_detail', SQLERRM,
            'error_hint', SQLSTATE,
            'court_id', p_court_id,
            'payment_method', p_payment_method,
            'payment_status', p_payment_status,
            'last_step', 'error'
        ),
        'Error en create_booking_v2: ' || v_error_message
    );
    
    RAISE EXCEPTION 'Error al crear la reserva: %', v_error_message;
END;
$function$;

-- 2. Otorgar permisos necesarios
GRANT EXECUTE ON FUNCTION public.create_booking_v2(
    uuid,
    date,
    time without time zone,
    time without time zone,
    numeric,
    payment_method_enum,
    payment_status_type,
    numeric,
    text,
    text,
    jsonb,
    jsonb
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.create_booking_v2(
    uuid,
    date,
    time without time zone,
    time without time zone,
    numeric,
    payment_method_enum,
    payment_status_type,
    numeric,
    text,
    text,
    jsonb,
    jsonb
) TO service_role; 