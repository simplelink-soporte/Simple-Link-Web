-- 1. Crear el tipo enum para reservation_type si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reservation_type_enum') THEN
        CREATE TYPE reservation_type_enum AS ENUM ('booking', 'class');
    END IF;
END$$;

-- 2. Añadir la columna reservation_type a la tabla bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS reservation_type reservation_type_enum DEFAULT 'booking'::reservation_type_enum;

-- 3. Añadir columna para el ID de la clase
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL;

-- 4. Crear índice para mejorar el rendimiento de consultas por class_id
CREATE INDEX IF NOT EXISTS idx_bookings_class_id ON public.bookings(class_id);

-- 5. Crear índice compuesto para consultas por tipo de reserva y empresa
CREATE INDEX IF NOT EXISTS idx_bookings_reservation_type_empresa ON public.bookings(reservation_type, empresa_id);

-- 6. Actualizar comentarios de la tabla para documentar los nuevos campos
COMMENT ON COLUMN public.bookings.reservation_type IS 'Tipo de reserva: booking (normal) o class (sesión de clase)';
COMMENT ON COLUMN public.bookings.class_id IS 'ID de la clase asociada cuando reservation_type es "class"';

-- 7. Actualizar el trigger de validación para incluir reglas específicas para las reservas de clases (opcional)
CREATE OR REPLACE FUNCTION public.validate_booking_creation()
RETURNS trigger AS $$
BEGIN
    -- Validar que la hora de inicio sea menor que la hora de fin
    IF NEW.start_time >= NEW.end_time THEN
        RAISE EXCEPTION 'La hora de inicio debe ser menor a la hora de fin';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;