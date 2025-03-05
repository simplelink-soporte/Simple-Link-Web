-- 1. Mejorar la función del trigger con más logging
CREATE OR REPLACE FUNCTION public.create_initial_payment()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Log al inicio de la ejecución
    INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
    VALUES ('create_initial_payment', 
            jsonb_build_object(
                'start', 'Iniciando proceso',
                'booking_id', NEW.id,
                'payment_status', NEW.payment_status,
                'payment_method', NEW.payment_method,
                'total_price', NEW.total_price,
                'deposit_amount', NEW.deposit_amount
            ),
            'Inicio del proceso');

    -- Intentar insertar el pago
    BEGIN
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
            'booking',
            COALESCE(NEW.payment_method, 'cash')::payment_method_enum,
            COALESCE(NEW.payment_status::text, 'pending')::payment_status_type,
            COALESCE(NEW.deposit_amount, 0),
            COALESCE(NEW.total_price, 0),
            'Pago inicial de reserva'
        );

        -- Log de éxito
        INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
        VALUES ('create_initial_payment', 
                jsonb_build_object(
                    'success', true,
                    'booking_id', NEW.id
                ),
                'Pago creado exitosamente');

    EXCEPTION WHEN OTHERS THEN
        -- Log detallado del error
        INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
        VALUES ('create_initial_payment', 
                jsonb_build_object(
                    'error_detail', SQLERRM,
                    'error_hint', SQLSTATE,
                    'booking_id', NEW.id,
                    'payment_status', NEW.payment_status,
                    'payment_method', NEW.payment_method
                ),
                'Error al crear pago: ' || SQLERRM);
                
        RAISE EXCEPTION 'Error al crear pago inicial: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Recrear el trigger
DROP TRIGGER IF EXISTS create_initial_payment_trigger ON public.bookings;
CREATE TRIGGER create_initial_payment_trigger
    AFTER INSERT ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.create_initial_payment(); 