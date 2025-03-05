-- Script para probar la creación de una reserva simple
-- Fecha: 27/12/2023

-- 1. Limpiar logs anteriores para tener una vista limpia
DELETE FROM trigger_logs 
WHERE created_at < NOW() - INTERVAL '1 hour';

-- 2. Realizar la prueba
DO $$
DECLARE
    v_court_id uuid;
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

    -- Log de inicio de prueba
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('test_booking', 
            jsonb_build_object(
                'court_id', v_court_id,
                'action', 'start_test'
            ),
            'Iniciando prueba simple de creación de reserva');

    -- Crear una reserva de prueba
    v_booking_id := public.create_booking_v2(
        v_court_id,                              -- p_court_id
        CURRENT_DATE + 1,                        -- p_date (mañana)
        '10:00'::time,                          -- p_start_time
        '11:00'::time,                          -- p_end_time
        100,                                    -- p_total_price
        'cash'::payment_method_enum,            -- p_payment_method
        'pending'::payment_status_type,         -- p_payment_status
        0,                                      -- p_deposit_amount
        'Reserva de prueba',                    -- p_title
        'Prueba simple de creación',            -- p_description
        '[]'::jsonb,                           -- p_participants (sin participantes)
        '[]'::jsonb                            -- p_rental_items (sin items rentados)
    );

    -- Log de éxito
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('test_booking', 
            jsonb_build_object(
                'booking_id', v_booking_id,
                'status', 'success'
            ),
            'Prueba completada exitosamente');

    -- Mostrar el ID de la reserva creada
    RAISE NOTICE 'Reserva creada exitosamente con ID: %', v_booking_id;

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

-- 4. Verificar la reserva creada
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