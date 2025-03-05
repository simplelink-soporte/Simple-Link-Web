-- Agregar la relación entre booking_rentals y bookings
ALTER TABLE booking_rentals
ADD CONSTRAINT booking_rentals_booking_id_fkey
FOREIGN KEY (booking_id)
REFERENCES bookings(id)
ON DELETE CASCADE;

-- Crear índice para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_booking_rentals_booking_id 
ON booking_rentals(booking_id);

-- Función para crear reserva con manejo correcto de JSON
CREATE OR REPLACE FUNCTION create_booking_with_rentals(
    p_court_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_court_price DECIMAL,
    p_rental_items_price DECIMAL,
    p_payment_method TEXT,
    p_payment_status TEXT,
    p_deposit_amount DECIMAL,
    p_title TEXT,
    p_description TEXT,
    p_participants JSONB[],
    p_rental_items JSONB
)
RETURNS UUID AS $$
DECLARE
    v_booking_id UUID;
    v_rental JSONB;
    v_quantity INTEGER;
    v_price_per_unit DECIMAL;
    v_total_price DECIMAL;
    v_item_id UUID;
    v_calculated_total DECIMAL := 0;
BEGIN
    -- Validación del tipo de datos
    IF jsonb_typeof(p_rental_items) != 'array' THEN
        RAISE EXCEPTION 'rental_items debe ser un array JSON válido';
    END IF;

    -- Pre-validación y cálculo de totales
    FOR v_rental IN SELECT * FROM jsonb_array_elements(p_rental_items)
    LOOP
        -- Validaciones básicas
        IF v_rental->>'item_id' IS NULL THEN
            RAISE EXCEPTION 'item_id es requerido en rental_items';
        END IF;

        -- Convertir y validar item_id
        BEGIN
            v_item_id := (v_rental->>'item_id')::UUID;
        EXCEPTION 
            WHEN OTHERS THEN
                RAISE EXCEPTION 'item_id inválido: %', v_rental->>'item_id';
        END;

        -- Validar existencia del item
        IF NOT EXISTS (SELECT 1 FROM items WHERE id = v_item_id) THEN
            RAISE EXCEPTION 'El item % no existe', v_item_id;
        END IF;

        -- Extraer y validar cantidad
        IF v_rental->>'quantity' IS NULL OR NOT (v_rental->>'quantity' ~ '^[0-9]+$') THEN
            RAISE EXCEPTION 'quantity inválida para item %', v_item_id;
        END IF;
        v_quantity := COALESCE((v_rental->>'quantity')::INTEGER, 0);
        IF v_quantity <= 0 THEN
            RAISE EXCEPTION 'La cantidad debe ser mayor que 0 para el item %', v_item_id;
        END IF;

        -- Extraer y validar precio por unidad
        IF v_rental->>'price_per_unit' IS NULL OR NOT (v_rental->>'price_per_unit' ~ '^[0-9]+\.?[0-9]*$') THEN
            RAISE EXCEPTION 'price_per_unit inválido para item %', v_item_id;
        END IF;
        v_price_per_unit := COALESCE((v_rental->>'price_per_unit')::DECIMAL, 0);
        IF v_price_per_unit < 0 THEN
            RAISE EXCEPTION 'El precio por unidad no puede ser negativo para el item %', v_item_id;
        END IF;

        -- Calcular precio total del item
        v_total_price := v_quantity * v_price_per_unit;
        IF v_total_price IS NULL OR v_total_price < 0 THEN
            RAISE EXCEPTION 'Error al calcular el precio total para el item %', v_item_id;
        END IF;
        
        -- Validar consistencia con total_price proporcionado
        IF v_rental->>'total_price' IS NOT NULL THEN
            IF ABS(COALESCE((v_rental->>'total_price')::DECIMAL, 0) - v_total_price) > 0.01 THEN
                RAISE EXCEPTION 'Inconsistencia en total_price para item %: calculado % vs proporcionado %', 
                    v_item_id, v_total_price, v_rental->>'total_price';
            END IF;
        END IF;

        -- Acumular total
        v_calculated_total := v_calculated_total + v_total_price;
    END LOOP;

    -- Validar total calculado contra rental_items_price
    IF ABS(COALESCE(v_calculated_total, 0) - COALESCE(p_rental_items_price, 0)) > 0.01 THEN
        RAISE EXCEPTION 'Inconsistencia en rental_items_price: calculado % vs proporcionado %',
            v_calculated_total, p_rental_items_price;
    END IF;

    -- Crear la reserva principal
    INSERT INTO bookings (
        court_id, date, start_time, end_time,
        court_price, rental_items_price,
        payment_method, payment_status, deposit_amount,
        title, description
    ) VALUES (
        p_court_id, p_date, p_start_time, p_end_time,
        COALESCE(p_court_price, 0), COALESCE(p_rental_items_price, 0),
        p_payment_method, p_payment_status, COALESCE(p_deposit_amount, 0),
        COALESCE(p_title, ''), COALESCE(p_description, '')
    ) RETURNING id INTO v_booking_id;

    -- Insertar participantes
    IF array_length(p_participants, 1) > 0 THEN
        INSERT INTO booking_participants (booking_id, member_id, role)
        SELECT v_booking_id, 
               (participant->>'member_id')::UUID,
               participant->>'role'
        FROM unnest(p_participants) AS participant;
    END IF;

    -- Insertar items rentados
    IF jsonb_array_length(p_rental_items) > 0 THEN
        BEGIN
            FOR v_rental IN SELECT * FROM jsonb_array_elements(p_rental_items)
            LOOP
                -- Validar que el item existe
                IF NOT EXISTS (
                    SELECT 1 
                    FROM rental_items 
                    WHERE id = (v_rental->>'item_id')::uuid
                ) THEN
                    RAISE EXCEPTION 'El item rentado con ID % no existe', (v_rental->>'item_id');
                END IF;

                -- Calcular precio total del item
                v_quantity := (v_rental->>'quantity')::integer;
                v_price_per_unit := (v_rental->>'price_per_unit')::numeric;
                v_total_price := v_quantity * v_price_per_unit;

                -- Insertar el rental (los horarios se establecerán por el trigger)
                INSERT INTO booking_rentals (
                    booking_id,
                    item_id,
                    quantity,
                    price_per_unit,
                    total_price
                ) VALUES (
                    v_booking_id,
                    (v_rental->>'item_id')::uuid,
                    v_quantity,
                    v_price_per_unit,
                    v_total_price
                );

                -- Acumular total
                v_calculated_total := v_calculated_total + v_total_price;
            END LOOP;

            -- Validar total calculado contra rental_items_price
            IF ABS(COALESCE(v_calculated_total, 0) - COALESCE(p_rental_items_price, 0)) > 0.01 THEN
                RAISE EXCEPTION 'Inconsistencia en rental_items_price: calculado % vs proporcionado %',
                    v_calculated_total, p_rental_items_price;
            END IF;
        END;
    END IF;

    RETURN v_booking_id;

EXCEPTION 
    WHEN OTHERS THEN
        -- Rollback en caso de error
        IF v_booking_id IS NOT NULL THEN
            DELETE FROM bookings WHERE id = v_booking_id;
        END IF;
        RAISE;
END;
$$ LANGUAGE plpgsql;

-- Actualizar el trigger para usar JSONB
CREATE OR REPLACE FUNCTION update_booking_rental_items_price()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE bookings
    SET rental_items_price = (
        SELECT COALESCE(SUM(total_price), 0)
        FROM booking_rentals
        WHERE booking_id = NEW.booking_id
    )
    WHERE id = NEW.booking_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recrear el trigger
DROP TRIGGER IF EXISTS update_rental_items_price_trigger ON booking_rentals;
CREATE TRIGGER update_rental_items_price_trigger
AFTER INSERT OR UPDATE OR DELETE ON booking_rentals
FOR EACH ROW
EXECUTE FUNCTION update_booking_rental_items_price();

-- Log para verificación
INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
VALUES (
  'fix_booking_rentals',
  jsonb_build_object(
    'action', 'add_foreign_key',
    'table', 'booking_rentals',
    'reference', 'bookings'
  ),
  'Relación y trigger agregados correctamente'
); 