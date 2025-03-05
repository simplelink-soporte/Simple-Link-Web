-- Script para verificar y corregir permisos de RPC
-- Fecha: 27/12/2023

-- 1. Asegurar que la función es accesible vía RPC
DO $$ 
BEGIN
    -- Verificar si la función está expuesta para RPC
    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'create_booking_v2'
    ) THEN
        RAISE EXCEPTION 'La función create_booking_v2 no existe en el esquema public';
    END IF;

    -- Log de verificación
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('system_check', 
            jsonb_build_object('action', 'check_rpc_function'),
            'Verificación de función RPC completada');
END $$;

-- 2. Actualizar permisos específicos
DO $$ 
BEGIN
    -- Revocar permisos existentes para limpiar
    REVOKE ALL ON FUNCTION public.create_booking_v2(
        uuid, date, time without time zone, time without time zone,
        numeric, payment_method_enum, booking_payment_status, numeric,
        text, text, jsonb, jsonb
    ) FROM PUBLIC;

    -- Otorgar permisos específicos
    GRANT EXECUTE ON FUNCTION public.create_booking_v2(
        uuid, date, time without time zone, time without time zone,
        numeric, payment_method_enum, booking_payment_status, numeric,
        text, text, jsonb, jsonb
    ) TO authenticated;

    GRANT EXECUTE ON FUNCTION public.create_booking_v2(
        uuid, date, time without time zone, time without time zone,
        numeric, payment_method_enum, booking_payment_status, numeric,
        text, text, jsonb, jsonb
    ) TO service_role;

    -- Asegurar permisos en tablas relacionadas
    GRANT ALL ON TABLE public.bookings TO authenticated;
    GRANT ALL ON TABLE public.bookings TO service_role;
    GRANT ALL ON TABLE public.booking_participants TO authenticated;
    GRANT ALL ON TABLE public.booking_participants TO service_role;
    GRANT ALL ON TABLE public.booking_rentals TO authenticated;
    GRANT ALL ON TABLE public.booking_rentals TO service_role;

    -- Log de la operación
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('system_check', 
            jsonb_build_object('action', 'update_rpc_permissions'),
            'Permisos de RPC actualizados');

END $$;

-- 3. Verificar que la función retorna el tipo correcto
DO $$ 
BEGIN
    -- Asegurar que la función retorna UUID
    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        JOIN pg_type t ON p.prorettype = t.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'create_booking_v2'
        AND t.typname = 'uuid'
    ) THEN
        RAISE EXCEPTION 'La función debe retornar UUID';
    END IF;

    -- Log de verificación
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('system_check', 
            jsonb_build_object('action', 'check_return_type'),
            'Tipo de retorno verificado');
END $$;

-- 4. Crear una función wrapper para mejor manejo de errores
CREATE OR REPLACE FUNCTION public.create_booking_v2_wrapper(
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
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking_id uuid;
    v_error_message text;
BEGIN
    -- Log de inicio
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('create_booking_wrapper', 
            jsonb_build_object(
                'court_id', p_court_id,
                'date', p_date,
                'payment_method', p_payment_method,
                'payment_status', p_payment_status,
                'participants', p_participants
            ),
            'Iniciando wrapper de creación de reserva'
    );

    -- Validar participantes
    IF jsonb_array_length(p_participants) = 0 THEN
        RAISE EXCEPTION 'Debe incluir al menos un participante';
    END IF;

    -- Intentar crear la reserva
    v_booking_id := public.create_booking_v2(
        p_court_id, p_date, p_start_time, p_end_time,
        p_total_price, p_payment_method, p_payment_status,
        p_deposit_amount, p_title, p_description,
        p_participants, p_rental_items
    );

    -- Log de éxito
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('create_booking_wrapper', 
            jsonb_build_object(
                'booking_id', v_booking_id,
                'status', 'success'
            ),
            'Reserva creada exitosamente'
    );

    -- Retornar resultado exitoso
    RETURN jsonb_build_object(
        'success', true,
        'booking_id', v_booking_id,
        'message', 'Reserva creada exitosamente'
    );

EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
    
    -- Log detallado del error
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('create_booking_wrapper', 
            jsonb_build_object(
                'error_detail', SQLERRM,
                'error_hint', SQLSTATE,
                'params', jsonb_build_object(
                    'court_id', p_court_id,
                    'date', p_date,
                    'payment_method', p_payment_method,
                    'payment_status', p_payment_status,
                    'participants', p_participants
                )
            ),
            'Error en wrapper: ' || v_error_message
    );

    -- Retornar error estructurado
    RETURN jsonb_build_object(
        'success', false,
        'error', v_error_message,
        'code', SQLSTATE
    );
END;
$$;

-- Otorgar permisos al wrapper
GRANT EXECUTE ON FUNCTION public.create_booking_v2_wrapper(
    uuid, date, time without time zone, time without time zone,
    numeric, payment_method_enum, booking_payment_status, numeric,
    text, text, jsonb, jsonb
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.create_booking_v2_wrapper(
    uuid, date, time without time zone, time without time zone,
    numeric, payment_method_enum, booking_payment_status, numeric,
    text, text, jsonb, jsonb
) TO service_role;

-- Función wrapper para el RPC
CREATE OR REPLACE FUNCTION create_booking_rpc(
    p_court_id uuid,
    p_date date,
    p_start_time time without time zone,
    p_end_time time without time zone,
    p_court_price numeric,
    p_rental_items_price numeric,
    p_payment_method text,
    p_payment_status text,
    p_deposit_amount numeric DEFAULT 0,
    p_title text DEFAULT NULL::text,
    p_description text DEFAULT NULL::text,
    p_participants jsonb DEFAULT '[]'::jsonb,
    p_rental_items text DEFAULT '[]'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking_id uuid;
    v_rental_items jsonb;
    v_error_message text;
BEGIN
    -- Validar y convertir rental_items
    BEGIN
        v_rental_items := p_rental_items::jsonb;
        
        IF jsonb_typeof(v_rental_items) != 'array' THEN
            RAISE EXCEPTION 'rental_items debe ser un array JSON';
        END IF;
        
        -- Validar estructura de cada item
        FOR i IN 0..jsonb_array_length(v_rental_items) - 1 LOOP
            IF v_rental_items->i->>'item_id' IS NULL OR
               v_rental_items->i->>'quantity' IS NULL OR
               v_rental_items->i->>'price_per_unit' IS NULL OR
               v_rental_items->i->>'total_price' IS NULL THEN
                RAISE EXCEPTION 'Campos requeridos faltantes en rental_items[%]', i;
            END IF;
        END LOOP;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Error al procesar rental_items: %', SQLERRM;
    END;

    -- Crear la reserva
    v_booking_id := create_booking_with_rentals(
        p_court_id,
        p_date,
        p_start_time,
        p_end_time,
        p_court_price,
        p_rental_items_price,
        p_payment_method,
        p_payment_status,
        p_deposit_amount,
        p_title,
        p_description,
        ARRAY[p_participants]::jsonb[],
        p_rental_items
    );

    -- Retornar resultado exitoso
    RETURN jsonb_build_object(
        'success', true,
        'booking_id', v_booking_id,
        'message', 'Reserva creada exitosamente'
    );

EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
    
    -- Log del error
    INSERT INTO error_logs (
        error_type,
        error_message,
        error_detail,
        error_data
    ) VALUES (
        'RPC_ERROR',
        v_error_message,
        SQLSTATE,
        jsonb_build_object(
            'court_id', p_court_id,
            'date', p_date,
            'rental_items', p_rental_items
        )
    );
    
    RETURN jsonb_build_object(
        'success', false,
        'error', v_error_message
    );
END;
$$;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION create_booking_rpc TO authenticated;
GRANT EXECUTE ON FUNCTION create_booking_rpc TO service_role; 