-- Añadir la columna 'sport' a la tabla 'classes'
ALTER TABLE public.classes
ADD COLUMN sport character varying(50);

-- Actualizar las clases existentes para establecer un valor predeterminado ('racket')
UPDATE public.classes
SET sport = 'racket'
WHERE sport IS NULL;

-- Hacer que la columna sea NOT NULL después de actualizar los datos existentes
ALTER TABLE public.classes
ALTER COLUMN sport SET NOT NULL;

-- Añadir una restricción CHECK para limitar los valores posibles
ALTER TABLE public.classes
ADD CONSTRAINT classes_sport_check CHECK (
  (sport)::text = ANY (
    (ARRAY['racket'::character varying, 'swimming'::character varying])::text[]
  )
);

-- Añadir un comentario a la columna para documentar su propósito
COMMENT ON COLUMN public.classes.sport IS 'Tipo de deporte para la clase (racket, swimming)';

-- Este SQL debe ejecutarse en el panel SQL de Supabase
