-- Script para corregir la estructura de payments y eliminar trigger
-- Fecha: 27/12/2023

-- 1. Eliminar el trigger y la función
DROP TRIGGER IF EXISTS create_initial_payment_trigger ON public.bookings;
DROP FUNCTION IF EXISTS public.create_initial_payment();

-- 2. Verificar y corregir la estructura de la tabla payments
DO $$ 
BEGIN
    -- Verificar si la tabla existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'payments'
    ) THEN
        -- Crear la tabla si no existe
        CREATE TABLE public.payments (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            booking_id UUID REFERENCES public.bookings(id),
            amount numeric(10,2) NOT NULL DEFAULT 0,
            payment_method payment_method_enum DEFAULT 'cash',
            payment_status booking_payment_status DEFAULT 'pending',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    ELSE
        -- Verificar y agregar columnas faltantes
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'payments' 
            AND column_name = 'amount'
        ) THEN
            ALTER TABLE public.payments ADD COLUMN amount numeric(10,2) NOT NULL DEFAULT 0;
        END IF;

        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'payments' 
            AND column_name = 'payment_method'
        ) THEN
            ALTER TABLE public.payments ADD COLUMN payment_method payment_method_enum DEFAULT 'cash';
        END IF;

        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'payments' 
            AND column_name = 'payment_status'
        ) THEN
            ALTER TABLE public.payments ADD COLUMN payment_status booking_payment_status DEFAULT 'pending';
        END IF;
    END IF;

    -- Log de la operación
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('system_check', 
            jsonb_build_object('action', 'fix_payments_structure'),
            'Estructura de tabla payments verificada y corregida');

EXCEPTION WHEN OTHERS THEN
    -- Log del error
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('system_check', 
            jsonb_build_object(
                'error_detail', SQLERRM,
                'error_hint', SQLSTATE
            ),
            'Error al corregir estructura: ' || SQLERRM);
    RAISE EXCEPTION 'Error al corregir estructura: %', SQLERRM;
END $$;

-- 3. Otorgar permisos necesarios
GRANT ALL ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

-- 4. Verificar que el trigger ha sido eliminado
INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
VALUES ('system_check', 
        jsonb_build_object('action', 'verify_trigger_removal'),
        'Trigger y función eliminados correctamente');

-- 5. Verificar la estructura final
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'payments'
ORDER BY ordinal_position; 