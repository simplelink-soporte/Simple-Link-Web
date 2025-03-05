-- 1. Limpiar tipos existentes
DO $$ 
BEGIN
    DROP TYPE IF EXISTS payment_status_type CASCADE;
    DROP TYPE IF EXISTS payment_type CASCADE;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 2. Crear tipos ENUM
DO $$ 
BEGIN
    CREATE TYPE payment_status_type AS ENUM (
        'pending',
        'partial',
        'completed',
        'refunded',
        'partially_refunded'
    );

    CREATE TYPE payment_type AS ENUM (
        'booking',
        'deposit',
        'remaining',
        'refund'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 3. Eliminar tabla si existe
DROP TABLE IF EXISTS public.payments CASCADE;

-- 4. Crear tabla payments
CREATE TABLE public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID REFERENCES public.bookings(id) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    payment_type payment_type NOT NULL,
    payment_method payment_method_enum NOT NULL,
    payment_status payment_status_type DEFAULT 'pending',
    transaction_id VARCHAR(255),
    receipt_url TEXT,
    metadata JSONB DEFAULT '{}',
    notes TEXT,
    refund_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(booking_id, payment_type)
);

-- 5. Crear índices
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at);

-- 6. Script de migración segura
DO $$ 
BEGIN
    -- 1. Verificar si la restricción única ya existe
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'payments_booking_id_payment_type_key'
    ) THEN
        -- 2. Limpiar posibles duplicados antes de agregar la restricción
        WITH duplicates AS (
            SELECT booking_id, payment_type, 
                   (array_agg(id ORDER BY created_at ASC))[1] as keep_id
            FROM public.payments
            GROUP BY booking_id, payment_type
            HAVING COUNT(*) > 1
        )
        DELETE FROM public.payments p
        USING duplicates d
        WHERE p.booking_id = d.booking_id 
        AND p.payment_type = d.payment_type 
        AND p.id != d.keep_id;

        -- 3. Agregar la restricción única
        ALTER TABLE public.payments
        ADD CONSTRAINT payments_booking_id_payment_type_key UNIQUE(booking_id, payment_type);
    END IF;
END $$;

-- 7. Verificar y actualizar el tipo si es necesario
DO $$ 
BEGIN
    -- Asegurarnos de que estamos usando el tipo correcto
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_enum') THEN
        CREATE TYPE payment_status_enum AS ENUM (
            'pending',
            'partial',
            'completed',
            'refunded',
            'partially_refunded'
        );
    END IF;
END $$;

-- 8. Función para el trigger de pago inicial
CREATE OR REPLACE FUNCTION create_initial_payment()
RETURNS TRIGGER AS $$
DECLARE
    v_payment_id UUID;
BEGIN
    -- Crear registro de pago basado en el estado de la reserva
    INSERT INTO public.payments (
        booking_id,
        amount,
        payment_type,
        payment_method,
        payment_status,
        notes,
        created_at
    ) VALUES (
        NEW.id,
        CASE 
            WHEN NEW.payment_status = 'completed' THEN NEW.total_price
            WHEN NEW.payment_status = 'partial' THEN NEW.deposit_amount
            ELSE 0
        END,
        CASE 
            WHEN NEW.payment_status = 'completed' THEN 'booking'::payment_type
            WHEN NEW.payment_status = 'partial' THEN 'deposit'::payment_type
            ELSE 'booking'::payment_type
        END,
        COALESCE(NEW.payment_method, 'cash')::payment_method_enum,
        (CASE 
            WHEN NEW.payment_status = 'completed' THEN 'completed'
            WHEN NEW.payment_status = 'partial' AND NEW.deposit_amount > 0 THEN 'partial'
            ELSE 'pending'
        END)::payment_status_enum,
        CASE 
            WHEN NEW.payment_status = 'completed' THEN 'Pago completo de reserva'
            WHEN NEW.payment_status = 'partial' THEN 'Seña de reserva'
            ELSE 'Reserva sin pago inicial'
        END,
        NEW.created_at
    ) RETURNING id INTO v_payment_id;

    -- Si hay un depósito pero no es el pago completo, crear un registro pendiente por el restante
    IF NEW.payment_status = 'partial' AND NEW.deposit_amount > 0 AND NEW.deposit_amount < NEW.total_price THEN
        INSERT INTO public.payments (
            booking_id,
            amount,
            payment_type,
            payment_method,
            payment_status,
            notes,
            created_at
        ) VALUES (
            NEW.id,
            NEW.total_price - NEW.deposit_amount,
            'remaining'::payment_type,
            COALESCE(NEW.payment_method, 'cash')::payment_method_enum,
            'pending'::payment_status_enum,
            'Monto restante pendiente',
            NEW.created_at
        )
        ON CONFLICT (booking_id, payment_type) 
        DO UPDATE SET
            amount = EXCLUDED.amount,
            updated_at = NOW();
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- Si hay una violación única, actualizamos el registro existente
        UPDATE public.payments
        SET 
            amount = CASE 
                WHEN NEW.payment_status = 'completed' THEN NEW.total_price
                WHEN NEW.payment_status = 'partial' THEN NEW.deposit_amount
                ELSE 0
            END,
            payment_status = (CASE 
                WHEN NEW.payment_status = 'completed' THEN 'completed'
                WHEN NEW.payment_status = 'partial' AND NEW.deposit_amount > 0 THEN 'partial'
                ELSE 'pending'
            END)::payment_status_enum,
            updated_at = NOW()
        WHERE booking_id = NEW.id;
        RETURN NEW;
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error al crear el pago inicial: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- 9. Crear o reemplazar el trigger
DROP TRIGGER IF EXISTS create_initial_payment_trigger ON public.bookings;
CREATE TRIGGER create_initial_payment_trigger
    AFTER INSERT ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION create_initial_payment();

-- 10. Función para actualizar pagos cuando se modifica una reserva
CREATE OR REPLACE FUNCTION update_booking_payments()
RETURNS TRIGGER AS $$
BEGIN
    -- Si cambia el estado de pago o el monto
    IF (OLD.payment_status != NEW.payment_status) OR 
       (OLD.total_price != NEW.total_price) OR 
       (OLD.deposit_amount != NEW.deposit_amount) THEN
        
        -- Actualizar el pago existente
        UPDATE public.payments
        SET amount = CASE 
                WHEN NEW.payment_status = 'completed' THEN NEW.total_price
                WHEN NEW.payment_status = 'partial' THEN NEW.deposit_amount
                ELSE 0
            END,
        payment_status = CASE 
                WHEN NEW.payment_status = 'completed' THEN 'completed'::payment_status_type
                WHEN NEW.payment_status = 'partial' AND NEW.deposit_amount > 0 THEN 'partial'::payment_status_type
                ELSE 'pending'::payment_status_type
            END,
            payment_method = COALESCE(NEW.payment_method, 'cash')::payment_method_enum,
        updated_at = NOW()
        WHERE booking_id = NEW.id AND payment_type = 'booking'::payment_type;

        -- Actualizar o crear el registro de pago restante
        IF NEW.payment_status = 'partial' AND NEW.deposit_amount > 0 AND NEW.deposit_amount < NEW.total_price THEN
            INSERT INTO public.payments (
                booking_id,
                amount,
                payment_type,
                payment_method,
                payment_status,
                notes,
                created_at
            ) VALUES (
                NEW.id,
                NEW.total_price - NEW.deposit_amount,
                'remaining'::payment_type,
                COALESCE(NEW.payment_method, 'cash')::payment_method_enum,
                'pending'::payment_status_type,
                'Monto restante pendiente',
                NOW()
            )
            ON CONFLICT (booking_id, payment_type) 
            DO UPDATE SET
                amount = NEW.total_price - NEW.deposit_amount,
                updated_at = NOW();
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Crear trigger para actualización de pagos
DROP TRIGGER IF EXISTS update_booking_payments_trigger ON public.bookings;
CREATE TRIGGER update_booking_payments_trigger
    AFTER UPDATE ON public.bookings
    FOR EACH ROW
    WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status OR 
          OLD.total_price IS DISTINCT FROM NEW.total_price OR 
          OLD.deposit_amount IS DISTINCT FROM NEW.deposit_amount)
    EXECUTE FUNCTION update_booking_payments();