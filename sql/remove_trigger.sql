-- Eliminar el trigger y la función
DROP TRIGGER IF EXISTS create_initial_payment_trigger ON public.bookings;
DROP FUNCTION IF EXISTS public.create_initial_payment();

-- Verificar que se haya eliminado (esto insertará un log de confirmación)
INSERT INTO trigger_logs (trigger_name, booking_data, error_message)
VALUES ('system', 
        jsonb_build_object('action', 'trigger_removed'),
        'Trigger y función eliminados correctamente'); 