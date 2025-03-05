-- Eliminar triggers primero
DROP TRIGGER IF EXISTS trigger_refresh_booking_availability ON bookings;
DROP TRIGGER IF EXISTS update_rental_time_range_trigger ON booking_rentals;
DROP TRIGGER IF EXISTS check_booking_overlap_trigger ON bookings;

-- Luego eliminar las funciones
DROP FUNCTION IF EXISTS refresh_booking_availability();
DROP FUNCTION IF EXISTS update_rental_time_range();
DROP FUNCTION IF EXISTS check_booking_overlap();

-- Eliminar vistas materializadas y tablas de log
DROP MATERIALIZED VIEW IF EXISTS booking_availability;
DROP TABLE IF EXISTS availability_check_log;

-- Eliminar índices relacionados
DROP INDEX IF EXISTS idx_booking_availability_range;
DROP INDEX IF EXISTS booking_availability_item_idx;

-- Eliminar las columnas antiguas de tiempo
ALTER TABLE booking_rentals
DROP COLUMN IF EXISTS rental_start_time,
DROP COLUMN IF EXISTS rental_end_time;

-- Crear extensión necesaria para constraints de exclusión
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Agregar columna para el rango de tiempo si no existe
ALTER TABLE booking_rentals
ADD COLUMN IF NOT EXISTS time_range tsrange;

-- Actualizar los rangos de tiempo existentes
UPDATE booking_rentals br
SET time_range = tsrange(
    (b.date + b.start_time)::timestamp,
    (b.date + b.end_time)::timestamp,
    '[]'
)
FROM bookings b
WHERE br.booking_id = b.id;

-- Crear trigger para mantener el time_range actualizado
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

CREATE TRIGGER update_rental_time_range_trigger
    BEFORE INSERT OR UPDATE ON booking_rentals
    FOR EACH ROW
    EXECUTE FUNCTION update_rental_time_range();

-- Hacer la columna NOT NULL después de la actualización
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

-- Función mejorada para verificar disponibilidad
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

    -- Registrar verificación para debugging
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
        p_item_id,
        NULL,
        'check',
        0,
        p_booking_date,
        p_start_time,
        p_end_time,
        v_base_stock - v_max_booked_quantity,
        v_max_booked_quantity,
        jsonb_build_object(
            'item_id', p_item_id,
            'date', p_booking_date,
            'start_time', p_start_time,
            'end_time', p_end_time,
            'base_stock', v_base_stock,
            'booked_quantity', v_max_booked_quantity,
            'time_range', v_time_range::text
        )
    );

    RETURN v_base_stock - v_max_booked_quantity;
END;
$$ LANGUAGE plpgsql;

-- Crear tabla de log para debugging si no existe
CREATE TABLE IF NOT EXISTS rental_operations_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id),
    booking_id UUID REFERENCES bookings(id),
    operation_type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    available_stock INTEGER NOT NULL,
    booked_quantity INTEGER NOT NULL,
    debug_info JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimizar las consultas
CREATE INDEX IF NOT EXISTS idx_rental_ops_item_date 
ON rental_operations_log(item_id, booking_date);

CREATE INDEX IF NOT EXISTS idx_rental_ops_booking 
ON rental_operations_log(booking_id);

-- Función para limpiar logs antiguos
CREATE OR REPLACE FUNCTION cleanup_rental_logs() RETURNS void AS $$
BEGIN
    DELETE FROM rental_operations_log
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Crear índices optimizados para las consultas principales
CREATE INDEX IF NOT EXISTS idx_bookings_date_time 
ON bookings(date, start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_booking_rentals_item_booking 
ON booking_rentals(item_id, booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_rentals_time_range 
ON booking_rentals USING gist (time_range);

-- Crear índice para optimizar las búsquedas por item y rango
CREATE INDEX IF NOT EXISTS idx_booking_rentals_item_time 
ON booking_rentals USING gist (item_id, time_range); 