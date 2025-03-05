-- Función para iniciar la transacción
CREATE OR REPLACE FUNCTION begin_no_show_charge_transaction(p_booking_id uuid)
RETURNS void AS $$
BEGIN
    -- Bloquear la reserva para evitar modificaciones concurrentes
    PERFORM pg_advisory_xact_lock(hashtext(p_booking_id::text));
    
    -- Verificar estado actual
    IF EXISTS (
        SELECT 1 FROM bookings 
        WHERE id = p_booking_id 
        AND (cancelled_at IS NOT NULL OR payment_status = 'cancelled')
    ) THEN
        RAISE EXCEPTION 'La reserva ya está cancelada';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Función para confirmar la transacción
CREATE OR REPLACE FUNCTION commit_no_show_charge_transaction(p_booking_id uuid)
RETURNS void AS $$
BEGIN
    -- No necesitamos hacer nada especial aquí, la transacción se confirmará automáticamente
    NULL;
END;
$$ LANGUAGE plpgsql;

-- Función para hacer rollback de la transacción
CREATE OR REPLACE FUNCTION rollback_no_show_charge_transaction(p_booking_id uuid)
RETURNS void AS $$
BEGIN
    -- Forzar un rollback
    RAISE EXCEPTION 'Rollback de la transacción';
END;
$$ LANGUAGE plpgsql; 