-- Script para corregir todas las funciones y triggers
-- Primero, eliminar todos los triggers existentes
DROP TRIGGER IF EXISTS check_booking_availability_trigger ON booking_rentals;
DROP TRIGGER IF EXISTS check_item_availability_trigger ON booking_rentals;
DROP TRIGGER IF EXISTS update_rental_time_range_trigger ON booking_rentals;
DROP TRIGGER IF EXISTS check_booking_overlap_trigger ON bookings;
DROP TRIGGER IF EXISTS check_rental_overlap_trigger ON booking_rentals;

-- Luego eliminar todas las funciones
DROP FUNCTION IF EXISTS check_booking_availability();
DROP FUNCTION IF EXISTS check_item_availability();
DROP FUNCTION IF EXISTS update_rental_time_range();
DROP FUNCTION IF EXISTS check_booking_overlap();
DROP FUNCTION IF EXISTS get_available_stock(UUID, TIME, TIME, DATE);
DROP FUNCTION IF EXISTS check_rental_overlap();

-- Asegurarse de que la tabla booking_rentals tiene la estructura correcta
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

-- Crear extensión necesaria para constraints de exclusión
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Función para verificar solapamiento de rentals
CREATE OR REPLACE FUNCTION check_rental_overlap()
RETURNS TRIGGER AS $$
DECLARE
    v_booking_date DATE;
    v_time_range tsrange;
BEGIN
    -- Obtener la fecha de la reserva
    SELECT date, tsrange(
        (date + start_time)::timestamp,
        (date + end_time)::timestamp,
        '[]'
    ) INTO v_booking_date, v_time_range
    FROM bookings
    WHERE id = NEW.booking_id;

    -- Verificar si hay solapamiento solo con reservas no canceladas
    IF EXISTS (
        SELECT 1
        FROM booking_rentals br
        JOIN bookings b ON b.id = br.booking_id
        WHERE br.item_id = NEW.item_id
        AND b.payment_status != 'cancelled'
        AND br.booking_id != NEW.booking_id
        AND br.time_range && v_time_range
    ) THEN
        RAISE EXCEPTION 'El item ya está reservado en ese horario';
    END IF;

    -- Establecer el time_range del nuevo rental
    NEW.time_range := v_time_range;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar disponibilidad de items
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

-- Función para mantener el time_range actualizado
CREATE OR REPLACE FUNCTION update_rental_time_range()
RETURNS TRIGGER AS $$
DECLARE
    v_booking_date date;
    v_start_time time;
    v_end_time time;
BEGIN
    SELECT date, start_time, end_time 
    INTO v_booking_date, v_start_time, v_end_time
    FROM bookings 
    WHERE id = NEW.booking_id;
    
    NEW.time_range := tsrange(
        (v_booking_date + v_start_time)::timestamp,
        (v_booking_date + v_end_time)::timestamp,
        '[]'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar solapamiento de reservas
CREATE OR REPLACE FUNCTION check_booking_overlap()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM bookings
        WHERE court_id = NEW.court_id
        AND date = NEW.date
        AND payment_status != 'cancelled'
        AND id != NEW.id
        AND (start_time, end_time) OVERLAPS (NEW.start_time, NEW.end_time)
    ) THEN
        RAISE EXCEPTION 'Ya existe una reserva para esta cancha en ese horario';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener stock disponible
CREATE OR REPLACE FUNCTION get_available_stock(
    p_item_id UUID,
    p_start_time TIME,
    p_end_time TIME,
    p_booking_date DATE
) RETURNS INTEGER AS $$
DECLARE
    v_base_stock INTEGER;
    v_max_booked_quantity INTEGER;
    v_time_range tsrange;
BEGIN
    -- Obtener stock base del item
    SELECT stock INTO v_base_stock
    FROM items
    WHERE id = p_item_id;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- Crear el rango de tiempo para la consulta
    v_time_range := tsrange(
        (p_booking_date + p_start_time)::timestamp,
        (p_booking_date + p_end_time)::timestamp,
        '[]'
    );

    -- Calcular máximo de reservas concurrentes en el período solicitado
    SELECT COALESCE(MAX(concurrent_rentals), 0)
    INTO v_max_booked_quantity
    FROM (
        SELECT SUM(br.quantity) as concurrent_rentals
        FROM booking_rentals br
        JOIN bookings b ON b.id = br.booking_id
        WHERE br.item_id = p_item_id
        AND b.payment_status != 'cancelled'
        AND br.time_range && v_time_range
        GROUP BY br.time_range
    ) concurrent_usage;

    RETURN v_base_stock - v_max_booked_quantity;
END;
$$ LANGUAGE plpgsql;

-- Recrear todos los triggers
CREATE TRIGGER check_item_availability_trigger
    BEFORE INSERT OR UPDATE ON booking_rentals
    FOR EACH ROW
    EXECUTE FUNCTION check_item_availability();

CREATE TRIGGER update_rental_time_range_trigger
    BEFORE INSERT OR UPDATE ON booking_rentals
    FOR EACH ROW
    EXECUTE FUNCTION update_rental_time_range();

CREATE TRIGGER check_booking_overlap_trigger
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION check_booking_overlap();

CREATE TRIGGER check_rental_overlap_trigger
    BEFORE INSERT OR UPDATE ON booking_rentals
    FOR EACH ROW
    EXECUTE FUNCTION check_rental_overlap();

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

-- Hacer la columna time_range NOT NULL después de la actualización
ALTER TABLE booking_rentals
ALTER COLUMN time_range SET NOT NULL;

-- Eliminar constraint existente si existe
ALTER TABLE booking_rentals
DROP CONSTRAINT IF EXISTS prevent_item_overlap;

-- Agregar constraint para prevenir solapamientos de items
ALTER TABLE booking_rentals
ADD CONSTRAINT prevent_item_overlap
EXCLUDE USING gist (
    item_id WITH =,
    time_range WITH &&
); 