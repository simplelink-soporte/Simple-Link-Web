-- Primero verificamos si el tipo ya existe antes de crearlo
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mercadopago_account_status') THEN
    CREATE TYPE mercadopago_account_status AS ENUM ('pending', 'active', 'rejected', 'inactive');
  END IF;
END $$;

-- Creamos la tabla solo si no existe
CREATE TABLE IF NOT EXISTS public.mercadopago_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    mercadopago_user_id TEXT NOT NULL,
    mercadopago_email TEXT,
    account_status mercadopago_account_status DEFAULT 'pending',
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expiry TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    last_webhook_received_at TIMESTAMP WITH TIME ZONE
);

-- Añadimos restricciones únicas solo si no existen
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mercadopago_connections_empresa_id_key') THEN
    ALTER TABLE public.mercadopago_connections ADD CONSTRAINT mercadopago_connections_empresa_id_key UNIQUE (empresa_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mercadopago_connections_mercadopago_user_id_key') THEN
    ALTER TABLE public.mercadopago_connections ADD CONSTRAINT mercadopago_connections_mercadopago_user_id_key UNIQUE (mercadopago_user_id);
  END IF;
END $$;

-- Configurar RLS (Row Level Security) si no está ya activado
ALTER TABLE public.mercadopago_connections ENABLE ROW LEVEL SECURITY;