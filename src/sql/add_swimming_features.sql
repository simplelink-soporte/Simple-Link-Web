-- Agregar nuevas opciones de superficie para piscinas a la validación de superficie
ALTER TABLE public.courts
DROP CONSTRAINT valid_surface;

-- Agregar nuevas opciones para piscinas  
ALTER TABLE public.courts
ADD CONSTRAINT valid_surface CHECK (
  surface = ANY (ARRAY[
    -- Superficies existentes para deportes de raqueta
    'crystal'::text,
    'synthetic'::text,
    'clay'::text,
    'grass'::text,
    'rubber'::text,
    'concrete'::text,
    'panoramic'::text,
    'premium'::text,
    -- Nuevas opciones para piscinas
    'climatized'::text,     -- Climatizadas
    'seasonal'::text,       -- De temporada
    'indoor_pool'::text,    -- Cubiertas
    'outdoor_pool'::text,   -- Descubiertas
    'overflow'::text,       -- Desbordantes
    'skimmer'::text,        -- De skimmers
    'elevated'::text,       -- Elevadas
    'underground'::text,    -- Soterradas
    'constructed'::text,    -- De obra
    'prefabricated'::text   -- Prefabricadas
  ])
);

-- Comentarios para mayor claridad en la base de datos
COMMENT ON COLUMN public.courts.surface IS 'Tipo de superficie o características de la pista/piscina. Para piscinas incluye tipos como climatizadas, cubiertas, etc.';
