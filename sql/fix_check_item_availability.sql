-- Script para actualizar la función check_item_availability
-- Primero, eliminar el trigger existente si existe
DROP TRIGGER IF EXISTS check_item_availability_trigger ON booking_rentals;

-- Luego, eliminar la función existente
DROP FUNCTION IF EXISTS check_item_availability();

-- Crear la nueva versión de la función
CREATE OR REPLACE FUNCTION check_item_availability()
RETURNS TRIGGER AS $$
DECLARE
    v_item_stock INTEGER;
    v_booking_date DATE;
    v_start_time TIME;
    v_end_time TIME;
    v_booked_quantity INTEGER;
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

    -- Verificar disponibilidad
    IF (v_item_stock >= v_booked_quantity + NEW.quantity) THEN
        -- Establecer el time_range del rental
        NEW.time_range := v_time_range;
        RETURN NEW;
    ELSE
        RAISE EXCEPTION 'No hay suficiente stock disponible para el item % (Solicitado: %, Disponible: %)',
            NEW.item_id, NEW.quantity, v_item_stock - v_booked_quantity;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Recrear el trigger
CREATE TRIGGER check_item_availability_trigger
    BEFORE INSERT OR UPDATE ON booking_rentals
    FOR EACH ROW
    EXECUTE FUNCTION check_item_availability(); 