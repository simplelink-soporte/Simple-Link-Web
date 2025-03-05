-- Script para restaurar columnas de pago en la tabla bookings
-- Fecha: 27/12/2023

-- 1. Verificar y asegurar que los tipos ENUM existen
DO $$ 
BEGIN
    -- Verificar payment_method_enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_enum') THEN
        CREATE TYPE payment_method_enum AS ENUM ('cash', 'stripe', 'transfer', 'card');
    END IF;

    -- Verificar payment_status_type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_type') THEN
        CREATE TYPE payment_status_type AS ENUM ('pending', 'partial', 'completed');
    END IF;
END $$;

-- 2. Agregar las columnas si no existen
DO $$ 
BEGIN
    -- Verificar y agregar payment_method
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE public.bookings 
        ADD COLUMN payment_method payment_method_enum DEFAULT 'cash'::payment_method_enum;
        
        -- Log de la operación
        INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
        VALUES ('system_check', 
                jsonb_build_object('action', 'add_payment_method'),
                'Columna payment_method agregada a bookings');
    END IF;

    -- Verificar y agregar payment_status
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE public.bookings 
        ADD COLUMN payment_status payment_status_type DEFAULT 'pending'::payment_status_type;
        
        -- Log de la operación
        INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
        VALUES ('system_check', 
                jsonb_build_object('action', 'add_payment_status'),
                'Columna payment_status agregada a bookings');
    END IF;

EXCEPTION WHEN OTHERS THEN
    -- Log del error
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('system_check', 
            jsonb_build_object(
                'error_detail', SQLERRM,
                'error_hint', SQLSTATE
            ),
            'Error al restaurar columnas: ' || SQLERRM);
    
    RAISE EXCEPTION 'Error al restaurar columnas: %', SQLERRM;
END $$;

-- 3. Verificar la estructura final
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'bookings'
AND column_name IN ('payment_method', 'payment_status')
ORDER BY ordinal_position; 