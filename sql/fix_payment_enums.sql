-- Script para corregir tipos de enumeración de pagos
-- Fecha: 27/12/2023

-- 1. Verificar y recrear los tipos de enumeración
DO $$ 
BEGIN
    -- Eliminar los tipos existentes si es necesario
    DROP TYPE IF EXISTS payment_method_enum CASCADE;
    DROP TYPE IF EXISTS payment_status_type CASCADE;
    DROP TYPE IF EXISTS booking_payment_status CASCADE;

    -- Crear los tipos con los valores correctos
    CREATE TYPE payment_method_enum AS ENUM ('cash', 'stripe', 'transfer', 'card');
    CREATE TYPE payment_status_type AS ENUM ('pending', 'partial', 'completed');

    -- Log de la operación
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('system_check', 
            jsonb_build_object('action', 'recreate_payment_enums'),
            'Tipos de enumeración de pagos recreados');

EXCEPTION WHEN OTHERS THEN
    -- Log del error
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('system_check', 
            jsonb_build_object(
                'error_detail', SQLERRM,
                'error_hint', SQLSTATE
            ),
            'Error al recrear tipos de enumeración: ' || SQLERRM);
    
    RAISE EXCEPTION 'Error al recrear tipos de enumeración: %', SQLERRM;
END $$;

-- 2. Actualizar las columnas en la tabla bookings
DO $$ 
BEGIN
    -- Verificar y actualizar la columna payment_method
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'payment_method'
    ) THEN
        -- Primero, convertir la columna a text temporalmente
        ALTER TABLE public.bookings 
        ALTER COLUMN payment_method TYPE text;

        -- Luego, convertirla de nuevo al tipo enum
        ALTER TABLE public.bookings 
        ALTER COLUMN payment_method TYPE payment_method_enum 
        USING payment_method::payment_method_enum;
    END IF;

    -- Verificar y actualizar la columna payment_status
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'payment_status'
    ) THEN
        -- Primero, convertir la columna a text temporalmente
        ALTER TABLE public.bookings 
        ALTER COLUMN payment_status TYPE text;

        -- Luego, convertirla de nuevo al tipo enum
        ALTER TABLE public.bookings 
        ALTER COLUMN payment_status TYPE payment_status_type 
        USING payment_status::payment_status_type;
    END IF;

    -- Log de la operación
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('system_check', 
            jsonb_build_object('action', 'update_payment_columns'),
            'Columnas de pago actualizadas en la tabla bookings');

EXCEPTION WHEN OTHERS THEN
    -- Log del error
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('system_check', 
            jsonb_build_object(
                'error_detail', SQLERRM,
                'error_hint', SQLSTATE
            ),
            'Error al actualizar columnas de pago: ' || SQLERRM);
    
    RAISE EXCEPTION 'Error al actualizar columnas de pago: %', SQLERRM;
END $$;

-- 3. Verificar los tipos de enumeración actuales
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN ('payment_method_enum', 'payment_status_type')
ORDER BY t.typname, e.enumsortorder;

-- 4. Verificar la estructura de la tabla bookings
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'bookings'
AND column_name IN ('payment_method', 'payment_status')
ORDER BY ordinal_position; 