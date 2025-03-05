-- Script para verificar y corregir tipos de enumeración y estructura
-- Fecha: 27/12/2023

-- 1. Verificar y recrear tipos de enumeración
DO $$ 
BEGIN
    -- Recrear payment_method_enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_enum') THEN
        CREATE TYPE payment_method_enum AS ENUM ('cash', 'stripe', 'transfer');
    ELSE
        -- Actualizar tipo existente
        ALTER TYPE payment_method_enum ADD VALUE IF NOT EXISTS 'stripe';
        ALTER TYPE payment_method_enum ADD VALUE IF NOT EXISTS 'transfer';
    END IF;

    -- Recrear payment_status_type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_type') THEN
        CREATE TYPE payment_status_type AS ENUM ('pending', 'partial', 'completed');
    END IF;

    -- Log de la operación
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('system_check', 
            jsonb_build_object('action', 'check_enum_types'),
            'Tipos de enumeración verificados y actualizados');
END $$;

-- 2. Verificar y actualizar la estructura de la tabla bookings
DO $$ 
BEGIN
    -- Verificar columna payment_method
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE public.bookings 
        ADD COLUMN payment_method payment_method_enum DEFAULT 'cash'::payment_method_enum;
    END IF;

    -- Verificar columna payment_status
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE public.bookings 
        ADD COLUMN payment_status payment_status_type DEFAULT 'pending'::payment_status_type;
    END IF;

    -- Verificar columna deposit_amount
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'deposit_amount'
    ) THEN
        ALTER TABLE public.bookings 
        ADD COLUMN deposit_amount numeric(10,2) DEFAULT 0;
    END IF;

    -- Log de la operación
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('system_check', 
            jsonb_build_object('action', 'check_table_structure'),
            'Estructura de tabla bookings verificada y actualizada');

END $$;

-- 3. Verificar y actualizar permisos
GRANT ALL ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;

-- 4. Verificar estructura final
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'bookings'
ORDER BY ordinal_position;

-- 5. Verificar tipos de enumeración
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN ('payment_method_enum', 'payment_status_type')
ORDER BY t.typname, e.enumsortorder; 