-- 1. Crear los tipos ENUM
DO $$ 
BEGIN
    -- Eliminar tipos existentes
    DROP TYPE IF EXISTS payment_status_type CASCADE;
    DROP TYPE IF EXISTS booking_payment_status CASCADE;
    DROP TYPE IF EXISTS payment_method_enum CASCADE;
    DROP TYPE IF EXISTS payment_type CASCADE;
    
    -- Crear tipos con los nombres correctos
    CREATE TYPE booking_payment_status AS ENUM ('pending', 'partial', 'completed', 'refunded');
    CREATE TYPE payment_method_enum AS ENUM ('cash', 'stripe', 'transfer');
    CREATE TYPE payment_type AS ENUM ('booking', 'deposit', 'remaining');
END $$;

-- 2. Modificar la tabla bookings
DO $$
BEGIN
    -- Agregar columnas si no existen
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'payment_status') THEN
        ALTER TABLE public.bookings ADD COLUMN payment_status booking_payment_status DEFAULT 'pending';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'payment_method') THEN
        ALTER TABLE public.bookings ADD COLUMN payment_method payment_method_enum DEFAULT 'cash';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'deposit_amount') THEN
        ALTER TABLE public.bookings ADD COLUMN deposit_amount numeric(10,2) DEFAULT 0;
    END IF;
END $$;

-- 3. Modificar la tabla payments
DO $$
BEGIN
    -- Crear la tabla payments si no existe
    CREATE TABLE IF NOT EXISTS public.payments (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        booking_id UUID REFERENCES public.bookings(id),
        payment_type payment_type DEFAULT 'booking',
        payment_method payment_method_enum DEFAULT 'cash',
        payment_status booking_payment_status DEFAULT 'pending',
        deposit_amount numeric(10,2) DEFAULT 0,
        total_price numeric(10,2) NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
END $$;

-- 4. Recrear la función con los tipos correctos
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
            'start_time', p_start_time,
            'end_time', p_end_time,
            'payment_method', p_payment_method,
            'payment_status', p_payment_status
        ),
        'Iniciando creación de reserva'
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

EXCEPTION WHEN OTHERS THEN
    -- Log del error
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('create_booking_v2', 
        jsonb_build_object(
            'error_detail', SQLERRM,
            'error_hint', SQLSTATE,
            'court_id', p_court_id,
            'payment_method', p_payment_method,
            'payment_status', p_payment_status
        ),
        'Error en create_booking_v2: ' || SQLERRM
    );
    
    RAISE EXCEPTION 'Error al crear la reserva: %', SQLERRM;
END;
$function$;

-- 5. Otorgar permisos necesarios
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