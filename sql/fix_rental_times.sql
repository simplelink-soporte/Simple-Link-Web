-- Script para corregir referencias a rental_start_time
-- Primero, desactivar los triggers que puedan interferir
DROP TRIGGER IF EXISTS check_booking_availability_trigger ON booking_rentals;
DROP TRIGGER IF EXISTS update_rental_time_range_trigger ON booking_rentals;

-- Eliminar las columnas antiguas si existen
ALTER TABLE booking_rentals
DROP COLUMN IF EXISTS rental_start_time,
DROP COLUMN IF EXISTS rental_end_time;

-- Asegurarse de que existe la columna time_range
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'booking_rentals' 
        AND column_name = 'time_range'
    ) THEN
        ALTER TABLE booking_rentals
        ADD COLUMN time_range tsrange;
    END IF;
END $$;

-- Recrear la función check_booking_availability
CREATE OR REPLACE FUNCTION check_booking_availability()
RETURNS TRIGGER AS $$
DECLARE
    v_item_stock INTEGER;
    v_booking_date DATE;
    v_start_time TIME;
    v_end_time TIME;
    v_booked_quantity INTEGER;
    v_debug_info JSONB;
    v_time_range tsrange;
BEGIN
    -- Obtener información de la reserva
    SELECT b.date, b.start_time, b.end_time 
    INTO v_booking_date, v_start_time, v_end_time
    FROM bookings b 
    WHERE b.id = NEW.booking_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No se encontró la reserva asociada (ID: %)', NEW.booking_id;
    END IF;

    -- Obtener stock base del item
    SELECT stock INTO v_item_stock
    FROM items
    WHERE id = NEW.item_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No se encontró el item (ID: %)', NEW.item_id;
    END IF;

    -- Crear el rango de tiempo para la consulta
    v_time_range := tsrange(
        (v_booking_date + v_start_time)::timestamp,
        (v_booking_date + v_end_time)::timestamp,
        '[]'
    );

    -- Calcular reservas concurrentes usando el time_range
    SELECT COALESCE(SUM(quantity), 0)
    INTO v_booked_quantity
    FROM booking_rentals br
    JOIN bookings b ON b.id = br.booking_id
    WHERE br.item_id = NEW.item_id
    AND b.payment_status != 'cancelled'
    AND br.booking_id != NEW.booking_id  -- Excluir la reserva actual
    AND br.time_range && v_time_range;

    -- Construir información de debug
    v_debug_info := jsonb_build_object(
        'item_id', NEW.item_id,
        'booking_id', NEW.booking_id,
        'date', v_booking_date,
        'start_time', v_start_time,
        'end_time', v_end_time,
        'requested_quantity', NEW.quantity,
        'base_stock', v_item_stock,
        'booked_quantity', v_booked_quantity,
        'available_stock', v_item_stock - v_booked_quantity,
        'time_range', v_time_range::text
    );

    -- Verificar disponibilidad
    IF (v_item_stock >= v_booked_quantity + NEW.quantity) THEN
        -- Establecer el time_range del rental
        NEW.time_range := v_time_range;

        -- Registrar operación exitosa
        INSERT INTO rental_operations_log (
            id,
            item_id,
            booking_id,
            operation_type,
            quantity,
            booking_date,
            start_time,
            end_time,
            available_stock,
            booked_quantity,
            debug_info
        ) VALUES (
            gen_random_uuid(),
            NEW.item_id,
            NEW.booking_id,
            'reserve',
            NEW.quantity,
            v_booking_date,
            v_start_time,
            v_end_time,
            v_item_stock - v_booked_quantity,
            v_booked_quantity,
            v_debug_info
        );

        RETURN NEW;
    ELSE
        -- Registrar intento fallido
        INSERT INTO rental_operations_log (
            id,
            item_id,
            booking_id,
            operation_type,
            quantity,
            booking_date,
            start_time,
            end_time,
            available_stock,
            booked_quantity,
            debug_info
        ) VALUES (
            gen_random_uuid(),
            NEW.item_id,
            NEW.booking_id,
            'failed_reserve',
            NEW.quantity,
            v_booking_date,
            v_start_time,
            v_end_time,
            v_item_stock - v_booked_quantity,
            v_booked_quantity,
            v_debug_info
        );

        RAISE EXCEPTION 'No hay suficiente stock disponible para el item % (Solicitado: %, Disponible: %)',
            NEW.item_id, NEW.quantity, v_item_stock - v_booked_quantity;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Recrear el trigger
CREATE TRIGGER check_booking_availability_trigger
    BEFORE INSERT OR UPDATE ON booking_rentals
    FOR EACH ROW
    EXECUTE FUNCTION check_booking_availability();

-- Actualizar los registros existentes para establecer el time_range
UPDATE booking_rentals br
SET time_range = tsrange(
    (b.date + b.start_time)::timestamp,
    (b.date + b.end_time)::timestamp,
    '[]'
)
FROM bookings b
WHERE br.booking_id = b.id
AND br.time_range IS NULL; 