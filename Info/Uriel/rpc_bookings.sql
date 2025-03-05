-- 1. Crear una función temporal para guardar los permisos existentes
CREATE OR REPLACE FUNCTION temp_save_permissions() RETURNS void AS $$
BEGIN
    CREATE TEMPORARY TABLE IF NOT EXISTS temp_permissions AS
    SELECT 
        r.rolname as grantee,
        n.nspname as schema_name,
        p.proname as function_name,
        pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    CROSS JOIN pg_roles r
    WHERE p.proname = 'create_booking_v2'
    AND has_function_privilege(r.oid, p.oid, 'EXECUTE');
END;
$$ LANGUAGE plpgsql;

-- 2. Guardar los permisos
SELECT temp_save_permissions();

-- 3. Eliminar todas las versiones existentes de la función
DROP FUNCTION IF EXISTS public.create_booking_v2(
    uuid, date, time without time zone, time without time zone,
    numeric, numeric, payment_method_enum, booking_payment_status,
    payment_type, numeric, text, text, jsonb, jsonb
) CASCADE;

DROP FUNCTION IF EXISTS public.create_booking_v2(
    uuid, date, time without time zone, time without time zone,
    numeric, numeric, payment_method_enum, booking_payment_status,
    payment_type, numeric, text, text, jsonb, jsonb, uuid
) CASCADE;

-- 4. Crear la nueva versión de la función
CREATE OR REPLACE FUNCTION public.create_booking_v2(
    p_court_id uuid,
    p_date date,
    p_start_time time without time zone,
    p_end_time time without time zone,
    p_court_price numeric,
    p_rental_items_price numeric,
    p_payment_method payment_method_enum,
    p_payment_status booking_payment_status,
    p_payment_type payment_type,
    p_deposit_amount numeric DEFAULT 0,
    p_title text DEFAULT NULL,
    p_description text DEFAULT NULL,
    p_participants jsonb DEFAULT '[]',
    p_rental_items jsonb DEFAULT '[]',
    p_empresa_id uuid DEFAULT NULL,
    p_stripe_payment_method_id text DEFAULT NULL
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
    -- Log inicio de operación
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('create_booking_v2', 
        jsonb_build_object(
            'court_id', p_court_id,
            'date', p_date,
            'court_price', p_court_price,
            'rental_items_price', p_rental_items_price,
            'payment_type', p_payment_type,
            'empresa_id', p_empresa_id,
            'stripe_payment_method_id', p_stripe_payment_method_id
        ),
        'Iniciando creación de reserva'
    );

    -- Insertar la reserva
    INSERT INTO public.bookings (
        court_id,
        date,
        start_time,
        end_time,
        court_price,
        rental_items_price,
        payment_method,
        payment_status,
        payment_type,
        deposit_amount,
        title,
        description,
        empresa_id
    ) VALUES (
        p_court_id,
        p_date,
        p_start_time,
        p_end_time,
        p_court_price,
        p_rental_items_price,
        p_payment_method,
        p_payment_status,
        p_payment_type,
        COALESCE(p_deposit_amount, 0),
        p_title,
        p_description,
        p_empresa_id
    )
    RETURNING id INTO v_booking_id;

    -- Insertar el pago inicial con el stripe_payment_method_id
    INSERT INTO public.payments (
        booking_id,
        deposit_amount,
        total_price,
        payment_method,
        payment_status,
        notes,
        stripe_payment_method_id
    ) VALUES (
        v_booking_id,
        COALESCE(p_deposit_amount, 0),
        p_court_price + p_rental_items_price,
        p_payment_method,
        p_payment_status,
        'Pago inicial generado automáticamente',
        CASE 
            WHEN p_payment_type = 'guarantee' THEN p_stripe_payment_method_id
            ELSE NULL
        END
    );

    -- Insertar participantes con la nueva columna user_id
    FOR v_participant IN SELECT * FROM jsonb_array_elements(p_participants)
    LOOP
        INSERT INTO public.booking_participants (
            booking_id,
            user_id,
            role
        ) VALUES (
            v_booking_id,
            (v_participant->>'user_id')::uuid,
            (COALESCE(v_participant->>'role', 'player'))::participant_role_enum
        );
    END LOOP;

    -- Insertar items rentados
    FOR v_rental IN SELECT * FROM jsonb_array_elements(p_rental_items)
    LOOP
        INSERT INTO public.booking_rentals (
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

EXCEPTION WHEN OTHERS THEN
    -- Log del error
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('create_booking_v2', 
        jsonb_build_object(
            'error_detail', SQLERRM,
            'error_hint', SQLSTATE,
            'court_id', p_court_id,
            'payment_type', p_payment_type,
            'stripe_payment_method_id', p_stripe_payment_method_id
        ),
        'Error en create_booking_v2: ' || SQLERRM
    );
    
    RAISE EXCEPTION 'Error al crear la reserva: %', SQLERRM;
END;
$function$;

-- 5. Otorgar permisos básicos
GRANT EXECUTE ON FUNCTION public.create_booking_v2(
    uuid, date, time without time zone, time without time zone,
    numeric, numeric, payment_method_enum, booking_payment_status,
    payment_type, numeric, text, text, jsonb, jsonb, uuid, text
) TO authenticated;

-- 6. Verificar la instalación
DO $$ 
BEGIN
    -- Verificar que solo existe una versión
    IF (
        SELECT COUNT(*)
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'create_booking_v2'
    ) != 1 THEN
        RAISE EXCEPTION 'Se encontró más de una versión de la función create_booking_v2';
    END IF;

    -- Verificar que la función tiene los parámetros correctos
    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'create_booking_v2'
        AND n.nspname = 'public'
        AND pg_get_function_identity_arguments(p.oid) LIKE '%stripe_payment_method_id text%'
    ) THEN
        RAISE EXCEPTION 'La función create_booking_v2 no tiene el parámetro stripe_payment_method_id';
    END IF;
END $$;
