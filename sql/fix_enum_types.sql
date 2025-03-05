-- 1. Eliminar triggers y funciones existentes
DROP TRIGGER IF EXISTS create_initial_payment_trigger ON public.bookings;
DROP FUNCTION IF EXISTS public.create_initial_payment();

-- 2. Hacer backup de los datos existentes
CREATE TEMP TABLE IF NOT EXISTS bookings_backup AS
SELECT * FROM public.bookings;

-- 3. Eliminar y recrear tipos ENUM
DROP TYPE IF EXISTS payment_status_type CASCADE;
DROP TYPE IF EXISTS booking_payment_status CASCADE;
DROP TYPE IF EXISTS payment_method_enum CASCADE;
DROP TYPE IF EXISTS payment_type CASCADE;
DROP TYPE IF EXISTS participant_role_enum CASCADE;

-- 4. Crear los tipos ENUM
CREATE TYPE booking_payment_status AS ENUM ('pending', 'partial', 'completed', 'refunded');
CREATE TYPE payment_method_enum AS ENUM ('cash', 'stripe', 'transfer');
CREATE TYPE payment_type AS ENUM ('booking', 'deposit', 'remaining');
CREATE TYPE participant_role_enum AS ENUM ('player', 'guest');

-- 5. Función para verificar y actualizar columnas
CREATE OR REPLACE FUNCTION update_table_columns()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Verificar y actualizar bookings
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE public.bookings ADD COLUMN payment_status booking_payment_status DEFAULT 'pending';
    ELSE
        ALTER TABLE public.bookings ALTER COLUMN payment_status TYPE booking_payment_status 
        USING payment_status::text::booking_payment_status;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE public.bookings ADD COLUMN payment_method payment_method_enum DEFAULT 'cash';
    ELSE
        ALTER TABLE public.bookings ALTER COLUMN payment_method TYPE payment_method_enum 
        USING payment_method::text::payment_method_enum;
    END IF;

    -- Verificar y actualizar payments
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN payment_status booking_payment_status DEFAULT 'pending';
    ELSE
        ALTER TABLE public.payments ALTER COLUMN payment_status TYPE booking_payment_status 
        USING payment_status::text::booking_payment_status;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN payment_method payment_method_enum DEFAULT 'cash';
    ELSE
        ALTER TABLE public.payments ALTER COLUMN payment_method TYPE payment_method_enum 
        USING payment_method::text::payment_method_enum;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' AND column_name = 'payment_type'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN payment_type payment_type DEFAULT 'booking';
    ELSE
        ALTER TABLE public.payments ALTER COLUMN payment_type TYPE payment_type 
        USING payment_type::text::payment_type;
    END IF;

    -- Verificar y actualizar booking_participants
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'booking_participants' AND column_name = 'role'
    ) THEN
        ALTER TABLE public.booking_participants ADD COLUMN role participant_role_enum DEFAULT 'player';
    ELSE
        ALTER TABLE public.booking_participants ALTER COLUMN role TYPE participant_role_enum 
        USING role::text::participant_role_enum;
    END IF;

    -- Log de éxito
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('system_check', 
            jsonb_build_object('action', 'update_columns'),
            'Columnas actualizadas correctamente');

EXCEPTION WHEN OTHERS THEN
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('system_check', 
            jsonb_build_object('action', 'update_columns'),
            'Error al actualizar columnas: ' || SQLERRM);
    RAISE;
END;
$$;

-- 6. Ejecutar la función de actualización
DO $$
BEGIN
    PERFORM update_table_columns();
END $$;

-- 7. Eliminar la función temporal
DROP FUNCTION IF EXISTS update_table_columns();

-- 8. Recrear la función con los tipos correctos
CREATE OR REPLACE FUNCTION public.create_booking_v2(
    p_court_id uuid,
    p_date date,
    p_start_time time without time zone,
    p_end_time time without time zone,
    p_court_price numeric,
    p_rental_items_price numeric,
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
            'rental_items_price', p_rental_items_price
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
        deposit_amount,
        title,
        description
    ) VALUES (
        p_court_id,
        p_date,
        p_start_time,
        p_end_time,
        p_court_price,
        p_rental_items_price,
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
            'court_price', p_court_price,
            'rental_items_price', p_rental_items_price
        ),
        'Error en create_booking_v2: ' || SQLERRM
    );
    
    RAISE EXCEPTION 'Error al crear la reserva: %', SQLERRM;
END;
$function$;

-- 9. Otorgar permisos necesarios
GRANT EXECUTE ON FUNCTION public.create_booking_v2(
    uuid,
    date,
    time without time zone,
    time without time zone,
    numeric,
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
    numeric,
    payment_method_enum,
    booking_payment_status,
    numeric,
    text,
    text,
    jsonb,
    jsonb
) TO service_role; 