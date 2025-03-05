-- Script para verificar y corregir tipos ENUM y estructura de tabla
-- Fecha: 27/12/2023

-- 1. Crear tabla temporal para backup
CREATE TEMP TABLE IF NOT EXISTS bookings_backup AS 
SELECT * FROM bookings;

-- 2. Verificar y recrear tipos ENUM
DO $$ 
BEGIN
    -- Eliminar tipos existentes
    DROP TYPE IF EXISTS payment_method_enum CASCADE;
    DROP TYPE IF EXISTS booking_payment_status CASCADE;
    DROP TYPE IF EXISTS payment_type CASCADE;
    
    -- Recrear tipos con valores correctos
    CREATE TYPE payment_method_enum AS ENUM ('cash', 'stripe', 'transfer');
    CREATE TYPE booking_payment_status AS ENUM ('pending', 'partial', 'completed', 'refunded');
    CREATE TYPE payment_type AS ENUM ('booking', 'deposit', 'remaining');
    
    -- Log de la operación
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('system_check', 
            jsonb_build_object('action', 'recreate_enums'),
            'Tipos ENUM recreados correctamente');
END $$;

-- 3. Verificar y corregir estructura de la tabla bookings
DO $$ 
BEGIN
    -- Verificar si las columnas existen y son del tipo correcto
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'payment_status'
    ) THEN
        -- Intentar convertir la columna al tipo correcto
        ALTER TABLE bookings 
            ALTER COLUMN payment_status TYPE booking_payment_status 
            USING payment_status::text::booking_payment_status;
    ELSE
        -- Crear la columna si no existe
        ALTER TABLE bookings 
            ADD COLUMN payment_status booking_payment_status 
            DEFAULT 'pending';
    END IF;

    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'payment_method'
    ) THEN
        -- Intentar convertir la columna al tipo correcto
        ALTER TABLE bookings 
            ALTER COLUMN payment_method TYPE payment_method_enum 
            USING payment_method::text::payment_method_enum;
    ELSE
        -- Crear la columna si no existe
        ALTER TABLE bookings 
            ADD COLUMN payment_method payment_method_enum 
            DEFAULT 'cash';
    END IF;

    -- Log de la operación
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('system_check', 
            jsonb_build_object('action', 'fix_bookings_structure'),
            'Estructura de tabla bookings verificada y corregida');

EXCEPTION WHEN OTHERS THEN
    -- Log del error
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('system_check', 
            jsonb_build_object(
                'error_detail', SQLERRM,
                'error_hint', SQLSTATE
            ),
            'Error al corregir estructura de tabla: ' || SQLERRM);
    RAISE EXCEPTION 'Error al corregir estructura: %', SQLERRM;
END $$;

-- 4. Verificar resultado
SELECT 
    column_name,
    data_type,
    udt_name,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'bookings'
AND column_name IN ('payment_status', 'payment_method')
ORDER BY ordinal_position; 