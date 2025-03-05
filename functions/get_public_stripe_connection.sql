create or replace function get_public_stripe_connection(p_empresa_id uuid)
returns json as $$
declare
  v_empresa record;
  v_stripe record;
  result json;
begin
  -- 1. Obtener el auth_user_id de la empresa
  select id, auth_user_id, is_active
  into v_empresa
  from empresas
  where id = p_empresa_id
    and is_active = true;

  if v_empresa.id is null then
    return json_build_object(
      'error', 'Empresa no encontrada o inactiva'
    );
  end if;

  -- 2. Obtener la conexión de Stripe usando el auth_user_id de la empresa
  select 
    stripe_account_id,
    charges_enabled,
    account_status,
    payouts_enabled
  into v_stripe
  from stripe_connections sc
  where sc.empresa_id = p_empresa_id
    and exists (
      select 1 
      from empresas e 
      where e.id = sc.empresa_id 
        and e.auth_user_id = v_empresa.auth_user_id
        and e.is_active = true
    );

  if v_stripe.stripe_account_id is null then
    return json_build_object(
      'error', 'No se encontró conexión Stripe activa'
    );
  end if;

  -- 3. Construir respuesta
  return json_build_object(
    'stripe_account_id', v_stripe.stripe_account_id,
    'charges_enabled', v_stripe.charges_enabled,
    'account_status', v_stripe.account_status,
    'is_active', true -- Si llegamos aquí, la conexión está activa
  );

exception 
  when others then
    return json_build_object(
      'error', SQLERRM
    );
end;
$$ language plpgsql security definer; 