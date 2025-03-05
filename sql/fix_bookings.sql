-- 1. Agregar la columna payment_method a la tabla bookings si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE public.bookings 
        ADD COLUMN payment_method payment_method_enum DEFAULT 'cash'::payment_method_enum;
    END IF;
END $$;

-- 2. Asegurar que el trigger siga funcionando
DROP TRIGGER IF EXISTS create_initial_payment_trigger ON public.bookings;

CREATE TRIGGER create_initial_payment_trigger
    AFTER INSERT ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.create_initial_payment();

-- 3. Verificar y actualizar permisos
GRANT ALL ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
GRANT ALL ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role; 