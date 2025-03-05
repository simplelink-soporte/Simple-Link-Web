-- Primero eliminamos la restricción existente si existe
ALTER TABLE booking_rentals DROP CONSTRAINT IF EXISTS prevent_item_overlap;

-- Creamos una nueva función para verificar la disponibilidad real
CREATE OR REPLACE FUNCTION check_item_availability_for_booking()
RETURNS TRIGGER AS $$
DECLARE
    v_item_stock INTEGER;
    v_total_booked INTEGER;
    v_booking_time_range tsrange;
BEGIN
    -- Obtener el stock total del item
    SELECT stock INTO v_item_stock
    FROM items
    WHERE id = NEW.item_id;

    -- Obtener el rango de tiempo de la reserva
    SELECT tsrange(
        (b.date || ' ' || b.start_time)::timestamp,
        (b.date || ' ' || b.end_time)::timestamp
    ) INTO v_booking_time_range
    FROM bookings b
    WHERE b.id = NEW.booking_id;

    -- Calcular la cantidad total reservada para ese período
    SELECT COALESCE(SUM(br.quantity), 0) INTO v_total_booked
    FROM booking_rentals br
    JOIN bookings b ON b.id = br.booking_id
    WHERE br.item_id = NEW.item_id
    AND b.payment_status != 'cancelled'
    AND tsrange(
        (b.date || ' ' || b.start_time)::timestamp,
        (b.date || ' ' || b.end_time)::timestamp
    ) && v_booking_time_range
    AND br.booking_id != NEW.booking_id;

    -- Verificar si hay suficiente stock disponible
    IF (v_total_booked + NEW.quantity) > v_item_stock THEN
        RAISE EXCEPTION 'No hay suficiente stock disponible para el item. Stock total: %, Reservado: %, Solicitado: %',
            v_item_stock, v_total_booked, NEW.quantity;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminamos el trigger existente si existe
DROP TRIGGER IF EXISTS check_item_availability_trigger ON booking_rentals;

-- Creamos el nuevo trigger
CREATE TRIGGER check_item_availability_trigger
    BEFORE INSERT OR UPDATE ON booking_rentals
    FOR EACH ROW
    EXECUTE FUNCTION check_item_availability_for_booking();

-- Actualizamos la función get_available_stock para que sea más precisa
CREATE OR REPLACE FUNCTION get_available_stock(
    p_item_id UUID,
    p_booking_date DATE,
    p_start_time TIME,
    p_end_time TIME
) RETURNS INTEGER AS $$
DECLARE
    v_item_stock INTEGER;
    v_max_booked INTEGER;
    v_booking_range tsrange;
BEGIN
    -- Obtener el stock total del item
    SELECT stock INTO v_item_stock
    FROM items
    WHERE id = p_item_id;

    IF v_item_stock IS NULL THEN
        RETURN 0;
    END IF;

    -- Crear el rango de tiempo para la consulta
    v_booking_range := tsrange(
        (p_booking_date || ' ' || p_start_time)::timestamp,
        (p_booking_date || ' ' || p_end_time)::timestamp
    );

    -- Obtener la máxima cantidad reservada en cualquier momento del rango
    SELECT COALESCE(MAX(booked_quantity), 0) INTO v_max_booked
    FROM (
        SELECT SUM(br.quantity) as booked_quantity
        FROM booking_rentals br
        JOIN bookings b ON b.id = br.booking_id
        WHERE br.item_id = p_item_id
        AND b.payment_status != 'cancelled'
        AND tsrange(
            (b.date || ' ' || b.start_time)::timestamp,
            (b.date || ' ' || b.end_time)::timestamp
        ) && v_booking_range
        GROUP BY br.item_id
    ) subquery;

    -- Devolver el stock disponible
    RETURN v_item_stock - v_max_booked;
END;
$$ LANGUAGE plpgsql; 