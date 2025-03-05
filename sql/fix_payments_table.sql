-- 1. Eliminar y recrear la tabla payments
DO $$
BEGIN
    -- Eliminar la tabla si existe
    DROP TABLE IF EXISTS public.payments CASCADE;
    
    -- Crear la tabla payments con la estructura correcta
    CREATE TABLE public.payments (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        booking_id UUID REFERENCES public.bookings(id),
        payment_type payment_type NOT NULL DEFAULT 'booking',
        payment_method payment_method_enum NOT NULL DEFAULT 'cash',
        payment_status booking_payment_status NOT NULL DEFAULT 'pending',
        amount numeric(10,2) NOT NULL DEFAULT 0,
        deposit_amount numeric(10,2) NOT NULL DEFAULT 0,
        total_price numeric(10,2) NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Crear índices para mejorar el rendimiento
    CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);
    CREATE INDEX IF NOT EXISTS idx_payments_payment_type ON public.payments(payment_type);
    CREATE INDEX IF NOT EXISTS idx_payments_payment_status ON public.payments(payment_status);
    
    -- Otorgar permisos
    GRANT ALL ON public.payments TO authenticated;
    GRANT ALL ON public.payments TO service_role;
    
    -- Log de éxito
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('system_check', 
            jsonb_build_object('action', 'recreate_payments_table'),
            'Tabla payments recreada exitosamente');
            
END $$;

-- 2. Crear la función create_initial_payment
CREATE OR REPLACE FUNCTION create_initial_payment(
    p_booking_id UUID,
    p_payment_method payment_method_enum,
    p_payment_status booking_payment_status,
    p_deposit_amount numeric,
    p_total_price numeric
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payment_id UUID;
BEGIN
    -- Log inicio de operación
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('create_initial_payment', 
        jsonb_build_object(
            'booking_id', p_booking_id,
            'payment_method', p_payment_method,
            'payment_status', p_payment_status,
            'deposit_amount', p_deposit_amount,
            'total_price', p_total_price
        ),
        'Iniciando creación de pago inicial'
    );

    -- Insertar el pago inicial
    INSERT INTO public.payments (
        booking_id,
        payment_type,
        payment_method,
        payment_status,
        amount,
        deposit_amount,
        total_price,
        notes
    ) VALUES (
        p_booking_id,
        'booking',
        p_payment_method,
        p_payment_status,
        COALESCE(p_deposit_amount, 0),
        COALESCE(p_deposit_amount, 0),
        p_total_price,
        'Pago inicial de reserva'
    )
    RETURNING id INTO v_payment_id;

    RETURN v_payment_id;

EXCEPTION WHEN OTHERS THEN
    -- Log del error
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('create_initial_payment', 
        jsonb_build_object(
            'error_detail', SQLERRM,
            'error_hint', SQLSTATE,
            'booking_id', p_booking_id
        ),
        'Error al crear pago inicial: ' || SQLERRM
    );
    
    RAISE EXCEPTION 'Error al crear pago inicial: %', SQLERRM;
END;
$$;

-- 3. Otorgar permisos a la función
GRANT EXECUTE ON FUNCTION create_initial_payment(
    UUID,
    payment_method_enum,
    booking_payment_status,
    numeric,
    numeric
) TO authenticated;

GRANT EXECUTE ON FUNCTION create_initial_payment(
    UUID,
    payment_method_enum,
    booking_payment_status,
    numeric,
    numeric
) TO service_role;

-- 4. Intentar una prueba con el ID de cancha proporcionado
DO $$
BEGIN
    -- Intentar crear una reserva con el ID de cancha específico
    PERFORM public.create_booking_v2(
        '8f69eb96-fde1-4085-8577-61da097e4f99'::uuid,
        CURRENT_DATE,
        '10:00'::time,
        '11:00'::time,
        100,
        'cash'::payment_method_enum,
        'pending'::booking_payment_status,
        0,
        'Prueba',
        'Reserva de prueba',
        '[]'::jsonb,
        '[]'::jsonb
    );

    -- Log de éxito
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('system_check', 
            jsonb_build_object(
                'action', 'test_booking',
                'court_id', '8f69eb96-fde1-4085-8577-61da097e4f99'
            ),
            'Prueba de reserva completada exitosamente');

EXCEPTION WHEN OTHERS THEN
    -- Log del error
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('system_check', 
            jsonb_build_object(
                'error_detail', SQLERRM,
                'error_hint', SQLSTATE,
                'court_id', '8f69eb96-fde1-4085-8577-61da097e4f99'
            ),
            'Error en prueba de reserva: ' || SQLERRM);
END $$; 