-- Primero creamos los tipos ENUM si no existen
DO $$ BEGIN
    CREATE TYPE payment_status_enum AS ENUM ('pending', 'partial', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method_enum AS ENUM ('cash', 'stripe', 'transfer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Eliminar solo la tabla bookings
DROP TABLE IF EXISTS public.bookings CASCADE;

-- Recrear la tabla bookings
create table public.bookings (
  id uuid default gen_random_uuid() primary key,
  court_id uuid references public.courts(id) not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  title varchar(255),
  description text,
  total_price numeric(10,2) not null,
  payment_status payment_status_enum default 'pending',
  payment_method payment_method_enum,
  deposit_amount numeric(10,2),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Índices para optimizar consultas frecuentes
create index bookings_court_id_date_idx on public.bookings(court_id, date);
create index bookings_date_idx on public.bookings(date);

-- Triggers para actualizar updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_bookings_updated_at
  before update on public.bookings
  for each row
  execute function update_updated_at_column();

-- Función para validar superposición de reservas
create or replace function check_booking_overlap()
returns trigger as $$
begin
  if exists (
    select 1 from bookings
    where court_id = new.court_id
    and date = new.date
    and (
      (start_time, end_time) overlaps (new.start_time, new.end_time)
    )
    and id != new.id
  ) then
    raise exception 'La cancha ya está reservada en ese horario';
  end if;
  return new;
end;
$$ language plpgsql;

-- Trigger para validar superposición antes de insertar o actualizar
create trigger check_booking_overlap_trigger
  before insert or update on bookings
  for each row
  execute function check_booking_overlap();

-- Modificar la tabla bookings
ALTER TABLE public.bookings 
  ALTER COLUMN payment_status SET DEFAULT 'pending',
  ALTER COLUMN deposit_amount DROP DEFAULT,
  ADD CONSTRAINT check_payment_consistency 
    CHECK (
      (payment_status = 'completed' AND deposit_amount = total_price) OR
      (payment_status = 'partial' AND deposit_amount < total_price) OR
      (payment_status = 'pending')
    );

-- Agregar un trigger para mantener la consistencia
CREATE OR REPLACE FUNCTION ensure_payment_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el depósito es igual al total, forzar estado completed
  IF NEW.deposit_amount = NEW.total_price THEN
    NEW.payment_status := 'completed';
  -- Si el depósito es menor al total y mayor a 0, forzar estado partial
  ELSIF NEW.deposit_amount > 0 AND NEW.deposit_amount < NEW.total_price THEN
    NEW.payment_status := 'partial';
  -- Si no hay depósito, forzar estado pending
  ELSE
    NEW.payment_status := 'pending';
  END IF;

  -- Si el estado es completed, forzar depósito igual al total
  IF NEW.payment_status = 'completed' THEN
    NEW.deposit_amount := NEW.total_price;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger
DROP TRIGGER IF EXISTS ensure_payment_consistency_trigger ON public.bookings;
CREATE TRIGGER ensure_payment_consistency_trigger
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION ensure_payment_consistency();

-- Crear la función create_booking_v2
CREATE OR REPLACE FUNCTION create_booking_v2(
  p_court_id UUID,
  p_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_total_price NUMERIC,
  p_payment_status TEXT,
  p_payment_method TEXT,
  p_deposit_amount NUMERIC,
  p_title TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_participants JSONB DEFAULT '[]',
  p_rental_items JSONB DEFAULT '[]'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_booking_id UUID;
  v_payment_status payment_status_enum;
  v_payment_method payment_method_enum;
  participant_record RECORD;
  rental_record RECORD;
  v_participants JSONB;
  v_rental_items JSONB;
BEGIN
  -- Asegurar que los arrays JSON sean válidos
  v_participants := COALESCE(p_participants, '[]'::jsonb);
  v_rental_items := COALESCE(p_rental_items, '[]'::jsonb);

  -- Validar que sean arrays
  IF jsonb_typeof(v_participants) != 'array' THEN
    RAISE EXCEPTION 'participants debe ser un array JSON';
  END IF;

  IF jsonb_typeof(v_rental_items) != 'array' THEN
    RAISE EXCEPTION 'rental_items debe ser un array JSON';
  END IF;

  -- Convertir y validar los enums
  BEGIN
    -- Validar y convertir payment_status
    IF p_payment_status NOT IN ('pending', 'partial', 'completed') THEN
      RAISE EXCEPTION 'Invalid payment_status: %. Must be one of: pending, partial, completed', p_payment_status;
    END IF;
    v_payment_status := p_payment_status::payment_status_enum;

    -- Validar y convertir payment_method
    IF p_payment_method NOT IN ('cash', 'stripe', 'transfer') THEN
      RAISE EXCEPTION 'Invalid payment_method: %. Must be one of: cash, stripe, transfer', p_payment_method;
    END IF;
    v_payment_method := p_payment_method::payment_method_enum;
  EXCEPTION 
    WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Invalid enum conversion: payment_status=%, payment_method=%', p_payment_status, p_payment_method;
  END;

  -- Insertar la reserva
  INSERT INTO bookings (
    court_id,
    date,
    start_time,
    end_time,
    title,
    description,
    total_price,
    payment_status,
    payment_method,
    deposit_amount
  )
  VALUES (
    p_court_id,
    p_date,
    p_start_time,
    p_end_time,
    p_title,
    p_description,
    p_total_price,
    v_payment_status,
    v_payment_method,
    p_deposit_amount
  )
  RETURNING id INTO new_booking_id;

  -- Insertar participantes si existen
  IF jsonb_array_length(v_participants) > 0 THEN
    FOR participant_record IN 
      SELECT * FROM jsonb_to_recordset(v_participants) 
      AS x(member_id UUID, role TEXT)
    LOOP
      INSERT INTO booking_participants (
        booking_id,
        member_id,
        role
      ) VALUES (
        new_booking_id,
        participant_record.member_id,
        COALESCE(participant_record.role, 'player')::participant_role_enum
      );
    END LOOP;
  END IF;

  -- Insertar items rentados si existen
  IF jsonb_array_length(v_rental_items) > 0 THEN
    FOR rental_record IN 
      SELECT * FROM jsonb_to_recordset(v_rental_items) 
      AS x(item_id UUID, quantity INT, price_per_unit NUMERIC)
    LOOP
      INSERT INTO booking_rentals (
        booking_id,
        item_id,
        quantity,
        price_per_unit,
        total_price
      ) VALUES (
        new_booking_id,
        rental_record.item_id,
        rental_record.quantity,
        rental_record.price_per_unit,
        rental_record.quantity * rental_record.price_per_unit
      );
    END LOOP;
  END IF;

  -- Retornar los datos completos
  RETURN (
    SELECT jsonb_build_object(
      'id', b.id,
      'court_id', b.court_id,
      'date', b.date,
      'start_time', b.start_time,
      'end_time', b.end_time,
      'title', b.title,
      'description', b.description,
      'total_price', b.total_price,
      'payment_status', b.payment_status,
      'payment_method', b.payment_method,
      'deposit_amount', b.deposit_amount,
      'created_at', b.created_at,
      'updated_at', b.updated_at,
      'participants', COALESCE(
        (
          SELECT jsonb_agg(jsonb_build_object(
            'id', bp.id,
            'member_id', bp.member_id,
            'role', bp.role
          ))
          FROM booking_participants bp
          WHERE bp.booking_id = b.id
        ),
        '[]'::jsonb
      ),
      'rental_items', COALESCE(
        (
          SELECT jsonb_agg(jsonb_build_object(
            'id', br.id,
            'item_id', br.item_id,
            'quantity', br.quantity,
            'price_per_unit', br.price_per_unit,
            'total_price', br.total_price
          ))
          FROM booking_rentals br
          WHERE br.booking_id = b.id
        ),
        '[]'::jsonb
      )
    )
    FROM bookings b
    WHERE b.id = new_booking_id
  );
END;
$$;

-- Otorgar permisos para la nueva función
GRANT EXECUTE ON FUNCTION create_booking_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION create_booking_v2 TO service_role;

-- Agregar relación entre booking_participants y members si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'booking_participants_member_id_fkey'
  ) THEN
    ALTER TABLE public.booking_participants
    ADD CONSTRAINT booking_participants_member_id_fkey
    FOREIGN KEY (member_id) REFERENCES public.members(id);
  END IF;
END $$;

-- Agregar índice para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_booking_participants_member_id 
ON public.booking_participants(member_id);

-- Agregar relación entre bookings y booking_participants si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'booking_participants_booking_id_fkey'
  ) THEN
    ALTER TABLE public.booking_participants
    ADD CONSTRAINT booking_participants_booking_id_fkey
    FOREIGN KEY (booking_id) REFERENCES public.bookings(id)
    ON DELETE CASCADE;

    -- Crear índice para mejorar el rendimiento de las consultas
    CREATE INDEX IF NOT EXISTS idx_booking_participants_booking_id 
    ON public.booking_participants(booking_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION get_bookings_by_date(p_date DATE)
RETURNS TABLE (
  id UUID,
  court_id UUID,
  date DATE,
  start_time TIME,
  end_time TIME,
  total_price DECIMAL,
  payment_status TEXT,
  payment_method TEXT,
  deposit_amount DECIMAL,
  title TEXT,
  description TEXT,
  courts JSONB,
  booking_participants JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.court_id,
    b.date,
    b.start_time,
    b.end_time,
    b.total_price,
    b.payment_status::TEXT as payment_status,
    b.payment_method::TEXT as payment_method,
    b.deposit_amount,
    b.title::TEXT,
    b.description::TEXT,
    jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'branch_id', c.branch_id
    ) AS courts,
    COALESCE(
      jsonb_agg(
        CASE WHEN bp.id IS NOT NULL THEN
          jsonb_build_object(
            'id', bp.id,
            'member_id', bp.member_id,
            'role', bp.role,
            'members', CASE WHEN m.id IS NOT NULL THEN
              jsonb_build_object(
                'id', m.id,
                'first_name', m.first_name,
                'last_name', m.last_name,
                'email', m.email,
                'phone', m.phone
              )
            ELSE NULL END
          )
        ELSE NULL END
      ) FILTER (WHERE bp.id IS NOT NULL),
      '[]'::jsonb
    ) AS booking_participants
  FROM bookings b
  INNER JOIN courts c ON b.court_id = c.id
  LEFT JOIN booking_participants bp ON b.id = bp.booking_id
  LEFT JOIN members m ON bp.member_id = m.id
  WHERE b.date = p_date
  GROUP BY b.id, b.court_id, b.date, b.start_time, b.end_time, b.total_price,
           b.payment_status, b.payment_method, b.deposit_amount, b.title,
           b.description, c.id, c.name, c.branch_id;
END;
$$ LANGUAGE plpgsql;
  