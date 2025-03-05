-- Script para mejorar el logging de create_booking_v2
-- Fecha: 27/12/2023

-- 1. Mejorar la función create_booking_v2 con más logging
CREATE OR REPLACE FUNCTION public.create_booking_v2(
    p_court_id uuid,
    p_date date,
    p_start_time time without time zone,
    p_end_time time without time zone,
    p_total_price numeric,
    p_payment_method payment_method_enum,
    p_payment_status booking_payment_status,
    p_deposit_amount numeric DEFAULT 0,
    p_title text DEFAULT NULL::text,
    p_description text DEFAULT NULL::text,
    p_participants jsonb DEFAULT '[]'::jsonb,
    p_rental_items jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking_id uuid;
    v_participant jsonb;
    v_rental jsonb;
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

    -- Validar datos requeridos
    IF p_court_id IS NULL THEN
        RAISE EXCEPTION 'court_id es requerido';
    END IF;

    IF p_date IS NULL THEN
        RAISE EXCEPTION 'date es requerido';
    END IF;

    IF p_start_time IS NULL OR p_end_time IS NULL THEN
        RAISE EXCEPTION 'start_time y end_time son requeridos';
    END IF;

    IF p_total_price IS NULL OR p_total_price <= 0 THEN
        RAISE EXCEPTION 'total_price debe ser mayor a 0';
    END IF;

    -- Validar que la cancha existe
    IF NOT EXISTS (SELECT 1 FROM courts WHERE id = p_court_id) THEN
        RAISE EXCEPTION 'La cancha especificada no existe';
    END IF;

    -- Log antes de insertar la reserva
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('create_booking_v2', 
        jsonb_build_object(
            'step', 'pre_insert',
            'court_id', p_court_id,
            'payment_method', p_payment_method,
            'payment_status', p_payment_status
        ),
        'Preparando inserción de reserva'
    );

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

    -- Log después de insertar la reserva
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('create_booking_v2', 
        jsonb_build_object(
            'step', 'post_insert',
            'booking_id', v_booking_id
        ),
        'Reserva insertada exitosamente'
    );

    -- Insertar participantes
    IF jsonb_array_length(p_participants) > 0 THEN
        FOR v_participant IN SELECT * FROM jsonb_array_elements(p_participants)
        LOOP
            -- Log antes de insertar cada participante
            INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
            VALUES ('create_booking_v2', 
                jsonb_build_object(
                    'step', 'participant_insert',
                    'booking_id', v_booking_id,
                    'participant', v_participant
                ),
                'Insertando participante'
            );

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
    END IF;

    -- Insertar items rentados
    IF jsonb_array_length(p_rental_items) > 0 THEN
        FOR v_rental IN SELECT * FROM jsonb_array_elements(p_rental_items)
        LOOP
            -- Log antes de insertar cada rental
            INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
            VALUES ('create_booking_v2', 
                jsonb_build_object(
                    'step', 'rental_insert',
                    'booking_id', v_booking_id,
                    'rental', v_rental
                ),
                'Insertando rental'
            );

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
        'Error en create_booking_v2: ' || SQLERRM
    );
    
    RAISE EXCEPTION 'Error al crear la reserva: %', SQLERRM;
END;
$$;

-- 2. Otorgar permisos necesarios
GRANT EXECUTE ON FUNCTION public.create_booking_v2(
    uuid,
    date,
    time without time zone,
    time without time zone,
    numeric,
    payment_method_enum,
    booking_payment_status,
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
    booking_payment_status,
    numeric,
    text,
    text,
    jsonb,
    jsonb
) TO service_role;

-- 3. Actualizar el historial de debugging
INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
VALUES ('system_check', 
        jsonb_build_object('action', 'update_create_booking_v2'),
        'Función create_booking_v2 actualizada con logging mejorado'); 