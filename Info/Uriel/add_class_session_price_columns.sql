-- Script para agregar columnas de precio de sesión de clase a las tablas de reservas y pagos
-- Fecha: Actualizado el 15 de mayo de 2024

-- Paso 1: Agregar columna para precio de sesión de clase a la tabla bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS class_session_price NUMERIC(10,2) DEFAULT 0;

-- Paso 2: Agregar columna para precio de sesión de clase a la tabla payments
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS class_session_price NUMERIC(10,2) DEFAULT 0;

-- Paso 3: Documentar las nuevas columnas con comentarios descriptivos
COMMENT ON COLUMN public.bookings.class_session_price IS 'Precio específico de la sesión de clase cuando reservation_type es "class"';
COMMENT ON COLUMN public.payments.class_session_price IS 'Precio específico de la sesión de clase cuando está relacionado con una reserva de tipo class';

-- Paso 4: Crear índice para mejorar rendimiento en consultas que filtran por clase y precio
CREATE INDEX IF NOT EXISTS idx_bookings_class_price 
ON public.bookings(class_id, class_session_price) 
WHERE reservation_type = 'class'::reservation_type_enum; 