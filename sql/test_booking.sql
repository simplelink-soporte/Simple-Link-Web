-- Script para probar la creación de una reserva
-- Fecha: 27/12/2023

-- 1. Limpiar logs anteriores
DELETE FROM trigger_logs 
WHERE created_at < NOW() - INTERVAL '1 hour';

-- 2. Obtener un court_id válido
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

    -- Intentar crear una reserva de prueba
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
        'Prueba de creación de reserva',        -- p_description
        jsonb_build_array(                      -- p_participants
            jsonb_build_object(
                'member_id', v_member_id,
                'role', 'player'
            )
        ),
        '[]'::jsonb                            -- p_rental_items
    );

    -- Log de éxito
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('test_booking', 
            jsonb_build_object(
                'booking_id', v_booking_id,
                'status', 'success'
            ),
            'Prueba completada exitosamente');

    -- Verificar la reserva creada
    RAISE NOTICE 'Reserva creada con ID: %', v_booking_id;

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