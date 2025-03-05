-- Verificar y recrear los tipos ENUM si es necesario
DO $$ 
BEGIN
    -- Recrear payment_status_type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_type') THEN
        CREATE TYPE payment_status_type AS ENUM ('pending', 'partial', 'completed', 'refunded');
    END IF;

    -- Recrear payment_type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_type') THEN
        CREATE TYPE payment_type AS ENUM ('booking', 'deposit', 'remaining');
    END IF;

    -- Recrear payment_method_enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_enum') THEN
        CREATE TYPE payment_method_enum AS ENUM ('cash', 'card', 'transfer');
    END IF;
END $$; 