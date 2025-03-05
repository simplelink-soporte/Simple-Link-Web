-- Script para probar la creación de una reserva
-- Fecha: 27/12/2023

-- 1. Limpiar logs anteriores
DELETE FROM trigger_logs 
WHERE created_at < NOW() - INTERVAL '1 hour';

-- 2. Obtener datos necesarios para la prueba
DO $$
DECLARE
    v_court_id uuid;
    v_member_id uuid;
    v_booking_id uuid;
BEGIN
    -- Obtener un ID de cancha válido
    SELECT id INTO v_court_id 
    FROM courts 
    WHERE is_active = true 
    LIMIT 1;

    IF v_court_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró ninguna cancha activa';
    END IF;

    -- Obtener un ID de miembro válido
    SELECT id INTO v_member_id
    FROM members
    LIMIT 1;

    IF v_member_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró ningún miembro';
    END IF;

    -- Log de inicio de prueba
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('test_booking', 
            jsonb_build_object(
                'court_id', v_court_id,
                'member_id', v_member_id,
                'action', 'start_test'
            ),
            'Iniciando prueba de creación de reserva');

    -- Probar diferentes métodos de pago
    -- 1. Prueba con método de pago 'cash'
    v_booking_id := public.create_booking_v2(
        v_court_id,                              -- p_court_id
        CURRENT_DATE + 1,                        -- p_date (mañana)
        '10:00'::time,                          -- p_start_time
        '11:00'::time,                          -- p_end_time
        100,                                    -- p_total_price
        'cash'::payment_method_enum,            -- p_payment_method
        'pending'::payment_status_type,         -- p_payment_status
        0,                                      -- p_deposit_amount
        'Reserva de prueba - Cash',             -- p_title
        'Prueba de creación de reserva',        -- p_description
        jsonb_build_array(                      -- p_participants
            jsonb_build_object(
                'member_id', v_member_id,
                'role', 'player'
            )
        ),
        '[]'::jsonb                            -- p_rental_items
    );

    -- Log de éxito para la primera prueba
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('test_booking', 
            jsonb_build_object(
                'booking_id', v_booking_id,
                'payment_method', 'cash',
                'status', 'success'
            ),
            'Prueba con método cash completada exitosamente');

    -- 2. Prueba con método de pago 'card' (debería convertirse a 'stripe')
    v_booking_id := public.create_booking_v2(
        v_court_id,                              -- p_court_id
        CURRENT_DATE + 1,                        -- p_date (mañana)
        '12:00'::time,                          -- p_start_time
        '13:00'::time,                          -- p_end_time
        100,                                    -- p_total_price
        'card'::payment_method_enum,            -- p_payment_method
        'pending'::payment_status_type,         -- p_payment_status
        0,                                      -- p_deposit_amount
        'Reserva de prueba - Card',             -- p_title
        'Prueba de creación de reserva',        -- p_description
        jsonb_build_array(                      -- p_participants
            jsonb_build_object(
                'member_id', v_member_id,
                'role', 'player'
            )
        ),
        '[]'::jsonb                            -- p_rental_items
    );

    -- Log de éxito para la segunda prueba
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('test_booking', 
            jsonb_build_object(
                'booking_id', v_booking_id,
                'payment_method', 'card',
                'status', 'success'
            ),
            'Prueba con método card completada exitosamente');

    -- Verificar las reservas creadas
    RAISE NOTICE 'Reservas creadas exitosamente';

EXCEPTION WHEN OTHERS THEN
    -- Log del error
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('test_booking', 
            jsonb_build_object(
                'error_detail', SQLERRM,
                'error_hint', SQLSTATE
            ),
            'Error en prueba: ' || SQLERRM);
    
    RAISE EXCEPTION 'Error en la prueba: %', SQLERRM;
END $$;

-- 3. Verificar los logs generados
SELECT trigger_name, booking_data, error_message, created_at
FROM trigger_logs
WHERE created_at >= NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;

-- 4. Verificar las reservas creadas
SELECT 
    id,
    court_id,
    date,
    start_time,
    end_time,
    total_price,
    payment_method,
    payment_status,
    deposit_amount,
    title,
    description,
    created_at
FROM bookings
WHERE created_at >= NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC; 