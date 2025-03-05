-- Primero, eliminar TODOS los triggers posibles que puedan interferir
DROP TRIGGER IF EXISTS check_booking_overlap_trigger ON booking_rentals;
DROP TRIGGER IF EXISTS check_booking_overlap_trigger ON bookings;
DROP TRIGGER IF EXISTS check_item_availability_trigger ON booking_rentals;
DROP TRIGGER IF EXISTS update_rental_time_range_trigger ON booking_rentals;
DROP TRIGGER IF EXISTS validate_booking_creation_trigger ON bookings;
DROP TRIGGER IF EXISTS prevent_overlap_trigger ON booking_rentals;
DROP TRIGGER IF EXISTS check_availability_trigger ON booking_rentals;
DROP TRIGGER IF EXISTS check_rental_overlap_trigger ON booking_rentals;

-- Eliminar TODAS las funciones relacionadas y sus variantes
DROP FUNCTION IF EXISTS get_available_stock(uuid, date, time, time);
DROP FUNCTION IF EXISTS get_available_stock(uuid, time, time, date);
DROP FUNCTION IF EXISTS get_available_stock(uuid, timestamp, timestamp, date);
DROP FUNCTION IF EXISTS check_booking_overlap() CASCADE;
DROP FUNCTION IF EXISTS check_item_availability() CASCADE;
DROP FUNCTION IF EXISTS update_rental_time_range() CASCADE;
DROP FUNCTION IF EXISTS validate_booking_creation() CASCADE;
DROP FUNCTION IF EXISTS prevent_overlap() CASCADE;
DROP FUNCTION IF EXISTS check_availability() CASCADE;
DROP FUNCTION IF EXISTS check_rental_overlap() CASCADE;

-- Eliminar cualquier restricción de exclusión que pueda existir
ALTER TABLE booking_rentals DROP CONSTRAINT IF EXISTS prevent_item_overlap;
ALTER TABLE booking_rentals DROP CONSTRAINT IF EXISTS prevent_booking_overlap;
ALTER TABLE booking_rentals DROP CONSTRAINT IF EXISTS check_availability;
ALTER TABLE booking_rentals DROP CONSTRAINT IF EXISTS prevent_overlap;

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

-- Función principal para verificar disponibilidad y actualizar time_range
CREATE OR REPLACE FUNCTION check_item_availability_for_booking()
RETURNS TRIGGER AS $$
DECLARE
    v_item_stock INTEGER;
    v_max_booked INTEGER;
    v_booking_time_range tsrange;
    v_debug_info TEXT;
BEGIN
    -- Obtener el stock total del item
    SELECT stock INTO v_item_stock
    FROM items
    WHERE id = NEW.item_id;

    IF v_item_stock IS NULL THEN
        RAISE EXCEPTION 'Item no encontrado';
    END IF;

    -- Obtener el rango de tiempo de la reserva
    SELECT tsrange(
        (b.date || ' ' || b.start_time)::timestamp,
        (b.date || ' ' || b.end_time)::timestamp,
        '[)'
    ) INTO v_booking_time_range
    FROM bookings b
    WHERE b.id = NEW.booking_id;

    IF v_booking_time_range IS NULL THEN
        RAISE EXCEPTION 'Reserva no encontrada';
    END IF;

    -- Encontrar la cantidad máxima reservada en cualquier punto del rango de tiempo
    WITH RECURSIVE
    overlapping_ranges AS (
        SELECT 
            br.quantity as booking_quantity,
            br.time_range
        FROM booking_rentals br
        JOIN bookings b ON b.id = br.booking_id
        WHERE br.item_id = NEW.item_id
        AND b.payment_status != 'cancelled'
        AND br.booking_id != NEW.booking_id
        -- Modificada la condición de solapamiento para excluir los bordes exactos
        AND (
            lower(br.time_range) < upper(v_booking_time_range)
            AND upper(br.time_range) > lower(v_booking_time_range)
        )
    ),
    time_points AS (
        SELECT 
            (lower(time_range))::timestamp as point,
            booking_quantity
        FROM overlapping_ranges
        UNION
        SELECT 
            (upper(time_range))::timestamp as point,
            booking_quantity
        FROM overlapping_ranges
    ),
    total_at_points AS (
        SELECT 
            tp.point,
            SUM(r.booking_quantity) FILTER (
                WHERE tp.point >= lower(r.time_range) 
                AND tp.point < upper(r.time_range)
            ) as total_booked
        FROM time_points tp
        CROSS JOIN overlapping_ranges r
        GROUP BY tp.point
    )
    SELECT COALESCE(MAX(total_booked), 0)
    INTO v_max_booked
    FROM total_at_points;

    -- Registrar información detallada para debugging
    RAISE NOTICE E'Verificación de disponibilidad:\nItem ID: %\nStock Total: %\nMáximo Reservado: %\nCantidad Solicitada: %\nDisponible: %',
        NEW.item_id,
        v_item_stock,
        v_max_booked,
        NEW.quantity,
        (v_item_stock - v_max_booked);

    -- Verificar si hay suficiente stock disponible
    IF (v_max_booked + NEW.quantity) > v_item_stock THEN
        RAISE EXCEPTION 'Stock insuficiente para el horario seleccionado. Stock total: %, Máximo reservado: %, Solicitado: %, Disponible: %',
            v_item_stock, v_max_booked, NEW.quantity, (v_item_stock - v_max_booked);
    END IF;

    -- Establecer el time_range del nuevo rental
    NEW.time_range := v_booking_time_range;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger con un nombre único y descriptivo
DROP TRIGGER IF EXISTS check_item_availability_booking_trigger ON booking_rentals;
CREATE TRIGGER check_item_availability_booking_trigger
    BEFORE INSERT OR UPDATE ON booking_rentals
    FOR EACH ROW
    EXECUTE FUNCTION check_item_availability_for_booking();

-- Actualizar la función get_available_stock para un cálculo más preciso
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
        RAISE NOTICE 'Item no encontrado: %', p_item_id;
        RETURN 0;
    END IF;

    -- Crear el rango de tiempo para la consulta
    v_booking_range := tsrange(
        (p_booking_date || ' ' || p_start_time)::timestamp,
        (p_booking_date || ' ' || p_end_time)::timestamp,
        '[)'
    );

    -- Calcular el máximo de unidades reservadas en cualquier punto del rango de tiempo
    WITH RECURSIVE
    overlapping_rentals AS (
        SELECT 
            br.quantity,
            br.time_range
        FROM booking_rentals br
        JOIN bookings b ON b.id = br.booking_id
        WHERE br.item_id = p_item_id
        AND b.payment_status != 'cancelled'
        -- Modificada la condición de solapamiento para excluir los bordes exactos
        AND (
            lower(br.time_range) < upper(v_booking_range)
            AND upper(br.time_range) > lower(v_booking_range)
        )
    ),
    time_points AS (
        SELECT (lower(time_range))::timestamp as point
        FROM overlapping_rentals
        UNION
        SELECT (upper(time_range))::timestamp as point
        FROM overlapping_rentals
        UNION
        SELECT (lower(v_booking_range))::timestamp
        UNION
        SELECT (upper(v_booking_range))::timestamp
    ),
    point_calculations AS (
        SELECT 
            tp.point,
            SUM(CASE 
                WHEN tp.point >= lower(r.time_range) 
                AND tp.point < upper(r.time_range)
                THEN r.quantity
                ELSE 0
            END) as total_at_point
        FROM time_points tp
        CROSS JOIN overlapping_rentals r
        GROUP BY tp.point
        ORDER BY tp.point
    )
    SELECT COALESCE(MAX(total_at_point), 0)
    INTO v_max_booked
    FROM point_calculations;

    -- Registrar información para debugging
    RAISE NOTICE 'Cálculo de stock disponible: Stock total: %, Máximo reservado: %, Disponible: %',
        v_item_stock, v_max_booked, GREATEST(0, v_item_stock - v_max_booked);

    -- Devolver el stock disponible
    RETURN GREATEST(0, v_item_stock - v_max_booked);
END;
$$ LANGUAGE plpgsql;

-- Crear índice optimizado para búsquedas de rango temporal
DROP INDEX IF EXISTS idx_booking_rentals_item_time_range;
CREATE INDEX idx_booking_rentals_item_time_range ON booking_rentals USING gist (item_id, time_range);

-- Crear una función para validar la creación de reservas
CREATE OR REPLACE FUNCTION validate_booking_creation()
RETURNS TRIGGER AS $$
BEGIN
    -- Validar que la hora de inicio sea menor que la hora de fin
    IF NEW.start_time >= NEW.end_time THEN
        RAISE EXCEPTION 'La hora de inicio debe ser menor a la hora de fin';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger para validación de reservas
CREATE TRIGGER validate_booking_creation_trigger
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION validate_booking_creation(); 