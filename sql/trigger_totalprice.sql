-- 1. Hacer backup de los datos existentes
CREATE TEMP TABLE bookings_backup AS SELECT * FROM bookings;

-- 2. Agregar nuevas columnas con validación
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS court_price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (court_price >= 0),
ADD COLUMN IF NOT EXISTS rental_items_price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (rental_items_price >= 0);

-- 3. Crear función para calcular total_price
CREATE OR REPLACE FUNCTION calculate_total_price()
RETURNS TRIGGER AS $$
BEGIN
    -- Validar precios no negativos
    IF NEW.court_price < 0 THEN
        RAISE EXCEPTION 'El precio de la cancha no puede ser negativo';
    END IF;
    IF NEW.rental_items_price < 0 THEN
        RAISE EXCEPTION 'El precio de los items rentados no puede ser negativo';
    END IF;

    -- Calcular total
    NEW.total_price = NEW.court_price + NEW.rental_items_price;

    -- Log para debugging
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('calculate_total_price', 
        jsonb_build_object(
            'court_price', NEW.court_price,
            'rental_items_price', NEW.rental_items_price,
            'total_price', NEW.total_price
        ),
        'Cálculo de precio total exitoso'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Crear trigger
DROP TRIGGER IF EXISTS update_total_price ON bookings;
CREATE TRIGGER update_total_price
    BEFORE INSERT OR UPDATE OF court_price, rental_items_price
    ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION calculate_total_price();

-- 5. Actualizar datos existentes
UPDATE bookings
SET court_price = total_price
WHERE court_price = 0;

me aparece esta advertencia:
Potential issue detected with your query
The following potential issue has been detected:
Ensure that these are intentional before executing this query
Query has destructive operation
Make sure you are not accidentally removing something important.
Please confirm that you would like to execute this query.