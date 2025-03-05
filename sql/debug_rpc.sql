-- 1. Verificar y otorgar permisos específicos para RPC
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

-- 2. Verificar que la función existe y es accesible
DO $$
DECLARE
    v_court_id uuid;
BEGIN
    -- Obtener un ID de cancha válido
    SELECT id INTO v_court_id FROM courts LIMIT 1;
    
    IF v_court_id IS NULL THEN
        INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
        VALUES ('system_check', 
                jsonb_build_object('error', 'No courts found'),
                'Error: No se encontraron canchas en la base de datos');
        RETURN;
    END IF;

    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('system_check', 
            jsonb_build_object(
                'action', 'verify_rpc',
                'court_id', v_court_id
            ),
            'Verificando acceso a create_booking_v2');

    -- Intentar una llamada de prueba con un court_id válido
    PERFORM public.create_booking_v2(
        v_court_id,
        CURRENT_DATE,
        '00:00'::time,
        '01:00'::time,
        100,
        'cash'::payment_method_enum,
        'pending'::booking_payment_status,
        0,
        NULL,
        NULL,
        '[]'::jsonb,
        '[]'::jsonb
    );

EXCEPTION WHEN OTHERS THEN
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('system_check', 
            jsonb_build_object(
                'error_detail', SQLERRM,
                'error_hint', SQLSTATE,
                'court_id', v_court_id
            ),
            'Error al verificar RPC: ' || SQLERRM);
END $$; 