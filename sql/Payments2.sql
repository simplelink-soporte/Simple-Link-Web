-- 1. Verificar y limpiar triggers duplicados
DO $$ 
BEGIN
    -- Eliminar triggers que podrían estar interfiriendo
    DROP TRIGGER IF EXISTS ensure_payment_consistency_trigger ON public.bookings;
    DROP TRIGGER IF EXISTS create_initial_payment_trigger ON public.bookings;
    
    -- Eliminar funciones antiguas
    DROP FUNCTION IF EXISTS ensure_payment_consistency();
    DROP FUNCTION IF EXISTS create_initial_payment();
END $$;

-- 1. Crear una tabla de logs para debugging
CREATE TABLE IF NOT EXISTS public.trigger_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trigger_name TEXT,
    booking_data JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1. Verificar y corregir los tipos ENUM
DO $$ 
BEGIN
    -- Recrear los tipos si es necesario
    DROP TYPE IF EXISTS payment_status_type CASCADE;
    DROP TYPE IF EXISTS payment_type CASCADE;
    DROP TYPE IF EXISTS payment_method_enum CASCADE;

    CREATE TYPE payment_status_type AS ENUM ('pending', 'partial', 'completed', 'refunded');
    CREATE TYPE payment_type AS ENUM ('booking', 'deposit', 'remaining');
    CREATE TYPE payment_method_enum AS ENUM ('cash', 'card', 'transfer');
END $$;

-- 2. Crear una función más simple y robusta
CREATE OR REPLACE FUNCTION public.create_initial_payment()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_status payment_status_type;
    v_method payment_method_enum;
BEGIN
    -- Convertir y validar el status
    BEGIN
        v_status := COALESCE(NEW.payment_status::text, 'pending')::payment_status_type;
    EXCEPTION WHEN OTHERS THEN
        v_status := 'pending'::payment_status_type;
    END;

    -- Convertir y validar el método de pago
    BEGIN
        v_method := COALESCE(NEW.payment_method::text, 'cash')::payment_method_enum;
    EXCEPTION WHEN OTHERS THEN
        v_method := 'cash'::payment_method_enum;
    END;

    -- Insertar el pago con valores seguros
    INSERT INTO public.payments (
        booking_id,
        payment_type,
        payment_method,
        payment_status,
        deposit_amount,
        total_price,
        notes
    ) VALUES (
        NEW.id,
        'booking'::payment_type,
        v_method,
        v_status,
        COALESCE(NEW.deposit_amount, 0),
        COALESCE(NEW.total_price, 0),
        'Pago inicial de reserva'
    );

    -- Registrar en logs
    INSERT INTO trigger_logs (
        trigger_name,
        booking_data,
        error_message
    ) VALUES (
        'create_initial_payment',
        jsonb_build_object(
            'id', NEW.id,
            'status', v_status,
            'method', v_method,
            'total', NEW.total_price
        ),
        'Pago creado exitosamente'
    );

    RETURN NEW;

EXCEPTION WHEN OTHERS THEN
    -- Registrar el error y continuar
    INSERT INTO trigger_logs (
        trigger_name,
        booking_data,
        error_message
    ) VALUES (
        'create_initial_payment',
        jsonb_build_object(
            'id', NEW.id,
            'error', SQLERRM,
            'state', SQLSTATE
        ),
        'Error en trigger: ' || SQLERRM
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Recrear el trigger
DROP TRIGGER IF EXISTS create_initial_payment_trigger ON public.bookings;
CREATE TRIGGER create_initial_payment_trigger
    AFTER INSERT ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.create_initial_payment();

-- 4. Verificar la estructura de payments
DO $$ 
BEGIN
    -- Verificar y corregir la estructura de payments si es necesario
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'payments'
    ) THEN
        CREATE TABLE public.payments (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            booking_id UUID REFERENCES public.bookings(id),
            payment_type payment_type NOT NULL,
            payment_method payment_method_enum NOT NULL,
            payment_status payment_status_type NOT NULL,
            deposit_amount NUMERIC(10,2) DEFAULT 0,
            total_price NUMERIC(10,2) NOT NULL,
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;