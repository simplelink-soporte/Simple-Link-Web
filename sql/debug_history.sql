-- Historial de Debugging - Problema con Creación de Reservas
-- Fecha: 27/12/2023

/*
ESTADO ACTUAL:
- La función create_booking_v2 funciona correctamente
- Error al crear reserva desde la interfaz: "Error al procesar la reserva en la base de datos"
- El trigger de payments se eliminará temporalmente para aislar el problema

ANÁLISIS PASO A PASO:
1. Verificar tipos ENUM actuales:
   - payment_method_enum: debe ser ('cash', 'stripe', 'transfer')
   - booking_payment_status: debe ser ('pending', 'partial', 'completed', 'refunded')
   - payment_type: debe ser ('booking', 'deposit', 'remaining')

2. Verificar estructura de la tabla bookings:
   - payment_status debe ser de tipo booking_payment_status
   - payment_method debe ser de tipo payment_method_enum
   - Asegurar que los valores por defecto sean correctos

3. Plan de acción:
   a) Eliminar el trigger de payments temporalmente ✓
   b) Verificar y corregir tipos ENUM
   c) Verificar estructura de tabla bookings
   d) Probar creación de reserva sin trigger
   e) Analizar logs de error para más detalles

HISTORIAL DE INTENTOS:
1. [27/12/2023] Eliminación del trigger payments:
   - Se eliminó el trigger y la función create_initial_payment
   - Resultado: El error persiste

PRÓXIMOS PASOS:
1. Verificar tipos ENUM actuales y su uso en la tabla bookings
2. Asegurar que los valores que vienen del frontend coincidan con los tipos esperados
3. Agregar más logging para identificar el punto exacto del fallo
*/

-- 1. Query para verificar tipos ENUM actuales
SELECT 
    t.typname AS enum_type,
    e.enumlabel AS enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN ('payment_method_enum', 'booking_payment_status', 'payment_type')
ORDER BY t.typname, e.enumsortorder;

-- 2. Query para verificar estructura actual de la tabla bookings
SELECT 
    column_name,
    data_type,
    udt_name,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'bookings'
ORDER BY ordinal_position;

-- 3. Query para verificar últimos errores
SELECT *
FROM trigger_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 5; 