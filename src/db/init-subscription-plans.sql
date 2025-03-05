-- Crear tipos ENUM si no existen
DO $$ BEGIN
    CREATE TYPE plan_type AS ENUM ('FREE', 'PRO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE reset_period AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Crear tabla subscription_plans si no existe
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    code plan_type NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    daily_booking_limit INTEGER NOT NULL,
    reset_period reset_period NOT NULL DEFAULT 'DAILY',
    features JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_subscription_plans_code ON subscription_plans(code);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_is_active ON subscription_plans(is_active);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_subscription_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_plans_updated_at();

-- Insertar o actualizar planes por defecto
INSERT INTO subscription_plans (
    name,
    code,
    description,
    price,
    daily_booking_limit,
    reset_period,
    features,
    is_active
)
VALUES
(
    'Plan Free',
    'FREE',
    'Plan gratuito con límite de reservas diarias',
    0,
    90,
    'DAILY',
    jsonb_build_object(
        'support', 'email',
        'analytics', 'basic',
        'max_courts', 2
    ),
    true
),
(
    'Plan Pro',
    'PRO',
    'Plan profesional con reservas ilimitadas',
    29.99,
    999999,
    'DAILY',
    jsonb_build_object(
        'support', '24/7',
        'analytics', 'advanced',
        'max_courts', 'unlimited',
        'priority_support', true
    ),
    true
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    daily_booking_limit = EXCLUDED.daily_booking_limit,
    reset_period = EXCLUDED.reset_period,
    features = EXCLUDED.features,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- Agregar columnas a empresas si no existen
DO $$ BEGIN
    ALTER TABLE empresas ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES subscription_plans(id);
    ALTER TABLE empresas ADD COLUMN IF NOT EXISTS plan_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Asignar plan FREE por defecto a empresas sin plan
WITH free_plan AS (
    SELECT id FROM subscription_plans WHERE code = 'FREE' LIMIT 1
)
UPDATE empresas
SET 
    plan_id = free_plan.id,
    plan_updated_at = CURRENT_TIMESTAMP
FROM free_plan
WHERE plan_id IS NULL; 